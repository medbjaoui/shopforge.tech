# 📝 MÉMOIRE DES MODIFICATIONS - SHOPFORGE
**Dernière mise à jour**: 6 Mars 2026

---

## 🎯 PHASE 1 : Correction Plans & Commissions (6 Mars 2026)

### 1. Plan FREE - Limite produits
**Problème**: Plan FREE permettait 10 produits, requis = 5 produits

**Solution**:
- ✅ Modifié `PLAN_LIMITS.FREE.maxProducts` : 10 → 5
- ✅ Fichier: `api/src/common/billing/plan-limits.ts:14`
- ✅ Appliqué dans configs statiques et dynamiques

### 2. Premier mois gratuit (tous les plans)
**Besoin**: 50 commandes gratuites le 1er mois pour TOUS les plans

**Solution**:
- ✅ Ajouté champs au modèle `Tenant`:
  - `firstMonthCommissionFree: Boolean @default(true)`
  - `firstMonthEndsAt: DateTime` (calculé: createdAt + 30 jours)
- ✅ Migration Prisma créée et appliquée: `20260306202336_add_first_month_commission_free`
- ✅ Tous les tenants existants mis à jour automatiquement

### 3. Système de commissions amélioré
**Modification**: `wallet.service.ts:deductCommission()`

**Logique**:
```typescript
if (tenant.firstMonthCommissionFree && now < firstMonthEndsAt) {
  // Premier mois → Pas de commission
  return;
}

// Après 1er mois → Commission normale
const commission = orderAmount × rate;
wallet.balance -= commission;
```

**Taux de commission**:
- FREE: 3%
- STARTER: 1.5%
- PRO: 0.5%

### 4. Analytics - Section Livraisons
**Ajouté**:
- ✅ Méthode `getMerchantShippingStats()` dans analytics.service.ts
- ✅ Endpoint `GET /analytics/shipping`
- ✅ Section UI "📦 Livraisons & Commissions" dans dashboard

**Données affichées**:
- Colis livrés (période + total)
- Mes contributions (commissions payées)
- Badge "🎁 X jours gratuits restants"
- Plan actuel

---

## 📊 PHASE 2 : Audit Financier & Corrections (6 Mars 2026)

### Audit complet réalisé
**Expert**: Finance & Analytique
**Document**: `AUDIT_FINANCIER.md`

### Découvertes critiques

#### 1. TOPUP ≠ Chiffre d'Affaires ⚠️
**Problème identifié**:
```
❌ Les TOPUP (recharges wallet) étaient considérés comme du CA
✅ TOPUP = Dépôt marchand (passif comptable)
✅ Commission = Revenu plateforme (actif)
```

**Clarification**:
- TOPUP = Comme recharger une carte prépayée
- Doit être restitué si marchand quitte
- **NE COMPTE PAS dans le CA de ShopForge**

#### 2. Pas de facturation mensuelle des plans 🚨
**Problème**:
```
STARTER: 29 TND/mois → jamais facturé
PRO: 79 TND/mois → jamais facturé
```

**Impact**:
- Perte de revenus récurrents
- MRR = 0 TND
- Marchands utilisent plans payants gratuitement

#### 3. CA Plateforme mal suivi
**Manque**:
- Aucun dashboard admin pour CA
- Pas de métriques MRR/ARR
- Confusion entre TOPUP et revenus réels

### Solutions à implémenter

#### A. Table `platform_revenue`
```sql
CREATE TABLE platform_revenue (
  id TEXT PRIMARY KEY,
  type TEXT, -- 'COMMISSION' | 'SUBSCRIPTION'
  tenantId TEXT,
  amount DECIMAL(10,3),
  orderId TEXT REFERENCES orders(id),
  period TEXT, -- '2026-03' pour subscriptions
  createdAt TIMESTAMP DEFAULT NOW()
);
```

