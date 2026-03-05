import { Injectable, Logger } from '@nestjs/common';
import { PlatformConfigService } from '../platform-config/platform-config.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private config: PlatformConfigService) {}

  private getToken(): string | null {
    return this.config.get('telegram_bot_token') || null;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const token = this.getToken();
    if (!token) {
      this.logger.warn('Telegram bot token not configured');
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram sendMessage failed: ${body}`);
      }
    } catch (err) {
      this.logger.error(`Telegram sendMessage error: ${err}`);
    }
  }

  async sendOrderAlert(chatId: string, order: {
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    totalAmount: string | number;
    paymentMethod: string;
    items: { productName?: string; quantity: number; unitPrice?: string | number }[];
    shippingAddress?: string;
  }): Promise<void> {
    const itemLines = (order.items || [])
      .map(i => `  • ${i.quantity}× ${i.productName ?? 'Produit'} — ${Number(i.unitPrice ?? 0) * i.quantity} TND`)
      .join('\n');

    const payLabel = order.paymentMethod === 'COD' ? '💵 À la livraison' : '🏦 Virement bancaire';

    const text = [
      `🛍️ <b>Nouvelle commande #${order.orderNumber}</b>`,
      ``,
      `👤 ${order.customerName}${order.customerPhone ? ` · ${order.customerPhone}` : ''}`,
      `📦 ${order.shippingAddress ?? ''}`,
      ``,
      itemLines,
      ``,
      `💰 <b>Total : ${Number(order.totalAmount).toFixed(2)} TND</b>`,
      `${payLabel}`,
    ].join('\n');

    await this.sendMessage(chatId, text);
  }
}
