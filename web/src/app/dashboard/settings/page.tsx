'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { THEMES, getFreeThemes, getPremiumThemes, isThemeAccessible } from '@/lib/themes';
import { STORE_FONTS } from '@/lib/fonts';
import PageHeader from '@/components/dashboard/PageHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StoreSettings {
  name: string; description: string; logo: string;
  phone: string; whatsapp: string; address: string; contactEmail: string;
  shippingFee: string; freeShippingThreshold: string; returnPolicy: string;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankTransferDetails: string;
  clickToPayEnabled: boolean;
  floussiEnabled: boolean;
  theme: string;
  matriculeFiscal: string;
  rne: string;
  legalName: string;
  legalAddress: string;
  bannerImage: string;
  instagram: string; facebook: string; tiktok: string;
  announcementText: string; announcementEnabled: boolean;
  announcementBgColor: string; announcementTextColor: string;
  heroTitle: string; heroSubtitle: string; heroCta: string;
  favicon: string; font: string;
  notificationChannel: string;
  telegramChatId: string | null;
  // Meta integration
  metaPixelId: string;
  metaAccessToken: string;
  metaIntegrationEnabled: boolean;
  whatsappWidgetEnabled: boolean;
  // Langue boutique
  storeLanguage: string;
}

interface Usage {
  plan: string; planLabel: string; priceMonthly: number;
  usage: {
    products: { used: number; limit: number; unlimited: boolean };
    ordersThisMonth: { used: number; limit: number; unlimited: boolean };
  };
}

type Tab = 'store' | 'appearance' | 'shipping' | 'account' | 'integrations';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'store', label: 'Boutique', icon: '◈' },
  { id: 'appearance', label: 'Apparence', icon: '◎' },
  { id: 'shipping', label: 'Paiement & Livraison', icon: '⊞' },
  { id: 'integrations', label: 'Intégrations', icon: '⬡' },
  { id: 'account', label: 'Compte', icon: '▲' },
];

