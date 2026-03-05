'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ReferralStats {
  total: number;
  activated: number;
  pending: number;
  paid: number;
  totalEarned: number;
}

interface Referral {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  isActivated: boolean;
}

interface ReferralData {
  referralCode: string | null;
  referralLink: string;
  rewardAmount: number;
  referrals: Referral[];
  stats: ReferralStats;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-orange-100 text-orange-700',
};

export default function ParrainagePage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/tenants/me/referral')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">Erreur lors du chargement.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Parrainage</h1>
        <p className="text-sm text-gray-500 mt-1">
          Parrainez des marchands et gagnez <strong>{data.rewardAmount} TND</strong> par filleul activé, directement sur votre wallet.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Filleuls inscrits', value: data.stats.total, color: 'text-gray-900' },
          { label: 'Filleuls activés', value: data.stats.activated, color: 'text-green-600' },
          { label: 'En attente', value: data.stats.pending, color: 'text-orange-500' },
          { label: 'Total gagné', value: `${data.stats.totalEarned.toFixed(2)} TND`, color: 'text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-7 text-white">
        <h2 className="font-bold text-lg mb-1">Votre lien de parrainage</h2>
        <p className="text-orange-100 text-sm mb-5">
          Partagez ce lien. Quand un marchand s'inscrit et passe sa première commande, vous recevez{' '}
          <strong>{data.rewardAmount} TND</strong> automatiquement.
        </p>

        {data.referralCode ? (
          <>
            <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <code className="text-sm font-mono flex-1 break-all">{data.referralLink}</code>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyLink}
                className="bg-white text-orange-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors"
              >
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Rejoins ShopForge et crée ta boutique en ligne gratuitement 🚀 ${data.referralLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#20ba5a] transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Partager sur WhatsApp
              </a>
              <div className="bg-white/10 text-white text-sm font-mono font-bold px-4 py-2.5 rounded-xl">
                Code : {data.referralCode}
              </div>
            </div>
          </>
        ) : (
          <p className="text-orange-200 text-sm">Code de parrainage en cours de génération...</p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Comment ça marche</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { n: '1', title: 'Partagez votre lien', desc: 'Envoyez votre lien à des amis, clients ou partenaires qui veulent vendre en ligne.' },
            { n: '2', title: 'Ils s\'inscrivent', desc: 'Votre filleul crée sa boutique via votre lien. Il est automatiquement rattaché à vous.' },
            { n: '3', title: 'Vous recevez 10 TND', desc: `Dès sa première commande confirmée, ${data.rewardAmount} TND sont crédités sur votre wallet.` },
          ].map((step) => (
            <div key={step.n} className="flex gap-3">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                {step.n}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{step.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Mes filleuls ({data.referrals.length})</h3>
        </div>
        {data.referrals.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-3">🤝</p>
            <p className="text-gray-500 text-sm">Aucun filleul pour l'instant.</p>
            <p className="text-gray-400 text-xs mt-1">Partagez votre lien pour commencer à gagner.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.referrals.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.slug}.shopforge.tech</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PLAN_COLORS[r.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.plan}
                  </span>
                  {r.isActivated ? (
                    <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Activé ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      En attente
                    </span>
                  )}
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(r.createdAt).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
