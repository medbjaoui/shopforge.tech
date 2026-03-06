# Implementation: Revenue Dashboard & Platform Analytics

**Date:** 2026-03-06
**Status:** ✅ Completed & Deployed

---

## 📋 Overview

Implemented a comprehensive revenue tracking and visualization system for ShopForge admin interface, clearly separating merchant revenue (marketplace activity) from platform revenue (actual ShopForge earnings).

---

## 🎯 What Was Built

### 1. New Admin Page: `/admin/revenue`

**Location:** `web/src/app/admin/revenue/page.tsx`

**Features:**
- **KPI Cards:**
  - CA Total (total platform revenue)
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue = MRR × 12)
  - Current month revenue with growth percentage

- **Revenue Breakdown:**
  - Visual breakdown by type (Commissions vs Subscriptions)
  - Percentage distribution
  - Color-coded progress bars (green for commissions, purple for subscriptions)

- **Historical Chart:**
  - Interactive bar chart showing 6/12/24 months evolution
  - Hover tooltips with detailed breakdown
  - Highlight current month

- **Data Table:**
  - Monthly breakdown of commissions and subscriptions
  - Transaction counts
  - Total revenue per period

- **Info Boxes:**
  - Clear explanation: CA = commissions + subscriptions only (TOPUP excluded)
  - MRR & ARR definitions

### 2. Enhanced Main Dashboard: `/admin`

**Updated:** `web/src/app/admin/page.tsx`

**Changes:**
- Changed grid from 4 to 5 columns to accommodate new KPI
- Split revenue display:
  - **CA Marchands** - Total order amounts (marketplace volume)
  - **CA ShopForge** - Platform revenue (commissions + subscriptions)
- New KPI links to `/admin/revenue` page
- Highlighted platform revenue card

### 3. Backend Enhancements

**Updated:** `api/src/modules/admin/admin.service.ts`

**Changes:**
- Added `platformRevenue` aggregation to `/admin/stats` endpoint
- Fetches from `platform_revenue` table alongside merchant revenue
- Properly filtered by date range (supports 7/30 day filters)

**Result:** Main dashboard now shows both:
```typescript
{
  totalRevenue: 70.00,        // Sum of all order amounts
  platformRevenue: 2.100,     // Sum of platform_revenue.amount
  ...
}
```

### 4. Navigation Updates

**Updated:** `web/src/app/admin/layout.tsx`

**Changes:**
- Added "Revenus CA" link in "Analytique" section
- Positioned as 2nd item (after Dashboard, before Performance)
- Uses WalletIcon for visual consistency

---

## 📊 Data Architecture

### Platform Revenue Sources

```
┌─────────────────────────────────────────┐
│         PLATFORM REVENUE (CA)           │
│                                         │
│  ┌────────────────┐  ┌────────────────┐│
│  │  COMMISSIONS   │  │ SUBSCRIPTIONS  ││
│  ├────────────────┤  ├────────────────┤│
│  │ FREE: 3%       │  │ STARTER: 29TND ││
│  │ STARTER: 1.5%  │  │ PRO: 79 TND    ││
│  │ PRO: 0.5%      │  │ (monthly)      ││
│  │                │  │                ││
│  │ Collected on   │  │ Billed 1st of  ││
│  │ DELIVERED      │  │ each month     ││
│  │ orders         │  │ (cron job)     ││
│  └────────────────┘  └────────────────┘│
└─────────────────────────────────────────┘
```

### Database Tables

**`platform_revenue`** (NEW - tracks actual earnings)
```sql
- id: string (cuid)
- type: COMMISSION | SUBSCRIPTION
- tenantId: string
- amount: Decimal(10,3)
- orderId: string? (for commissions)
- period: string? (format: 'YYYY-MM' for subscriptions)
- plan: PlanType?
- note: string?
- createdAt: DateTime
```

**`commission_records`** (EXISTING - tracks commission calculations)
```sql
- id: string
- tenantId: string
- walletId: string
- orderId: string (unique)
- orderAmount: Decimal
- commissionRate: Decimal
- commissionAmount: Decimal
- status: COLLECTED | REFUNDED
- createdAt: DateTime
```

**Relationship:**
- When commission is deducted → creates `commission_records` entry
- Simultaneously → creates `platform_revenue` entry (type: COMMISSION)
- This ensures financial accuracy and audit trail

---

## 🔄 Integration Points

### Automatic Revenue Recording

**File:** `api/src/modules/wallet/wallet.service.ts`

**Method:** `deductCommission()`

```typescript
// After deducting from wallet and creating commission record:
await this.platformRevenue.recordCommission(
  tenantId,
  orderId,
  commissionAmount,
  plan
);
```

**When:** Triggered automatically when order status changes to `DELIVERED`

### Subscription Billing (Future)

**File:** `api/src/modules/scheduler/scheduler.service.ts`

**Method:** `chargeMonthlyPlanFees()`

```typescript
@Cron('0 1 1 * *') // 1st of month, 1am
async chargeMonthlyPlanFees() {
  // For each STARTER/PRO tenant:
  // 1. Deduct from wallet
  // 2. Record platform revenue (type: SUBSCRIPTION)
}
```

**Note:** This cron job is already implemented and will start generating subscription revenue data from next month.

---

## 📈 Current Production Data

As of deployment (2026-03-06):

```
Platform Revenue Summary:
├── Total Revenue: 2.100 TND
├── Commissions: 2.100 TND (1 transaction)
├── Subscriptions: 0 TND (0 transactions)
├── MRR: 0 TND
└── ARR: 0 TND

Merchant Activity:
├── Total Orders: ~X orders
├── Delivered Orders: 1 order
├── Merchant Revenue: 70.00 TND
└── Active Tenants: 1 tenant (FREE plan)
```

