import { Suspense } from 'react';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>{children}</Suspense>;
}
