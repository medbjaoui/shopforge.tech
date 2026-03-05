import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

@Injectable()
export class StoreCustomerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(tenantId: string, dto: CustomerRegisterDto) {
    // Check email uniqueness within this tenant
    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, email: dto.email, password: { not: null } },
      });
      if (existing) throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    // Check if CRM customer already exists (same phone or email) — link account to it
    let customer = dto.phone
      ? await this.prisma.customer.findFirst({ where: { tenantId, phone: dto.phone } })
      : null;

    if (!customer && dto.email) {
      customer = await this.prisma.customer.findFirst({ where: { tenantId, email: dto.email } });
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    if (customer) {
      // Link account to existing CRM customer
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          password: hashed,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
    } else {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone ?? `${Date.now()}`,  // placeholder if no phone
          password: hashed,
          source: 'CHECKOUT',
        },
      });
    }

    const token = this.issueToken(customer.id, tenantId);
    return { token, customer: this.sanitize(customer) };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(tenantId: string, dto: CustomerLoginDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const valid = await bcrypt.compare(dto.password, customer.password);
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect.');

    const token = this.issueToken(customer.id, tenantId);
    return { token, customer: this.sanitize(customer) };
  }

  // ── Me ─────────────────────────────────────────────────────────────────────

  async getMe(customerId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Client introuvable.');
    return this.sanitize(customer);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async getMyOrders(customerId: string, tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        paymentMethod: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
          },
        },
        shipment: {
          select: { trackingNumber: true, carrier: true, status: true },
        },
      },
    });
    return orders;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private issueToken(customerId: string, tenantId: string) {
    return this.jwtService.sign(
      { sub: customerId, tenantId, type: 'customer' },
      { expiresIn: '30d' },
    );
  }

  private sanitize(c: any) {
    const { password, ...rest } = c;
    return rest;
  }
}
