import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private createTransporter() {
    const host = this.config.get('SMTP_HOST');
    if (!host) return null;

    return nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  private getFrom(): string {
    return this.config.get('SMTP_FROM', 'noreply@shopforge.tech');
  }

  /**
   * Envoie un email de confirmation au client (LECE art. 25)
   */
  async sendOrderConfirmation(order: any, tenantId: string): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) {
      this.logger.warn('SMTP non configure — email confirmation non envoye');
      return;
    }

    if (!order.customerEmail) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, contactEmail: true, phone: true },
    });
    if (!tenant) return;

    const itemsHtml = (order.items || []).map((item: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.product?.name ?? 'Produit'}${item.variant ? ` (${item.variant.name})` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(item.unitPrice).toFixed(3)} TND</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#111827;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">${tenant.name}</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#111;margin:0 0 8px">Commande confirmee</h2>
          <p style="color:#666;margin:0 0 24px">
            Merci ${order.customerName} ! Votre commande <strong>${order.orderNumber}</strong> a ete enregistree avec succes.
          </p>

          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:8px 12px;text-align:left;font-weight:600">Produit</th>
                <th style="padding:8px 12px;text-align:center;font-weight:600">Qte</th>
                <th style="padding:8px 12px;text-align:right;font-weight:600">Prix</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;font-size:14px">
            ${order.shippingFee > 0 ? `<p style="margin:0 0 4px;color:#666">Livraison : <strong>${Number(order.shippingFee).toFixed(3)} TND</strong></p>` : ''}
            ${order.discountAmount > 0 ? `<p style="margin:0 0 4px;color:#16a34a">Remise : <strong>-${Number(order.discountAmount).toFixed(3)} TND</strong></p>` : ''}
            <p style="margin:0;font-size:16px;font-weight:700;color:#111">
              Total : ${Number(order.totalAmount).toFixed(3)} TND
            </p>
          </div>

          <div style="margin-top:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">
            <p style="margin:0 0 4px;font-weight:600;color:#111">Adresse de livraison</p>
            <p style="margin:0;color:#666">${order.shippingAddress}</p>
          </div>

          <p style="margin:24px 0 0;color:#999;font-size:12px">
            Vous pouvez suivre votre commande sur notre site avec le numero <strong>${order.orderNumber}</strong>.
            ${tenant.contactEmail ? `Pour toute question, contactez-nous a ${tenant.contactEmail}.` : ''}
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;font-size:11px;color:#999">
          ${tenant.name} — Propulse par ShopForge
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: order.customerEmail,
        subject: `Confirmation de commande ${order.orderNumber} — ${tenant.name}`,
        html,
      });
      this.logger.log(`Email confirmation envoye a ${order.customerEmail} pour ${order.orderNumber}`);
    } catch (err) {
      this.logger.error(`Echec envoi email confirmation: ${err}`);
    }
  }

  /**
   * Email de bienvenue à l'inscription (C2)
   */
  async sendWelcomeEmail(email: string, firstName: string, storeName: string, storeSlug: string): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#111827;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">ShopForge</h1>
        </div>
        <div style="padding:32px 24px">
          <h2 style="color:#111;margin:0 0 8px">Bienvenue ${firstName} !</h2>
          <p style="color:#555;margin:0 0 24px;font-size:15px">
            Votre boutique <strong>${storeName}</strong> est créée et prête a etre configuree.
          </p>
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 12px;font-weight:600;color:#111;font-size:14px">Pour commencer :</p>
            <p style="font-size:13px;color:#444;margin:4px 0">✅ Ajoutez vos produits — photos, prix, stock</p>
            <p style="font-size:13px;color:#444;margin:4px 0">🎨 Personnalisez votre theme — couleurs, logo, banniere</p>
            <p style="font-size:13px;color:#444;margin:4px 0">🚀 Partagez votre boutique — ${storeSlug}.shopforge.tech</p>
          </div>
          <a href="https://app.shopforge.tech/dashboard" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:14px">
            Acceder a mon tableau de bord
          </a>
          <p style="margin:24px 0 0;color:#999;font-size:12px">Une question ? Repondez a cet email.</p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;font-size:11px;color:#999">
          ShopForge — Plateforme e-commerce Tunisie
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: email,
        subject: `Bienvenue sur ShopForge — Votre boutique ${storeName} est prete !`,
        html,
      });
      this.logger.log(`Email bienvenue envoye a ${email}`);
    } catch (err) {
      this.logger.error(`Echec envoi email bienvenue: ${err}`);
    }
  }

  /**
   * Alerte limite de plan a 80% (C3)
   */
  async sendPlanLimitWarning(email: string, firstName: string, type: 'products' | 'orders', used: number, max: number): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const typeLabel = type === 'products' ? 'produits' : 'commandes ce mois';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#f59e0b;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:18px">Limite de plan atteinte a 80%</h1>
        </div>
        <div style="padding:24px;font-size:14px;color:#333">
          <p>Bonjour ${firstName},</p>
          <p>Vous avez utilise <strong>${used} / ${max} ${typeLabel}</strong> inclus dans votre plan actuel.</p>
          <p>Pour continuer a developper votre boutique sans interruption, passez a un plan superieur.</p>
          <a href="https://app.shopforge.tech/dashboard/billing" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Voir les plans
          </a>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: email,
        subject: `Vous approchez de la limite de votre plan ShopForge`,
        html,
      });
    } catch (err) {
      this.logger.error(`Echec envoi alerte limite plan: ${err}`);
    }
  }

  /**
   * Alerte commandes PENDING > 48h (C3)
   */
  async sendPendingOrdersAlert(email: string, firstName: string, storeName: string, orders: Array<{ orderNumber: string; customerName: string; totalAmount: string | number }>): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const ordersHtml = orders.map((o) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${o.orderNumber}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${o.customerName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(o.totalAmount).toFixed(3)} TND</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#ef4444;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:18px">${orders.length} commande(s) en attente depuis 48h</h1>
        </div>
        <div style="padding:24px;font-size:14px;color:#333">
          <p>Bonjour ${firstName}, la boutique <strong>${storeName}</strong> a des commandes en attente :</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left">N commande</th>
              <th style="padding:8px 12px;text-align:left">Client</th>
              <th style="padding:8px 12px;text-align:right">Total</th>
            </tr></thead>
            <tbody>${ordersHtml}</tbody>
          </table>
          <a href="https://app.shopforge.tech/dashboard/orders" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Gerer mes commandes
          </a>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: email,
        subject: `${orders.length} commande(s) en attente de confirmation — ${storeName}`,
        html,
      });
    } catch (err) {
      this.logger.error(`Echec envoi alerte commandes pending: ${err}`);
    }
  }

  /**
   * Resume hebdomadaire marchand (C3)
   */
  async sendWeeklyReport(email: string, firstName: string, storeName: string, stats: { orders: number; revenue: number; topProduct?: string; prevOrders?: number }): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const trend = stats.prevOrders != null && stats.prevOrders > 0
      ? Math.round((stats.orders - stats.prevOrders) / stats.prevOrders * 100)
      : null;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#111827;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:18px">Votre semaine chez ShopForge</h1>
        </div>
        <div style="padding:24px;font-size:14px;color:#333">
          <p>Bonjour ${firstName}, voici le bilan de <strong>${storeName}</strong> cette semaine :</p>
          <table style="width:100%;margin:20px 0;border-collapse:collapse">
            <tr>
              <td style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;width:50%">
                <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a">${stats.orders}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#555">commandes livrees${trend != null ? ` (${trend > 0 ? '+' : ''}${trend}%)` : ''}</p>
              </td>
              <td style="width:16px"></td>
              <td style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;width:50%">
                <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb">${stats.revenue.toFixed(0)}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#555">TND de revenus</p>
              </td>
            </tr>
          </table>
          ${stats.topProduct ? `<p style="background:#fefce8;border-radius:8px;padding:12px;margin:0 0 20px">Produit star : <strong>${stats.topProduct}</strong></p>` : ''}
          <a href="https://app.shopforge.tech/dashboard" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Voir mes statistiques
          </a>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: email,
        subject: `${storeName} — ${stats.orders} commande(s) / ${stats.revenue.toFixed(0)} TND cette semaine`,
        html,
      });
    } catch (err) {
      this.logger.error(`Echec envoi rapport hebdo: ${err}`);
    }
  }

  /**
   * Notifie le marchand d'une nouvelle commande
   */
  async sendMerchantNotification(order: any, tenantId: string): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, contactEmail: true, users: { select: { email: true }, where: { role: 'OWNER' }, take: 1 } },
    });
    if (!tenant) return;

    const merchantEmail = tenant.contactEmail || tenant.users?.[0]?.email;
    if (!merchantEmail) return;

    const itemsSummary = (order.items || [])
      .map((item: any) => `- ${item.product?.name ?? 'Produit'}${item.variant ? ` (${item.variant.name})` : ''} x${item.quantity}`)
      .join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#111827;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:18px">Nouvelle commande</h1>
        </div>
        <div style="padding:24px;font-size:14px;color:#333">
          <p style="margin:0 0 16px">
            <strong>${order.customerName}</strong> a passe une commande de
            <strong>${Number(order.totalAmount).toFixed(3)} TND</strong>.
          </p>
          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-weight:600">Commande ${order.orderNumber}</p>
            <pre style="margin:0;font-family:inherit;white-space:pre-line;color:#666">${itemsSummary}</pre>
          </div>
          <p style="margin:0;color:#666;font-size:13px">
            Client : ${order.customerName} | ${order.customerPhone || ''}${order.customerEmail ? ` | ${order.customerEmail}` : ''}
          </p>
          <p style="margin:4px 0 0;color:#666;font-size:13px">
            Adresse : ${order.shippingAddress}
          </p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: merchantEmail,
        subject: `Nouvelle commande ${order.orderNumber} — ${Number(order.totalAmount).toFixed(3)} TND`,
        html,
      });
      this.logger.log(`Notification marchand envoyee a ${merchantEmail} pour ${order.orderNumber}`);
    } catch (err) {
      this.logger.error(`Echec envoi notification marchand: ${err}`);
    }
  }

  /**
   * Email de réengagement J+7 : "Voici ce que vous avez manqué"
   */
  async sendReengagementEmail(
    email: string,
    storeName: string,
    stats: { orderCount: number; revenue: number; topProduct: string | null },
  ): Promise<void> {
    const transporter = this.createTransporter();
    if (!transporter) return;

    const revenueStr = stats.revenue.toFixed(2);
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#111827;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">👋 Votre boutique vous attend</h1>
        </div>
        <div style="padding:28px;font-size:14px;color:#333">
          <p style="margin:0 0 20px;font-size:15px">
            Bonjour, voici ce qui s'est passé sur <strong>${storeName}</strong> ces 7 derniers jours pendant votre absence :
          </p>
          <div style="display:grid;gap:12px;margin-bottom:24px">
            <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 18px;border-radius:6px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#15803d">${stats.orderCount}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#166534">Commande(s) reçue(s)</p>
            </div>
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:6px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#1d4ed8">${revenueStr} TND</p>
              <p style="margin:4px 0 0;font-size:13px;color:#1e40af">Chiffre d'affaires généré</p>
            </div>
            ${stats.topProduct ? `
            <div style="background:#fefce8;border-left:4px solid #eab308;padding:14px 18px;border-radius:6px">
              <p style="margin:0;font-size:14px;font-weight:700;color:#854d0e">🏆 Meilleur produit</p>
              <p style="margin:4px 0 0;font-size:13px;color:#713f12">${stats.topProduct}</p>
            </div>` : ''}
          </div>
          <div style="text-align:center;margin-top:24px">
            <a href="https://app.shopforge.tech/dashboard"
               style="background:#111827;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
              Accéder à mon tableau de bord →
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">
            ShopForge • Vous recevez cet email car vous n'avez pas visité votre dashboard depuis 7 jours.
          </p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to: email,
        subject: `👋 ${storeName} : ${stats.orderCount} commande(s) vous attendent`,
        html,
      });
      this.logger.log(`Email réengagement envoyé à ${email}`);
    } catch (err) {
      this.logger.error(`Echec réengagement: ${err}`);
    }
  }
}
