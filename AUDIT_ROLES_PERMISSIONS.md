# 🔐 AUDIT COMPLET DES RÔLES ET PERMISSIONS - SHOPFORGE

**Date:** 2026-03-06
**Auditeur:** Expert en Architecture Logicielle & Sécurité
**Plateforme:** ShopForge - Plateforme E-commerce Multi-tenant SaaS

---

## 📊 RÉSUMÉ EXÉCUTIF

### Points Critiques Identifiés

🔴 **CRITIQUE** - Pas de contrôle granulaire OWNER/ADMIN/STAFF
🟠 **IMPORTANT** - 4 fonctionnalités marchands non implémentées
🟡 **ATTENTION** - Fonctionnalités clients limitées
🟢 **POSITIF** - Excellente séparation SuperAdmin/Merchant/Customer

### Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| **Rôles définis** | 4 (SuperAdmin, OWNER, ADMIN, STAFF, Customer) |
| **Endpoints API** | 175+ |
| **Pages Dashboard Marchand** | 14 (7 actives, 4 vides, 3 partielles) |
| **Pages Admin Plateforme** | 15 |
| **Pages Vitrine Client** | 14 |
| **Guards de sécurité** | 3 (SuperAdminGuard, JwtAuthGuard, CustomerJwtGuard) |

---

## 1️⃣ RÔLE: SUPER ADMIN (Administrateur Plateforme)

### 👤 Expert: Directeur Technique SaaS

### 📋 Ce qu'il voit actuellement

#### Backend API (39 endpoints)

**✅ IMPLÉMENTÉ - Excellent**

##### Gestion des Tenants (Boutiques)
- ✅ Liste complète des boutiques avec recherche
- ✅ Activation/Désactivation de boutiques
- ✅ Changement de plan (FREE → STARTER → PRO)
- ✅ Gestion des domaines personnalisés
- ✅ Métriques de performance par boutique
- ✅ Configuration CNAME Cloudflare

##### Analytics SaaS Avancés
- ✅ **Churn Rate** - Taux d'attrition avec détails
- ✅ **LTV (Lifetime Value)** - Valeur par plan
- ✅ **Cohort Retention** - Heatmap de rétention mensuelle
- ✅ **Activation Funnel** - Inscription → Produit → Commande
- ✅ Statistiques plateforme globales

##### Revenue Management
- ✅ **Revenus totaux plateforme**
- ✅ **MRR (Monthly Recurring Revenue)**
- ✅ **ARR (Annual Recurring Revenue)**
- ✅ Répartition Commissions vs Abonnements
- ✅ Historique sur 6/12/24 mois
- ✅ Croissance month-over-month

##### Wallet & Facturation
- ✅ Liste de tous les wallets marchands
- ✅ Alertes solde faible
- ✅ Top-up manuel (créditer un marchand)
- ✅ Création de codes promo (CreditCode)
- ✅ Historique d'utilisation des codes

##### Commandes & Facturation
- ✅ Toutes les commandes plateforme (cross-tenant)
- ✅ Statistiques factures globales
- ✅ Liste/détail de toutes les factures
- ✅ Génération manuelle de facture

##### Transporteurs
- ✅ CRUD transporteurs (Aramex, La Poste, DHL, etc.)
- ✅ Configuration API par transporteur

##### AI Monitoring
- ✅ Statistiques d'utilisation IA par tenant
- ✅ Tokens consommés (input/output)

##### Configuration Plateforme
- ✅ Platform Settings (variables de config dynamiques)
- ✅ Configuration des limites de plans
- ✅ Configuration des taux de commission

#### Frontend Admin Dashboard (15 pages)

**✅ IMPLÉMENTÉ**

1. `/admin` - Dashboard principal avec KPIs
2. `/admin/analytics` - SaaS Analytics (Churn, LTV, Cohorts)
3. `/admin/revenue` - Dashboard revenus (MRR, ARR)
4. `/admin/tenants` - Gestion boutiques
5. `/admin/tenants/[id]` - Détail boutique
6. `/admin/wallet` - Gestion wallets
7. `/admin/credit-codes` - Codes promo
8. `/admin/carriers` - Transporteurs
9. `/admin/billing` - Facturation
10. `/admin/invoices` - Factures
11. `/admin/invoices/[id]` - Détail facture
12. `/admin/settings` - Paramètres plateforme
13. `/admin/ai` - Monitoring IA
14. `/admin/performance` - Performance
15. `/admin/login` - Authentification séparée

