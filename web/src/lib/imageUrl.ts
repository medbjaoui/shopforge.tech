const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function imageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
