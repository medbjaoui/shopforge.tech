# 🔐 Guide d'Implémentation RBAC - ShopForge

## ✅ Étape 1: Guards & Decorators (TERMINÉ)

- [x] `/api/src/common/guards/roles.guard.ts` - Créé
- [x] `/api/src/common/decorators/roles.decorator.ts` - Créé

## ✅ Étape 2: Controllers Appliqués (EN COURS)

### 🔴 Critiques - Finances & Paramètres

- [x] `tenants.controller.ts` - Appliqué
  - OWNER only: update settings, telegram, referral, onboarding
  - OWNER+ADMIN: usage
  - ALL: get tenant info

- [x] `wallet.controller.ts` - Appliqué
  - OWNER only: get wallet, transactions, redeem codes

- [ ] `analytics.controller.ts`
  - OWNER+ADMIN: tous les endpoints analytics
  - STAFF: aucun accès analytics financières

- [ ] `invoices.controller.ts`
  - OWNER+ADMIN: voir factures
  - STAFF: aucun accès

### 🟠 Importants - Opérations

- [ ] `products.controller.ts`
  - OWNER+ADMIN: create, update, delete, import, bulk
  - STAFF: get (lecture seule)

- [ ] `orders.controller.ts`
  - OWNER+ADMIN+STAFF: get orders, update status
  - OWNER+ADMIN: refund, bulk actions, export CSV
  - STAFF: update status uniquement

- [ ] `customers.controller.ts`
  - OWNER+ADMIN+STAFF: get customers (lecture)
  - OWNER+ADMIN: create, update, tags
  - OWNER: delete

- [ ] `categories.controller.ts`
  - OWNER+ADMIN: CRUD
  - STAFF: get (lecture)

- [ ] `coupons.controller.ts`
  - OWNER+ADMIN: CRUD
  - STAFF: aucun accès

- [ ] `reviews.controller.ts`
  - OWNER+ADMIN: modération (approve/reject/delete)
  - STAFF: aucun accès

- [ ] `inventory.controller.ts`
  - OWNER+ADMIN: summary, movements, export
  - STAFF: adjust stock uniquement

### 🟡 Secondaires

- [ ] `shipping.controller.ts`
  - OWNER+ADMIN: configure carriers
  - ALL: create shipment, sync

- [ ] `ai.controller.ts`
  - ALL: utiliser IA
  - OWNER+ADMIN: voir usage

- [ ] `uploads.controller.ts`
  - ALL: upload images

## 📋 Matrice Permissions Détaillée

### Products

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /products | ✅ | ✅ | ✅ |
| GET /products/:id | ✅ | ✅ | ✅ |
| POST /products | ✅ | ✅ | ❌ |
| PATCH /products/:id | ✅ | ✅ | ❌ |
| DELETE /products/:id | ✅ | ✅ | ❌ |
| POST /products/import | ✅ | ✅ | ❌ |
| GET /products/export/csv | ✅ | ✅ | ❌ |
| PATCH /products/bulk | ✅ | ✅ | ❌ |
| POST /products/:id/variants | ✅ | ✅ | ❌ |
| PATCH /products/:id/variants/:variantId | ✅ | ✅ | ❌ |
| DELETE /products/:id/variants/:variantId | ✅ | ✅ | ❌ |

### Orders

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /orders | ✅ | ✅ | ✅ |
| GET /orders/stats | ✅ | ✅ | ❌ |
| GET /orders/:id | ✅ | ✅ | ✅ |
| PATCH /orders/:id/status | ✅ | ✅ | ✅ |
| PATCH /orders/:id/return | ✅ | ✅ | ❌ |
| PATCH /orders/:id/refund | ✅ | ✅ | ❌ |
| PATCH /orders/:id/exchange | ✅ | ✅ | ❌ |
| GET /orders/export/csv | ✅ | ✅ | ❌ |
| PATCH /orders/bulk/status | ✅ | ✅ | ❌ |

### Customers

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /customers | ✅ | ✅ | ✅ |
| GET /customers/stats | ✅ | ✅ | ❌ |
| GET /customers/:id | ✅ | ✅ | ✅ |
| POST /customers | ✅ | ✅ | ❌ |
| PATCH /customers/:id | ✅ | ✅ | ❌ |
| PATCH /customers/:id/notes | ✅ | ✅ | ❌ |
| DELETE /customers/:id | ✅ | ❌ | ❌ |
| GET /customers/export/csv | ✅ | ✅ | ❌ |
| GET /customers/tags | ✅ | ✅ | ❌ |
| POST /customers/tags | ✅ | ✅ | ❌ |
| POST /customers/:id/tags | ✅ | ✅ | ❌ |

### Categories

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /categories | ✅ | ✅ | ✅ |
| POST /categories | ✅ | ✅ | ❌ |
| PATCH /categories/:id | ✅ | ✅ | ❌ |
| DELETE /categories/:id | ✅ | ✅ | ❌ |