---

### ❌ CE QUI MANQUE - Recommandations d'Expert

#### 🔴 CRITIQUE

**1. Audit Logs Détaillés**
```
📌 BESOIN: Journal d'audit complet
- Qui a fait quoi et quand (traçabilité RGPD/INPDP)
- Actions sensibles: changement plan, suspension compte, top-up
- Filtrage par action/tenant/admin
- Export pour conformité légale
```

**2. Bulk Operations**
```
📌 BESOIN: Actions en masse sur les boutiques
- Suspension multiple (ex: impayés)
- Migration de plan groupée
- Envoi d'emails groupés
- Export CSV tenants avec critères
```

**3. Feature Flags System**
```
📌 BESOIN: Activation/désactivation de fonctionnalités
- Rollout progressif de nouvelles features
- A/B testing par segment de boutiques
- Désactivation d'urgence en cas de bug
```

#### 🟠 IMPORTANT

**4. Support Ticketing**
```
📌 BESOIN: Système de tickets support
- Marchands peuvent ouvrir tickets depuis dashboard
- Priorisation (urgent, normal, low)
- Statut (nouveau, en cours, résolu)
- Templates de réponses
```

**5. Email Campaign Manager**
```
📌 BESOIN: Campagnes email vers les marchands
- Newsletters plateforme
- Onboarding drip campaigns
- Rappels renouvellement plan
- Suivi taux d'ouverture/clic
```

**6. Advanced Reporting**
```
📌 BESOIN: Rapports financiers avancés
- Revenue breakdown par gouvernorat
- Forecast MRR (3/6/12 mois)
- Plan conversion rates (FREE → STARTER → PRO)
- Commission trends by plan
```

#### 🟡 AMÉLIORATION

**7. API Rate Limiting Dashboard**
```
📌 BESOIN: Monitoring consommation API
- Requêtes par tenant
- Endpoints les plus appelés
- Détection abus/bots
```

**8. Performance Monitoring**
```
📌 BESOIN: Métriques techniques
- Temps de réponse API par endpoint
- Taux d'erreur (4xx, 5xx)
- Uptime tracking
- Database slow queries
```

**9. Impersonation Mode**
```
📌 BESOIN: Se connecter comme un marchand
- Debug problèmes rapidement
- Voir exactement ce que le marchand voit
- Audit trail automatique (qui s'est connecté comme qui)
```

---

### 🎯 Score Maturité: 7.5/10

**Points forts:**
- ✅ Analytics SaaS complets (Churn, LTV, Cohorts)
- ✅ Revenue tracking solide (MRR, ARR)
- ✅ Gestion tenant complète
- ✅ Wallet management

**À améliorer:**
- ⚠️ Audit logs
- ⚠️ Bulk operations
- ⚠️ Support system

---

## 2️⃣ RÔLE: MERCHANT (Marchand/Vendeur)

### 👤 Experts Consultés
- **E-commerce Manager** (Vue opérationnelle)
- **Directeur Marketing Digital** (Vue acquisition/rétention)
- **Responsable Logistique** (Vue opérations)

### 📋 Ce qu'il voit actuellement

#### Backend API (114 endpoints)

**✅ IMPLÉMENTÉ**

##### Produits & Catalogue
- ✅ CRUD produits complet
- ✅ Gestion variants (taille, couleur, etc.)
- ✅ Upload images (5MB max, images only)
- ✅ Import/Export CSV
- ✅ Actions en masse (bulk)
- ✅ Catégories

##### Commandes
- ✅ Liste commandes avec filtres statut
- ✅ Statistiques commandes
- ✅ Changement statut
- ✅ Gestion retours/remboursements/échanges
- ✅ Export CSV
- ✅ Clients extraits des commandes

##### Analytics
- ✅ Funnel conversion (visiteurs → achats)
- ✅ Sources de trafic (UTM tracking)
- ✅ Statistiques shipping
- ✅ Info commissions