export default function SettingsPage() {
  const { store, user, updateStore } = useAuth();
  const [tab, setTab] = useState<Tab>('store');

  const [settings, setSettings] = useState<StoreSettings>({
    name: '', description: '', logo: '', phone: '', whatsapp: '', address: '',
    contactEmail: '', shippingFee: '', freeShippingThreshold: '', returnPolicy: '',
    codEnabled: true, bankTransferEnabled: false, bankTransferDetails: '',
    clickToPayEnabled: false, floussiEnabled: false,
    theme: 'default',
    matriculeFiscal: '', rne: '', legalName: '', legalAddress: '',
    bannerImage: '', instagram: '', facebook: '', tiktok: '',
    announcementText: '', announcementEnabled: false,
    announcementBgColor: '#111827', announcementTextColor: '#ffffff',
    heroTitle: '', heroSubtitle: '', heroCta: '',
    favicon: '', font: 'system',
    notificationChannel: 'EMAIL', telegramChatId: null,
    metaPixelId: '', metaAccessToken: '', metaIntegrationEnabled: false, whatsappWidgetEnabled: false,
    storeLanguage: 'fr',
  });
  const [telegramCode, setTelegramCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  useEffect(() => {
    api.get('/tenants/me/usage').then(({ data }) => setUsage(data)).catch(console.error);
    api.get('/tenants/me').then(({ data }) => {
      setSettings({
        name: data.name ?? '',
        description: data.description ?? '',
        logo: data.logo ?? '',
        phone: data.phone ?? '',
        whatsapp: data.whatsapp ?? '',
        address: data.address ?? '',
        contactEmail: data.contactEmail ?? '',
        shippingFee: data.shippingFee != null ? String(data.shippingFee) : '',
        freeShippingThreshold: data.freeShippingThreshold != null ? String(data.freeShippingThreshold) : '',
        returnPolicy: data.returnPolicy ?? '',
        codEnabled: data.codEnabled ?? true,
        bankTransferEnabled: data.bankTransferEnabled ?? false,
        bankTransferDetails: data.bankTransferDetails ?? '',
        clickToPayEnabled: data.clickToPayEnabled ?? false,
        floussiEnabled: data.floussiEnabled ?? false,
        theme: data.theme ?? 'default',
        matriculeFiscal: data.matriculeFiscal ?? '',
        rne: data.rne ?? '',
        legalName: data.legalName ?? '',
        legalAddress: data.legalAddress ?? '',
        bannerImage: data.bannerImage ?? '',
        instagram: data.instagram ?? '',
        facebook: data.facebook ?? '',
        tiktok: data.tiktok ?? '',
        announcementText: data.announcementText ?? '',
        announcementEnabled: data.announcementEnabled ?? false,
        announcementBgColor: data.announcementBgColor || '#111827',
        announcementTextColor: data.announcementTextColor || '#ffffff',
        heroTitle: data.heroTitle ?? '',
        heroSubtitle: data.heroSubtitle ?? '',
        heroCta: data.heroCta ?? '',
        favicon: data.favicon ?? '',
        font: data.font ?? 'system',
        notificationChannel: data.notificationChannel ?? 'EMAIL',
        telegramChatId: data.telegramChatId ?? null,
        metaPixelId: data.metaPixelId ?? '',
        metaAccessToken: data.metaAccessToken ?? '',
        metaIntegrationEnabled: data.metaIntegrationEnabled ?? false,
        whatsappWidgetEnabled: data.whatsappWidgetEnabled ?? false,
        storeLanguage: data.storeLanguage ?? 'fr',
      });
    }).catch(console.error);
  }, []);

  // Track unsaved changes
  const updateSettings = (patch: Partial<typeof settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateSettings({ logo: data.url });
    } catch {
      setError('Erreur lors du téléchargement du logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'bannerImage' | 'favicon',
    setUploading: (v: boolean) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateSettings({ [field]: data.url });
    } catch {
      setError(`Erreur lors du téléchargement`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.name.trim()) return;
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: settings.name.trim(),
        description: settings.description.trim() || null,
        logo: settings.logo || null,
        phone: settings.phone.trim() || null,
        whatsapp: settings.whatsapp.trim() || null,
        address: settings.address.trim() || null,
        contactEmail: settings.contactEmail.trim() || null,
        returnPolicy: settings.returnPolicy.trim() || null,
      };
      if (settings.shippingFee !== '') payload.shippingFee = parseFloat(settings.shippingFee);
      if (settings.freeShippingThreshold !== '') payload.freeShippingThreshold = parseFloat(settings.freeShippingThreshold);
      payload.codEnabled = settings.codEnabled;
      payload.bankTransferEnabled = settings.bankTransferEnabled;
      payload.bankTransferDetails = settings.bankTransferDetails.trim() || null;
      payload.clickToPayEnabled = settings.clickToPayEnabled;
      payload.floussiEnabled = settings.floussiEnabled;
      payload.theme = settings.theme;
      payload.matriculeFiscal = settings.matriculeFiscal.trim() || null;
      payload.rne = settings.rne.trim() || null;
      payload.legalName = settings.legalName.trim() || null;
      payload.legalAddress = settings.legalAddress.trim() || null;
      payload.bannerImage = settings.bannerImage || null;
      payload.instagram = settings.instagram.trim() || null;
      payload.facebook = settings.facebook.trim() || null;
      payload.tiktok = settings.tiktok.trim() || null;
      payload.announcementText = settings.announcementText.trim() || null;
      payload.announcementEnabled = settings.announcementEnabled;
      payload.announcementBgColor = settings.announcementBgColor || null;
      payload.announcementTextColor = settings.announcementTextColor || null;
      payload.heroTitle = settings.heroTitle.trim() || null;
      payload.heroSubtitle = settings.heroSubtitle.trim() || null;
      payload.heroCta = settings.heroCta.trim() || null;
      payload.favicon = settings.favicon || null;
      payload.font = settings.font;
      payload.notificationChannel = settings.notificationChannel;
      payload.metaPixelId = settings.metaPixelId.trim() || null;
      payload.metaAccessToken = settings.metaAccessToken.trim() || null;
      payload.metaIntegrationEnabled = settings.metaIntegrationEnabled;
      payload.whatsappWidgetEnabled = settings.whatsappWidgetEnabled;

      await api.patch('/tenants/me', payload);
      updateStore({ name: settings.name.trim(), theme: settings.theme });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const usageBar = (used: number, limit: number, unlimited: boolean) => {
    const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-orange-400' : 'bg-blue-500';
    return (
      <div className="mt-1.5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{used} utilisé{used > 1 ? 's' : ''}</span>
          <span>{unlimited ? 'Illimité' : `${limit} max`}</span>
        </div>
        {!unlimited && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  };

  const logoUrl = settings.logo
    ? (settings.logo.startsWith('http') ? settings.logo : `${API_URL}${settings.logo}`)
    : null;
  const faviconUrl = settings.favicon
    ? (settings.favicon.startsWith('http') ? settings.favicon : `${API_URL}${settings.favicon}`)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez les informations et l'apparence de votre boutique" />

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="hidden sm:block w-52 shrink-0">
          <nav className="bg-white rounded-xl shadow-sm p-2 sticky top-20 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setSaved(false); setError(''); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                  tab === t.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
                {dirty && tab === t.id && (
                  <span className="ml-auto w-2 h-2 bg-orange-400 rounded-full shrink-0" title="Modifications non sauvegardées" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex gap-1 bg-gray-100 p-1 rounded-lg w-full overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setSaved(false); setError(''); }}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

      {dirty && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-4 py-2.5 text-sm mb-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Modifications non sauvegardées
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">{error}</div>
      )}

      {/* ─── Tab: Boutique ─── */}
      {tab === 'store' && (
        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Identité de la boutique</h2>

            {/* Logo + Favicon side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-300 text-2xl">◈</span>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <span className={`text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors ${logoUploading ? 'opacity-50' : ''}`}>
                      {logoUploading ? 'Upload...' : 'Changer le logo'}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <p className="text-xs text-gray-400 mb-2">Icône affichée dans l&apos;onglet du navigateur (32x32 px).</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                    {faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-300 text-xs">ico</span>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'favicon', setFaviconUploading)} className="hidden" />
                    <span className={`text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors ${faviconUploading ? 'opacity-50' : ''}`}>
                      {faviconUploading ? 'Upload...' : settings.favicon ? 'Changer' : 'Ajouter'}
                    </span>
                  </label>
                  {settings.favicon && (
                    <button type="button" onClick={() => updateSettings({ favicon: '' })}
                      className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom de la boutique" required>
                <input type="text" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })}
                  className={INPUT} minLength={2} required />
              </Field>
              <Field label="URL de la boutique">
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 h-[38px]">
                  <span className="text-sm font-mono text-blue-600">{store?.slug}.shopforge.tech</span>
                </div>
              </Field>
            </div>

            <Field label="Description" hint="Tagline affichée sur la page d'accueil">
              <textarea value={settings.description} onChange={(e) => updateSettings({ description: e.target.value })}
                rows={2} className={`${INPUT} resize-none`} placeholder="Votre boutique en ligne..." />
            </Field>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Informations legales & fiscales</h2>
            <p className="text-xs text-gray-400">Obligatoire pour les factures, CGV et mentions legales conformes.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Raison sociale" hint="Nom legal de l'entreprise">
                <input type="text" value={settings.legalName}
                  onChange={(e) => updateSettings({ legalName: e.target.value })}
                  className={INPUT} placeholder="SARL Ma Boutique" />
              </Field>
              <Field label="Adresse legale" hint="Siege social de l'entreprise">
                <input type="text" value={settings.legalAddress}
                  onChange={(e) => updateSettings({ legalAddress: e.target.value })}
                  className={INPUT} placeholder="12 Rue de la Liberte, 1000 Tunis" />
              </Field>
              <Field label="Matricule fiscal" hint="Format : 1234567/A/B/C/000">
                <input type="text" value={settings.matriculeFiscal}
                  onChange={(e) => updateSettings({ matriculeFiscal: e.target.value.toUpperCase() })}
                  className={INPUT} placeholder="1234567/A/B/C/000" />
              </Field>
              <Field label="RNE" hint="Registre National des Entreprises">
                <input type="text" value={settings.rne}
                  onChange={(e) => updateSettings({ rne: e.target.value })}
                  className={INPUT} placeholder="Numero RNE" />
              </Field>
            </div>
          </section>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ─── Tab: Apparence ─── */}
      {tab === 'appearance' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Thème */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Thème de la boutique</h2>
              <p className="text-xs text-gray-400 mt-0.5">Basé sur la psychologie des couleurs pour maximiser vos conversions.</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Gratuits</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {getFreeThemes().map((theme) => (
                  <button key={theme.id} type="button" onClick={() => updateSettings({ theme: theme.id })}
                    className={`relative border-2 rounded-xl p-2.5 text-left transition-all ${
                      settings.theme === theme.id ? 'border-blue-500 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    {settings.theme === theme.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[9px]">✓</span>
                      </div>
                    )}
                    <div className="flex gap-0.5 mb-1.5">
                      {theme.preview.map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className={`bg-gradient-to-r ${theme.hero} rounded h-5 mb-1`} />
                    <p className="text-[11px] font-semibold text-gray-900 truncate">{theme.name}</p>
                    <p className="text-[9px] text-gray-400 truncate">{theme.category}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</p>
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Starter & Pro</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {getPremiumThemes().map((theme) => {
                  const locked = !isThemeAccessible(theme.id, usage?.plan ?? 'FREE');
                  return (
                    <button key={theme.id} type="button"
                      onClick={() => { if (!locked) updateSettings({ theme: theme.id }); }}
                      disabled={locked}
                      className={`relative border-2 rounded-xl p-2.5 text-left transition-all ${
                        locked ? 'border-gray-100 opacity-40 cursor-not-allowed'
                          : settings.theme === theme.id ? 'border-blue-500 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}>
                      {settings.theme === theme.id && !locked && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[9px]">✓</span>
                        </div>
                      )}
                      {locked && <div className="absolute top-1.5 right-1.5 text-xs">🔒</div>}
                      <div className="flex gap-0.5 mb-1.5">
                        {theme.preview.map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className={`bg-gradient-to-r ${theme.hero} rounded h-5 mb-1`} />
                      <p className="text-[11px] font-semibold text-gray-900 truncate">{theme.name}</p>
                      <p className="text-[9px] text-gray-400 truncate">{theme.category}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const t = THEMES[settings.theme as keyof typeof THEMES];
              return t?.psychologyNote ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex gap-2">
                  <span className="text-blue-500 shrink-0 text-sm">💡</span>
                  <p className="text-xs text-blue-700">{t.psychologyNote}</p>
                </div>
              ) : null;
            })()}

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Police de caractères</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {STORE_FONTS.map((font) => (
                  <button key={font.id} type="button"
                    onClick={() => updateSettings({ font: font.id })}
                    className={`border-2 rounded-xl p-3 text-left transition-all ${
                      settings.font === font.id ? 'border-blue-500 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: font.family }}>
                      {font.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{font.category}</p>
                    <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: font.family }}>
                      Aperçu du texte
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Bannière */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Image de bannière</h2>
              <p className="text-xs text-gray-400 mt-0.5">Image de fond du hero. Si vide, le dégradé du thème est utilisé.</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-40 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">
                {settings.bannerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.bannerImage.startsWith('http') ? settings.bannerImage : `${API_URL}${settings.bannerImage}`}
                    alt="Bannière" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-300 text-xs">Aucune bannière</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerImage', setBannerUploading)} className="hidden" />
                  <span className={`text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors inline-block ${bannerUploading ? 'opacity-50' : ''}`}>
                    {bannerUploading ? 'Upload...' : settings.bannerImage ? 'Changer la bannière' : 'Ajouter une bannière'}
                  </span>
                </label>
                {settings.bannerImage && (
                  <button type="button" onClick={() => updateSettings({ bannerImage: '' })}
                    className="text-xs text-red-500 hover:text-red-700 text-left">Supprimer</button>
                )}
              </div>
            </div>
          </section>

          {/* Hero */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Contenu du hero</h2>
              <p className="text-xs text-gray-400 mt-0.5">Titre, sous-titre et bouton CTA de la section hero.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Titre hero" hint="Laissez vide pour utiliser le nom de la boutique">
                <input type="text" value={settings.heroTitle} onChange={(e) => updateSettings({ heroTitle: e.target.value })}
                  className={INPUT} placeholder={settings.name || 'Nom de la boutique'} />
              </Field>
              <Field label="Texte du bouton CTA" hint="Laissez vide pour 'Voir tous les produits'">
                <input type="text" value={settings.heroCta} onChange={(e) => updateSettings({ heroCta: e.target.value })}
                  className={INPUT} placeholder="Voir tous les produits" />
              </Field>
            </div>
            <Field label="Sous-titre hero" hint="Laissez vide pour utiliser la description">
              <input type="text" value={settings.heroSubtitle} onChange={(e) => updateSettings({ heroSubtitle: e.target.value })}
                className={INPUT} placeholder={settings.description || 'Découvrez notre sélection de produits'} />
            </Field>
          </section>

          {/* Annonce */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Barre d&apos;annonce</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bandeau affiché en haut de votre boutique.</p>
              </div>
              <button type="button"
                onClick={() => updateSettings({ announcementEnabled: !settings.announcementEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.announcementEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.announcementEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <Field label="Texte de l'annonce">
              <input type="text" value={settings.announcementText} onChange={(e) => updateSettings({ announcementText: e.target.value })}
                className={INPUT} placeholder="Livraison gratuite dès 100 TND !" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Couleur de fond">
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.announcementBgColor} onChange={(e) => updateSettings({ announcementBgColor: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                  <input type="text" value={settings.announcementBgColor} onChange={(e) => updateSettings({ announcementBgColor: e.target.value })}
                    className={`flex-1 ${INPUT} font-mono text-xs`} placeholder="#111827" />
                </div>
              </Field>
              <Field label="Couleur du texte">
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.announcementTextColor} onChange={(e) => updateSettings({ announcementTextColor: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                  <input type="text" value={settings.announcementTextColor} onChange={(e) => updateSettings({ announcementTextColor: e.target.value })}
                    className={`flex-1 ${INPUT} font-mono text-xs`} placeholder="#ffffff" />
                </div>
              </Field>
            </div>
            {settings.announcementText && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Aperçu</p>
                <div className="rounded-lg px-4 py-2 text-sm font-medium text-center"
                  style={{ backgroundColor: settings.announcementBgColor, color: settings.announcementTextColor }}>
                  {settings.announcementText}
                </div>
              </div>
            )}
          </section>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ─── Tab: Paiement & Livraison ─── */}
      {tab === 'shipping' && (
        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Livraison</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Frais de livraison (TND)" hint="0 = livraison gratuite">
                <input type="number" min="0" step="0.5" value={settings.shippingFee}
                  onChange={(e) => updateSettings({ shippingFee: e.target.value })}
                  className={INPUT} placeholder="7.000" />
              </Field>
              <Field label="Livraison gratuite dès (TND)" hint="Laisser vide pour désactiver">
                <input type="number" min="0" step="1" value={settings.freeShippingThreshold}
                  onChange={(e) => updateSettings({ freeShippingThreshold: e.target.value })}
                  className={INPUT} placeholder="150" />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Moyens de paiement</h2>
            <p className="text-xs text-gray-400">Modes de paiement disponibles sur votre boutique.</p>
            <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0">💵</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Paiement à la livraison</p>
                  <p className="text-xs text-gray-400">Le client paie en espèces à la réception</p>
                </div>
              </div>
              <button type="button"
                onClick={() => updateSettings({ codEnabled: !settings.codEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.codEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.codEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏦</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Virement bancaire</p>
                    <p className="text-xs text-gray-400">Le client vire avant l'expédition</p>
                  </div>
                </div>
                <button type="button"
                  onClick={() => updateSettings({ bankTransferEnabled: !settings.bankTransferEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.bankTransferEnabled ? 'bg-blue-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.bankTransferEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {settings.bankTransferEnabled && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Coordonnées bancaires <span className="text-gray-400">(RIB, IBAN, banque…)</span></label>
                  <textarea
                    value={settings.bankTransferDetails}
                    onChange={(e) => updateSettings({ bankTransferDetails: e.target.value })}
                    rows={3}
                    className={`${INPUT} resize-none`}
                    placeholder="Ex: Banque Zitouna&#10;RIB : 17 006 0123456789 14&#10;Bénéficiaire : SARL Mon Entreprise" />
                  <p className="text-xs text-gray-400 mt-1">Ces informations seront affichées au client lors du checkout et dans l&apos;email de confirmation.</p>
                </div>
              )}
            </div>

            {/* ClicToPay */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-orange-500"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">Paiement par carte (ClicToPay)</p>
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">UIB</span>
                    </div>
                    <p className="text-xs text-gray-400">Carte bancaire tunisienne ou internationale en ligne</p>
                  </div>
                </div>
                <button type="button"
                  onClick={() => updateSettings({ clickToPayEnabled: !settings.clickToPayEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.clickToPayEnabled ? 'bg-orange-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.clickToPayEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {settings.clickToPayEnabled && (
                <div className="mt-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
                  Les identifiants ClicToPay sont configurés par la plateforme ShopForge. Contactez le support pour l&apos;activation.
                </div>
              )}
            </div>

            {/* Floussi */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-purple-500"><path d="M17 1H7C5.9 1 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 20c-.83 0-1.5-.67-1.5-1.5S11.17 18 12 18s1.5.67 1.5 1.5S12.83 21 12 21zm5-4H7V4h10v13z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Portefeuille mobile (Floussi)</p>
                    <p className="text-xs text-gray-400">Paiement via l&apos;application Floussi</p>
                  </div>
                </div>
                <button type="button"
                  onClick={() => updateSettings({ floussiEnabled: !settings.floussiEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.floussiEnabled ? 'bg-purple-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.floussiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {settings.floussiEnabled && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
                  Les identifiants Floussi sont configurés par la plateforme ShopForge. Contactez le support pour l&apos;activation.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Politique de retour</h2>
            <textarea value={settings.returnPolicy} onChange={(e) => updateSettings({ returnPolicy: e.target.value })}
              rows={4} className={`${INPUT} resize-none`}
              placeholder="Ex : Retours acceptés dans les 7 jours suivant la réception, produit non ouvert..." />
          </section>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ─── Tab: Compte ─── */}
      {tab === 'account' && (
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Coordonnées</h2>
              <p className="text-xs text-gray-400">Affichées dans le footer et la page contact.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email de contact">
                  <input type="email" value={settings.contactEmail} onChange={(e) => updateSettings({ contactEmail: e.target.value })}
                    className={INPUT} placeholder="contact@maboutique.tn" />
                </Field>
                <Field label="Téléphone">
                  <input type="tel" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })}
                    className={INPUT} placeholder="+216 XX XXX XXX" />
                </Field>
                <Field label="WhatsApp" hint="Numéro avec indicatif pays">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-lg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </span>
                    <input type="tel" value={settings.whatsapp} onChange={(e) => updateSettings({ whatsapp: e.target.value })}
                      className={`flex-1 ${INPUT}`} placeholder="+21698000000" />
                  </div>
                </Field>
                <Field label="Adresse">
                  <input type="text" value={settings.address} onChange={(e) => updateSettings({ address: e.target.value })}
                    className={INPUT} placeholder="Tunis, Tunisie" />
                </Field>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Réseaux sociaux</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Instagram" hint="@username ou URL">
                    <input type="text" value={settings.instagram} onChange={(e) => updateSettings({ instagram: e.target.value })}
                      className={INPUT} placeholder="@maboutique" />
                  </Field>
                  <Field label="Facebook" hint="Nom de page ou URL">
                    <input type="text" value={settings.facebook} onChange={(e) => updateSettings({ facebook: e.target.value })}
                      className={INPUT} placeholder="maboutique" />
                  </Field>
                  <Field label="TikTok" hint="@username ou URL">
                    <input type="text" value={settings.tiktok} onChange={(e) => updateSettings({ tiktok: e.target.value })}
                      className={INPUT} placeholder="@maboutique" />
                  </Field>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Notifications de commandes</h2>

              <div className="space-y-2">
                {[
                  { val: 'EMAIL', label: '📧 Email uniquement', desc: 'Notification par email à chaque nouvelle commande' },
                  { val: 'TELEGRAM', label: '✈️ Telegram uniquement', desc: "Notification Telegram instantanée (taux d'ouverture ×3)" },
                  { val: 'BOTH', label: '📧 + ✈️ Email & Telegram', desc: 'Recevoir sur les deux canaux' },
                ].map(opt => (
                  <label key={opt.val}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      settings.notificationChannel === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="notificationChannel" value={opt.val}
                      checked={settings.notificationChannel === opt.val}
                      onChange={() => updateSettings({ notificationChannel: opt.val })}
                      className="accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {(settings.notificationChannel === 'TELEGRAM' || settings.notificationChannel === 'BOTH') && (
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                  {settings.telegramChatId ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <p className="text-sm font-medium text-gray-900">Telegram connecté</p>
                      </div>
                      <button type="button" disabled={telegramLoading}
                        onClick={async () => {
                          setTelegramLoading(true);
                          try {
                            await api.delete('/tenants/me/telegram');
                            updateSettings({ telegramChatId: null, notificationChannel: 'EMAIL' });
                            setTelegramCode(null);
                          } finally { setTelegramLoading(false); }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        Déconnecter
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">Connecter votre compte Telegram</p>
                      {!telegramCode ? (
                        <button type="button" disabled={telegramLoading}
                          onClick={async () => {
                            setTelegramLoading(true);
                            try {
                              const { data } = await api.post('/tenants/me/telegram-link-code');
                              setTelegramCode(data);
                            } finally { setTelegramLoading(false); }
                          }}
                          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
                          {telegramLoading ? 'Génération...' : '🔗 Générer un code de liaison'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Votre code (valable 24h)</p>
                            <p className="text-3xl font-bold font-mono tracking-widest text-gray-900">{telegramCode.code}</p>
                          </div>
                          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                            <li>Ouvrez Telegram et cherchez <strong>@ShopForgeBot</strong></li>
                            <li>Envoyez le message : <code className="bg-gray-100 px-1 rounded font-mono">/start {telegramCode.code}</code></li>
                            <li>Rechargez cette page — la connexion est automatique</li>
                          </ol>
                          <button type="button" onClick={() => setTelegramCode(null)}
                            className="text-xs text-gray-400 hover:text-gray-600">
                            Annuler
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <SaveButton saving={saving} saved={saved} />
          </form>

          {/* Profil éditable + changement mdp */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Profil</h2>
              <ProfileEditor user={user} />
            </section>

            {usage && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Plan actuel</h2>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    usage.plan === 'PRO' ? 'bg-purple-100 text-purple-700'
                    : usage.plan === 'STARTER' ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                  }`}>
                    {usage.planLabel}{usage.priceMonthly > 0 ? ` — ${usage.priceMonthly} TND/mois` : ' — Gratuit'}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Produits</p>
                    {usageBar(usage.usage.products.used, usage.usage.products.limit, usage.usage.products.unlimited)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Commandes ce mois</p>
                    {usageBar(usage.usage.ordersThisMonth.used, usage.usage.ordersThisMonth.limit, usage.usage.ordersThisMonth.unlimited)}
                  </div>
                </div>
              </section>
            )}
          </div>

          <section className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
            <h2 className="font-semibold text-red-700 mb-3">Zone de danger</h2>
            <p className="text-sm text-gray-500 mb-4">Ces actions sont irréversibles. Contactez le support avant de procéder.</p>
            <button disabled className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50">
              Supprimer la boutique
            </button>
          </section>
        </div>
      )}

      {/* ─── Tab: Intégrations ─── */}
      {tab === 'integrations' && (
        <form onSubmit={handleSave} className="space-y-6">

          {/* Langue de la boutique */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg shrink-0">🌐</div>
              <div>
                <h2 className="font-semibold text-gray-900">Langue de la boutique</h2>
                <p className="text-xs text-gray-500">Définit la langue d'affichage et la direction du texte (LTR / RTL)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'LTR' },
                { code: 'ar', label: 'العربية', flag: '🇹🇳', dir: 'RTL' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => updateSettings({ storeLanguage: lang.code })}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                    settings.storeLanguage === lang.code
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{lang.label}</p>
                    <p className="text-xs text-gray-500">Direction {lang.dir}</p>
                  </div>
                  {settings.storeLanguage === lang.code && (
                    <span className="ml-auto text-orange-500 font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            {settings.storeLanguage === 'ar' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                Mode RTL activé — la vitrine de votre boutique s'affichera de droite à gauche.
                Les contenus (noms, descriptions) restent tels que vous les avez saisis.
              </div>
            )}
          </section>

          {/* Meta / Facebook Pixel */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Meta / Facebook Pixel</h2>
                <p className="text-xs text-gray-500">Trackez les conversions et optimisez vos campagnes publicitaires</p>
              </div>
              <label className="ml-auto flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Activer</span>
                <div
                  onClick={() => updateSettings({ metaIntegrationEnabled: !settings.metaIntegrationEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.metaIntegrationEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.metaIntegrationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            <Field label="Pixel ID" hint="Trouvez votre Pixel ID dans Meta Events Manager → Paramètres">
              <input
                type="text"
                value={settings.metaPixelId}
                onChange={(e) => updateSettings({ metaPixelId: e.target.value })}
                placeholder="123456789012345"
                className={INPUT}
              />
            </Field>

            <Field
              label="Access Token (Conversions API)"
              hint="Optionnel mais recommandé pour un tracking iOS 14+ fiable. Générez-le dans Events Manager → Paramètres → Conversions API."
            >
              <input
                type="password"
                value={settings.metaAccessToken}
                onChange={(e) => updateSettings({ metaAccessToken: e.target.value })}
                placeholder="EAAxxxxxxxxxxxxxxxxx..."
                className={INPUT}
                autoComplete="off"
              />
            </Field>

            {settings.metaIntegrationEnabled && !settings.metaPixelId && (
              <p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2">
                ⚠️ Veuillez renseigner votre Pixel ID pour activer le tracking.
              </p>
            )}

            {settings.metaIntegrationEnabled && settings.metaPixelId && (
              <div className="bg-green-50 rounded-lg px-3 py-2 text-xs text-green-700 space-y-1">
                <p className="font-medium">Événements trackés :</p>
                <p>PageView · ViewContent · AddToCart · InitiateCheckout · AddPaymentInfo · Purchase</p>
                {settings.metaAccessToken && <p className="text-green-600">+ Conversions API (server-side) actif</p>}
              </div>
            )}
          </section>

          {/* WhatsApp Widget */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Widget WhatsApp</h2>
                <p className="text-xs text-gray-500">Bouton flottant WhatsApp sur votre vitrine pour les clients</p>
              </div>
              <label className="ml-auto flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Activer</span>
                <div
                  onClick={() => updateSettings({ whatsappWidgetEnabled: !settings.whatsappWidgetEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.whatsappWidgetEnabled ? 'bg-[#25D366]' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.whatsappWidgetEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            {settings.whatsappWidgetEnabled && !settings.whatsapp && (
              <p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2">
                ⚠️ Configurez votre numéro WhatsApp dans l&apos;onglet <strong>Boutique</strong> pour activer le widget.
              </p>
            )}
            {settings.whatsappWidgetEnabled && settings.whatsapp && (
              <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                ✓ Widget actif sur <strong>{settings.whatsapp}</strong>
              </p>
            )}
          </section>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      </div>{/* end flex-1 content */}
      </div>{/* end flex row */}
    </div>
  );
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={saving}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? 'Sauvegarde...' : 'Enregistrer'}
      </button>
      {saved && <span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function ProfileEditor({ user }: { user: any }) {
  const { setAuth, store } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Password change
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  const handleProfileSave = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const { data } = await api.patch('/auth/profile', { firstName, lastName });
      setMsg('Profil mis à jour');
      // Mettre à jour le contexte auth
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.firstName = data.firstName;
        u.lastName = data.lastName;
        localStorage.setItem('user', JSON.stringify(u));
      }
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (newPw !== confirmPw) { setPwErr('Les mots de passe ne correspondent pas'); return; }
    if (newPw.length < 8) { setPwErr('Minimum 8 caractères'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
      setPwMsg('Mot de passe modifié');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (e: any) {
      setPwErr(e.response?.data?.message || 'Erreur');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profil */}
      <div className="space-y-3">
        <InfoRow label="Email" value={user?.email ?? ''} />
        <InfoRow label="Rôle" value={user?.role ?? ''} />
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Prénom</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Nom</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleProfileSave} disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Mettre à jour'}
          </button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      {/* Changement mot de passe */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="font-medium text-gray-900 text-sm mb-3">Changer le mot de passe</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <input type="password" placeholder="Mot de passe actuel" value={oldPw}
            onChange={(e) => setOldPw(e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Nouveau mot de passe" value={newPw}
            onChange={(e) => setNewPw(e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwSaving}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {pwSaving ? 'Modification...' : 'Changer le mot de passe'}
            </button>
            {pwMsg && <span className="text-sm text-green-600">{pwMsg}</span>}
            {pwErr && <span className="text-sm text-red-600">{pwErr}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
