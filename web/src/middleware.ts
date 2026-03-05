import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SUBDOMAINS = ['api', 'app', 'admin', 'www', 'mail', 'ftp', 'static', 'cdn'];

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const { pathname } = request.nextUrl;

  // ── Dev local (localhost) — pas de subdomain routing ─────────────────────
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  // ── Domaine custom marchand (ni *.shopforge.tech ni shopforge.tech) ───────
  const isShopforgeDomain = hostname === 'shopforge.tech' || hostname.endsWith('.shopforge.tech');
  if (!isShopforgeDomain) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${apiBase}/tenants/by-domain/${encodeURIComponent(hostname)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.slug) {
          const url = request.nextUrl.clone();
          url.pathname = `/store/${data.slug}${pathname === '/' ? '' : pathname}`;
          return NextResponse.rewrite(url);
        }
      }
    } catch { /* domain not found — fall through */ }
    return NextResponse.next();
  }

  // ── Dashboard marchand (app.shopforge.tech) ───────────────────────────────
  if (hostname === 'app.shopforge.tech') {
    return NextResponse.next();
  }

  // ── Super admin (admin.shopforge.tech) → rewrite /admin/* ───────────────
  if (hostname === 'admin.shopforge.tech') {
    const url = request.nextUrl.clone();
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ── Redirect /store/[slug] → [slug].shopforge.tech (canonical URL) ─────────
  if (hostname === 'shopforge.tech' && pathname.startsWith('/store/')) {
    const match = pathname.match(/^\/store\/([^\/]+)(\/.*)?$/);
    if (match) {
      const [, slug, rest] = match;
      const url = request.nextUrl.clone();
      url.hostname = `${slug}.shopforge.tech`;
      url.pathname = rest || '/';
      return NextResponse.redirect(url, 301); // Permanent redirect
    }
  }

  // ── Store vitrine (storename.shopforge.tech) ──────────────────────────────
  const parts = hostname.split('.');
  const subdomain = parts.length >= 3 ? parts[0] : null;

  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    // Rewrite interne : demo.shopforge.tech/products/abc → /store/demo/products/abc
    // L'URL visible par le client ne change PAS
    const url = request.nextUrl.clone();
    url.pathname = `/store/${subdomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
