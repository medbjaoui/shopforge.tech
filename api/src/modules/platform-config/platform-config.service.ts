import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ConfigEntry {
  key: string;
  value: string;
  group: string;
  label: string;
  type: string;
}

/** Default platform configuration */
const DEFAULTS: ConfigEntry[] = [
  // ─── Plans : FREE ─────────────────────────────
  { key: 'plan_free_max_products', value: '10', group: 'plans', label: 'FREE — Max produits', type: 'number' },
  { key: 'plan_free_max_orders_month', value: '50', group: 'plans', label: 'FREE — Max commandes / mois', type: 'number' },
  { key: 'plan_free_price', value: '0', group: 'plans', label: 'FREE — Prix mensuel (TND)', type: 'number' },
  { key: 'plan_free_label', value: 'Gratuit', group: 'plans', label: 'FREE — Libellé', type: 'string' },
  // ─── Plans : STARTER ──────────────────────────
  { key: 'plan_starter_max_products', value: '100', group: 'plans', label: 'STARTER — Max produits', type: 'number' },
  { key: 'plan_starter_max_orders_month', value: '500', group: 'plans', label: 'STARTER — Max commandes / mois', type: 'number' },
  { key: 'plan_starter_price', value: '29', group: 'plans', label: 'STARTER — Prix mensuel (TND)', type: 'number' },
  { key: 'plan_starter_label', value: 'Starter', group: 'plans', label: 'STARTER — Libellé', type: 'string' },
  // ─── Plans : PRO ──────────────────────────────
  { key: 'plan_pro_max_products', value: '-1', group: 'plans', label: 'PRO — Max produits (-1 = illimité)', type: 'number' },
  { key: 'plan_pro_max_orders_month', value: '-1', group: 'plans', label: 'PRO — Max commandes / mois (-1 = illimité)', type: 'number' },
  { key: 'plan_pro_price', value: '79', group: 'plans', label: 'PRO — Prix mensuel (TND)', type: 'number' },
  { key: 'plan_pro_label', value: 'Pro', group: 'plans', label: 'PRO — Libellé', type: 'string' },
  // ─── Fiscal ───────────────────────────────────
  { key: 'tva_rate', value: '0.19', group: 'fiscal', label: 'Taux TVA', type: 'number' },
  { key: 'timbre_fiscal', value: '0.600', group: 'fiscal', label: 'Timbre fiscal (TND)', type: 'number' },
  { key: 'invoice_prefix', value: 'SF', group: 'fiscal', label: 'Préfixe numéro facture', type: 'string' },
  // ─── Plateforme ───────────────────────────────
  { key: 'platform_name', value: 'ShopForge', group: 'platform', label: 'Nom de la plateforme', type: 'string' },
  { key: 'platform_contact_email', value: 'contact@shopforge.tech', group: 'platform', label: 'Email de contact', type: 'string' },
  { key: 'default_plan', value: 'FREE', group: 'platform', label: 'Plan par défaut nouveaux tenants', type: 'string' },
  { key: 'cod_enabled_default', value: 'true', group: 'platform', label: 'COD activé par défaut', type: 'boolean' },
  { key: 'max_upload_size_mb', value: '5', group: 'platform', label: 'Taille max upload (MB)', type: 'number' },
  // ─── Maintenance ──────────────────────────────
  { key: 'maintenance_mode', value: 'false', group: 'maintenance', label: 'Mode maintenance', type: 'boolean' },
  { key: 'maintenance_message', value: 'La plateforme est en maintenance. Veuillez réessayer plus tard.', group: 'maintenance', label: 'Message de maintenance', type: 'string' },
  // ─── Intelligence Artificielle ───────────────
  { key: 'ai_enabled', value: 'false', group: 'ai', label: 'IA activée', type: 'boolean' },
  { key: 'ai_provider', value: 'anthropic', group: 'ai', label: 'Fournisseur IA (anthropic / gemini)', type: 'string' },
  { key: 'ai_api_key', value: '', group: 'ai', label: 'Clé API IA', type: 'string' },
  { key: 'ai_model', value: 'claude-haiku-4-5', group: 'ai', label: 'Modèle IA (auto-détecté si incompatible)', type: 'string' },
  { key: 'ai_max_tokens_response', value: '1024', group: 'ai', label: 'Max tokens par réponse', type: 'number' },
  { key: 'ai_free_monthly_limit', value: '0', group: 'ai', label: 'FREE — Requêtes IA / mois', type: 'number' },
  { key: 'ai_starter_monthly_limit', value: '50', group: 'ai', label: 'STARTER — Requêtes IA / mois', type: 'number' },
  { key: 'ai_pro_monthly_limit', value: '500', group: 'ai', label: 'PRO — Requêtes IA / mois', type: 'number' },
  { key: 'ai_feature_product_desc', value: 'true', group: 'ai', label: 'Générateur description produit', type: 'boolean' },
  { key: 'ai_feature_chatbot', value: 'true', group: 'ai', label: 'Chatbot assistant boutique', type: 'boolean' },
  { key: 'ai_feature_review_sentiment', value: 'true', group: 'ai', label: 'Analyse sentiments avis', type: 'boolean' },
  { key: 'ai_feature_dashboard_insights', value: 'true', group: 'ai', label: 'Insights dashboard', type: 'boolean' },
  { key: 'ai_feature_order_response', value: 'true', group: 'ai', label: 'Réponse commande IA', type: 'boolean' },
  // ─── Wallet & Commissions ──────────────────────────
  { key: 'commission_free_rate', value: '3.0', group: 'wallet', label: 'FREE — Commission COD (%)', type: 'number' },
  { key: 'commission_starter_rate', value: '1.5', group: 'wallet', label: 'STARTER — Commission COD (%)', type: 'number' },
  { key: 'commission_pro_rate', value: '0.5', group: 'wallet', label: 'PRO — Commission COD (%)', type: 'number' },
  { key: 'wallet_minimum_balance', value: '10', group: 'wallet', label: 'Solde minimum avant blocage (TND)', type: 'number' },
  { key: 'wallet_block_on_low_balance', value: 'true', group: 'wallet', label: 'Bloquer nouvelles commandes si solde insuffisant', type: 'boolean' },
  { key: 'wallet_welcome_balance', value: '15', group: 'wallet', label: "Solde de bienvenu offert à l'inscription (TND, 0 = désactivé)", type: 'number' },
  // ─── Telegram ───────────────────────────────────────
  { key: 'telegram_bot_token', value: '', group: 'platform', label: 'Token Bot Telegram (@BotFather)', type: 'string' },
  // ─── Parrainage ─────────────────────────────────────
  { key: 'referral_enabled', value: 'true', group: 'platform', label: 'Système de parrainage activé', type: 'boolean' },
  { key: 'referral_reward_amount', value: '10', group: 'platform', label: 'Récompense parrainage (TND)', type: 'number' },
  // ─── ClicToPay (UIB) ────────────────────────────────
  { key: 'clictopay_merchant_id', value: '', group: 'payments', label: 'ClicToPay — Identifiant marchand', type: 'string' },
  { key: 'clictopay_password', value: '', group: 'payments', label: 'ClicToPay — Mot de passe API', type: 'string' },
  { key: 'clictopay_api_url', value: 'https://test.clictopay.com/payment/rest', group: 'payments', label: 'ClicToPay — URL API (test/prod)', type: 'string' },
  { key: 'clictopay_enabled', value: 'false', group: 'payments', label: 'ClicToPay — Activé globalement', type: 'boolean' },
  // ─── Floussi ─────────────────────────────────────────
  { key: 'floussi_merchant_id', value: '', group: 'payments', label: 'Floussi — Identifiant marchand', type: 'string' },
  { key: 'floussi_api_key', value: '', group: 'payments', label: 'Floussi — Clé API', type: 'string' },
  { key: 'floussi_api_url', value: 'https://api.floussi.tn/v1', group: 'payments', label: 'Floussi — URL API', type: 'string' },
  { key: 'floussi_webhook_secret', value: '', group: 'payments', label: 'Floussi — Secret webhook HMAC', type: 'string' },
  { key: 'floussi_enabled', value: 'false', group: 'payments', label: 'Floussi — Activé globalement', type: 'boolean' },
];

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  /** In-memory cache keyed by config key */
  private cache = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
    await this.loadCache();
  }

  /** Seed missing config entries (does not overwrite existing) */
  private async seed() {
    for (const entry of DEFAULTS) {
      await this.prisma.platformConfig.upsert({
        where: { key: entry.key },
        create: entry,
        update: {}, // ne pas écraser les valeurs existantes
      });
    }
  }

  /** Load all config values into memory */
  private async loadCache() {
    const rows = await this.prisma.platformConfig.findMany();
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(row.key, row.value);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Get single config value (from cache) */
  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  /** Get single config value as number */
  getNumber(key: string, fallback = 0): number {
    const v = this.cache.get(key);
    return v !== undefined ? Number(v) : fallback;
  }

  /** Get single config value as boolean */
  getBool(key: string, fallback = false): boolean {
    const v = this.cache.get(key);
    return v !== undefined ? v === 'true' : fallback;
  }

  /** Get all configs grouped */
  async getAll() {
    const rows = await this.prisma.platformConfig.findMany({
      orderBy: { key: 'asc' },
    });

    const groups: Record<string, Array<{ key: string; value: string; label: string; type: string }>> = {};
    for (const row of rows) {
      if (!groups[row.group]) groups[row.group] = [];
      groups[row.group].push({
        key: row.key,
        value: row.value,
        label: row.label,
        type: row.type,
      });
    }
    return groups;
  }

  /** Get flat list of all configs */
  async getAllFlat() {
    return this.prisma.platformConfig.findMany({ orderBy: { key: 'asc' } });
  }

  /** Bulk update configs */
  async updateMany(updates: Array<{ key: string; value: string }>) {
    const ops = updates.map(({ key, value }) =>
      this.prisma.platformConfig.update({
        where: { key },
        data: { value },
      }),
    );
    await this.prisma.$transaction(ops);
    // Refresh cache
    await this.loadCache();
    return this.getAll();
  }
}