##### Shipping
- ✅ Configuration transporteurs (Aramex, ABM, FDG, etc.)
- ✅ Création expéditions
- ✅ Tracking sync automatique
- ✅ Définition transporteur par défaut

##### Paiements
- ✅ Initiation ClicToPay
- ✅ Initiation Floussi
- ✅ COD & virement bancaire

##### Factures
- ✅ Liste factures
- ✅ Statistiques
- ✅ Détail facture (conforme législation TN)

##### Wallet
- ✅ Consultation solde
- ✅ Historique transactions
- ✅ Utilisation code promo

##### Paramètres Boutique
- ✅ Informations générales (nom, slug, description)
- ✅ Logo, favicon, police
- ✅ Frais livraison & seuil gratuit
- ✅ Moyens de paiement (4 options)
- ✅ Réseaux sociaux
- ✅ Bannière hero
- ✅ Barre d'annonce
- ✅ Informations fiscales (MF, RNE)
- ✅ Notifications Telegram
- ✅ Meta Pixel & Conversions API
- ✅ Widget WhatsApp
- ✅ Langue boutique (FR/AR)

##### Parrainage
- ✅ Code parrainage unique
- ✅ Liste filleuls
- ✅ Récompenses

##### IA
- ✅ Génération descriptions produits
- ✅ Résumé avis clients
- ✅ Insights dashboard
- ✅ Réponses commandes
- ✅ Suivi utilisation

#### Frontend Dashboard (14 pages)

**✅ PAGES ACTIVES (7)**

1. `/dashboard` - Vue d'ensemble
2. `/dashboard/analytics` - Analytics détaillées
3. `/dashboard/billing` - Plans & usage
4. `/dashboard/orders` - Gestion commandes
5. `/dashboard/products` - Gestion produits
6. `/dashboard/settings` - Paramètres
7. `/dashboard/shipping` - Transporteurs & expéditions
8. `/dashboard/wallet` - Portefeuille
9. `/dashboard/parrainage` - Programme parrainage

**⚠️ PAGES VIDES / NON IMPLÉMENTÉES (4)**

10. `/dashboard/coupons` - 🔴 Empty state
11. `/dashboard/customers` - 🔴 Empty state
12. `/dashboard/inventory` - 🔴 Empty state
13. `/dashboard/reviews` - 🔴 Empty state

**🟡 PAGES PARTIELLES (1)**

14. `/dashboard/categories` - ✅ CRUD basique

---

### ❌ CE QUI MANQUE - Recommandations d'Experts

#### 🔴 CRITIQUE - **Expert E-commerce Manager**

**1. CRM Client Complet**
```
📌 BESOIN: Actuellement page vide
- Liste clients avec filtres (VIP, actifs, inactifs, à risque)
- Historique achats par client
- Tags/segments personnalisés
- Notes privées sur chaque client
- Envoi email/SMS direct
- RFM scoring (Récence, Fréquence, Montant)
```

**2. Gestion Coupons/Promotions**
```
📌 BESOIN: Actuellement page vide
- CRUD coupons (API existe, UI manquante)
- Types: pourcentage, montant fixe, livraison gratuite
- Conditions: montant min, produits spécifiques, premier achat
- Limites: usage max, date expiration
- Statistiques utilisation
```

**3. Modération Avis Produits**
```
📌 BESOIN: Actuellement page vide
- Approbation/rejet avis (API existe)
- Notification nouveaux avis
- Réponse aux avis
- Statistiques notes moyennes
```

**4. Gestion Stock Avancée**
```
📌 BESOIN: Actuellement page vide (API existe partiellement)
- Alertes stock faible (seuil personnalisable)
- Historique mouvements stock
- Prévisions rupture
- Ajustements manuels avec raisons
- Import réapprovisionnement
```

#### 🟠 IMPORTANT - **Expert Marketing Digital**

**5. Email Marketing**
```
📌 BESOIN: Aucune fonctionnalité
- Campagnes email clients
- Templates newsletter
- Abandon panier (cart recovery)
- Post-achat (demande avis, upsell)
- Segmentation audience
```

**6. Analytics Avancées**
```
📌 BESOIN: Analytics basiques existent
- Google Analytics integration (actuellement seulement Meta Pixel)
- Heatmaps comportement
- A/B testing produits/checkout
- Attribution multi-touch
- Customer journey mapping
```

