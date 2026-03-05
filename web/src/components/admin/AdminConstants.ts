// ── Plan ──────────────────────────────────────────────────────────────────────

export type Plan = 'FREE' | 'STARTER' | 'PRO';

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Gratuit',
  STARTER: 'Starter',
  PRO: 'Pro',
};

export const PLAN_BADGE_COLORS: Record<Plan, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-50 text-blue-600',
  PRO: 'bg-indigo-50 text-indigo-600',
};

export const PLAN_BAR_COLORS: Record<Plan, string> = {
  FREE: 'bg-gray-500',
  STARTER: 'bg-blue-500',
  PRO: 'bg-indigo-500',
};

// ── Order status ─────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PROCESSING: 'bg-purple-50 text-purple-600',
  SHIPPED: 'bg-indigo-50 text-indigo-600',
  DELIVERED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmee',
  PROCESSING: 'En cours',
  SHIPPED: 'Expediee',
  DELIVERED: 'Livree',
  CANCELLED: 'Annulee',
};

// ── Invoice status ───────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-600',
  ISSUED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Emise',
  CANCELLED: 'Annulee',
};

// ── User roles ───────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF';

export const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: 'bg-indigo-50 text-indigo-600',
  ADMIN: 'bg-blue-50 text-blue-600',
  STAFF: 'bg-gray-100 text-gray-600',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatTnd(v: number) {
  return v.toFixed(2) + ' TND';
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatGrowth(v: number) {
  if (v === 0) return '\u2014';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

export function growthColor(v: number) {
  if (v > 0) return 'text-green-600';
  if (v < 0) return 'text-red-600';
  return 'text-gray-500';
}
