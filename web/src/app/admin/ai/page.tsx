'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import Link from 'next/link';
import { PageHeader, KpiCard, SectionCard, SkeletonGrid } from '@/components/admin/AdminUI';
import { BrainIcon, ChartIcon, WalletIcon, StoreIcon } from '@/components/admin/AdminIcons';

interface FeatureStat {
  feature: string;
  count: number;
  tokens: number;
}

interface TenantStat {
  tenantId: string;
  count: number;
}

interface AiStats {
  totalRequests: number;
  monthRequests: number;
  activeTenants: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  provider?: string;
  byFeature: FeatureStat[];
  topTenants: TenantStat[];
}

const FEATURE_LABELS: Record<string, string> = {
  PRODUCT_DESCRIPTION: 'Description produit',
  STORE_CHATBOT: 'Chatbot vitrine',
  REVIEW_SENTIMENT: 'Analyse avis',
  DASHBOARD_INSIGHTS: 'Insights dashboard',
  ORDER_RESPONSE: 'Reponse commande',
};

const FEATURE_COLORS: Record<string, string> = {
  PRODUCT_DESCRIPTION: 'bg-blue-500',
  STORE_CHATBOT: 'bg-purple-500',
  REVIEW_SENTIMENT: 'bg-green-500',
  DASHBOARD_INSIGHTS: 'bg-orange-500',
  ORDER_RESPONSE: 'bg-pink-500',
};

const PRICING: Record<string, { input: number; output: number; label: string }> = {
  anthropic: { input: 0.25, output: 1.25, label: 'Haiku' },
  gemini: { input: 0.10, output: 0.40, label: 'Flash' },
};

function estimateCost(inputTokens: number, outputTokens: number, provider = 'anthropic'): string {
  const pricing = PRICING[provider] || PRICING.anthropic;
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return cost < 0.01 ? '< $0.01' : `~$${cost.toFixed(2)}`;
}

export default function AdminAiPage() {
  const [stats, setStats] = useState<AiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get('/ai/stats')
      .then(({ data }) => setStats(data))
      .catch((e) => setError(e.response?.data?.message || 'Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Intelligence Artificielle" subtitle="Usage et statistiques IA de la plateforme" />
        <SkeletonGrid cols={4} rows={1} />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  if (!stats) return null;

  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  const maxFeatureCount = Math.max(...stats.byFeature.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Intelligence Artificielle" subtitle="Usage et statistiques IA de la plateforme">
        <Link
          href="/admin/settings"
          className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
        >
          Configurer l&apos;IA &rarr;
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Requetes ce mois" value={String(stats.monthRequests)} icon={<ChartIcon size={18} />} />
        <KpiCard label="Tenants actifs" value={String(stats.activeTenants)} icon={<StoreIcon size={18} />} />
        <KpiCard
          label="Tokens utilises"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens)}
          icon={<BrainIcon size={18} />}
        />
        <KpiCard
          label="Cout estime"
          value={estimateCost(stats.totalInputTokens, stats.totalOutputTokens, stats.provider)}
          sub={`Ce mois (${PRICING[stats.provider || 'anthropic']?.label || 'IA'})`}
          icon={<WalletIcon size={18} />}
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Feature */}
        <SectionCard title="Repartition par feature">
          {stats.byFeature.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aucune requete IA ce mois.</p>
          ) : (
            <div className="space-y-3">
              {stats.byFeature.map((f) => {
                const pct = (f.count / maxFeatureCount) * 100;
                return (
                  <div key={f.feature}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{f.count}</span>
                        <span className="text-xs text-gray-500 ml-1.5">{f.tokens.toLocaleString()} tok</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${FEATURE_COLORS[f.feature] ?? 'bg-gray-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Top Tenants */}
        <SectionCard title="Top tenants par usage">
          {stats.topTenants.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aucune donnee.</p>
          ) : (
            <div className="space-y-2">
              {stats.topTenants.map((t, i) => (
                <div key={t.tenantId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                      i === 0 ? 'bg-yellow-100 text-yellow-600'
                      : i === 1 ? 'bg-gray-200 text-gray-600'
                      : i === 2 ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="text-sm text-gray-700 font-mono truncate max-w-[200px]">{t.tenantId.slice(0, 12)}...</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{t.count} req.</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Global stats */}
      <SectionCard title="Statistiques globales">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total requetes (all time)</p>
            <p className="text-gray-900 font-bold text-lg">{stats.totalRequests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Input tokens (mois)</p>
            <p className="text-gray-900 font-bold text-lg">{stats.totalInputTokens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Output tokens (mois)</p>
            <p className="text-gray-900 font-bold text-lg">{stats.totalOutputTokens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Ratio output/input</p>
            <p className="text-gray-900 font-bold text-lg">
              {stats.totalInputTokens > 0
                ? (stats.totalOutputTokens / stats.totalInputTokens).toFixed(2)
                : '\u2014'}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
