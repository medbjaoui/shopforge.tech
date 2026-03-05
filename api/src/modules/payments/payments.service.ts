import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

export interface InitiatePaymentDto {
  orderId: string;
  tenantId: string;
  returnBaseUrl: string; // e.g. https://demo.shopforge.tech
}

export interface PaymentInitResult {
  paymentUrl: string;
  gatewayRef: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PlatformConfigService,
  ) {}

  // ─── ClicToPay (UIB) ──────────────────────────────────────────────────────

  async initiateClicToPay(dto: InitiatePaymentDto): Promise<PaymentInitResult> {
    const merchantId = this.config.get('clictopay_merchant_id') ?? '';
    const password = this.config.get('clictopay_password') ?? '';
    const apiUrl = this.config.get('clictopay_api_url') ?? 'https://test.clictopay.com/payment/rest';

    if (!merchantId || !password) {
      throw new BadRequestException('ClicToPay non configuré. Contactez le support.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId: dto.tenantId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    // ClicToPay expects amount in millimes (TND × 1000)
    const amountMillimes = Math.round(Number(order.totalAmount) * 1000);
    const returnUrl = `${dto.returnBaseUrl}/payment/callback?gateway=clictopay&orderId=${order.id}`;
    const failUrl = `${dto.returnBaseUrl}/payment/callback?gateway=clictopay&orderId=${order.id}&status=fail`;

    const params = new URLSearchParams({
      userName: merchantId,
      password,
      orderNumber: order.orderNumber,
      amount: String(amountMillimes),
      currency: '788', // TND ISO 4217
      returnUrl,
      failUrl,
      language: 'fr',
      description: `Commande ${order.orderNumber}`,
    });

    const response = await fetch(`${apiUrl}/register.do?${params.toString()}`);
    const data = (await response.json()) as { orderId?: string; formUrl?: string; errorCode?: string; errorMessage?: string };

    if (data.errorCode && data.errorCode !== '0') {
      throw new BadRequestException(`ClicToPay: ${data.errorMessage ?? 'Erreur inconnue'}`);
    }
    if (!data.formUrl || !data.orderId) {
      throw new BadRequestException('Réponse ClicToPay invalide');
    }

    // Save gateway reference
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: data.orderId, paymentStatus: PaymentStatus.PENDING },
    });

    return { paymentUrl: data.formUrl, gatewayRef: data.orderId };
  }

  async confirmClicToPay(orderId: string, gatewayOrderId: string): Promise<boolean> {
    const merchantId = this.config.get('clictopay_merchant_id') ?? '';
    const password = this.config.get('clictopay_password') ?? '';
    const apiUrl = this.config.get('clictopay_api_url') ?? 'https://test.clictopay.com/payment/rest';

    const params = new URLSearchParams({
      userName: merchantId,
      password,
      orderId: gatewayOrderId,
      language: 'fr',
    });

    const response = await fetch(`${apiUrl}/getOrderStatus.do?${params.toString()}`);
    const data = (await response.json()) as { OrderStatus?: number; ErrorCode?: string };

    // OrderStatus 2 = APPROVED in ClicToPay
    const approved = data.OrderStatus === 2;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: approved ? PaymentStatus.PAID : PaymentStatus.FAILED },
    });

    return approved;
  }

  // ─── Floussi ──────────────────────────────────────────────────────────────

  async initiateFloussi(dto: InitiatePaymentDto): Promise<PaymentInitResult> {
    const merchantId = this.config.get('floussi_merchant_id') ?? '';
    const apiKey = this.config.get('floussi_api_key') ?? '';
    const apiUrl = this.config.get('floussi_api_url') ?? 'https://api.floussi.tn/v1';

    if (!merchantId || !apiKey) {
      throw new BadRequestException('Floussi non configuré. Contactez le support.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId: dto.tenantId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const returnUrl = `${dto.returnBaseUrl}/payment/callback?gateway=floussi&orderId=${order.id}`;

    // Floussi API: POST /payments/initiate
    const response = await fetch(`${apiUrl}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-Id': merchantId,
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        amount: Number(order.totalAmount),
        currency: 'TND',
        orderId: order.orderNumber,
        description: `Commande ${order.orderNumber}`,
        returnUrl,
        cancelUrl: returnUrl + '&status=cancel',
      }),
    });

    const data = (await response.json()) as { paymentUrl?: string; paymentId?: string; error?: string };

    if (data.error || !data.paymentUrl) {
      throw new BadRequestException(`Floussi: ${data.error ?? 'Erreur inconnue'}`);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: data.paymentId, paymentStatus: PaymentStatus.PENDING },
    });

    return { paymentUrl: data.paymentUrl, gatewayRef: data.paymentId ?? '' };
  }

  async confirmFloussi(orderId: string, gatewayPaymentId: string): Promise<boolean> {
    const merchantId = this.config.get('floussi_merchant_id') ?? '';
    const apiKey = this.config.get('floussi_api_key') ?? '';
    const apiUrl = this.config.get('floussi_api_url') ?? 'https://api.floussi.tn/v1';

    const response = await fetch(`${apiUrl}/payments/${gatewayPaymentId}`, {
      headers: { 'X-Merchant-Id': merchantId, 'X-Api-Key': apiKey },
    });
    const data = (await response.json()) as { status?: string };

    const approved = data.status === 'PAID' || data.status === 'SUCCESS';

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: approved ? PaymentStatus.PAID : PaymentStatus.FAILED },
    });

    return approved;
  }

  // ─── Webhook signature verification (Floussi HMAC) ────────────────────────

  verifyFloussiWebhook(payload: string, signature: string): boolean {
    const secret = this.config.get('floussi_webhook_secret') ?? '';
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // ─── Generic helpers ───────────────────────────────────────────────────────

  async markFailed(orderId: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  }

  async getOrderPaymentInfo(orderId: string, tenantId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { paymentMethod: true, paymentStatus: true, paymentRef: true, totalAmount: true, orderNumber: true },
    });
  }
}
