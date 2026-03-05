import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

interface MetaOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number | string;
}

interface MetaTenantConfig {
  metaPixelId: string | null;
  metaAccessToken: string | null;
  metaIntegrationEnabled: boolean;
  slug: string;
}

interface MetaPurchasePayload {
  orderId: string;
  orderNumber: string;
  totalAmount: number | string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: MetaOrderItem[];
  tenant: MetaTenantConfig;
}

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly META_API_VERSION = 'v19.0';

  private sha256(value: string): string {
    return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit chars, ensure no leading +
    return phone.replace(/\D/g, '');
  }

  async trackPurchase(payload: MetaPurchasePayload): Promise<void> {
    const { tenant, orderId, orderNumber, totalAmount, customerEmail, customerPhone, items } = payload;

    if (!tenant.metaIntegrationEnabled || !tenant.metaPixelId || !tenant.metaAccessToken) {
      return;
    }

    const userData: Record<string, string[]> = {};
    if (customerEmail) userData.em = [this.sha256(customerEmail)];
    if (customerPhone) userData.ph = [this.sha256(this.normalizePhone(customerPhone))];

    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: orderId, // deduplication key with client-side pixel
          event_source_url: `https://${tenant.slug}.shopforge.tech/checkout`,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: 'TND',
            value: Number(totalAmount),
            order_id: orderNumber,
            num_items: items.reduce((s, i) => s + i.quantity, 0),
            contents: items.map((i) => ({
              id: i.productId,
              quantity: i.quantity,
              item_price: Number(i.unitPrice),
            })),
          },
        },
      ],
      access_token: tenant.metaAccessToken,
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/${this.META_API_VERSION}/${tenant.metaPixelId}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Meta CAPI error for tenant ${tenant.slug}: ${err}`);
      } else {
        this.logger.debug(`Meta Purchase event sent for order ${orderNumber}`);
      }
    } catch (e) {
      // Never block order creation if Meta fails
      this.logger.warn(`Meta CAPI request failed: ${e}`);
    }
  }
}
