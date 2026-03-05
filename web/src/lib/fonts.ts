export interface StoreFont {
  id: string;
  name: string;
  family: string;
  googleUrl: string | null; // null = system font
  category: string;
}

export const STORE_FONTS: StoreFont[] = [
  {
    id: 'system',
    name: 'Système (défaut)',
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleUrl: null,
    category: 'Rapide, zéro chargement',
  },
  {
    id: 'inter',
    name: 'Inter',
    family: '"Inter", sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    category: 'Moderne, lisible',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: '"Poppins", sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    category: 'Rond, friendly',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: '"Playfair Display", serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap',
    category: 'Luxe, élégant',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    family: '"Cairo", sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
    category: 'Support arabe (MENA)',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: '"Montserrat", sans-serif',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
    category: 'Géométrique, pro',
  },
];

export function getFont(id?: string | null): StoreFont {
  return STORE_FONTS.find((f) => f.id === id) ?? STORE_FONTS[0];
}
