import Link from 'next/link';
import { SearchIcon } from './AdminIcons';

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  href?: string;
  color?: string;
}

export function KpiCard({ label, value, sub, icon, highlight, href, color }: KpiCardProps) {
  const card = (
    <div className={`rounded-xl p-4 border transition-colors shadow-sm ${
      highlight
        ? 'bg-indigo-50 border-indigo-200'
        : 'bg-white border-gray-200'
    } ${href ? 'hover:border-indigo-400 cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold font-mono ${color || (highlight ? 'text-indigo-600' : 'text-gray-900')}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color: string;
  dot?: boolean;
}

export function Badge({ label, color, dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color.includes('emerald') ? 'bg-emerald-400' : color.includes('red') ? 'bg-red-400' : 'bg-current'}`} />}
      {label}
    </span>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Spinner({ size = 'md', color = 'border-indigo-500' }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex items-center justify-center h-64">
      <div className={`${sizes[size]} border-2 ${color} border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

// ── Skeleton Grid ────────────────────────────────────────────────────────────

interface SkeletonGridProps {
  cols?: number;
  rows?: number;
  cardHeight?: string;
}

export function SkeletonGrid({ cols = 4, rows = 1, cardHeight = 'h-24' }: SkeletonGridProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className={`grid grid-cols-2 lg:grid-cols-${cols} gap-4`}>
          {[...Array(cols)].map((_, c) => (
            <div key={c} className={`${cardHeight} bg-gray-200 rounded-xl`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-gray-400 mb-3 flex justify-center">{icon}</div>}
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {action && onAction && (
        <button onClick={onAction} className="mt-4 text-indigo-600 hover:text-indigo-500 text-sm transition-colors">
          {action} &rarr;
        </button>
      )}
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm mb-2">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.href ? (
                <Link href={item.href} className="text-gray-500 hover:text-gray-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-400">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, action, children, className = '', noPadding }: SectionCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

// ── Search Input ─────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-sm bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
      />
    </div>
  );
}
