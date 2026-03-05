import { PlatformConfigService } from '../../modules/platform-config/platform-config.service';

/** TVA standard Tunisie (défaut statique) */
export const TVA_RATE = 0.19;

/** Timbre fiscal par facture (TND) (défaut statique) */
export const TIMBRE_FISCAL = 0.6;

/** Get TVA rate from dynamic config */
export function getDynamicTvaRate(config?: PlatformConfigService): number {
  return config?.getNumber('tva_rate', TVA_RATE) ?? TVA_RATE;
}

/** Get timbre fiscal from dynamic config */
export function getDynamicTimbreFiscal(config?: PlatformConfigService): number {
  return config?.getNumber('timbre_fiscal', TIMBRE_FISCAL) ?? TIMBRE_FISCAL;
}

/** Get invoice prefix from dynamic config */
export function getDynamicInvoicePrefix(config?: PlatformConfigService): string {
  return config?.get('invoice_prefix') ?? 'SF';
}

/** Calcul montant HT à partir du TTC */
export function computeHT(ttc: number, tvaRate = TVA_RATE): number {
  return roundTo3(ttc / (1 + tvaRate));
}

/** TVA = TTC - HT */
export function computeTVA(ttc: number, ht: number): number {
  return roundTo3(ttc - ht);
}

/** Arrondi à 3 décimales (précision HT/TVA) */
export function roundTo3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Numéro de facture séquentiel : SF-YYYY-000001 */
export function formatInvoiceNumber(year: number, seq: number, prefix = 'SF'): string {
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

/** Validation matricule fiscal tunisien : 1234567/A/B/C/000 */
export function isValidMF(mf: string): boolean {
  return /^\d{7}\/[A-Z]\/[A-Z]\/[A-Z]\/\d{3}$/.test(mf);
}
