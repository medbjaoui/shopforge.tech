# 📊 AUDIT FINANCIER & ANALYTIQUE - SHOPFORGE
**Date**: 6 Mars 2026
**Expert**: Analyse Finance & Cycle de vie

---

## 🔍 CYCLE DE VIE D'UNE COMMANDE

### 1. **Création de la commande** (Status: PENDING)
```
Customer → Passe commande → Order created
- orderAmount = subtotal + shippingFee - discountAmount
- Wallet NOT touched yet
- Stock décrémenté immédiatement
```

### 2. **Traitement de la commande** (CONFIRMED → PROCESSING → SHIPPED)
```
- Aucune transaction financière
- Création automatique du shipment si SHIPPED
- Facture générée automatiquement si CONFIRMED
```

### 3. **Livraison de la commande** (Status: DELIVERED) ⚠️ **POINT CLÉ**
```typescript
// Dans orders.service.ts:452-463
if (status === OrderStatus.DELIVERED) {
  this.walletService.deductCommission(
    tenantId,
    orderId,
    orderAmount,  // ← Montant total de la commande
    plan
  )
}
```

**Commission calculée sur**:
- ✅ `orderAmount` (montant total de la commande)
- ❌ PAS sur le solde wallet
- ❌ PAS sur le nombre d'articles

**Formule**: `commission = orderAmount × rate`
- FREE: 3%
- STARTER: 1.5%
- PRO: 0.5%

### 4. **Déduction de la commission** (wallet.service.ts:94-166)

```typescript
async deductCommission(tenantId, orderId, orderAmount, plan) {
  // 1. Vérifier si premier mois gratuit
  if (tenant.firstMonthCommissionFree && now < firstMonthEndsAt) {
    return; // ← Pas de commission
  }

  // 2. Calculer commission
  const rate = getDynamicCommissionRate(plan);
  const commission = orderAmount × rate;

  // 3. Déduire du wallet
  wallet.balance -= commission;
  wallet.totalCommission += commission;

  // 4. Créer enregistrement
  CommissionRecord.create({
    orderAmount,
    commissionRate: rate,
    commissionAmount: commission,
    status: COLLECTED
  });
}
```

---

## 💰 FLUX FINANCIERS

### **Revenus Plateforme** (Chiffre d'affaires)

#### 1. **Commissions sur livraisons** ✅
```sql
SELECT SUM(commissionAmount) FROM commission_records
WHERE status = 'COLLECTED';
```
**Montant actuel**: 2.100 TND

#### 2. **Prix des plans mensuels** ⚠️ **PROBLÈME DÉTECTÉ**
```
FREE: 0 TND/mois
STARTER: 29 TND/mois
PRO: 79 TND/mois
```

**⚠️ ALERTE**: Aucun système de facturation mensuelle des plans détecté !
- Pas de table `subscriptions`
- Pas de cron job pour charge mensuelle
- Pas de paiement automatique des plans

#### 3. **Recharges wallet (TOPUP)** ❌ **N'EST PAS UN REVENU**
```sql
SELECT SUM(totalTopup) FROM tenant_wallets; -- 30.000 TND
```

**Important**: Les TOPUP sont des **dépôts** des marchands, pas des revenus !
- Utilisés pour payer les futures commissions
- Doivent être restitués si le marchand quitte

---

## 📈 CHIFFRE D'AFFAIRES PLATEFORME

