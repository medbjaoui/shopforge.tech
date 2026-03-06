'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function LoyaltyProgramPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [program, setProgram] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState({
    isEnabled: false,
    pointsPerDinar: 1,
    rewardThreshold: 100,
    rewardValue: 10,
    welcomePoints: 0,
    reviewPoints: 10,
    silverThreshold: 200,
    goldThreshold: 500,
    platinumThreshold: 1000,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [programRes, statsRes] = await Promise.all([
        api.get('/loyalty/program'),
        api.get('/loyalty/stats'),
      ]);

      if (programRes.data && statsRes.data) {
        setProgram(programRes.data);
        setStats(statsRes.data.program ? statsRes.data : { ...statsRes.data, program: programRes.data });
        setConfig({
          isEnabled: programRes.data.isEnabled,
          pointsPerDinar: Number(programRes.data.pointsPerDinar),
          rewardThreshold: programRes.data.rewardThreshold,
          rewardValue: Number(programRes.data.rewardValue),
          welcomePoints: programRes.data.welcomePoints,
          reviewPoints: programRes.data.reviewPoints,
          silverThreshold: Number(programRes.data.silverThreshold),
          goldThreshold: Number(programRes.data.goldThreshold),
          platinumThreshold: Number(programRes.data.platinumThreshold),
        });
      }
    } catch (error) {
      console.error('Erreur chargement fidélité:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.patch('/loyalty/program', config);
      alert('Configuration enregistrée !');
      loadData();
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-purple-500 text-white';
      case 'GOLD': return 'bg-yellow-500 text-white';
      case 'SILVER': return 'bg-gray-400 text-white';
      default: return 'bg-orange-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Programme de Fidélité</h1>
        <p className="text-gray-600 mt-1">Récompensez vos clients fidèles et augmentez vos ventes</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['stats', 'config', 'customers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab === 'stats' && '📊 Statistiques'}
              {tab === 'config' && '⚙️ Configuration'}
              {tab === 'customers' && '👥 Top Clients'}
            </button>
          ))}
        </nav>
      </div>

      {/* STATISTIQUES */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Clients inscrits</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalCustomers || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Clients actifs</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats?.activeCustomers || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Points en circulation</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.totalPointsInCirculation || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Points utilisés</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.totalPointsRedeemed || 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-4">Répartition par niveau</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats?.tierBreakdown?.map((tier: any) => (
                <div key={tier.tier} className="text-center p-4 border rounded-lg">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(tier.tier)}`}>
                    {tier.tier}
                  </span>
                  <p className="text-2xl font-bold mt-2">{tier._count}</p>
                  <p className="text-xs text-gray-500">clients</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-4">Configuration du programme</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Activer le programme de fidélité</p>
                  <p className="text-sm text-gray-500">Permettre aux clients de cumuler des points</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points par 1 TND dépensé</label>
                  <input
                    type="number"
                    value={config.pointsPerDinar}
                    onChange={(e) => setConfig({ ...config, pointsPerDinar: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil de récompense (points)</label>
                  <input
                    type="number"
                    value={config.rewardThreshold}
                    onChange={(e) => setConfig({ ...config, rewardThreshold: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valeur récompense (TND)</label>
                  <input
                    type="number"
                    value={config.rewardValue}
                    onChange={(e) => setConfig({ ...config, rewardValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points de bienvenue</label>
                  <input
                    type="number"
                    value={config.welcomePoints}
                    onChange={(e) => setConfig({ ...config, welcomePoints: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>
              </div>

              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : 'Enregistrer la configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP CLIENTS */}
      {activeTab === 'customers' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">⭐ Top 10 clients les plus fidèles</h3>
          <div className="space-y-3">
            {stats?.topCustomers?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun client inscrit au programme</p>
            ) : (
              stats?.topCustomers?.map((loyalty: any, index: number) => (
                <div key={loyalty.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{loyalty.customer.firstName} {loyalty.customer.lastName}</p>
                      <p className="text-sm text-gray-500">{loyalty.customer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(loyalty.tier)}`}>
                      {loyalty.tier}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">🪙 {loyalty.points} pts</p>
                      <p className="text-xs text-gray-500">{Number(loyalty.customer.totalSpent).toFixed(2)} TND</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
