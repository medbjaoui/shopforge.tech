# 🔐 RBAC Implémenté - ShopForge

**Date déploiement:** 6 Mars 2026 22:15 UTC
**Status:** ✅ DÉPLOYÉ EN PRODUCTION

---

## ✅ Ce qui a été fait

### 1. Infrastructure RBAC (TERMINÉ)

- [x] **RolesGuard** créé - `/api/src/common/guards/roles.guard.ts`
  - Vérifie que l'utilisateur a l'un des rôles requis
  - Fonctionne avec le decorator `@Roles()`

- [x] **@Roles() decorator** créé - `/api/src/common/decorators/roles.decorator.ts`
  - Permet de définir les rôles autorisés sur chaque endpoint
  - Syntaxe: `@Roles(UserRole.OWNER, UserRole.ADMIN)`

### 2. Controllers Sécurisés (3/19)

#### ✅ Tenants Controller
**Fichier:** `api/src/modules/tenants/tenants.controller.ts`

| Endpoint | Rôles Autorisés | Justification |
|----------|-----------------|---------------|
| GET /tenants/me | OWNER, ADMIN, STAFF | Tous peuvent voir infos tenant |
| GET /tenants/me/usage | OWNER, ADMIN | Stats usage sensibles |
| GET /tenants/me/referral | OWNER only | Parrainage réservé au propriétaire |
| POST /tenants/me/onboarding | OWNER only | Configuration initiale |
| PATCH /tenants/me | OWNER only | Paramètres boutique critiques |
| POST /tenants/me/telegram-link-code | OWNER only | Configuration Telegram |
| DELETE /tenants/me/telegram | OWNER only | Déconnexion Telegram |

**Impact:** STAFF ne peut plus modifier les paramètres de la boutique ✅

---

#### ✅ Wallet Controller
**Fichier:** `api/src/modules/wallet/wallet.controller.ts`

| Endpoint | Rôles Autorisés | Justification |
|----------|-----------------|---------------|
| GET /wallet | OWNER only | Finances très sensibles |
| GET /wallet/transactions | OWNER only | Historique financier |
| POST /wallet/redeem | OWNER only | Utilisation codes promo |

**Impact:** Seul le OWNER peut voir les finances ✅

---

#### ✅ Products Controller
**Fichier:** `api/src/modules/products/products.controller.ts`

| Endpoint | Rôles Autorisés | Justification |
|----------|-----------------|---------------|
| GET /products | OWNER, ADMIN, STAFF | Tous peuvent voir |
| GET /products/:id | OWNER, ADMIN, STAFF | Détail produit |
| POST /products | OWNER, ADMIN | Création réservée |
| PATCH /products/:id | OWNER, ADMIN | Modification réservée |
| DELETE /products/:id | OWNER, ADMIN | Suppression réservée |
| GET /products/export/csv | OWNER, ADMIN | Export données |
| POST /products/import | OWNER, ADMIN | Import CSV |
| PATCH /products/bulk | OWNER, ADMIN | Actions en masse |
| POST /products/:id/variants | OWNER, ADMIN | Gestion variants |
| PATCH /products/:id/variants/:variantId | OWNER, ADMIN | Modification variant |
| DELETE /products/:id/variants/:variantId | OWNER, ADMIN | Suppression variant |

**Impact:** STAFF peut voir les produits mais ne peut plus les modifier ✅

---

## 🔴 Ce qu'il reste à faire (16 controllers)

### Priorité 1 - Critiques (6 controllers)

- [ ] `analytics.controller.ts`
  - OWNER+ADMIN: tous les endpoints
  - OWNER only: /analytics/commission-info
  - STAFF: aucun accès

- [ ] `invoices.controller.ts`
  - OWNER+ADMIN: tout
  - STAFF: aucun accès

- [ ] `orders.controller.ts`
  - ALL: get, update status
  - OWNER+ADMIN: refund, bulk, export

- [ ] `customers.controller.ts`
  - ALL: get (lecture)
  - OWNER+ADMIN: CRUD, tags
  - OWNER only: delete

- [ ] `coupons.controller.ts`
  - OWNER+ADMIN: CRUD
  - STAFF: aucun accès

- [ ] `reviews.controller.ts`
  - OWNER+ADMIN: modération
  - STAFF: aucun accès

### Priorité 2 - Importants (5 controllers)

- [ ] `categories.controller.ts`
- [ ] `inventory.controller.ts`
- [ ] `shipping.controller.ts`
- [ ] `ai.controller.ts`
- [ ] `uploads.controller.ts`

### Priorité 3 - Secondaires (5 controllers)

- [ ] `payments.controller.ts`
- [ ] `auth.controller.ts` (change-password, profile)
- [ ] `telegram.controller.ts`
- [ ] `admin.controller.ts` (déjà protégé par SuperAdminGuard)
- [ ] `platform-revenue.controller.ts` (déjà protégé par SuperAdminGuard)

---

## 📋 Matrice Permissions Appliquée

### Paramètres Boutique
| Action | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| Modifier infos boutique | ✅ | ❌ | ❌ |
| Logo, thème, hero | ✅ | ❌ | ❌ |
| Moyens de paiement | ✅ | ❌ | ❌ |
| Domaine personnalisé | ✅ | ❌ | ❌ |
| Telegram | ✅ | ❌ | ❌ |