**7. Programme Fidélité**
```
📌 BESOIN: Inexistant
- Points de fidélité par achat
- Récompenses paliers
- Historique points client
- Gamification
```

**8. Promotions Flash / Ventes Privées**
```
📌 BESOIN: Inexistant
- Countdown timers
- Accès VIP early bird
- Quantités limitées affichées
```

#### 🟡 AMÉLIORATION - **Expert Logistique**

**9. Multi-User / Permissions**
```
📌 CRITIQUE: Pas de différenciation OWNER/ADMIN/STAFF
Actuellement tous les users ont TOUS les droits!

Proposé:
OWNER:
  - Tout (paramètres, facturation, wallet, users)

ADMIN:
  - Produits, commandes, clients, shipping
  - PAS: paramètres boutique, wallet, gestion users

STAFF:
  - Commandes (lecture + changement statut)
  - Produits (lecture only)
  - PAS: clients, analytics, paramètres
```

**10. Dashboard Logistique**
```
📌 BESOIN: Vue opérationnelle
- Commandes à préparer aujourd'hui
- Commandes en retard
- Alertes transporteur
- Performance délais livraison
- Taux de retour par produit
```

**11. Impression Documents**
```
📌 BESOIN: Workflow physique
- Impression bordereaux picking
- Étiquettes d'expédition en masse
- Bon de livraison
- Export manifest transporteur
```

**12. Gestion Retours Avancée**
```
📌 BESOIN: UI manquante (statuts existent en DB)
- Liste demandes retour
- Validation/refus retour
- Génération étiquette retour
- Suivi colis retour
- Remboursement/avoir
```

#### 🟡 CONFORT

**13. Mobile App Dashboard**
```
📌 BESOIN: Actuellement web only
- App iOS/Android responsive
- Notifications push nouvelles commandes
- Scan barcode produits
```

**14. Facturation Multi-Devise**
```
📌 BESOIN: Actuellement TND only
- EUR, USD support
- Taux de change auto
```

**15. Export Comptable**
```
📌 BESOIN: Comptabilité
- Export FEC (Fichier Écriture Comptable)
- Intégration Sage, QuickBooks
- Journal ventes mensuel
```

---

### 🎯 Score Maturité: 6/10

**Points forts:**
- ✅ Core e-commerce complet (produits, commandes, checkout)
- ✅ Analytics de base
- ✅ Multi-transporteurs
- ✅ Intégrations paiement (4 méthodes)
- ✅ Factures conformes

**Bloquants:**
- 🔴 Pas de RBAC (OWNER/ADMIN/STAFF identiques)
- 🔴 4 pages vides (Customers, Coupons, Inventory, Reviews)
- 🔴 Pas de CRM
- 🔴 Pas d'email marketing

---

## 3️⃣ RÔLE: CUSTOMER (Client Final)

### 👤 Expert: UX Designer E-commerce

### 📋 Ce qu'il voit actuellement

#### Backend API (22 endpoints)

**✅ IMPLÉMENTÉ**

##### Authentification
- ✅ Inscription client
- ✅ Connexion
- ✅ Récupération profil
- ✅ Historique commandes

##### Shopping
- ✅ Liste produits publique avec recherche
- ✅ Filtres catégories
- ✅ Détail produit
- ✅ Validation coupon

##### Checkout
- ✅ Création commande (rate limit 10/min)
- ✅ Initiation paiement online
- ✅ Callbacks gateway

##### Tracking
- ✅ Suivi commande par numéro

##### Avis
- ✅ Soumission avis (API)
- ✅ Lecture avis approuvés

##### Chatbot
- ✅ Chatbot IA public (rate limit 10/min)

#### Frontend Store (14 pages)

**✅ PAGES ACTIVES**

1. `/store/[slug]` - Homepage
2. `/store/[slug]/products` - Catalogue avec filtres
3. `/store/[slug]/products/[slug]` - Détail produit
4. `/store/[slug]/checkout` - Panier & paiement (2 étapes)
5. `/store/[slug]/track` - Tracking commande
6. `/store/[slug]/account` - Compte client
7. `/store/[slug]/account/login` - Connexion
8. `/store/[slug]/account/register` - Inscription
9. `/store/[slug]/wishlist` - Liste souhaits
10. `/store/[slug]/about` - À propos
11. `/store/[slug]/contact` - Contact
12. `/store/[slug]/cgv` - CGV
13. `/store/[slug]/privacy` - Politique confidentialité
14. `/store/[slug]/policies` - Politiques retour/livraison