**Note:** Subscription billing will begin on 2026-04-01 when cron job runs for the first time.

---

## 🎨 UI/UX Design Decisions

### Color Coding

- **Platform Revenue (ShopForge CA):** Highlighted with gradient (orange/indigo)
- **Merchant Revenue:** Standard card styling
- **Commissions:** Green gradient (emerald → green)
- **Subscriptions:** Purple gradient (indigo → purple)

### Information Architecture

1. **Main Dashboard (`/admin`):**
   - High-level overview
   - Both merchant and platform metrics
   - Quick navigation to detailed pages

2. **Revenue Dashboard (`/admin/revenue`):**
   - Deep dive into platform earnings
   - Focus on MRR/ARR for SaaS metrics
   - Historical trends and growth

3. **Billing Dashboard (`/admin/billing`):**
   - Existing page (unchanged)
   - May be consolidated in future

### Responsive Design

- **Desktop:** 5-column KPI grid on main dashboard
- **Tablet:** 2-column layout
- **Mobile:** Single column stack

---

## ✅ Verification & Testing

### Database Checks Performed

1. ✅ Verified `platform_revenue` table exists
2. ✅ Confirmed commission records import
3. ✅ Checked historical data migration (1 commission imported)
4. ✅ Validated aggregation queries

### Deployment Verification

1. ✅ API container rebuilt and restarted
2. ✅ Web container rebuilt and restarted
3. ✅ Build successful (no TypeScript errors)
4. ✅ Navigation link appears in sidebar
5. ✅ Page renders correctly in production

### Endpoints Available

```
GET /admin/revenue/summary
├── Returns: totalRevenue, MRR, ARR, revenueByType, thisMonth

GET /admin/revenue/history?months=12
├── Returns: Array of monthly revenue breakdown

GET /admin/revenue/mrr
├── Returns: Current MRR and active subscriptions

GET /admin/stats
├── NOW INCLUDES: platformRevenue field
```

---

## 📝 Key Differences: Merchant Revenue vs Platform Revenue

### Merchant Revenue (CA Marchands)
- **Source:** Sum of all order `totalAmount`
- **Meaning:** Total sales volume on the platform
- **Who benefits:** Merchants (tenants)
- **Example:** 1 order × 70 TND = 70 TND merchant revenue

### Platform Revenue (CA ShopForge)
- **Source:** Sum of `platform_revenue.amount`
- **Meaning:** ShopForge's actual earnings
- **Who benefits:** ShopForge (platform)
- **Example:** 1 order × 70 TND × 3% = 2.10 TND platform revenue

### Why This Matters
- **Before:** Only tracked merchant revenue → inflated perception of earnings
- **After:** Clear separation → accurate financial reporting
- **Impact:** Admin can now see real platform profitability

---

## 🚀 Future Enhancements

### Short Term (Next Sprint)
- [ ] Export revenue data to CSV/Excel
- [ ] Add revenue alerts (e.g., "MRR dropped by X%")
- [ ] Show commission rate changes over time
- [ ] Add tenant contribution ranking

### Medium Term
- [ ] Revenue forecasting (ML-based predictions)
- [ ] Cohort analysis (revenue by signup month)
- [ ] Churn analysis (canceled subscriptions)
- [ ] Compare to industry benchmarks

### Long Term
- [ ] Full financial dashboard (P&L, balance sheet)
- [ ] Integration with accounting software
- [ ] Automated tax reporting
- [ ] Multi-currency support

---

## 🐛 Known Limitations

1. **Historical Data:** Only commissions recorded after deployment appear in `platform_revenue`
   - **Workaround:** Imported existing commission (1 record)
   - **Future:** Run migration script for full history if needed

2. **Subscription Revenue:** Will only appear after first cron job run (2026-04-01)
   - **Impact:** MRR/ARR currently show 0
   - **Resolution:** Automatic once subscriptions are billed

3. **Real-time Updates:** Dashboard requires page refresh
   - **Future Enhancement:** WebSocket for live updates

4. **First Month Free:** Tenants in first 30 days don't contribute commission revenue
   - **By Design:** This is intentional per business rules
   - **Tracking:** `tenant.firstMonthCommissionFree` field tracks this

---

## 📚 Related Documentation

- [AUDIT_FINANCIER.md](./AUDIT_FINANCIER.md) - Financial audit and analysis
- [MEMOIRE_MODIFICATIONS.md](./MEMOIRE_MODIFICATIONS.md) - Complete change log
- [api/src/common/billing/plan-limits.ts](./api/src/common/billing/plan-limits.ts) - Plan pricing and limits

---

## 👥 Access

**URL:** https://shopforge.tech/admin/revenue

**Credentials:**
- Email: admin@shopforge.tech
- Password: ShopForge2026!

**Required:** Super admin authentication (JWT with `isAdmin: true`)

---

## ✨ Summary

Successfully implemented a complete revenue tracking and visualization system that:

✅ Clearly separates merchant activity from platform earnings
✅ Provides actionable SaaS metrics (MRR, ARR)
✅ Shows historical trends with interactive charts
✅ Integrates seamlessly with existing admin interface
✅ Automatically records revenue from commissions and subscriptions
✅ Deployed and verified in production

The platform now has full visibility into its financial performance, enabling data-driven business decisions.

---

**Deployed by:** Claude Code Agent
**Deployment Date:** 2026-03-06 21:30 UTC
**Status:** ✅ Production Ready
