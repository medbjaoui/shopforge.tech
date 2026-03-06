'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CommissionData {
  plan: string;
  fixedFee: number;
  percentage: number;
  formula: string;
  breakEvenPoint: number;
  examples: Array<{
    orderAmount: number;
    commission: number;
    isFixedUsed: boolean;
  }>;
  explanation: {
    fr: string;
  };
}

export default function CommissionInfo() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics/commission-info')
      .then((res) => setData(res.data))
      .catch((err) => console.error('Error fetching commission info:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const planColors: Record<string, string> = {
    FREE: 'emerald',
    STARTER: 'blue',
    PRO: 'purple',
  };

  const color = planColors[data.plan] || 'gray';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r from-${color}-500 to-${color}-600 p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">💰 Vos Commissions</h3>
            <p className="text-sm opacity-90">Plan {data.plan}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.fixedFee} TND</div>
            <div className="text-xs opacity-90">minimum fixe</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Formula */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Formule de Calcul
          </div>
          <code className="text-sm font-mono text-gray-900">{data.formula}</code>
          <p className="text-xs text-gray-600 mt-2">
            Vous payez le <strong>maximum</strong> entre le montant fixe et le pourcentage
          </p>
        </div>

        {/* Break-even Point */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium mb-1">Point de Basculement</p>
              <p className="text-xs text-blue-700">
                À partir de <strong>{data.breakEvenPoint} TND</strong>, le pourcentage ({data.percentage}%)
                devient plus avantageux que le montant fixe ({data.fixedFee} TND).
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Exemples de Commissions</h4>
          <div className="space-y-2">
            {data.examples.map((example) => (
              <div
                key={example.orderAmount}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {example.isFixedUsed ? '🔒' : '📊'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Commande {example.orderAmount} TND
                    </div>
                    <div className="text-xs text-gray-500">
                      {example.isFixedUsed ? 'Montant fixe' : `Pourcentage (${data.percentage}%)`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {example.commission.toFixed(3)} TND
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            {data.explanation.fr}
          </p>
        </div>

        {/* Upgrade CTA (if FREE or STARTER) */}
        {data.plan !== 'PRO' && (
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-purple-600 text-lg">⭐</span>
              <div className="flex-1">
                <p className="text-sm text-purple-900 font-medium mb-1">
                  Passez au plan supérieur
                </p>
                <p className="text-xs text-purple-700 mb-2">
                  {data.plan === 'FREE'
                    ? 'STARTER: seulement 0.6% de commission (vs 1.2% actuel)'
                    : 'PRO: seulement 0.4% de commission (vs 0.6% actuel)'}
                </p>
                <a
                  href="/dashboard/billing"
                  className="inline-block text-xs font-semibold text-purple-600 hover:text-purple-700 underline"
                >
                  Voir les plans →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