#### B. Cron job facturation mensuelle
```typescript
@Cron('0 0 1 * *') // 1er de chaque mois
async chargeMonthlyPlanFees() {
  const tenants = await findAll({
    plan: ['STARTER', 'PRO'],
    isActive: true
  });

  for (const tenant of tenants) {
    const planPrice = getPlanPrice(tenant.plan);

    // Déduire du wallet
    await wallet.deduct({
      type: 'PLAN_FEE',
      amount: planPrice,
      description: `Abonnement ${tenant.plan}`
    });

    // Enregistrer revenu plateforme
    await platformRevenue.create({
      type: 'SUBSCRIPTION',
      tenantId,
      amount: planPrice,
      period: getCurrentMonth()
    });
  }
}
```

#### C. Dashboard Super Admin CA
**Métriques à afficher**:
- CA Total (commissions + subscriptions)
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Commissions ce mois
- Abonnements actifs
- Graphique évolution CA

---

## 💰 FLUX FINANCIERS CLARIFIÉS

### Revenus Plateforme (CA)
```
1. Commissions sur livraisons
   - Calcul: orderAmount × rate
   - Moment: Quand order.status = DELIVERED
   - Déduction: Wallet marchand

2. Prix plans mensuels (à implémenter)
   - FREE: 0 TND/mois
   - STARTER: 29 TND/mois
   - PRO: 79 TND/mois
   - Facturation: 1er de chaque mois
```

### Passifs (Non-revenus)
```
1. TOPUP Wallet
   - Recharges marchands
   - Utilisé pour payer commissions futures
   - Doit être restitué si marchand quitte
   - ⚠️ NE COMPTE PAS DANS LE CA
```

---

## 🎯 LIMITES PLANS FINALES

### FREE
- Produits: **5 maximum**
- Commandes: **50/mois**
- Commission: **3%** (après 1er mois)
- Prix: **0 TND/mois**
- 🎁 50 commandes gratuites le 1er mois

### STARTER
- Produits: **100 maximum**
- Commandes: **500/mois**
- Commission: **1.5%** (après 1er mois)
- Prix: **29 TND/mois** (à implémenter)
- 🎁 50 commandes gratuites le 1er mois

### PRO
- Produits: **Illimité**
- Commandes: **Illimité**
- Commission: **0.5%** (après 1er mois)
- Prix: **79 TND/mois** (à implémenter)
- 🎁 50 commandes gratuites le 1er mois

---

## 📈 CYCLE DE VIE COMMANDE

```
1. PENDING
   → Stock décrémenté
   → Pas de transaction financière

2. CONFIRMED
   → Facture générée automatiquement
   → Pas de transaction financière

3. PROCESSING
   → Préparation commande
   → Pas de transaction financière

4. SHIPPED
   → Shipment créé automatiquement
   → Pas de transaction financière

5. DELIVERED ⭐ POINT CLÉ
   → Commission calculée: orderAmount × rate
   → Si hors 1er mois: Commission déduite du wallet
   → CommissionRecord créé (status: COLLECTED)
   → PlatformRevenue créé (à implémenter)
   → CA Plateforme += commission

6. RETURNED / REFUNDED
   → Commission remboursée au marchand
   → CommissionRecord (status: REFUNDED)
   → Stock réincrémenté
   → CA Plateforme -= commission
```

---

## 🔧 MODIFICATIONS TECHNIQUES

### Fichiers modifiés - Phase 1 & 2
1. `api/prisma/schema.prisma`
   - Ajout: `firstMonthCommissionFree`, `firstMonthEndsAt` au Tenant
   - Ajout: modèle `PlatformRevenue` et enum `PlatformRevenueType`

2. `api/src/common/billing/plan-limits.ts`
   - FREE: maxProducts 10 → 5

3. `api/src/modules/wallet/wallet.service.ts`
   - Ajout: Logique premier mois gratuit dans `deductCommission()`
   - Ajout: Appels `platformRevenue.recordCommission()` et `refundCommission()`

4. `api/src/modules/analytics/analytics.service.ts`
   - Ajout: Méthode `getMerchantShippingStats()`

5. `api/src/modules/analytics/analytics.controller.ts`
   - Ajout: Endpoint `GET /analytics/shipping`

6. `web/src/app/dashboard/analytics/page.tsx`
   - Ajout: Section "📦 Livraisons & Commissions"