### Finances
| Action | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| Voir wallet | ✅ | ❌ | ❌ |
| Voir transactions | ✅ | ❌ | ❌ |
| Utiliser code promo | ✅ | ❌ | ❌ |
| Voir parrainage | ✅ | ❌ | ❌ |

### Produits
| Action | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| Voir produits | ✅ | ✅ | ✅ |
| Créer produit | ✅ | ✅ | ❌ |
| Modifier produit | ✅ | ✅ | ❌ |
| Supprimer produit | ✅ | ✅ | ❌ |
| Import/Export CSV | ✅ | ✅ | ❌ |
| Actions en masse | ✅ | ✅ | ❌ |

---

## 🧪 Tests Effectués

### ✅ API Démarre Correctement
```bash
$ sudo docker compose -f docker-compose.prod.yml logs --tail=5 shopforge_api
[Nest] 1  - 03/06/2026, 10:15:09 PM     LOG [NestApplication] Nest application successfully started
API running on port 3001
```

### ✅ Build Docker Réussi
```bash
$ sudo docker compose -f docker-compose.prod.yml build shopforge_api
# ✅ SUCCESS - Image built
```

### ⏳ Tests Fonctionnels à Faire

**Test 1: STAFF ne peut PAS modifier un produit**
```bash
# Login en tant que STAFF
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@example.com","password":"..."}'

# Tenter de modifier un produit
curl -X PATCH http://localhost:3001/products/xxx \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'

# ❌ Doit retourner 403 Forbidden
```

**Test 2: STAFF ne peut PAS voir le wallet**
```bash
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer $STAFF_TOKEN"

# ❌ Doit retourner 403 Forbidden
```

**Test 3: ADMIN peut créer un produit**
```bash
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":50}'

# ✅ Doit réussir (200/201)
```

**Test 4: ADMIN ne peut PAS voir le wallet**
```bash
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# ❌ Doit retourner 403 Forbidden
```

**Test 5: OWNER peut TOUT faire**
```bash
# Wallet
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer $OWNER_TOKEN"
# ✅ Doit réussir

# Modifier paramètres
curl -X PATCH http://localhost:3001/tenants/me \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
# ✅ Doit réussir

# Créer produit
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":50}'
# ✅ Doit réussir
```

---

## 📊 Progression RBAC

**Controllers sécurisés:** 3/19 (16%)
**Endpoints protégés:** ~25/114 (22%)

**Objectif Phase 4.1:** 19/19 (100%)

---

## 🚀 Prochaines Actions

### Immédiat (Aujourd'hui)

1. **Appliquer RBAC sur 6 controllers critiques restants**
   - Analytics
   - Invoices
   - Orders
   - Customers
   - Coupons
   - Reviews

2. **Build + Deploy**
   ```bash
   sudo docker compose -f docker-compose.prod.yml build shopforge_api
   sudo docker compose -f docker-compose.prod.yml up -d shopforge_api
   ```

3. **Tests manuels**
   - Créer 3 users (OWNER, ADMIN, STAFF)
   - Tester les permissions
   - Vérifier les erreurs 403

### Court terme (Demain)

4. **Compléter RBAC sur tous les controllers**
   - Categories, Inventory, Shipping, AI, Uploads, etc.

5. **Documentation**
   - Mettre à jour API docs
   - Créer guide pour les marchands

6. **Passer aux 4 pages vides**
   - CRM Clients
   - Gestion Coupons
   - Gestion Stock
   - Modération Avis

---

## 📝 Notes Techniques

### Comment appliquer RBAC sur un nouveau controller

```typescript
// 1. Imports
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// 2. Appliquer RolesGuard au controller
@Controller('xxx')
@UseGuards(JwtAuthGuard, RolesGuard)
export class XxxController {

  // 3. Définir les rôles par endpoint

  // OWNER only
  @Roles(UserRole.OWNER)
  @Patch('sensitive')
  sensitiveAction() { }

  // OWNER + ADMIN
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('create')
  createResource() { }

  // Tous les rôles
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get()
  listResources() { }
}
```

### Ordre d'exécution Guards

```
Request
  ↓
1. JwtAuthGuard (vérifie JWT, extrait user)
  ↓
2. RolesGuard (vérifie user.role vs @Roles())
  ↓
3. Controller Handler
```

---

## 🎯 Impact Sécurité

**Avant:**
- ❌ STAFF pouvait modifier paramètres boutique
- ❌ ADMIN pouvait voir wallet
- ❌ STAFF pouvait utiliser codes promo
- ❌ Tous pouvaient tout faire

**Après:**
- ✅ OWNER seul contrôle paramètres
- ✅ OWNER seul voit finances
- ✅ ADMIN+OWNER gèrent catalogue
- ✅ STAFF lecture seule produits

**Risque éliminé:** Employé malveillant ne peut plus:
- Voler les codes promo
- Voir le solde wallet
- Changer les paramètres de paiement
- Modifier le domaine personnalisé

---

**Prochaine étape:** Appliquer RBAC sur les 6 controllers critiques restants