### **Revenus réels**:
1. ✅ **Commissions collectées**: 2.100 TND
2. ❌ **Prix plans mensuels**: 0 TND (non implémenté)
3. ❌ **TOPUP wallet**: 30.000 TND (⚠️ ce n'est PAS un revenu !)

### **CA Total actuel**: **2.100 TND** (commissions uniquement)

---

## ⚠️ PROBLÈMES IDENTIFIÉS

### 1. **Pas de facturation mensuelle des plans**
```
Problème: Les marchands ne paient jamais leur abonnement mensuel
- STARTER (29 TND/mois) → jamais facturé
- PRO (79 TND/mois) → jamais facturé
```

**Impact financier**:
- Perte de revenus récurrents
- Aucun MRR (Monthly Recurring Revenue)

### 2. **Confusion TOPUP vs Revenu**
```
⚠️ TOPUP = Dépôt (comme une carte prépayée)
✅ Commission = Revenu réel de la plateforme
```

**Les TOPUP ne doivent PAS être comptés comme chiffre d'affaires !**

### 3. **Pas de suivi du CA plateforme**
```
Manque:
- Dashboard admin pour CA total
- Graphique évolution commissions
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
```

### 4. **Premier mois gratuit non suivi**
```
Actuellement:
- firstMonthCommissionFree = true
- Mais aucun compteur des 50 commandes gratuites
- Aucun reporting sur commandes gratuites vs payantes
```

---

## 📊 AUDIT BASE DE DONNÉES

### **État actuel** (6 Mars 2026):
```
Tenants avec wallet: 2
Total TOPUP reçus: 30.000 TND (dépôts marchands)
Total Commissions: 2.100 TND (CA réel)
Transactions WELCOME: 2 × 15 TND = 30 TND
Transactions COMMISSION: 1 × 2.100 TND
```

### **Commissions Records**:
```sql
SELECT
  COUNT(*) as total_commissions,
  SUM(orderAmount) as total_orders_value,
  SUM(commissionAmount) as total_ca,
  AVG(commissionRate) as avg_rate
FROM commission_records;
```

---

## ✅ RECOMMANDATIONS

### 1. **Implémenter facturation mensuelle des plans**
```typescript
// Créer cron job mensuel
@Cron('0 0 1 * *') // 1er de chaque mois
async chargePlanFees() {
  const tenants = await getTenants({ plan: ['STARTER', 'PRO'] });

  for (const tenant of tenants) {
    const planPrice = getPlanPrice(tenant.plan);

    // Déduire du wallet
    await wallet.deduct({
      amount: planPrice,
      type: 'PLAN_FEE',
      description: `Abonnement ${tenant.plan} - ${month}`
    });

    // Créer revenu plateforme
    await platformRevenue.create({
      tenantId,
      type: 'SUBSCRIPTION',
      amount: planPrice
    });
  }
}
```

### 2. **Créer table PlatformRevenue**
```sql
CREATE TABLE platform_revenue (
  id TEXT PRIMARY KEY,
  type TEXT, -- 'COMMISSION' | 'SUBSCRIPTION'
  tenantId TEXT,
  amount DECIMAL(10,3),
  orderId TEXT, -- si type = COMMISSION
  period TEXT, -- '2026-03' si type = SUBSCRIPTION
  createdAt TIMESTAMP
);
```

### 3. **Dashboard Super Admin CA**
```
Metrics à afficher:
- CA total (commissions + subscriptions)
- MRR (Monthly Recurring Revenue)
- Commissions ce mois
- Nombre de tenants payants
- Graphique évolution CA
```

### 4. **Séparer TOPUP et Revenus**
```
TOPUP = Comptabilité client (passif)
Commission = Chiffre d'affaires (actif)
Plan Fee = Chiffre d'affaires (actif)
```

---

## 📝 RÉSUMÉ CYCLE COMMANDE

```
1. PENDING → Stock décrémenté
2. CONFIRMED → Facture générée
3. SHIPPED → Shipment créé
4. DELIVERED →
   ✅ Commission calculée (orderAmount × rate)
   ✅ Si hors 1er mois → Commission déduite du wallet
   ✅ CommissionRecord créé
   ✅ CA plateforme += commission
5. RETURNED/REFUNDED →
   ✅ Commission remboursée au marchand
   ✅ CA plateforme -= commission
```

---

## 🎯 FORMULES FINANCIÈRES

### **Commission**:
```
commission = orderAmount × rate
- FREE: orderAmount × 0.03
- STARTER: orderAmount × 0.015
- PRO: orderAmount × 0.005
```

### **CA Plateforme mensuel** (quand implémenté):
```
CA = Σ(commissions) + Σ(plan_fees)
   = Σ(commissions_COLLECTED) + (nb_STARTER × 29) + (nb_PRO × 79)
```

### **MRR** (quand implémenté):
```
MRR = (nb_tenants_STARTER × 29) + (nb_tenants_PRO × 79)
```

---

## ⚠️ POINTS D'ATTENTION

1. ✅ Commissions correctement calculées et déduites
2. ✅ Premier mois gratuit implémenté
3. ❌ **Facturation plans mensuels NON implémentée**
4. ❌ **CA plateforme mal suivi** (TOPUP ≠ Revenu)
5. ❌ **Dashboard admin CA manquant**
6. ✅ Remboursement commission sur retour fonctionne

---

**Conclusion**: Le système de commissions fonctionne correctement, mais la facturation des plans mensuels (STARTER 29 TND, PRO 79 TND) n'est pas implémentée, ce qui représente une perte de revenus récurrents significative.
