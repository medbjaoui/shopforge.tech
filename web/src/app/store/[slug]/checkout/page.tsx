'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { getTheme } from '@/lib/themes';
import { GOVERNORATES } from '@/lib/governorates';
import { imageUrl } from '@/lib/imageUrl';
import { trackCheckoutStart, trackPurchase } from '@/lib/tracker';
import {
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackPurchase as metaTrackPurchase,
} from '@/lib/meta';

interface Props { params: { slug: string } }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CouponResult { code: string; type: string; value: number; discount: number }
interface OrderConfirmation { orderNumber: string; itemCount: number; total: number }
interface StockIssue { name: string; available: number; requested: number }

export default function CheckoutPage({ params }: Props) {
  const { items, total, count, updateQty, removeItem, clear } = useCart();
  const { customer } = useCustomer();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    city: '',
    governorate: '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'CLICK_TO_PAY' | 'FLOUSSI'>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [error, setError] = useState('');

  const [shippingFee, setShippingFee] = useState(0);
  const [freeThreshold, setFreeThreshold] = useState<number | null>(null);
  const [codEnabled, setCodEnabled] = useState(true);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [bankTransferDetails, setBankTransferDetails] = useState('');
  const [clickToPayEnabled, setClickToPayEnabled] = useState(false);
  const [floussiEnabled, setFloussiEnabled] = useState(false);
  const [themeKey, setThemeKey] = useState('default');

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Post-checkout account creation modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountDone, setAccountDone] = useState(false);
  const [accountError, setAccountError] = useState('');

  // Fetch tenant settings
  useEffect(() => {
    fetch(`${API_URL}/tenants/public/${params.slug}`)
      .then((r) => r.json())
      .then((t) => {
        if (t.shippingFee != null) setShippingFee(Number(t.shippingFee));
        if (t.freeShippingThreshold != null) setFreeThreshold(Number(t.freeShippingThreshold));
        if (t.codEnabled != null) setCodEnabled(t.codEnabled);
        if (t.bankTransferEnabled != null) setBankTransferEnabled(t.bankTransferEnabled);
        if (t.bankTransferDetails) setBankTransferDetails(t.bankTransferDetails);
        if (t.clickToPayEnabled != null) setClickToPayEnabled(t.clickToPayEnabled);
        if (t.floussiEnabled != null) setFloussiEnabled(t.floussiEnabled);
        if (t.theme) setThemeKey(t.theme);
        // Default: prefer COD, else first available method
        if (!t.codEnabled) {
          if (t.bankTransferEnabled) setPaymentMethod('BANK_TRANSFER');
          else if (t.clickToPayEnabled) setPaymentMethod('CLICK_TO_PAY');
          else if (t.floussiEnabled) setPaymentMethod('FLOUSSI');
        }
      })
      .catch(() => {});
  }, [params.slug]);

  // Restore form from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`checkout_form_${params.slug}`);
    if (saved) {
      try { setForm(JSON.parse(saved)); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist form to sessionStorage on change
  useEffect(() => {
    const nonEmpty = Object.values(form).some(Boolean);
    if (nonEmpty) sessionStorage.setItem(`checkout_form_${params.slug}`, JSON.stringify(form));
  }, [form, params.slug]);

  // Pre-fill form from customer account (only if fields are still empty)
  useEffect(() => {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || `${customer.firstName} ${customer.lastName}`.trim(),
      customerEmail: prev.customerEmail || (customer.email ?? ''),
      customerPhone: prev.customerPhone || (customer.phone ?? ''),
    }));
  }, [customer]);

  // Meta — InitiateCheckout when cart is loaded
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout({ numItems: count, value: total });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fire once on mount only

  // Stock validation
  useEffect(() => {
    if (items.length === 0) { setStockIssues([]); return; }
    Promise.all(
      items.map(async (item) => {
        try {
          const res = await fetch(`${API_URL}/products/public/${item.slug}`, {
            headers: { 'X-Tenant-Slug': params.slug },
          });
          if (!res.ok) return null;
          const p = await res.json();
          const available = item.variantId
            ? (p.variants?.find((v: { id: string; stock: number }) => v.id === item.variantId)?.stock ?? p.stock)
            : p.stock;
          return available < item.quantity ? { name: item.name, available, requested: item.quantity } : null;
        } catch { return null; }
      })
    ).then((r) => setStockIssues(r.filter(Boolean) as StockIssue[]));
  }, [items, params.slug]);

  const theme = getTheme(themeKey);
  const effectiveShipping = freeThreshold && total >= freeThreshold ? 0 : shippingFee;
  const discount = coupon?.discount ?? 0;
  const grandTotal = Math.max(0, total + effectiveShipping - discount);

  const handleCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': params.slug },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: total }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.message || 'Code invalide'); return; }
      setCoupon(data);
    } catch {
      setCouponError('Erreur réseau');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setError('');
    setSubmitting(true);
    const finalCount = count;
    const finalTotal = grandTotal;
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': params.slug },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || undefined,
          shippingAddress: {
            address: form.address,
            ...(form.city ? { city: form.city } : {}),
            ...(form.governorate ? { governorate: form.governorate } : {}),
          },
          notes: form.notes || undefined,
          couponCode: coupon?.code,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            ...(i.variantId ? { variantId: i.variantId } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 403 = wallet insuffisant côté marchand — ne pas exposer ce détail interne au client
        const msg = res.status === 403
          ? 'Cette boutique est temporairement indisponible. Veuillez réessayer plus tard ou contacter le vendeur.'
          : (data.message || 'Erreur lors de la commande');
        setError(msg);
        return;
      }
      trackPurchase(data.orderNumber, finalTotal, finalCount, paymentMethod);
      metaTrackPurchase({
        orderId: data.orderId ?? data.orderNumber,
        total: finalTotal,
        numItems: finalCount,
        itemIds: items.map((i) => i.productId),
      });
      clear();
      sessionStorage.removeItem(`checkout_form_${params.slug}`);

      // Online payment: redirect to gateway
      if (paymentMethod === 'CLICK_TO_PAY' || paymentMethod === 'FLOUSSI') {
        const gateway = paymentMethod === 'CLICK_TO_PAY' ? 'clictopay' : 'floussi';
        const returnBaseUrl = window.location.origin;
        const payRes = await fetch(`${API_URL}/payments/store/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': params.slug },
          body: JSON.stringify({ orderId: data.id, gateway, returnBaseUrl }),
        });
        const payData = await payRes.json();
        if (payRes.ok && payData.paymentUrl) {
          window.location.href = payData.paymentUrl;
          return;
        }
        // Fallback: show confirmation (payment failed to initiate)
        setError(payData.message ?? 'Erreur lors de l\'initialisation du paiement. Commande créée — veuillez contacter le vendeur.');
      }

      setConfirmation({ orderNumber: data.orderNumber, itemCount: finalCount, total: finalTotal });
      if (!customer) {
        setTimeout(() => setShowAccountModal(true), 1000);
      }
    } catch {
      setError('Erreur réseau lors de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountCreate = async () => {
    if (!accountPassword || accountPassword.length < 6) {
      setAccountError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setAccountError('');
    setAccountLoading(true);
    try {
      const res = await fetch(`${API_URL}/store/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': params.slug },
        body: JSON.stringify({
          firstName: form.customerName.split(' ')[0] || form.customerName,
          lastName: form.customerName.split(' ').slice(1).join(' ') || '',
          phone: form.customerPhone,
          email: form.customerEmail || undefined,
          password: accountPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.message || 'Erreur lors de la création du compte');
        return;
      }
      setAccountDone(true);
    } catch {
      setAccountError('Erreur réseau');
    } finally {
      setAccountLoading(false);
    }
  };

  // ── Order confirmed ──────────────────────────────────────────────────────────
  if (confirmation) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {/* Account creation modal */}
        {showAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-left">
              {accountDone ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Compte créé !</h3>
                  <p className="text-sm text-gray-500 mb-5">Connectez-vous pour suivre vos commandes.</p>
                  <button
                    onClick={() => setShowAccountModal(false)}
                    className={`w-full ${theme.btn} text-white py-2.5 rounded-xl font-semibold`}
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Créer votre compte</h3>
                  <p className="text-sm text-gray-500 mb-5">Suivez vos commandes et gérez votre profil facilement.</p>

                  {form.customerEmail && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <div className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500">
                        {form.customerEmail}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>

                  {accountError && (
                    <p className="text-xs text-red-600 mb-3">{accountError}</p>
                  )}

                  <button
                    onClick={handleAccountCreate}
                    disabled={accountLoading}
                    className={`w-full ${theme.btn} text-white py-2.5 rounded-xl font-semibold mb-2 disabled:opacity-60`}
                  >
                    {accountLoading ? 'Création…' : 'Créer mon compte'}
                  </button>
                  <button
                    onClick={() => setShowAccountModal(false)}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-1.5"
                  >
                    Non merci
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-green-50 border border-green-100 rounded-2xl p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Commande confirmée !</h1>
          <p className="text-gray-500 mb-6">Merci pour votre commande. Vous serez contacté(e) bientôt.</p>

          <div className="bg-white rounded-xl border border-green-100 px-6 py-4 mb-6 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">N° de commande</span>
              <span className="font-mono font-semibold text-gray-900">{confirmation.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Articles</span>
              <span className="font-medium text-gray-900">{confirmation.itemCount} article{confirmation.itemCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-medium text-gray-700">Total</span>
              <span className="font-bold text-gray-900">{confirmation.total.toFixed(2)} TND</span>
            </div>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && bankTransferDetails && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-5 text-sm text-left">
              <p className="font-semibold text-blue-900 mb-1">Instructions de virement</p>
              <p className="text-blue-700 whitespace-pre-line">{bankTransferDetails}</p>
              <p className="text-xs text-blue-500 mt-2">Mentionnez votre n° de commande dans le libellé du virement.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={() => router.push(`/track`)}
              className={`w-full ${theme.btn} text-white py-3 rounded-xl font-semibold transition-colors`}>
              Suivre ma commande
            </button>
            <button onClick={() => router.push(`/products`)}
              className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon panier</h1>

      {/* Progress bar */}
      <div className="flex items-center mb-8">
        <button onClick={() => setStep(1)} className={`flex items-center gap-2 text-sm ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${step >= 1 ? `${theme.btn} text-white` : 'bg-gray-200 text-gray-400'}`}>1</span>
          <span className="font-medium hidden sm:inline">Panier</span>
        </button>
        <div className={`flex-1 h-0.5 mx-3 transition-colors ${step >= 2 ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`flex items-center gap-2 text-sm ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${step >= 2 ? `${theme.btn} text-white` : 'bg-gray-200 text-gray-400'}`}>2</span>
          <span className="font-medium hidden sm:inline">Livraison</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">Votre panier est vide.</p>
          <button onClick={() => router.push(`/products`)} className="text-blue-600 font-medium hover:underline">
            Voir les produits →
          </button>
        </div>
      ) : step === 1 ? (
        /* ── Step 1 : Cart + coupon + totals ── */
        <div className="space-y-4">
          {/* Stock issues banner */}
          {stockIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-red-700">⚠️ Stock insuffisant</p>
              {stockIssues.map((issue) => (
                <p key={issue.name} className="text-xs text-red-600">
                  {issue.name} — {issue.available > 0 ? `${issue.available} disponible(s)` : 'épuisé'} (demandé : {issue.requested})
                </p>
              ))}
            </div>
          )}

          {/* Cart items */}
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? ''}`}
              className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {item.image ? (
                  <Image src={imageUrl(item.image)} alt={item.name} width={64} height={64} className="w-full h-full object-cover" />
                ) : <span className="text-gray-200 text-2xl">◈</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                {item.variantName && <p className="text-xs text-blue-600">{item.variantName}</p>}
                <p className="text-sm text-gray-500">{item.price.toFixed(2)} TND / unité</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm">−</button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm">+</button>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toFixed(2)} TND</p>
                <button onClick={() => removeItem(item.productId, item.variantId)}
                  className="text-xs text-red-400 hover:text-red-600 mt-1">Retirer</button>
              </div>
            </div>
          ))}

          {/* Coupon */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Code promo</p>
            <div className="flex gap-2">
              <input value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCoupon(null); setCouponError(''); }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="VOTRE CODE" disabled={!!coupon} />
              {coupon ? (
                <button onClick={() => { setCoupon(null); setCouponInput(''); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">✕</button>
              ) : (
                <button onClick={handleCoupon} disabled={couponLoading || !couponInput.trim()}
                  className={`px-4 py-2 ${theme.btn} text-white rounded-lg text-sm font-medium disabled:opacity-50`}>
                  {couponLoading ? '...' : 'Appliquer'}
                </button>
              )}
            </div>
            {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            {coupon && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-sm font-semibold text-green-700">
                  🎉 Vous économisez {coupon.discount.toFixed(2)} TND avec ce coupon !
                </p>
                <p className="text-xs text-green-600">
                  Code {coupon.code} — {coupon.type === 'PERCENT' ? `${coupon.value}% de réduction` : `${Number(coupon.value).toFixed(2)} TND de réduction`}
                </p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total ({count} article{count > 1 ? 's' : ''})</span>
              <span>{total.toFixed(2)} TND</span>
            </div>
            {shippingFee > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Livraison{effectiveShipping === 0 ? ' (offerte ✓)' : ''}</span>
                <span className={effectiveShipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {effectiveShipping === 0 ? 'Gratuit' : `${effectiveShipping.toFixed(3)} TND`}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Réduction coupon</span>
                <span>-{discount.toFixed(2)} TND</span>
              </div>
            )}
            {freeThreshold && total < freeThreshold && shippingFee > 0 && (
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-700 font-medium mb-1.5">
                  Plus que {(freeThreshold - total).toFixed(2)} TND pour la livraison gratuite !
                </p>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (total / freeThreshold) * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">{grandTotal.toFixed(2)} TND</span>
            </div>
          </div>

          <button
            onClick={() => { trackCheckoutStart(grandTotal, count); trackAddPaymentInfo(paymentMethod); setStep(2); }}
            disabled={stockIssues.length > 0}
            className={`w-full ${theme.btn} text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50`}
          >
            Continuer vers la livraison →
          </button>
        </div>
      ) : (
        /* ── Step 2 : Delivery form ── */
        <div>
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
            ← Retour au panier
          </button>

          {/* Order recap — full product list */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Récapitulatif</p>
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-100">
                  {item.image
                    ? <Image src={imageUrl(item.image)} alt={item.name} width={40} height={40} className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-gray-300 text-lg">◈</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  {item.variantName && <p className="text-xs text-blue-600">{item.variantName}</p>}
                  <p className="text-xs text-gray-400">× {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{(item.price * item.quantity).toFixed(2)} TND</p>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 space-y-1">
              {effectiveShipping > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Livraison</span><span>{effectiveShipping.toFixed(3)} TND</span>
                </div>
              )}
              {effectiveShipping === 0 && shippingFee > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Livraison offerte ✓</span><span>Gratuit</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs text-green-600 font-medium">
                  <span>Réduction coupon</span><span>-{discount.toFixed(2)} TND</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                <span>Total</span><span>{grandTotal.toFixed(2)} TND</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Vos informations</h2>

            {/* Customer pre-fill notice */}
            {customer && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 mb-4 flex items-center gap-2">
                <span>✓</span>
                <span>Connecté en tant que <strong>{customer.firstName}</strong> — formulaire pré-rempli</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
            )}

            {/* Payment method selector */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mode de paiement</p>
              {!codEnabled && !bankTransferEnabled && !clickToPayEnabled && !floussiEnabled ? (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  Aucun moyen de paiement disponible pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {codEnabled && (
                    <label className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')} className="accent-green-500" />
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base flex-shrink-0">💵</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Paiement à la livraison</p>
                        <p className="text-xs text-gray-500">Payez en espèces à la réception</p>
                      </div>
                    </label>
                  )}
                  {bankTransferEnabled && (
                    <label className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 cursor-pointer transition-colors ${paymentMethod === 'BANK_TRANSFER' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'}
                        onChange={() => setPaymentMethod('BANK_TRANSFER')} className="accent-blue-500" />
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-base flex-shrink-0">🏦</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Virement bancaire</p>
                        <p className="text-xs text-gray-500">Coordonnées bancaires après confirmation</p>
                      </div>
                    </label>
                  )}
                  {clickToPayEnabled && (
                    <label className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 cursor-pointer transition-colors ${paymentMethod === 'CLICK_TO_PAY' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="CLICK_TO_PAY" checked={paymentMethod === 'CLICK_TO_PAY'}
                        onChange={() => setPaymentMethod('CLICK_TO_PAY')} className="accent-orange-500" />
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-orange-600"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">Paiement par carte</p>
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">ClicToPay</span>
                        </div>
                        <p className="text-xs text-gray-500">Carte bancaire tunisienne ou internationale — paiement sécurisé</p>
                      </div>
                    </label>
                  )}
                  {floussiEnabled && (
                    <label className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 cursor-pointer transition-colors ${paymentMethod === 'FLOUSSI' ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="FLOUSSI" checked={paymentMethod === 'FLOUSSI'}
                        onChange={() => setPaymentMethod('FLOUSSI')} className="accent-purple-500" />
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-purple-600"><path d="M17 1H7C5.9 1 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 20c-.83 0-1.5-.67-1.5-1.5S11.17 18 12 18s1.5.67 1.5 1.5S12.83 21 12 21zm5-4H7V4h10v13z"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">Paiement mobile</p>
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Floussi</span>
                        </div>
                        <p className="text-xs text-gray-500">Portefeuille mobile Floussi — rapide et sécurisé</p>
                      </div>
                    </label>
                  )}
                </div>
              )}
              {/* Bank transfer instructions inline */}
              {paymentMethod === 'BANK_TRANSFER' && bankTransferDetails && (
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                  <p className="font-semibold mb-1">Coordonnées bancaires</p>
                  <p className="whitespace-pre-line">{bankTransferDetails}</p>
                </div>
              )}
              {/* Online payment info */}
              {(paymentMethod === 'CLICK_TO_PAY' || paymentMethod === 'FLOUSSI') && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Vous serez redirigé(e) vers la page de paiement sécurisée après validation de votre commande.</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom complet *</label>
                <input type="text" value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className={INP} placeholder="Mohamed Ben Ali" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
                <input type="tel" value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className={INP} placeholder="+216 XX XXX XXX" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className={INP} placeholder="email@exemple.com" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Adresse de livraison *</label>
                <input type="text" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={INP} placeholder="Rue, N°, Cité, Appartement..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gouvernorat *</label>
                  <select value={form.governorate}
                    onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                    className={`${INP} bg-white`} required>
                    <option value="">Sélectionner...</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                  <input type="text" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={INP} placeholder="Ex: La Marsa" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instructions <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} className={`${INP} resize-none`}
                  placeholder="Étage, code d'entrée, disponibilité..." />
              </div>
              <button type="submit"
                disabled={submitting || items.length === 0 || (!codEnabled && !bankTransferEnabled && !clickToPayEnabled && !floussiEnabled) || stockIssues.length > 0}
                className={`w-full ${theme.btn} text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-colors mt-2`}>
                {submitting
                  ? (paymentMethod === 'CLICK_TO_PAY' || paymentMethod === 'FLOUSSI') ? 'Redirection...' : 'Envoi en cours...'
                  : `Commander — ${grandTotal.toFixed(2)} TND`}
              </button>
            </form>

            {/* Trust badges */}
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2.5">
              {[
                { icon: '🔒', label: 'Paiement sécurisé' },
                { icon: '🚚', label: 'Livraison rapide' },
                { icon: '↩', label: 'Retours faciles' },
                { icon: '✓', label: 'Confirmation par email' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400';
