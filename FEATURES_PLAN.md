# Plan d'Implémentation - Nouvelles Fonctionnalités ShopForge

**Date:** 2026-03-06
**Features demandées:**
1. Édition profil client
2. Adresses multiples
3. Dashboard logistique (commandes à préparer)
4. Multi-user management

---

## 📋 État Actuel (Audit)

### ✅ Ce qui existe déjà

**Database (Prisma):**
- ✅ `Customer` model complet
- ✅ `CustomerAddress` model (adresses multiples)
- ✅ Champs: firstName, lastName, phone, email, company, password
- ✅ Relations: addresses[], orders[]

**Frontend Storefront:**
- ✅ Login/Register client (/store/[slug]/account/login)
- ✅ Profil client (/store/[slug]/account/page.tsx)
- ✅ Affichage commandes
- ✅ CustomerContext avec auth

**Backend API:**
- ✅ `/store/auth/*` - Auth customer
- ✅ `/store/auth/orders` - Liste commandes client

### ❌ Ce qui manque

**1. Édition Profil Client:**
- ❌ Formulaire édition (firstName, lastName, email)
- ❌ Changement mot de passe
- ❌ Upload photo profil (optionnel)
- ❌ Endpoint API `PATCH /store/auth/profile`

**2. Gestion Adresses Multiples:**
- ❌ Liste adresses client
- ❌ Ajouter/éditer/supprimer adresse
- ❌ Définir adresse par défaut
- ❌ Sélection adresse au checkout
- ❌ Endpoints API:
  - `GET /store/auth/addresses`
  - `POST /store/auth/addresses`
  - `PATCH /store/auth/addresses/:id`
  - `DELETE /store/auth/addresses/:id`
  - `POST /store/auth/addresses/:id/set-default`

**3. Dashboard Logistique (Marchands):**
- ❌ Vue "Commandes à préparer" (CONFIRMED status)
- ❌ Filtres: CONFIRMED, PROCESSING, SHIPPED
- ❌ Actions rapides: Marquer "en préparation", "prêt", "expédié"
- ❌ Print bordereaux multiples
- ❌ Scan barcode (optionnel mobile)
- ❌ Page dédiée `/dashboard/logistics` ou `/dashboard/prepare`

**4. Multi-User Management:**
- ❌ Modèle `TenantUser` (employés/collaborateurs)
- ❌ Rôles: OWNER, ADMIN, MANAGER, STAFF
- ❌ Permissions granulaires
- ❌ Invitation par email
- ❌ Dashboard `/dashboard/team`
- ❌ Endpoints API:
  - `GET /tenants/users`
  - `POST /tenants/users/invite`
  - `PATCH /tenants/users/:id/role`
  - `DELETE /tenants/users/:id`

---

## 🎯 Priorisation

### Phase 1: Client Features (Quick Wins)
**Temps estimé:** 2-3h

1. **Édition Profil Client** (1h)
   - Backend: endpoint PATCH /store/auth/profile
   - Frontend: formulaire édition + validation

2. **Adresses Multiples** (2h)
   - Backend: CRUD endpoints addresses
   - Frontend: composant gestion adresses
   - Integration checkout (sélection adresse)

### Phase 2: Logistics Dashboard (Merchant Value++)
**Temps estimé:** 3-4h

3. **Dashboard Logistique** (3-4h)
   - Backend: endpoint /orders/logistics avec filtres
   - Frontend: nouvelle page /dashboard/logistics
   - Actions: update status bulk
   - Print bordereaux multiples

### Phase 3: Team Management (Enterprise Feature)
**Temps estimé:** 6-8h

4. **Multi-User Management** (6-8h)
   - Database: migration TenantUser + Role + Permission
   - Backend: invitation system + auth multi-user
   - Frontend: team management UI
   - Email: invitations + notifications

---

## 📐 Architecture Technique

### 1. Édition Profil Client

**Database:** (Already exists)
```prisma
model Customer {
  firstName String
  lastName  String
  email     String?
  phone     String
  password  String? // bcrypt hash
}
```

