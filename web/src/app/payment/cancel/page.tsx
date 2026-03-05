'use client';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get('reason');

  const message =
    reason === 'declined' ? 'Votre paiement a été refusé par la banque.' :
    reason === 'error' ? 'Une erreur est survenue lors du traitement du paiement.' :
    'Vous avez annulé le paiement.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement non complété</h1>
        <p className="text-gray-500 mb-8">{message} Votre commande reste enregistrée.</p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Réessayer le paiement
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Retour à l'accueil
          </button>
          <p className="text-xs text-gray-400">
            Votre commande est sauvegardée. Contactez le vendeur si besoin d'aide.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense>
      <PaymentCancelContent />
    </Suspense>
  );
}
