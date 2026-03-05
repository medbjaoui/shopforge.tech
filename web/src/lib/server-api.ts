/**
 * Utilisé dans les Server Components (SSR/SSG) uniquement.
 * En prod : appelle http://api:3001 directement dans le réseau Docker.
 * En dev  : appelle http://localhost:3001.
 */
export const INTERNAL_API =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export async function serverFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${INTERNAL_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res;
}