**Backend API:**
```typescript
// api/src/modules/store-auth/store-auth.controller.ts
@Patch('profile')
@UseGuards(CustomerJwtGuard)
async updateProfile(@CurrentCustomer() customer, @Body() dto: UpdateProfileDto) {
  // Validate & update
}

@Patch('password')
@UseGuards(CustomerJwtGuard)
async changePassword(@CurrentCustomer() customer, @Body() dto: ChangePasswordDto) {
  // Verify old password, hash new one
}
```

**Frontend:**
```tsx
// web/src/app/store/[slug]/account/page.tsx
// Add "Edit" button in profile tab
// Modal or inline form for editing
```

---

### 2. Adresses Multiples

**Database:** (Already exists)
```prisma
model CustomerAddress {
  id          String  @id
  customerId  String
  label       String  // "Domicile", "Bureau", etc.
  line1       String
  line2       String?
  city        String
  governorate String
  postalCode  String?
  isDefault   Boolean @default(false)
}
```

**Backend API:**
```typescript
// api/src/modules/store-auth/store-auth.controller.ts
@Get('addresses')
@UseGuards(CustomerJwtGuard)
async getAddresses(@CurrentCustomer() customer) {
  return prisma.customerAddress.findMany({ where: { customerId: customer.id } })
}

@Post('addresses')
@UseGuards(CustomerJwtGuard)
async createAddress(@CurrentCustomer() customer, @Body() dto: CreateAddressDto) {
  // If isDefault=true, unset others first
}

@Patch('addresses/:id')
async updateAddress(@Param('id') id, @Body() dto: UpdateAddressDto) {}

@Delete('addresses/:id')
async deleteAddress(@Param('id') id) {}

@Post('addresses/:id/set-default')
async setDefaultAddress(@Param('id') id, @CurrentCustomer() customer) {
  // Transaction: unset all isDefault, set this one
}
```

**Frontend:**
```tsx
// web/src/components/storefront/AddressManager.tsx
// List addresses with edit/delete/set-default actions
// Add new address form (modal or expandable)

// web/src/app/store/[slug]/checkout/page.tsx
// Dropdown to select address (or add new inline)
```

---

### 3. Dashboard Logistique

**Backend API:**
```typescript
// api/src/modules/orders/orders.controller.ts
@Get('logistics')
@UseGuards(JwtAuthGuard)
async getLogisticsOrders(
  @CurrentTenant() tenant,
  @Query('status') status?: OrderStatus,
  @Query('date') date?: string,
) {
  // Return orders with status CONFIRMED, PROCESSING, SHIPPED
  // Include: items (with product name), customer info, address, shipment
  // Sort by: createdAt ASC (oldest first = priority)
}

@Patch('logistics/bulk-update-status')
@UseGuards(JwtAuthGuard)
async bulkUpdateStatus(
  @Body() dto: { orderIds: string[]; newStatus: OrderStatus }
) {
  // Update multiple orders at once
  // Send notifications to customers
}
```

**Frontend:**
```tsx
// web/src/app/dashboard/logistics/page.tsx
// Table view with columns:
// - Order # | Customer | Items | Status | Actions
// Filters: Status (CONFIRMED/PROCESSING/SHIPPED), Date
// Bulk actions: checkbox selection + "Mark as Processing" button
// Single actions: dropdown per row
// Print: generate PDF bordereau for selected orders
```

---

### 4. Multi-User Management

**Database Schema (NEW):**
```prisma
enum TenantRole {
  OWNER      // Créateur du tenant, full access
  ADMIN      // Accès complet sauf delete tenant
  MANAGER    // Orders, products, customers
  STAFF      // Read-only + update order status
}

model TenantUser {
  id            String      @id @default(cuid())
  tenantId      String
  email         String
  firstName     String?
  lastName      String?
  role          TenantRole  @default(STAFF)
  passwordHash  String?     // null = pending invitation
  invitedBy     String?     // user ID who invited
  invitedAt     DateTime    @default(now())
  lastLoginAt   DateTime?
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())

  tenant        Tenant      @relation(fields: [tenantId], references: [id])

  @@unique([email, tenantId])
  @@index([tenantId])
  @@index([tenantId, isActive])
  @@map("tenant_users")
}

// Update Tenant model:
model Tenant {
  // ... existing fields
  users         TenantUser[]  // Team members
  ownerId       String?       // Original creator
}
```