### Coupons

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /coupons | ✅ | ✅ | ❌ |
| POST /coupons | ✅ | ✅ | ❌ |
| PATCH /coupons/:id | ✅ | ✅ | ❌ |
| DELETE /coupons/:id | ✅ | ✅ | ❌ |

### Reviews

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /reviews | ✅ | ✅ | ❌ |
| PATCH /reviews/:id/status | ✅ | ✅ | ❌ |
| DELETE /reviews/:id | ✅ | ✅ | ❌ |

### Inventory

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /inventory/summary | ✅ | ✅ | ❌ |
| GET /inventory/movements | ✅ | ✅ | ❌ |
| POST /inventory/adjust | ✅ | ✅ | ✅ |
| GET /inventory/export/csv | ✅ | ✅ | ❌ |

### Invoices

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /invoices | ✅ | ✅ | ❌ |
| GET /invoices/stats | ✅ | ✅ | ❌ |
| GET /invoices/:id | ✅ | ✅ | ❌ |

### Analytics

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /analytics/funnel | ✅ | ✅ | ❌ |
| GET /analytics/funnel/daily | ✅ | ✅ | ❌ |
| GET /analytics/sources | ✅ | ✅ | ❌ |
| GET /analytics/shipping | ✅ | ✅ | ❌ |
| GET /analytics/commission-info | ✅ | ❌ | ❌ |

### Shipping

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| GET /shipping/carriers | ✅ | ✅ | ✅ |
| GET /shipping/my-carriers | ✅ | ✅ | ❌ |
| POST /shipping/carriers/:carrierId | ✅ | ✅ | ❌ |
| PATCH /shipping/carriers/:carrierId/default | ✅ | ✅ | ❌ |
| DELETE /shipping/carriers/:carrierId | ✅ | ✅ | ❌ |
| GET /shipping/shipments | ✅ | ✅ | ✅ |
| POST /shipping/shipments | ✅ | ✅ | ✅ |
| POST /shipping/shipments/:id/sync | ✅ | ✅ | ✅ |

### AI

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| POST /ai/product-description | ✅ | ✅ | ✅ |
| POST /ai/review-summary | ✅ | ✅ | ✅ |
| POST /ai/dashboard-insights | ✅ | ✅ | ✅ |
| POST /ai/order-response | ✅ | ✅ | ✅ |
| GET /ai/usage | ✅ | ✅ | ❌ |

### Uploads

| Endpoint | OWNER | ADMIN | STAFF |
|----------|-------|-------|-------|
| POST /uploads | ✅ | ✅ | ✅ |

## 📝 Template d'Application

```typescript
// Imports requis
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Appliquer au controller
@Controller('xxx')
@UseGuards(JwtAuthGuard, RolesGuard)
export class XxxController {

  // OWNER only
  @Roles(UserRole.OWNER)
  @Patch('sensitive')
  sensitiveOperation() { }

  // OWNER + ADMIN
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('create')
  createResource() { }

  // Tous les rôles
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get()
  getResources() { }
}
```

## 🧪 Tests à Effectuer

Une fois tous les controllers modifiés, tester:

1. **STAFF ne peut PAS:**
   - Voir wallet
   - Modifier paramètres boutique
   - Créer/modifier produits
   - Voir analytics financières
   - Créer coupons
   - Modérer avis
   - Export CSV (sauf son propre usage)

2. **STAFF PEUT:**
   - Voir commandes
   - Changer statut commandes
   - Voir produits (lecture)
   - Ajuster stock
   - Créer expéditions
   - Utiliser IA

3. **ADMIN ne peut PAS:**
   - Voir wallet
   - Modifier paramètres boutique
   - Utiliser codes promo
   - Voir parrainage
   - Changer plan

4. **ADMIN PEUT:**
   - Tout ce que STAFF peut
   - Créer/modifier/supprimer produits
   - Créer/modifier clients
   - Créer coupons
   - Modérer avis
   - Voir analytics (sauf commission-info)
   - Export CSV
   - Faire remboursements

5. **OWNER PEUT:**
   - TOUT

## 🚀 Commandes de Déploiement

```bash
# 1. Build API
cd api
npm run build

# 2. Rebuild Docker
sudo docker compose -f docker-compose.prod.yml build shopforge_api

# 3. Restart API
sudo docker compose -f docker-compose.prod.yml up -d shopforge_api

# 4. Vérifier logs
sudo docker compose -f docker-compose.prod.yml logs --tail=50 shopforge_api
```

## ✅ Checklist Finale

- [ ] Tous les controllers modifiés
- [ ] Imports RolesGuard ajoutés
- [ ] Decorator @Roles() appliqué selon matrice
- [ ] Tests manuels OWNER/ADMIN/STAFF
- [ ] Documentation mise à jour
- [ ] Déployé en production
- [ ] Vérification logs erreurs