**Checkout Features:**
- ✅ 2 étapes (cart → delivery)
- ✅ Validation stock temps réel
- ✅ Coupons
- ✅ Calcul shipping
- ✅ Seuil livraison gratuite
- ✅ 4 moyens paiement
- ✅ Persistance session
- ✅ Meta Pixel tracking
- ✅ Création compte post-achat

---

### ❌ CE QUI MANQUE - Recommandations UX Expert

#### 🔴 CRITIQUE

**1. Affichage Avis Produits**
```
📌 BESOIN: API existe, UI manquante sur page produit
- Stars rating visible
- Liste avis approuvés
- Photos clients
- Tri (plus récents, plus utiles)
- Filtrage par note
```

**2. Soumission Avis Post-Achat**
```
📌 BESOIN: Workflow incomplet
- Email automatique J+7 après livraison
- Formulaire avis (note + commentaire + photo)
- Badge "achat vérifié"
- Incitation (points, coupon)
```

**3. Gestion Profil Client**
```
📌 BESOIN: Actuellement lecture seule
- Modification nom/prénom/email
- Changement mot de passe
- Téléphone de secours
```

#### 🟠 IMPORTANT

**4. Adresses Multiples**
```
📌 BESOIN: Actuellement 1 adresse à chaque commande
- Carnet d'adresses
- Adresse par défaut
- Labels (Domicile, Bureau, Autre)
- Sélection rapide au checkout
```

**5. Wishlist Complète**
```
📌 BESOIN: Page existe mais basique
- Ajout/retrait produits
- Notification baisse prix
- Partage wishlist
- Déplacer vers panier
```

**6. Demande Retour/Annulation**
```
📌 BESOIN: Statuts existent (RETURN_REQUESTED, etc.) mais pas d'UI
- Bouton "Annuler commande" (si PENDING/CONFIRMED)
- Formulaire retour avec raison
- Upload photos produit défectueux
- Suivi statut retour
```

**7. Historique Détaillé**
```
📌 BESOIN: Actuellement liste basique
- Détail chaque commande (items, prix, shipping)
- Téléchargement facture PDF
- Récommander identique (repeat order)
- Suivi livraison intégré
```

#### 🟡 AMÉLIORATION

**8. Comparateur Produits**
```
📌 BESOIN: Feature e-commerce standard
- Comparer jusqu'à 4 produits
- Tableau caractéristiques
```

**9. Quick View Produits**
```
📌 BESOIN: UX moderne
- Modal aperçu rapide depuis catalogue
- Ajout panier sans quitter la page
```

**10. Filtre Prix**
```
📌 BESOIN: Navigation
- Slider min-max prix
- Filtres disponibilité (en stock, précommande)
```

**11. Support Client**
```
📌 BESOIN: Assistance
- Chat live (actuellement seulement WhatsApp widget)
- FAQ dynamique
- Tickets support
```

**12. Programme Fidélité Client**
```
📌 BESOIN: Rétention
- Points visibles sur compte
- Historique gains/dépenses
- Catalogue récompenses
```

**13. Notifications Email Transactionnelles**
```
📌 BESOIN: Communication
- Confirmation commande (existe probablement)
- Expédition avec tracking
- Livraison confirmée
- Demande avis
- Rappel panier abandonné
```

---

### 🎯 Score Maturité: 7/10

**Points forts:**
- ✅ Checkout complet et optimisé
- ✅ Multi-paiement (4 méthodes)
- ✅ Tracking commande
- ✅ Compte client
- ✅ Pages légales

**À améliorer:**
- 🔴 Pas d'affichage avis (API existe)
- 🔴 Profil non éditable
- 🟠 Wishlist basique
- 🟠 Pas de demande retour UI

---

## 4️⃣ PROBLÈME MAJEUR: RBAC (Contrôle d'Accès)

### 🔴 DÉCOUVERTE CRITIQUE