**Permissions Matrix:**
```typescript
// api/src/common/permissions/tenant-permissions.ts

const PERMISSIONS = {
  OWNER: ['*'], // All permissions

  ADMIN: [
    'products.*', 'orders.*', 'customers.*',
    'settings.update', 'billing.view',
    'team.view', 'team.invite', 'team.update',
  ],

  MANAGER: [
    'products.view', 'products.update', 'products.create',
    'orders.*', 'customers.*',
  ],

  STAFF: [
    'orders.view', 'orders.update_status',
    'products.view', 'customers.view',
  ],
};
```

**Backend API:**
```typescript
// api/src/modules/tenant-users/tenant-users.controller.ts

@Get()
@UseGuards(JwtAuthGuard)
@RequirePermission('team.view')
async getTeamMembers(@CurrentTenant() tenant) {
  return prisma.tenantUser.findMany({
    where: { tenantId: tenant.id },
    select: { id, email, firstName, lastName, role, isActive, lastLoginAt }
  });
}

@Post('invite')
@RequirePermission('team.invite')
async inviteUser(@Body() dto: { email, role, firstName?, lastName? }) {
  // Create TenantUser with passwordHash = null
  // Send email with invitation link + token
  // Link: /accept-invitation?token=xxx
}

@Patch(':id/role')
@RequirePermission('team.update')
async updateRole(@Param('id') id, @Body('role') role: TenantRole) {
  // Cannot change OWNER role
  // Cannot demote yourself
}

@Delete(':id')
@RequirePermission('team.delete')
async removeUser(@Param('id') id) {
  // Cannot remove OWNER
  // Cannot remove yourself
}
```

**Frontend:**
```tsx
// web/src/app/dashboard/team/page.tsx
// Table: Email | Name | Role | Last Login | Actions
// Add button: "Invite member" modal
// Actions: Change role (dropdown), Deactivate, Remove
```

---

## 🚀 Plan d'Exécution

### Phase 1 (Priorité Haute - Client UX)
```
1. ✅ Édition profil client
   - Backend: PATCH /store/auth/profile + /store/auth/password
   - Frontend: formulaire édition inline

2. ✅ Adresses multiples
   - Backend: CRUD /store/auth/addresses
   - Frontend: composant AddressManager
   - Integration checkout
```

### Phase 2 (Priorité Haute - Merchant Productivity)
```
3. ✅ Dashboard logistique
   - Backend: GET /orders/logistics + bulk update
   - Frontend: /dashboard/logistics page
   - Filtres + actions bulk
```

### Phase 3 (Priorité Moyenne - Team Collaboration)
```
4. ✅ Multi-user management
   - Migration Prisma (TenantUser model)
   - Backend: invitation system + auth
   - Frontend: /dashboard/team
   - Email: invitation template
```

---

## 📝 Notes Importantes

### Sécurité
- Validation stricte des inputs (DTO avec class-validator)
- Bcrypt pour passwords (rounds: 12)
- JWT avec expiration courte (2h)
- RBAC pour multi-user (check permissions)
- Rate limiting sur endpoints sensibles

### UX/UI
- Formulaires réactifs avec validation temps réel
- Messages d'erreur clairs en français
- Confirmations avant suppressions
- Loading states + skeleton loaders
- Mobile-responsive (Tailwind)

### Performance
- Pagination pour listes longues
- Index DB sur colonnes filtrées
- Cache Redis pour team permissions (optionnel)
- Lazy loading composants lourds

---

## 🎯 Quelle feature commencer?

**Ma recommandation:**

**Option A - Quick Wins Client:**
Commencer par Phase 1 (édition profil + adresses)
→ Améliore UX client immédiatement
→ Facile à implémenter (2-3h)
→ Database schema déjà prête

**Option B - High Value Merchant:**
Commencer par Phase 2 (dashboard logistique)
→ Améliore productivité marchand
→ Feature différenciante vs concurrence
→ ROI immédiat (gain de temps)

**Option C - Enterprise Ready:**
Commencer par Phase 3 (multi-user)
→ Permet scaling équipes marchands
→ Feature premium (potentiel upsell)
→ Plus complexe (6-8h)

---

**Quelle phase voulez-vous que j'implémente en premier?**

A. Édition profil + adresses (Client UX)
B. Dashboard logistique (Merchant productivity)
C. Multi-user management (Team collaboration)
D. Tout en parallèle (si vous avez le temps!)
