'use client';
import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/admin-api';
import { PageHeader, SearchInput, Spinner } from '@/components/admin/AdminUI';
import { useToast } from '@/components/admin/Toast';
import { SettingsIcon, ChevronRightIcon } from '@/components/admin/AdminIcons';

interface ConfigItem {
  key: string;
  value: string;
  label: string;
  type: string;
}

type GroupedConfig = Record<string, ConfigItem[]>;

const GROUP_LABELS: Record<string, string> = {
  plans: 'Plans & Tarification',
  fiscal: 'Fiscalite',
  platform: 'Plateforme',
  maintenance: 'Maintenance',
  ai: 'Intelligence Artificielle',
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  plans: <span className="text-lg">&#x1F4B0;</span>,
  fiscal: <span className="text-lg">&#x1F9FE;</span>,
  platform: <SettingsIcon size={18} className="text-gray-400" />,
  maintenance: <span className="text-lg">&#x1F527;</span>,
  ai: <span className="text-lg">&#x1F916;</span>,
};

const GROUP_ORDER = ['platform', 'plans', 'ai', 'fiscal', 'maintenance'];

export default function AdminSettingsPage() {
  const [groups, setGroups] = useState<GroupedConfig>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['platform']));
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/settings');
      setGroups(data);
      const d: Record<string, string> = {};
      for (const items of Object.values(data) as ConfigItem[][]) {
        for (const item of items) {
          d[item.key] = item.value;
        }
      }
      setDraft(d);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleChange(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleBoolToggle(key: string) {
    const newVal = draft[key] === 'true' ? 'false' : 'true';
    setDraft((prev) => ({ ...prev, [key]: newVal }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Array<{ key: string; value: string }> = [];
      for (const items of Object.values(groups) as ConfigItem[][]) {
        for (const item of items) {
          if (draft[item.key] !== item.value) {
            updates.push({ key: item.key, value: draft[item.key] });
          }
        }
      }
      if (updates.length === 0) {
        setDirty(false);
        toast('info', 'Aucune modification a enregistrer');
        return;
      }
      const { data } = await adminApi.patch('/settings', { updates });
      setGroups(data);
      const d: Record<string, string> = {};
      for (const items of Object.values(data) as ConfigItem[][]) {
        for (const item of items) {
          d[item.key] = item.value;
        }
      }
      setDraft(d);
      setDirty(false);
      toast('success', `${updates.length} parametre${updates.length > 1 ? 's' : ''} enregistre${updates.length > 1 ? 's' : ''}`);
    } catch {
      toast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const d: Record<string, string> = {};
    for (const items of Object.values(groups) as ConfigItem[][]) {
      for (const item of items) {
        d[item.key] = item.value;
      }
    }
    setDraft(d);
    setDirty(false);
  }

  const sortedGroups = GROUP_ORDER.filter((g) => groups[g]);

  function filterItems(items: ConfigItem[]): ConfigItem[] {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q),
    );
  }

  // When searching, force all groups open
  const isSearching = search.length > 0;

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Parametres" subtitle="Configuration globale de la plateforme">
        <div className="flex items-center gap-3">
          {dirty && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Annuler
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </PageHeader>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un parametre..."
        className="mb-6"
      />

      <div className="space-y-3">
        {sortedGroups.map((groupKey) => {
          const items = filterItems(groups[groupKey]);
          if (!items || items.length === 0) return null;

          const isOpen = isSearching || openGroups.has(groupKey);

          return (
            <div
              key={groupKey}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Collapsible header */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {GROUP_ICONS[groupKey] ?? <SettingsIcon size={18} className="text-gray-400" />}
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {GROUP_LABELS[groupKey] ?? groupKey}
                  </h2>
                  <span className="text-xs text-gray-500 font-normal normal-case tracking-normal">
                    ({items.length})
                  </span>
                </div>
                <ChevronRightIcon
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Collapsible content */}
              {isOpen && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 font-medium">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-600 font-mono mt-0.5">
                          {item.key}
                        </p>
                      </div>

                      <div className="flex-shrink-0 w-52">
                        {item.key === 'ai_provider' ? (
                          <select
                            value={draft[item.key] ?? 'anthropic'}
                            onChange={(e) =>
                              handleChange(item.key, e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="gemini">Google (Gemini)</option>
                          </select>
                        ) : item.type === 'boolean' ? (
                          <button
                            onClick={() => handleBoolToggle(item.key)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              draft[item.key] === 'true'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                draft[item.key] === 'true'
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : item.type === 'number' ? (
                          <input
                            type="number"
                            step="any"
                            value={draft[item.key] ?? ''}
                            onChange={(e) =>
                              handleChange(item.key, e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        ) : (
                          <input
                            type="text"
                            value={draft[item.key] ?? ''}
                            onChange={(e) =>
                              handleChange(item.key, e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <p className="text-xs text-gray-500">
          Les modifications de plans et de fiscalite prennent effet immediatement.
          Les factures deja generees ne sont pas affectees par les changements de TVA ou de timbre fiscal.
        </p>
      </div>
    </div>
  );
}
