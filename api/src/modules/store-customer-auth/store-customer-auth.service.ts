import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

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

  // ── Update Profile ─────────────────────────────────────────────────────────

  async updateProfile(customerId: string, tenantId: string, dto: UpdateProfileDto) {
    // Check if email is already taken by another customer
    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          email: dto.email,
          id: { not: customerId },
          password: { not: null },
        },
      });
      if (existing) throw new ConflictException('Cet email est déjà utilisé.');
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
    });

    return this.sanitize(customer);
  }

  // ── Change Password ────────────────────────────────────────────────────────

  async changePassword(customerId: string, tenantId: string, dto: ChangePasswordDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer || !customer.password) {
      throw new NotFoundException('Client introuvable.');
    }

    // Verify current password
    const valid = await bcrypt.compare(dto.currentPassword, customer.password);
    if (!valid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { password: hashed },
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  // ── Addresses ──────────────────────────────────────────────────────────────

  async getAddresses(customerId: string, tenantId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(customerId: string, tenantId: string, dto: CreateAddressDto) {
    // If this is set as default, unset all others first
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        ...dto,
        customerId,
        label: dto.label || 'Domicile',
        country: dto.country || 'Tunisie',
      },
    });
  }

  async updateAddress(addressId: string, customerId: string, tenantId: string, dto: UpdateAddressDto) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Adresse introuvable.');

    // If setting as default, unset all others first
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(addressId: string, customerId: string, tenantId: string) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Adresse introuvable.');

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    return { message: 'Adresse supprimée.' };
  }

  async setDefaultAddress(addressId: string, customerId: string, tenantId: string) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Adresse introuvable.');

    // Unset all defaults, then set this one
    await this.prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