**Expert Sécurité Applicative**

```typescript
// Schéma Prisma définit 3 rôles:
enum UserRole {
  OWNER  // Propriétaire boutique
  ADMIN  // Administrateur
  STAFF  // Employé
}
```

**MAIS:**
```typescript
// TOUS les endpoints utilisent uniquement:
@UseGuards(JwtAuthGuard)

// Aucun:
@Roles('OWNER')
@Roles('ADMIN', 'OWNER')
@UseGuards(RolesGuard)
```

### 🚨 Conséquences

Un **STAFF** (employé) peut actuellement:
- ❌ Modifier les paramètres boutique
- ❌ Voir le wallet et finances
- ❌ Changer le plan
- ❌ Créer/supprimer d'autres utilisateurs
- ❌ Configurer les moyens de paiement
- ❌ Voir les analytics financières

### ✅ Solution Recommandée

#### 1. Créer RolesGuard
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

#### 2. Créer Decorator @Roles()
```typescript
// api/src/common/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
```

#### 3. Appliquer sur Endpoints Sensibles
```typescript
// Exemple: api/src/modules/tenants/tenants.controller.ts

@Roles(UserRole.OWNER)
@Patch('me')
async updateSettings() { }

@Roles(UserRole.OWNER)
@Patch('me/plan')
async upgradePlan() { }

@Roles(UserRole.OWNER, UserRole.ADMIN)
@Post('me/products')
async createProduct() { }

@Roles(UserRole.OWNER, UserRole.ADMIN)
@Get('analytics')
async getAnalytics() { }

// STAFF peut seulement:
// - Voir commandes
// - Changer statut commande
// - Voir produits
```

#### 4. Matrice Permissions Proposée

| Action | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| **Paramètres Boutique** |
| Modifier infos boutique | ✅ | ❌ | ❌ |
| Logo, thème, hero | ✅ | ❌ | ❌ |
| Moyens paiement | ✅ | ❌ | ❌ |
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

## 📊 MATRICE GLOBALE: QUI VOIT QUOI?

### Backend API

| Module | SuperAdmin | OWNER | ADMIN | STAFF | Customer | Public |
|--------|------------|-------|-------|-------|----------|--------|
| Platform Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tenants Management | ✅ | Mon tenant | Mon tenant | Mon tenant | ❌ | Infos publiques |
| Users/Team | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Products | Liste tous | ✅ | ✅ | 👁️ | ❌ | Liste publique |
| Categories | Liste tous | ✅ | ✅ | 👁️ | ❌ | Liste publique |
| Orders | Liste tous | ✅ | ✅ | ✅ | Mes commandes | Créer |
| Customers | Liste tous | ✅ | ✅ | 👁️ | ❌ | ❌ |
| Coupons | ❌ | ✅ | ✅ | ❌ | ❌ | Valider |
| Reviews | ❌ | ✅ Modération | ✅ Modération | ❌ | ❌ | Créer/Lire |
| Invoices | Liste tous | ✅ | ✅ | ❌ | ❌ | ❌ |
| Payments | ❌ | ✅ | ✅ | ❌ | ✅ | Initier |
| Shipping | CRUD carriers | ✅ Config | ✅ Config | Créer expédition | ❌ | ❌ |
| Wallet | Liste tous + topup | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics (Store) | ❌ | ✅ | ✅ | ❌ | ❌ | Ingest events |
| Analytics (SaaS) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Platform Revenue | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI | Stats tous | ✅ Utiliser | ✅ Utiliser | ✅ Utiliser | ❌ | Chatbot |
| Credit Codes | ✅ CRUD | Utiliser | ❌ | ❌ | ❌ | ❌ |
| Inventory | ❌ | ✅ | ✅ | Ajuster | ❌ | ❌ |

**Légende:**
✅ Accès complet | 👁️ Lecture seule | ❌ Aucun accès

---

## 🎯 PLAN D'ACTION PRIORISÉ

### Phase 1: CRITIQUE (Sprint 1-2)

**🔴 Priorité 1 - Sécurité**
1. ✅ Implémenter `RolesGuard` et `@Roles()` decorator
2. ✅ Appliquer permissions OWNER/ADMIN/STAFF sur tous endpoints
3. ✅ Tests E2E permissions
4. ✅ Migration data: attribuer rôle OWNER aux premiers users de chaque tenant

