'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Review {
  id: string;
  rating: number;
  authorName: string;
  comment: string | null;
  createdAt: string;
}

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-lg ${i <= rating ? 'text-yellow-400' : 'text-gray-200'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => interactive && onChange?.(i)}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductReviews({ productId, storeSlug }: { productId: string; storeSlug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/reviews/product/${productId}`, {
      headers: { 'X-Tenant-Slug': storeSlug },
    })
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews ?? []);
        setCount(data.count ?? 0);
        setAvgRating(data.avgRating ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, storeSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': storeSlug },
        body: JSON.stringify({ rating, authorName, authorEmail, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erreur');
      }
      setSuccess(true);
      setShowForm(false);
      setAuthorName(''); setAuthorEmail(''); setComment(''); setRating(5);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Avis clients</h2>
          {count > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500">{avgRating}/5 ({count} avis)</span>
            </div>
          )}
        </div>
        {!showForm && !success && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Laisser un avis
          </button>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700">
          Merci pour votre avis ! Il sera visible après modération.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Votre note</label>
            <Stars rating={rating} interactive onChange={setRating} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Partagez votre expérience..." />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Envoi...' : 'Envoyer mon avis'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {count === 0 && !success ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucun avis pour le moment. Soyez le premier !</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {r.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.authorName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
