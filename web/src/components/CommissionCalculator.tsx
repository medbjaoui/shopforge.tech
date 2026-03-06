'use client';
import { useState } from 'react';

interface CommissionConfig {
  plan: string;
  fixedFee: number;
  percentage: number;
  monthlyFee: number;
  label: string;
  color: string;
}

const PLANS: CommissionConfig[] = [
  {
    plan: 'FREE',
    fixedFee: 2.0,
    percentage: 1.2,
    monthlyFee: 0,
    label: 'Gratuit',
    color: 'emerald',
  },
  {
    plan: 'STARTER',
    fixedFee: 1.0,
    percentage: 0.6,
    monthlyFee: 29,
    label: 'Starter',
    color: 'blue',
  },
  {
    plan: 'PRO',
    fixedFee: 0.5,
    percentage: 0.4,
    monthlyFee: 79,
    label: 'Pro',
    color: 'purple',
  },
];

function calculateCommission(orderAmount: number, config: CommissionConfig) {
  const fixedFee = config.fixedFee;
  const percentageFee = (orderAmount * config.percentage) / 100;
  const commission = Math.max(fixedFee, percentageFee);
  const isFixedUsed = commission === fixedFee;

  return {
    commission: Math.round(commission * 1000) / 1000,
    isFixedUsed,
    percentageFee: Math.round(percentageFee * 1000) / 1000,
    fixedFee,
  };
}

export default function CommissionCalculator() {
  const [orderAmount, setOrderAmount] = useState(150);
  const [selectedPlan, setSelectedPlan] = useState('FREE');

  const selectedConfig = PLANS.find(p => p.plan === selectedPlan) || PLANS[0];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          💰 Calculateur de Commission
        </h3>
        <p className="text-gray-600">
          Formule: <code className="bg-gray-100 px-2 py-1 rounded text-sm">MAX(Montant Fixe, Commande × Pourcentage)</code>
        </p>
      </div>

      {/* Plan Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Choisissez votre plan
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <button
              key={plan.plan}
              onClick={() => setSelectedPlan(plan.plan)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPlan === plan.plan
                  ? `border-${plan.color}-500 bg-${plan.color}-50 shadow-md`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{plan.label}</div>
              <div className="text-xs text-gray-500 mt-1">
                {plan.monthlyFee > 0 ? `${plan.monthlyFee} TND/mois` : 'Gratuit'}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {plan.fixedFee} TND fixe • {plan.percentage}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Order Amount Slider */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Montant de la commande: <span className="text-indigo-600 font-bold">{orderAmount} TND</span>
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={orderAmount}
          onChange={(e) => setOrderAmount(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10 TND</span>
          <span>500 TND</span>
          <span>1000 TND</span>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[50, 100, 150, 200, 500, 1000].map((amount) => (
          <button
            key={amount}
            onClick={() => setOrderAmount(amount)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              orderAmount === amount
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {amount} TND
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Fixed Fee */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Montant Fixe
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {selectedConfig.fixedFee.toFixed(3)} TND
            </div>
          </div>

          {/* Percentage Fee */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Pourcentage ({selectedConfig.percentage}%)
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {calculateCommission(orderAmount, selectedConfig).percentageFee.toFixed(3)} TND
            </div>
          </div>
        </div>

        {/* Final Commission */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium opacity-90 mb-1">
                Commission Finale (Maximum)
              </div>
              <div className="text-4xl font-bold">
                {calculateCommission(orderAmount, selectedConfig).commission.toFixed(3)} TND
              </div>
              <div className="text-sm opacity-90 mt-2">
                {calculateCommission(orderAmount, selectedConfig).isFixedUsed ? (
                  <span className="inline-flex items-center gap-1">
                    🔒 Montant fixe appliqué
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    📊 Pourcentage appliqué ({selectedConfig.percentage}%)
                  </span>
                )}
              </div>
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4 bg-white/50 rounded-lg p-4 text-sm text-gray-700">
          <strong>Comment ça marche?</strong>
          <p className="mt-2">
            Pour une commande de <strong>{orderAmount} TND</strong> avec le plan <strong>{selectedConfig.label}</strong>:
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Fixe: {selectedConfig.fixedFee} TND</li>
            <li>• Pourcentage: {orderAmount} × {selectedConfig.percentage}% = {calculateCommission(orderAmount, selectedConfig).percentageFee.toFixed(3)} TND</li>
            <li>• <strong>Maximum</strong>: {calculateCommission(orderAmount, selectedConfig).commission.toFixed(3)} TND</li>
          </ul>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Comparaison pour {orderAmount} TND
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Plan</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Abonnement</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Commission</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Total/mois*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {PLANS.map((plan) => {
                const result = calculateCommission(orderAmount, plan);
                const assumedOrders = 100; // Assume 100 orders/month for comparison
                const monthlyCommission = result.commission * assumedOrders;
                const monthlyTotal = monthlyCommission + plan.monthlyFee;

                return (
                  <tr
                    key={plan.plan}
                    className={selectedPlan === plan.plan ? 'bg-indigo-50' : ''}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{plan.label}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {plan.monthlyFee > 0 ? `${plan.monthlyFee} TND` : 'Gratuit'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {result.commission.toFixed(3)} TND
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {monthlyTotal.toFixed(0)} TND
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            * Estimation basée sur 100 commandes/mois à {orderAmount} TND chacune
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong className="flex items-center gap-2 mb-2">
          💡 Bon à savoir
        </strong>
        <ul className="space-y-1 text-xs">
          <li>• Vous payez <strong>toujours le maximum</strong> entre le montant fixe et le pourcentage</li>
          <li>• Premier mois: <strong>50 commandes gratuites</strong> (aucune commission)</li>
          <li>• Passez à STARTER ou PRO pour économiser sur les gros volumes</li>
          <li>• Les abonnements STARTER et PRO donnent accès à plus de produits et commandes</li>
        </ul>
      </div>
    </div>
  );
}