### Fichiers créés - Phase 3
7. `api/src/modules/platform-revenue/platform-revenue.service.ts`
   - Service complet de tracking CA

8. `api/src/modules/platform-revenue/platform-revenue.controller.ts`
   - Endpoints admin revenue

9. `api/src/modules/platform-revenue/platform-revenue.module.ts`
   - Module revenue

10. `api/src/modules/scheduler/scheduler.service.ts`
    - Ajout: Cron job `chargeMonthlyPlanFees()` (1er de chaque mois)

### Migrations Prisma
- `20260306202336_add_first_month_commission_free`
  - Ajout colonnes `firstMonthCommissionFree`, `firstMonthEndsAt`
  - Migration auto des tenants existants

- `20260306205034_add_platform_revenue`
  - Création table `platform_revenue`
  - Création enum `PlatformRevenueType`
  - Index et foreign keys

---

## ✅ PHASE 3 TERMINÉE : Système Tracking CA & Facturation

### ✅ Implémentations complétées
- [x] Créer table `platform_revenue` avec enum `PlatformRevenueType`
- [x] Créer service `PlatformRevenueService` (10+ méthodes)
- [x] Implémenter cron job facturation mensuelle (1er de chaque mois)
- [x] Modifier `deductCommission()` pour créer PlatformRevenue automatiquement
- [x] Endpoints admin: `GET /admin/revenue/*` (summary, history, mrr, etc.)
- [x] Métriques: CA total, MRR, ARR, par type
- [x] Gestion wallet insuffisant (email d'alerte)
- [x] Migration appliquée et déployée en production

---

## ✅ À FAIRE (Prochaines étapes)

### Priorité 1 : Dashboard Admin UI Frontend
- [ ] Créer page admin dashboard CA (`/admin/revenue`)
- [ ] Graphique évolution CA (Chart.js ou Recharts)
- [ ] Cards métriques KPI (CA total, MRR, ARR)
- [ ] Liste transactions platform_revenue récentes
- [ ] Export données CSV/Excel

### Priorité 2 : Gestion Tenants suspendus
- [ ] Suspendre automatiquement si wallet < planPrice après 7 jours
- [ ] Email de relance J+3, J+5, J+7
- [ ] Réactivation automatique après rechargement wallet
- [ ] Bloquer création commandes si tenant suspendu

### Priorité 3 : Affichage Plans
- [ ] Mettre à jour page d'accueil avec limites correctes
- [ ] Mettre à jour page billing/pricing
- [ ] Afficher "🎁 1er mois gratuit (50 commandes)" sur tous les plans
- [ ] Clarifier FREE = 5 produits max
- [ ] Mentionner facturation mensuelle pour STARTER (29 TND) et PRO (79 TND)

---

## 📊 MÉTRIQUES ACTUELLES (6 Mars 2026)

### Financier
```
CA Total: 2.100 TND (commissions uniquement)
MRR: 0 TND (facturation plans non implémentée)
TOPUP reçus: 30 TND (non-revenu, dépôts marchands)
```

### Tenants
```
Total tenants: 2
Tenants avec wallet: 2
Commissions collectées: 1
```

### Transactions
```
WELCOME: 2 × 15 TND = 30 TND
COMMISSION: 1 × 2.100 TND
```

---

## 🎓 LEÇONS APPRISES

1. **TOPUP ≠ Revenu**
   - Dépôt client = passif comptable
   - Seules les commissions et abonnements = CA

2. **Plans mensuels = MRR critique**
   - Revenus récurrents = stabilité financière
   - Facturation automatique indispensable

3. **Premier mois gratuit**
   - Excellent pour acquisition
   - Bien implémenté avec flag + date expiration

4. **Tracking CA essentiel**
   - Dashboard admin indispensable
   - Séparer clairement passifs vs actifs

---

---

## 🔐 PHASE 4 : Audit Rôles & Permissions (6 Mars 2026)

### Audit complet réalisé
**Experts consultés**:
- Directeur Technique SaaS (SuperAdmin)
- E-commerce Manager (Merchant)
- Directeur Marketing Digital (Merchant)
- Responsable Logistique (Merchant)
- UX Designer E-commerce (Customer)
- Expert Sécurité Applicative (RBAC)

**Document**: `AUDIT_ROLES_PERMISSIONS.md`

### 🔴 DÉCOUVERTE CRITIQUE: RBAC Inexistant

**Problème majeur identifié**:
```typescript
// Schéma Prisma définit 3 rôles:
enum UserRole {
  OWNER  // Propriétaire boutique
  ADMIN  // Administrateur
  STAFF  // Employé
}

// MAIS tous les endpoints utilisent uniquement:
@UseGuards(JwtAuthGuard)

// Aucune restriction par rôle!
// ❌ Pas de @Roles() decorator
// ❌ Pas de RolesGuard
```

**Conséquence critique**:
Un simple **STAFF** (employé) peut actuellement:
- ❌ Modifier tous les paramètres de la boutique
- ❌ Voir le wallet et toutes les finances
- ❌ Créer/supprimer d'autres utilisateurs
- ❌ Configurer les moyens de paiement
- ❌ Changer le plan d'abonnement
- ❌ Accéder aux analytics financières

**Risque**: Sécurité et séparation des responsabilités inexistante.

---

### 📊 Scores de Maturité par Rôle

| Rôle | Score Actuel | Score Cible | Gap | Problèmes Principaux |
|------|--------------|-------------|-----|---------------------|
| **SuperAdmin** | 7.5/10 | 9/10 | +1.5 | Audit logs, bulk operations, support ticketing |
| **Merchant OWNER** | 6/10 | 9/10 | +3 | RBAC, CRM, coupons UI, inventory UI, email marketing |
| **Merchant ADMIN** | 0/10 🔴 | 8/10 | +8 | RBAC totalement inexistant |
| **Merchant STAFF** | 0/10 🔴 | 7/10 | +7 | RBAC totalement inexistant |
| **Customer** | 7/10 | 8.5/10 | +1.5 | Avis produits UI, profil éditable, adresses multiples |

**Moyenne globale**: 4.1/10 → Cible: 8.3/10

---

### 📋 Inventaire Complet Plateforme

#### API Backend
- **SuperAdmin**: 39 endpoints
- **Merchant**: 114 endpoints (TOUS accessibles par OWNER/ADMIN/STAFF sans distinction!)
- **Customer**: 22 endpoints
- **Public**: 20 endpoints
- **Total**: 175+ endpoints

#### Frontend Pages
- **Dashboard Merchant**: 14 pages (7 actives, 4 VIDES, 3 partielles)
- **Admin SuperAdmin**: 15 pages
- **Store Customer**: 14 pages
- **Public/Auth**: 6 pages

---

### 🔴 4 Pages Dashboard VIDES (APIs existent!)

Ces pages affichent un "empty state" alors que les APIs backend sont COMPLÈTES:

1. **`/dashboard/customers`** - CRM Client
   - ✅ API: 20+ endpoints (CRUD, tags, segments, export CSV)
   - ❌ UI: Empty state
   - Impact: Aucune gestion clients (critique e-commerce)

2. **`/dashboard/coupons`** - Gestion Coupons
   - ✅ API: 6 endpoints (CRUD, validation)
   - ❌ UI: Empty state
   - Impact: Aucune promotion possible

3. **`/dashboard/inventory`** - Gestion Stock
   - ✅ API: 4 endpoints (mouvements, ajustements, export CSV)
   - ❌ UI: Empty state
   - Impact: Pas d'alertes stock, pas d'historique

4. **`/dashboard/reviews`** - Modération Avis
   - ✅ API: 3 endpoints (liste, approbation, suppression)
   - ❌ UI: Empty state
   - Impact: Avis clients invisibles (perte confiance)

**Estimation**: 2 sprints pour activer ces 4 pages (APIs prêtes).

---

### 🎯 PLAN D'ACTION PRIORISÉ

#### Phase 4.1: CRITIQUE - Sécurité (Sprint 1-2) ⏱️ 2-4 semaines

**🔴 Priorité 1: Implémenter RBAC**

1. **Créer RolesGuard**
   ```typescript
   // api/src/common/guards/roles.guard.ts
   @Injectable()
   export class RolesGuard implements CanActivate {
     constructor(private reflector: Reflector) {}

     canActivate(context: ExecutionContext): boolean {
       const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
         ROLES_KEY,
         [context.getHandler(), context.getClass()]
       );

       if (!requiredRoles) return true;

       const { user } = context.switchToHttp().getRequest();
       return requiredRoles.some((role) => user.role === role);
     }
   }
   ```

2. **Créer decorator @Roles()**
   ```typescript
   // api/src/common/decorators/roles.decorator.ts
   export const ROLES_KEY = 'roles';
   export const Roles = (...roles: UserRole[]) =>
     SetMetadata(ROLES_KEY, roles);
   ```

3. **Appliquer sur endpoints sensibles**
   ```typescript
   // Exemple: tenants.controller.ts
   @Roles(UserRole.OWNER)
   @Patch('me')
   async updateSettings() { }

   @Roles(UserRole.OWNER, UserRole.ADMIN)
   @Post('products')
   async createProduct() { }

   @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
   @Patch('orders/:id/status')
   async updateOrderStatus() { }
   ```

4. **Tests E2E permissions**
   - Tester que STAFF ne peut pas accéder aux settings
   - Tester que ADMIN ne peut pas voir le wallet
   - Tester que OWNER a tous les droits

**Fichiers à modifier**: ~20 controllers

---

**🔴 Priorité 2: Activer les 4 pages vides**

5. **CRM Clients** (`/dashboard/customers`)
   - Liste clients avec filtres (VIP, actifs, inactifs)
   - Historique achats par client
   - Tags/segments personnalisés
   - Notes privées
   - Export CSV (API existe)

   Fichier: `web/src/app/dashboard/customers/page.tsx`

6. **Gestion Coupons** (`/dashboard/coupons`)
   - CRUD coupons (API existe)
   - Types: pourcentage, montant fixe
   - Conditions: montant min, usage max, expiration
   - Statistiques utilisation

   Fichier: `web/src/app/dashboard/coupons/page.tsx`

7. **Gestion Stock** (`/dashboard/inventory`)
   - Alertes stock faible
   - Historique mouvements (API existe)
   - Ajustements manuels
   - Export CSV (API existe)

   Fichier: `web/src/app/dashboard/inventory/page.tsx`

8. **Modération Avis** (`/dashboard/reviews`)
   - Liste avis pending/approved/rejected (API existe)
   - Approbation/rejet en masse
   - Statistiques notes moyennes
   - Réponse aux avis

   Fichier: `web/src/app/dashboard/reviews/page.tsx`

**Estimation**: 2-3 jours par page = 8-12 jours total

---

#### Phase 4.2: IMPORTANT - Expérience Client (Sprint 3-4) ⏱️ 2-4 semaines

**🟠 Priorité 3: Avis Produits**

9. **Afficher avis sur pages produits**
   - Stars rating visible
   - Liste avis approuvés (API existe)
   - Tri (plus récents, plus utiles)
   - Photos clients

   Fichier: `web/src/app/store/[slug]/products/[productSlug]/page.tsx`

10. **Workflow soumission avis post-achat**
    - Email automatique J+7 après livraison
    - Formulaire avis (note + commentaire + photo)
    - Badge "achat vérifié"

**🟠 Priorité 4: Profil Client**

11. **Édition profil client**
    - Modifier nom/prénom/email
    - Changement mot de passe
    - Téléphone de secours

    Fichier: `web/src/app/store/[slug]/account/page.tsx`

12. **Adresses multiples**
    - Carnet d'adresses
    - Adresse par défaut
    - Labels (Domicile, Bureau)
    - Sélection rapide au checkout

13. **Demande retour/annulation UI**
    - Bouton "Annuler commande" (si PENDING/CONFIRMED)
    - Formulaire retour avec raison
    - Upload photos produit défectueux
    - Suivi statut retour

    Note: Statuts existent (RETURN_REQUESTED, RETURNED, REFUNDED) mais pas d'UI

---

#### Phase 4.3: AMÉLIORATION - Opérations & Marketing (Sprint 5-6) ⏱️ 2-4 semaines

**🟡 Priorité 5: Multi-User Management**

14. **Gestion utilisateurs boutique**
    - Créer/éditer/supprimer ADMIN/STAFF
    - Assigner rôles
    - Voir dernière connexion
    - Désactiver utilisateur

    Nouvelle page: `web/src/app/dashboard/team/page.tsx`

**🟡 Priorité 6: Dashboard Logistique**

15. **Vue opérationnelle**
    - Commandes à préparer aujourd'hui
    - Commandes en retard
    - Performance délais livraison
    - Taux de retour par produit

**🟡 Priorité 7: Email Marketing (Basique)**

16. **Abandon cart recovery**
    - Email automatique si panier non finalisé après 1h
    - Lien direct vers checkout
    - Peut inclure coupon incitation

17. **Post-achat**
    - Demande avis J+7
    - Upsell/cross-sell produits similaires

---

#### Phase 4.4: ADMIN AVANCÉ (Sprint 7-8) ⏱️ 2-4 semaines

**🟡 Priorité 8: Admin SuperAdmin**

18. **Audit Logs détaillés**
    - Qui a fait quoi et quand
    - Actions sensibles: changement plan, suspension, top-up
    - Filtrage par action/tenant/admin
    - Export pour conformité RGPD/INPDP

    Table existe: `audit_logs` (API à créer)

19. **Bulk Operations**
    - Suspension multiple tenants
    - Migration plan groupée
    - Envoi emails groupés
    - Export CSV avec critères

20. **Support Ticketing**
    - Marchands ouvrent tickets depuis dashboard
    - Priorisation (urgent, normal, low)
    - Statut (nouveau, en cours, résolu)
    - Templates réponses

---

### 📋 Matrice Permissions Recommandée

| Action | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| **Paramètres Boutique** |
| Modifier infos boutique | ✅ | ❌ | ❌ |
| Logo, thème, hero | ✅ | ❌ | ❌ |
| Moyens de paiement | ✅ | ❌ | ❌ |
| Domaine personnalisé | ✅ | ❌ | ❌ |
| **Produits** |
| Créer produit | ✅ | ✅ | ❌ |
| Modifier produit | ✅ | ✅ | ❌ |
| Supprimer produit | ✅ | ✅ | ❌ |
| Voir produits | ✅ | ✅ | ✅ |
| Ajuster stock | ✅ | ✅ | ✅ |
| **Commandes** |
| Voir commandes | ✅ | ✅ | ✅ |
| Changer statut | ✅ | ✅ | ✅ |
| Remboursement | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ❌ |
| **Clients** |
| Voir clients | ✅ | ✅ | ✅ |
| Modifier client | ✅ | ✅ | ❌ |
| Supprimer client | ✅ | ❌ | ❌ |
| **Finances** |
| Voir wallet | ✅ | ❌ | ❌ |
| Voir analytics revenue | ✅ | ✅ | ❌ |
| Utiliser code promo | ✅ | ❌ | ❌ |
| Voir factures | ✅ | ✅ | ❌ |
| **Plan & Billing** |
| Changer plan | ✅ | ❌ | ❌ |
| Voir usage limites | ✅ | ✅ | ❌ |
| **Users & Équipe** |
| Créer utilisateur | ✅ | ❌ | ❌ |
| Modifier rôles | ✅ | ❌ | ❌ |
| Supprimer utilisateur | ✅ | ❌ | ❌ |
| **Shipping** |
| Configurer transporteurs | ✅ | ✅ | ❌ |
| Créer expédition | ✅ | ✅ | ✅ |
| **Marketing** |
| Coupons | ✅ | ✅ | ❌ |
| Email campaigns | ✅ | ✅ | ❌ |
| Parrainage | ✅ | ❌ | ❌ |
| **IA** |
| Utiliser IA | ✅ | ✅ | ✅ |
| Voir usage IA | ✅ | ✅ | ❌ |

---

### 🔧 Fichiers à Créer/Modifier - Phase 4

#### Backend (RBAC)
- [ ] `api/src/common/guards/roles.guard.ts` (nouveau)
- [ ] `api/src/common/decorators/roles.decorator.ts` (nouveau)
- [ ] `api/src/modules/*/**.controller.ts` (~20 controllers à modifier)

#### Frontend (4 pages vides)
- [ ] `web/src/app/dashboard/customers/page.tsx` (réimplémenter)
- [ ] `web/src/app/dashboard/coupons/page.tsx` (réimplémenter)
- [ ] `web/src/app/dashboard/inventory/page.tsx` (réimplémenter)
- [ ] `web/src/app/dashboard/reviews/page.tsx` (réimplémenter)

#### Frontend (Avis produits)
- [ ] `web/src/app/store/[slug]/products/[productSlug]/page.tsx` (modifier)
- [ ] `web/src/components/store/ReviewsList.tsx` (nouveau)
- [ ] `web/src/components/store/ReviewForm.tsx` (nouveau)

#### Frontend (Profil client)
- [ ] `web/src/app/store/[slug]/account/page.tsx` (modifier)
- [ ] `web/src/app/store/[slug]/account/edit/page.tsx` (nouveau)
- [ ] `web/src/app/store/[slug]/account/addresses/page.tsx` (nouveau)

---

### ✅ Checklist Phase 4.1 (EN COURS)

**🔴 RBAC - Sécurité Critique**
- [ ] Créer `RolesGuard`
- [ ] Créer decorator `@Roles()`
- [ ] Appliquer sur endpoints tenants
- [ ] Appliquer sur endpoints products
- [ ] Appliquer sur endpoints orders
- [ ] Appliquer sur endpoints customers
- [ ] Appliquer sur endpoints wallet
- [ ] Appliquer sur endpoints analytics
- [ ] Tests E2E permissions
- [ ] Documentation matrice permissions

**🔴 CRM Clients**
- [ ] Page liste clients avec tableau
- [ ] Filtres (statut, segment, tags)
- [ ] Détail client (modal/page)
- [ ] Historique commandes client
- [ ] Tags personnalisés
- [ ] Notes privées
- [ ] Export CSV
- [ ] Statistiques clients (VIP, actifs, etc.)

**🔴 Gestion Coupons**
- [ ] Page liste coupons
- [ ] Formulaire création coupon
- [ ] Types: PERCENT, FIXED
- [ ] Conditions: minAmount, maxUses, expiresAt
- [ ] Activation/désactivation
- [ ] Statistiques utilisation
- [ ] Copier code rapide

**🔴 Gestion Stock**
- [ ] Page overview stock
- [ ] Alertes stock faible (threshold)
- [ ] Historique mouvements
- [ ] Filtrage par produit/type
- [ ] Ajustement manuel stock
- [ ] Export CSV mouvements

**🔴 Modération Avis**
- [ ] Page liste avis (pending, approved, rejected)
- [ ] Filtres par statut/produit
- [ ] Approbation/rejet rapide
- [ ] Réponse aux avis
- [ ] Statistiques notes moyennes
- [ ] Suppression avis

---

### 📊 Estimation Effort Phase 4

| Phase | Durée | Sprints | Priorité | Impact Score |
|-------|-------|---------|----------|--------------|
| 4.1 - RBAC + 4 pages | 2-4 semaines | 1-2 | 🔴 Critique | 4.1→7.0 (+2.9) |
| 4.2 - Expérience Client | 2-4 semaines | 3-4 | 🟠 Important | 7.0→8.0 (+1.0) |
| 4.3 - Opérations | 2-4 semaines | 5-6 | 🟡 Amélioration | 8.0→8.3 (+0.3) |
| 4.4 - Admin Avancé | 2-4 semaines | 7-8 | 🟡 Amélioration | 8.3→8.5 (+0.2) |

**Total estimé**: 8-16 semaines (2-4 mois)
**Progression maturité**: 4.1/10 → 8.5/10

---

**Prochaine session**: Implémentation RBAC (RolesGuard + @Roles decorator) + CRM Clients
