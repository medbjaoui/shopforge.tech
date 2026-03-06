import { PlanType } from '@prisma/client';
import { PlatformConfigService } from '../../modules/platform-config/platform-config.service';

export interface PlanLimits {
  maxProducts: number;       // -1 = illimité
  maxOrdersPerMonth: number; // -1 = illimité
  priceMonthly: number;      // TND
  label: string;
}

export interface CommissionConfig {
  fixedFee: number;    // Montant fixe minimum (TND)
  percentage: number;  // Pourcentage (%)
}

/** Static defaults (used as fallback when config service not available) */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    maxProducts: 5,
    maxOrdersPerMonth: 50,
    priceMonthly: 0,
    label: 'Gratuit',
  },
  STARTER: {
    maxProducts: 100,
    maxOrdersPerMonth: 500,
    priceMonthly: 29,
    label: 'Starter',
  },
  PRO: {
    maxProducts: -1,
    maxOrdersPerMonth: -1,
    priceMonthly: 79,
    label: 'Pro',
  },
};

/** Get plan limits from dynamic config, with static fallback */
export function getDynamicPlanLimits(
  config: PlatformConfigService,
): Record<PlanType, PlanLimits> {
  return {
    FREE: {
      maxProducts: config.getNumber('plan_free_max_products', 5),
      maxOrdersPerMonth: config.getNumber('plan_free_max_orders_month', 50),
      priceMonthly: config.getNumber('plan_free_price', 0),
      label: config.get('plan_free_label') ?? 'Gratuit',
    },
    STARTER: {
      maxProducts: config.getNumber('plan_starter_max_products', 100),
      maxOrdersPerMonth: config.getNumber('plan_starter_max_orders_month', 500),
      priceMonthly: config.getNumber('plan_starter_price', 29),
      label: config.get('plan_starter_label') ?? 'Starter',
    },
    PRO: {
      maxProducts: config.getNumber('plan_pro_max_products', -1),
      maxOrdersPerMonth: config.getNumber('plan_pro_max_orders_month', -1),
      priceMonthly: config.getNumber('plan_pro_price', 79),
      label: config.get('plan_pro_label') ?? 'Pro',
    },
  };
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

/** Get commission rate (as decimal, e.g. 0.03 for 3%) for a plan */
export function getDynamicCommissionRate(plan: PlanType, config: PlatformConfigService): number {
  switch (plan) {
    case PlanType.FREE:    return config.getNumber('commission_free_rate', 3.0) / 100;
    case PlanType.STARTER: return config.getNumber('commission_starter_rate', 1.5) / 100;
    case PlanType.PRO:     return config.getNumber('commission_pro_rate', 0.5) / 100;
    default:               return 0.03;
  }
}

/** Get hybrid commission config (fixed fee + percentage) for a plan */
export function getHybridCommissionConfig(plan: PlanType, config: PlatformConfigService): CommissionConfig {
  const planKey = plan.toLowerCase();
  return {
    fixedFee: config.getNumber(`commission.${planKey}.fixedFee`, getDefaultFixedFee(plan)),
    percentage: config.getNumber(`commission.${planKey}.percentage`, getDefaultPercentage(plan)),
  };
}

/** Static defaults for fixed fees */
function getDefaultFixedFee(plan: PlanType): number {
  switch (plan) {
    case PlanType.FREE:    return 2.0;
    case PlanType.STARTER: return 1.0;
    case PlanType.PRO:     return 0.5;
    default:               return 2.0;
  }
}

/** Static defaults for percentages */
function getDefaultPercentage(plan: PlanType): number {
  switch (plan) {
    case PlanType.FREE:    return 1.2;
    case PlanType.STARTER: return 0.6;
    case PlanType.PRO:     return 0.4;
    default:               return 1.2;
  }
}

/** Calculate hybrid commission: MAX(fixedFee, orderAmount × percentage) */
export function calculateHybridCommission(
  orderAmount: number,
  plan: PlanType,
  config: PlatformConfigService,
): number {
  const commissionConfig = getHybridCommissionConfig(plan, config);

  const fixedFee = commissionConfig.fixedFee;
  const percentageFee = orderAmount * (commissionConfig.percentage / 100);

  // Retourner le maximum entre le fixe et le pourcentage
  const commission = Math.max(fixedFee, percentageFee);

  // Arrondir à 3 décimales
  return Math.round(commission * 1000) / 1000;
}
