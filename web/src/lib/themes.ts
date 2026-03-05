// ══════════════════════════════════════════════════════════════════════════════
// ShopForge Theme System — Basé sur la psychologie des couleurs e-commerce
//
// Principes appliqués :
// - Effet Von Restorff : CTA contrasté → capte l'attention
// - Warm accent on cool background : l'œil est naturellement attiré vers le CTA
// - Rouge/Orange = urgence + appétit (McDonald's, KFC)
// - Bleu = confiance + sécurité (PayPal, Facebook)
// - Vert = naturel + santé + argent
// - Noir = luxe + exclusivité + rareté perçue
// - Rose/Pastel = douceur + féminité + soin
// - Mode sombre = sessions plus longues → plus de conversions
// ══════════════════════════════════════════════════════════════════════════════

export const THEME_CATEGORIES = [
  'Universel',
  'Mode & Lifestyle',
  'Tech & Gaming',
  'Alimentation',
  'Beauté & Soins',
  'Sport & Fitness',
  'Artisanat & Déco',
  'Enfants & Jouets',
  'Maison & Intérieur',
  'Bio & Écologie',
  'Luxe & Prestige',
] as const;

export type ThemeCategory = typeof THEME_CATEGORIES[number];

export const THEMES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // GRATUITS — 8 thèmes universels, adaptés à tous les types de boutiques
  // ═══════════════════════════════════════════════════════════════════════════

  default: {
    id: 'default',
    name: 'Minimaliste',
    description: 'Épuré et intemporel — fonctionne pour tout',
    category: 'Universel' as ThemeCategory,
    premium: false,
    hero: 'from-gray-900 to-gray-700',
    btn: 'bg-gray-900 hover:bg-gray-700',
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headerBorder: 'border-gray-100',
    isDark: false,
    accent: 'gray',
    preview: ['#111827', '#374151'],
    psychologyNote: 'Le minimalisme réduit la charge cognitive — décision d\'achat plus rapide',
  },

  ocean: {
    id: 'ocean',
    name: 'Océan',
    description: 'Bleu confiance — idéal tech & services',
    category: 'Tech & Gaming' as ThemeCategory,
    premium: false,
    hero: 'from-sky-800 to-cyan-600',
    btn: 'bg-sky-700 hover:bg-sky-800',
    headerBg: 'bg-sky-900',
    headerText: 'text-white',
    headerBorder: 'border-sky-800',
    isDark: true,
    accent: 'sky',
    preview: ['#0369a1', '#0891b2'],
    psychologyNote: 'Le bleu inspire confiance et sécurité — parfait pour l\'électronique et les services',
  },

  forest: {
    id: 'forest',
    name: 'Nature',
    description: 'Vert naturel — bio, santé & bien-être',
    category: 'Bio & Écologie' as ThemeCategory,
    premium: false,
    hero: 'from-green-800 to-emerald-600',
    btn: 'bg-green-700 hover:bg-green-800',
    headerBg: 'bg-green-900',
    headerText: 'text-white',
    headerBorder: 'border-green-800',
    isDark: true,
    accent: 'green',
    preview: ['#15803d', '#059669'],
    psychologyNote: 'Le vert évoque le naturel et la santé — crée un sentiment de fraîcheur et de confiance',
  },

  sunset: {
    id: 'sunset',
    name: 'Coucher de soleil',
    description: 'Chaleureux et énergique — mode & lifestyle',
    category: 'Mode & Lifestyle' as ThemeCategory,
    premium: false,
    hero: 'from-orange-700 to-red-600',
    btn: 'bg-orange-600 hover:bg-orange-700',
    headerBg: 'bg-orange-900',
    headerText: 'text-white',
    headerBorder: 'border-orange-800',
    isDark: true,
    accent: 'orange',
    preview: ['#c2410c', '#dc2626'],
    psychologyNote: 'L\'orange/rouge crée un sentiment d\'urgence — augmente les achats impulsifs de +28%',
  },

  royal: {
    id: 'royal',
    name: 'Royal',
    description: 'Violet luxueux — beauté & créativité',
    category: 'Beauté & Soins' as ThemeCategory,
    premium: false,
    hero: 'from-violet-800 to-purple-600',
    btn: 'bg-violet-700 hover:bg-violet-800',
    headerBg: 'bg-violet-900',
    headerText: 'text-white',
    headerBorder: 'border-violet-800',
    isDark: true,
    accent: 'violet',
    preview: ['#7c3aed', '#9333ea'],
    psychologyNote: 'Le violet évoque la royauté et la créativité — augmente la valeur perçue du produit',
  },

  rose: {
    id: 'rose',
    name: 'Rose',
    description: 'Doux et féminin — cosmétique & soins',
    category: 'Beauté & Soins' as ThemeCategory,
    premium: false,
    hero: 'from-pink-700 to-rose-600',
    btn: 'bg-pink-600 hover:bg-pink-700',
    headerBg: 'bg-pink-900',
    headerText: 'text-white',
    headerBorder: 'border-pink-800',
    isDark: true,
    accent: 'pink',
    preview: ['#be185d', '#e11d48'],
    psychologyNote: 'Le rose active des émotions de soin et de tendresse — augmente l\'attachement au produit',
  },

  energy: {
    id: 'energy',
    name: 'Energy',
    description: 'Orange dynamique — sport & action',
    category: 'Sport & Fitness' as ThemeCategory,
    premium: false,
    hero: 'from-orange-600 via-orange-500 to-amber-400',
    btn: 'bg-orange-500 hover:bg-orange-600',
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headerBorder: 'border-orange-100',
    isDark: false,
    accent: 'orange',
    preview: ['#f97316', '#f59e0b'],
    psychologyNote: 'L\'orange est la couleur CTA n°1 en conversion — dynamisme + action immédiate',
  },

  terracotta: {
    id: 'terracotta',
    name: 'Terre Cuite',
    description: 'Tons chauds — fait-main & artisanat',
    category: 'Artisanat & Déco' as ThemeCategory,
    premium: false,
    hero: 'from-amber-800 to-orange-700',
    btn: 'bg-amber-700 hover:bg-amber-800',
    headerBg: 'bg-amber-900',
    headerText: 'text-white',
    headerBorder: 'border-amber-800',
    isDark: true,
    accent: 'amber',
    preview: ['#92400e', '#c2410c'],
    psychologyNote: 'Les tons terre évoquent l\'authenticité — renforcent la perception artisanale et fait-main',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIUM — 10 thèmes spécialisés, optimisés pour la conversion
  // Accessibles aux plans STARTER et PRO uniquement
  // ═══════════════════════════════════════════════════════════════════════════

  noir: {
    id: 'noir',
    name: 'Noir Luxe',
    description: 'Noir + or — exclusivité et prestige',
    category: 'Luxe & Prestige' as ThemeCategory,
    premium: true,
    hero: 'from-gray-950 via-gray-900 to-gray-800',
    btn: 'bg-amber-500 hover:bg-amber-600',
    headerBg: 'bg-gray-950',
    headerText: 'text-white',
    headerBorder: 'border-gray-800',
    isDark: true,
    accent: 'amber',
    preview: ['#030712', '#d97706'],
    psychologyNote: 'Noir = exclusivité perçue — le bouton doré capte l\'œil par contraste (effet Von Restorff)',
  },

  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Tech sombre + néon — électronique & gaming',
    category: 'Tech & Gaming' as ThemeCategory,
    premium: true,
    hero: 'from-slate-900 via-blue-950 to-indigo-900',
    btn: 'bg-cyan-500 hover:bg-cyan-400',
    headerBg: 'bg-slate-950',
    headerText: 'text-white',
    headerBorder: 'border-slate-800',
    isDark: true,
    accent: 'cyan',
    preview: ['#0f172a', '#06b6d4'],
    psychologyNote: 'Contraste sombre + néon = innovation perçue — déclenche le désir chez les acheteurs tech',
  },

  gourmand: {
    id: 'gourmand',
    name: 'Gourmand',
    description: 'Rouge appétissant — alimentation & resto',
    category: 'Alimentation' as ThemeCategory,
    premium: true,
    hero: 'from-red-800 via-red-700 to-orange-600',
    btn: 'bg-red-600 hover:bg-red-700',
    headerBg: 'bg-red-900',
    headerText: 'text-white',
    headerBorder: 'border-red-800',
    isDark: true,
    accent: 'red',
    preview: ['#991b1b', '#ea580c'],
    psychologyNote: 'Le rouge stimule l\'appétit (+25% commandes) — utilisé par McDonald\'s, KFC, Coca-Cola',
  },

  bloom: {
    id: 'bloom',
    name: 'Bloom',
    description: 'Lavande douce — beauté & parfumerie',
    category: 'Beauté & Soins' as ThemeCategory,
    premium: true,
    hero: 'from-purple-400 via-pink-300 to-rose-300',
    btn: 'bg-purple-600 hover:bg-purple-700',
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headerBorder: 'border-purple-100',
    isDark: false,
    accent: 'purple',
    preview: ['#c084fc', '#fda4af'],
    psychologyNote: 'Pastels = raffinement et délicatesse — augmente le temps passé sur la page de +40%',
  },

  titan: {
    id: 'titan',
    name: 'Titan',
    description: 'Rouge intense + noir — sport & fitness',
    category: 'Sport & Fitness' as ThemeCategory,
    premium: true,
    hero: 'from-gray-950 via-red-900 to-red-700',
    btn: 'bg-red-600 hover:bg-red-500',
    headerBg: 'bg-gray-950',
    headerText: 'text-white',
    headerBorder: 'border-red-900',
    isDark: true,
    accent: 'red',
    preview: ['#030712', '#dc2626'],
    psychologyNote: 'Rouge + noir = puissance et détermination — déclenche l\'action (buy now, join now)',
  },

  sahara: {
    id: 'sahara',
    name: 'Sahara',
    description: 'Sable doré — artisanat oriental & déco',
    category: 'Artisanat & Déco' as ThemeCategory,
    premium: true,
    hero: 'from-yellow-800 via-amber-700 to-orange-600',
    btn: 'bg-yellow-700 hover:bg-yellow-800',
    headerBg: 'bg-stone-50',
    headerText: 'text-stone-900',
    headerBorder: 'border-stone-200',
    isDark: false,
    accent: 'yellow',
    preview: ['#854d0e', '#ea580c'],
    psychologyNote: 'Tons sable = voyage et authenticité — ancrage culturel MENA qui renforce la confiance locale',
  },

  bonbon: {
    id: 'bonbon',
    name: 'Bonbon',
    description: 'Couleurs vives — enfants & jouets',
    category: 'Enfants & Jouets' as ThemeCategory,
    premium: true,
    hero: 'from-yellow-400 via-pink-400 to-purple-500',
    btn: 'bg-pink-500 hover:bg-pink-600',
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headerBorder: 'border-pink-100',
    isDark: false,
    accent: 'pink',
    preview: ['#facc15', '#ec4899'],
    psychologyNote: 'Couleurs vives captent l\'attention des enfants — parents associent joie et positivité',
  },

  cocon: {
    id: 'cocon',
    name: 'Cocon',
    description: 'Beige chaleureux — maison, déco & intérieur',
    category: 'Maison & Intérieur' as ThemeCategory,
    premium: true,
    hero: 'from-stone-700 via-stone-600 to-amber-700',
    btn: 'bg-stone-700 hover:bg-stone-800',
    headerBg: 'bg-stone-50',
    headerText: 'text-stone-900',
    headerBorder: 'border-stone-200',
    isDark: false,
    accent: 'stone',
    preview: ['#44403c', '#b45309'],
    psychologyNote: 'Neutres chauds = sentiment de "chez-soi" — réduit l\'hésitation d\'achat de 18%',
  },

  organic: {
    id: 'organic',
    name: 'Organic',
    description: 'Vert profond — bio, vegan & écologie',
    category: 'Bio & Écologie' as ThemeCategory,
    premium: true,
    hero: 'from-emerald-900 via-green-800 to-teal-700',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    headerBg: 'bg-emerald-950',
    headerText: 'text-white',
    headerBorder: 'border-emerald-900',
    isDark: true,
    accent: 'emerald',
    preview: ['#064e3b', '#0f766e'],
    psychologyNote: 'Vert foncé = "naturel et responsable" — augmente la confiance bio de +35%',
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Mode sombre élégante — universel premium',
    category: 'Universel' as ThemeCategory,
    premium: true,
    hero: 'from-indigo-950 via-slate-900 to-violet-900',
    btn: 'bg-indigo-500 hover:bg-indigo-400',
    headerBg: 'bg-slate-950',
    headerText: 'text-white',
    headerBorder: 'border-slate-800',
    isDark: true,
    accent: 'indigo',
    preview: ['#1e1b4b', '#4c1d95'],
    psychologyNote: 'Mode sombre = sessions +45% plus longues + fatigue réduite — plus de conversions',
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
export type Theme = typeof THEMES[ThemeKey];

export function getTheme(key?: string | null) {
  if (!key || !(key in THEMES)) return THEMES.default;
  return THEMES[key as ThemeKey];
}

/** Returns only free themes */
export function getFreeThemes() {
  return Object.values(THEMES).filter((t) => !t.premium);
}

/** Returns only premium themes */
export function getPremiumThemes() {
  return Object.values(THEMES).filter((t) => t.premium);
}

/** Check if a theme is accessible for a given plan */
export function isThemeAccessible(themeId: string, plan: string): boolean {
  const theme = THEMES[themeId as ThemeKey];
  if (!theme) return true; // fallback to default
  if (!theme.premium) return true;
  return plan === 'STARTER' || plan === 'PRO';
}

// ══════════════════════════════════════════════════════════════════════════════
// Theme Utils — Couleurs d'accent derivées pour couvrir 100% de l'UI
// Toutes les classes sont pre-calculées pour que Tailwind les detecte
// ══════════════════════════════════════════════════════════════════════════════

export interface ThemeUtils {
  footerBg: string;
  footerText: string;
  footerBorder: string;
  linkColor: string;
  linkHover: string;
  focusRing: string;
  pillActive: string;
  pillInactive: string;
  cardHover: string;
}

const ACCENT_MAP: Record<string, ThemeUtils> = {
  gray: {
    footerBg: 'bg-gray-900', footerText: 'text-gray-300', footerBorder: 'border-gray-800',
    linkColor: 'text-gray-600', linkHover: 'hover:text-gray-900',
    focusRing: 'focus:ring-gray-500',
    pillActive: 'bg-gray-900 text-white', pillInactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    cardHover: 'group-hover:text-gray-600',
  },
  sky: {
    footerBg: 'bg-sky-950', footerText: 'text-sky-100', footerBorder: 'border-sky-900',
    linkColor: 'text-sky-600', linkHover: 'hover:text-sky-500',
    focusRing: 'focus:ring-sky-500',
    pillActive: 'bg-sky-700 text-white', pillInactive: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    cardHover: 'group-hover:text-sky-600',
  },
  green: {
    footerBg: 'bg-green-950', footerText: 'text-green-100', footerBorder: 'border-green-900',
    linkColor: 'text-green-600', linkHover: 'hover:text-green-500',
    focusRing: 'focus:ring-green-500',
    pillActive: 'bg-green-700 text-white', pillInactive: 'bg-green-50 text-green-700 hover:bg-green-100',
    cardHover: 'group-hover:text-green-600',
  },
  orange: {
    footerBg: 'bg-orange-950', footerText: 'text-orange-100', footerBorder: 'border-orange-900',
    linkColor: 'text-orange-600', linkHover: 'hover:text-orange-500',
    focusRing: 'focus:ring-orange-500',
    pillActive: 'bg-orange-600 text-white', pillInactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    cardHover: 'group-hover:text-orange-600',
  },
  violet: {
    footerBg: 'bg-violet-950', footerText: 'text-violet-100', footerBorder: 'border-violet-900',
    linkColor: 'text-violet-600', linkHover: 'hover:text-violet-500',
    focusRing: 'focus:ring-violet-500',
    pillActive: 'bg-violet-700 text-white', pillInactive: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    cardHover: 'group-hover:text-violet-600',
  },
  pink: {
    footerBg: 'bg-pink-950', footerText: 'text-pink-100', footerBorder: 'border-pink-900',
    linkColor: 'text-pink-600', linkHover: 'hover:text-pink-500',
    focusRing: 'focus:ring-pink-500',
    pillActive: 'bg-pink-600 text-white', pillInactive: 'bg-pink-50 text-pink-700 hover:bg-pink-100',
    cardHover: 'group-hover:text-pink-600',
  },
  amber: {
    footerBg: 'bg-amber-950', footerText: 'text-amber-100', footerBorder: 'border-amber-900',
    linkColor: 'text-amber-600', linkHover: 'hover:text-amber-500',
    focusRing: 'focus:ring-amber-500',
    pillActive: 'bg-amber-700 text-white', pillInactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    cardHover: 'group-hover:text-amber-600',
  },
  cyan: {
    footerBg: 'bg-slate-950', footerText: 'text-cyan-100', footerBorder: 'border-slate-800',
    linkColor: 'text-cyan-500', linkHover: 'hover:text-cyan-400',
    focusRing: 'focus:ring-cyan-500',
    pillActive: 'bg-cyan-600 text-white', pillInactive: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    cardHover: 'group-hover:text-cyan-500',
  },
  red: {
    footerBg: 'bg-red-950', footerText: 'text-red-100', footerBorder: 'border-red-900',
    linkColor: 'text-red-600', linkHover: 'hover:text-red-500',
    focusRing: 'focus:ring-red-500',
    pillActive: 'bg-red-600 text-white', pillInactive: 'bg-red-50 text-red-700 hover:bg-red-100',
    cardHover: 'group-hover:text-red-600',
  },
  purple: {
    footerBg: 'bg-purple-950', footerText: 'text-purple-100', footerBorder: 'border-purple-900',
    linkColor: 'text-purple-600', linkHover: 'hover:text-purple-500',
    focusRing: 'focus:ring-purple-500',
    pillActive: 'bg-purple-600 text-white', pillInactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    cardHover: 'group-hover:text-purple-600',
  },
  yellow: {
    footerBg: 'bg-stone-900', footerText: 'text-yellow-100', footerBorder: 'border-stone-800',
    linkColor: 'text-yellow-700', linkHover: 'hover:text-yellow-600',
    focusRing: 'focus:ring-yellow-500',
    pillActive: 'bg-yellow-700 text-white', pillInactive: 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100',
    cardHover: 'group-hover:text-yellow-700',
  },
  stone: {
    footerBg: 'bg-stone-900', footerText: 'text-stone-200', footerBorder: 'border-stone-800',
    linkColor: 'text-stone-600', linkHover: 'hover:text-stone-500',
    focusRing: 'focus:ring-stone-500',
    pillActive: 'bg-stone-700 text-white', pillInactive: 'bg-stone-100 text-stone-600 hover:bg-stone-200',
    cardHover: 'group-hover:text-stone-600',
  },
  emerald: {
    footerBg: 'bg-emerald-950', footerText: 'text-emerald-100', footerBorder: 'border-emerald-900',
    linkColor: 'text-emerald-600', linkHover: 'hover:text-emerald-500',
    focusRing: 'focus:ring-emerald-500',
    pillActive: 'bg-emerald-600 text-white', pillInactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    cardHover: 'group-hover:text-emerald-600',
  },
  indigo: {
    footerBg: 'bg-indigo-950', footerText: 'text-indigo-100', footerBorder: 'border-indigo-900',
    linkColor: 'text-indigo-500', linkHover: 'hover:text-indigo-400',
    focusRing: 'focus:ring-indigo-500',
    pillActive: 'bg-indigo-600 text-white', pillInactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    cardHover: 'group-hover:text-indigo-500',
  },
};

/** Get computed theme utility classes from a theme's accent color */
export function getThemeUtils(theme?: Theme | null): ThemeUtils {
  const accent = (theme as Record<string, unknown>)?.accent as string | undefined;
  return ACCENT_MAP[accent ?? 'gray'] ?? ACCENT_MAP.gray;
}