**🔴 Priorité 2 - Fonctionnalités Bloquantes Marchands**
5. ✅ **CRM Clients** - Implémenter page `/dashboard/customers` (API existe)
6. ✅ **Gestion Coupons** - Implémenter page `/dashboard/coupons` (API existe)
7. ✅ **Modération Avis** - Implémenter page `/dashboard/reviews` (API existe)

### Phase 2: IMPORTANT (Sprint 3-4)

**🟠 Priorité 3 - Expérience Client**
8. ✅ Affichage avis sur pages produits (API existe)
9. ✅ Workflow soumission avis post-achat
10. ✅ Édition profil client
11. ✅ Adresses multiples
12. ✅ Demande retour/annulation UI

**🟠 Priorité 4 - Opérations Marchands**
13. ✅ **Inventory Management** - Implémenter page `/dashboard/inventory` (API existe)
14. ✅ Dashboard logistique (commandes à préparer)
15. ✅ Multi-user management (créer/éditer/supprimer ADMIN/STAFF)

### Phase 3: AMÉLIORATION (Sprint 5-6)

**🟡 Priorité 5 - Marketing**
16. ✅ Email marketing basique (campagnes)
17. ✅ Abandon cart recovery
18. ✅ Programme fidélité

**🟡 Priorité 6 - Admin Avancé**
19. ✅ Audit logs détaillés
20. ✅ Bulk operations tenants
21. ✅ Support ticketing system

### Phase 4: OPTIMISATION (Backlog)

22. ⚪ Feature flags
23. ⚪ API rate limiting dashboard
24. ⚪ Impersonation mode
25. ⚪ Mobile app dashboard
26. ⚪ Advanced reporting
27. ⚪ Multi-devise

---

## 📈 SCORING FINAL PAR RÔLE

| Rôle | Maturité Actuelle | Maturité Cible | Gap |
|------|-------------------|----------------|-----|
| **SuperAdmin** | 7.5/10 | 9/10 | +1.5 (audit logs, bulk ops) |
| **Merchant (OWNER)** | 6/10 | 9/10 | +3 (RBAC, CRM, coupons, inventory, marketing) |
| **Merchant (ADMIN)** | 0/10 🔴 | 8/10 | +8 (RBAC inexistant) |
| **Merchant (STAFF)** | 0/10 🔴 | 7/10 | +7 (RBAC inexistant) |
| **Customer** | 7/10 | 8.5/10 | +1.5 (avis, profil, adresses) |

**Moyenne globale:** 4.1/10 → 8.3/10
**Effort estimé:** ~12 sprints (6 mois à 2 semaines/sprint)

---

## 🏆 CONCLUSION & RECOMMANDATIONS

### Points Forts de la Plateforme

✅ **Architecture solide**
- Séparation claire SuperAdmin/Tenant/Customer
- Multi-tenancy bien implémenté
- 3 guards de sécurité distincts

✅ **Fonctionnalités core complètes**
- E-commerce complet (produits, commandes, checkout)
- Multi-transporteurs
- Multi-paiement (4 méthodes)
- Analytics SaaS avancés (churn, LTV, cohorts, MRR)

✅ **Conformité légale**
- Factures conformes Tunisie (TVA, timbre fiscal, MF)
- Pages CGV/privacy

### Points d'Amélioration Critiques

🔴 **RBAC inexistant** - Tous les marchands ont tous les droits
🔴 **4 pages dashboard vides** - Customers, Coupons, Inventory, Reviews
🔴 **Pas de CRM** - Gestion clients limitée
🔴 **Avis produits invisibles** - API existe, UI manquante

### Recommendation Finale

**Prioriser absolument:**
1. **Sécurité RBAC** (1 sprint) - Risque sécurité élevé
2. **4 pages vides** (2 sprints) - APIs existent, juste UI
3. **CRM + Avis** (2 sprints) - Indispensable e-commerce moderne

Avec ces 5 sprints (2.5 mois), la plateforme passe de **4.1/10 à 7/10** en maturité.

---

**Document généré le:** 2026-03-06
**Prochaine révision:** Après Phase 1 (~ 2026-04-01)
