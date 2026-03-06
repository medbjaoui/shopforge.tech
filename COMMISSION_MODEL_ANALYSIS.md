# Analyse & Modèle de Commission Optimal - ShopForge

**Date:** 2026-03-06
**Objectif:** Maximiser les revenus ShopForge tout en restant compétitif

---

## 🔍 Analyse Concurrence Tunisie

### Converty
- **Commission:** 0.3% après seuil
- **Exemple:** 1000 TND → 3 TND de commission
- **Clients:** 2458 marchands
- **Volume:** +1M TND de ventes

### TikTakPro
- **Utilisateurs:** 47,000+
- **Pricing:** Non publique (devis sur demande)
- **Positionnement:** Omni-canal, back-office centralisé

### Autres Plateformes (International)
- **Shopify:** 2% + frais transaction
- **WooCommerce:** 0% (auto-hébergé) + frais paiement
- **Stripe:** 2.9% + 0.30$ par transaction

---

## 📐 Équations de Revenus

### **Modèle Actuel ShopForge (Pourcentage Simple)**

```
Revenue = Σ (OrderAmount × CommissionRate)

FREE:    Revenue = OrderAmount × 3%
STARTER: Revenue = OrderAmount × 1.5%
PRO:     Revenue = OrderAmount × 0.5%
```

**Problèmes:**
- ❌ Peu de revenus sur petites commandes (20 TND × 3% = 0.60 TND)
- ❌ Non compétitif vs Converty (0.3%)
- ❌ Pas de revenu minimum garanti par commande

---

## 💰 Modèle Recommandé: **Hybride (Fixe + Pourcentage)**

### **Option 1: Fixe + Pourcentage (Max des deux)**

```
Commission = MAX(FixedFee, OrderAmount × Percentage)
```

**Exemple FREE:**
```
Commission = MAX(1.5 TND, OrderAmount × 1%)

Commande 50 TND:  MAX(1.5, 0.5)  = 1.5 TND  ✅ (fixe gagne)
Commande 200 TND: MAX(1.5, 2.0)  = 2.0 TND  ✅ (% gagne)
Commande 500 TND: MAX(1.5, 5.0)  = 5.0 TND  ✅ (% gagne)
```

**Barème Proposé:**

| Plan | Fixe Min | % | Exemple 100 TND | Exemple 500 TND |
|------|----------|---|-----------------|-----------------|
| FREE | 1.5 TND | 1% | 1.5 TND | 5 TND |
| STARTER | 1 TND | 0.5% | 1 TND | 2.5 TND |
| PRO | 0.5 TND | 0.3% | 1 TND | 1.5 TND |

**Avantages:**
- ✅ Revenu minimum garanti (même petites commandes)
- ✅ Compétitif avec Converty (0.3% PRO)
- ✅ Incentive upgrade STARTER → PRO
- ✅ Protège contre commandes low-value

---

### **Option 2: Fixe + Pourcentage (Somme des deux)**

```
Commission = FixedFee + (OrderAmount × Percentage)
```

**Exemple FREE:**
```
Commission = 0.5 TND + (OrderAmount × 0.5%)

Commande 50 TND:  0.5 + 0.25  = 0.75 TND
Commande 200 TND: 0.5 + 1.0   = 1.5 TND
Commande 500 TND: 0.5 + 2.5   = 3.0 TND
```

**Barème Proposé:**

| Plan | Fixe | % | Exemple 100 TND | Exemple 500 TND |
|------|------|---|-----------------|-----------------|
| FREE | 0.5 TND | 0.8% | 1.3 TND | 4.5 TND |
| STARTER | 0.3 TND | 0.4% | 0.7 TND | 2.3 TND |
| PRO | 0.2 TND | 0.2% | 0.6 TND | 1.2 TND |

**Avantages:**
- ✅ Revenus plus élevés sur toutes commandes
- ✅ Prévisible pour les marchands
- ⚠️ Peut être perçu comme "cher" vs concurrence

---

### **Option 3: Paliers (Tiers)**

```
Commission =
  IF OrderAmount < 50 TND  → 1.5 TND
  IF 50 ≤ OrderAmount < 200 → 1%
  IF OrderAmount ≥ 200      → 0.5%
```

**Exemple FREE:**

| Montant Commande | Commission |
|------------------|------------|
| 30 TND | 1.5 TND (fixe) |
| 100 TND | 1 TND (1%) |
| 500 TND | 2.5 TND (0.5%) |

**Avantages:**
- ✅ Encourage commandes à haute valeur
- ✅ Protège sur petites commandes
- ⚠️ Complexe à expliquer

---

## 📊 Simulation de Revenus

### **Scénario: 1 Marchand FREE, 100 commandes/mois**

**Profil Commandes Typique Tunisia:**
- 40 commandes × 50 TND (moyenne basse)
- 40 commandes × 150 TND (moyenne)
- 20 commandes × 400 TND (premium)

**Total Volume:** 14,000 TND/mois

#### **Modèle Actuel (3% simple):**
```
Revenue = 14,000 × 3% = 420 TND/mois
```

#### **Option 1 (MAX fixe/%):**
```
Petites (40 × 50 TND):
  40 × MAX(1.5, 0.5) = 40 × 1.5 = 60 TND

Moyennes (40 × 150 TND):
  40 × MAX(1.5, 1.5) = 40 × 1.5 = 60 TND

Grandes (20 × 400 TND):
  20 × MAX(1.5, 4.0) = 20 × 4.0 = 80 TND

TOTAL = 200 TND/mois  (-52% vs actuel)
```

#### **Option 2 (Fixe + %):**
```
Petites: 40 × (0.5 + 0.4) = 36 TND
Moyennes: 40 × (0.5 + 1.2) = 68 TND
Grandes: 20 × (0.5 + 3.2) = 74 TND

TOTAL = 178 TND/mois  (-58% vs actuel)
```

#### **Converty (0.3%):**
```
Revenue = 14,000 × 0.3% = 42 TND/mois  (-90% vs actuel!)
```

---

## 🎯 Recommandation Finale

### **Modèle Hybride Optimisé:**

```javascript
Commission = MAX(FixedMinimum, OrderAmount × Percentage)
```

**Barème ShopForge 2026:**

| Plan | Abonnement/mois | Fixe Min/commande | % Commission | Seuil Break-even |
|------|-----------------|-------------------|--------------|------------------|
| **FREE** | 0 TND | **2 TND** | **1.2%** | 167 TND |
| **STARTER** | 29 TND | **1 TND** | **0.6%** | 167 TND |
| **PRO** | 79 TND | **0.5 TND** | **0.4%** | 125 TND |

**Seuil Break-even** = Point où % > Fixe

**Exemple FREE:**
- Commande 50 TND: 2 TND (fixe)
- Commande 100 TND: 2 TND (fixe)
- Commande 200 TND: 2.4 TND (1.2%)
- Commande 500 TND: 6 TND (1.2%)

---

## 💡 Pourquoi ce Modèle?

### **Comparaison Compétitive:**

| Plateforme | Petite (50 TND) | Moyenne (200 TND) | Grande (500 TND) |
|------------|-----------------|-------------------|------------------|
| **ShopForge FREE** | 2 TND | 2.4 TND | 6 TND |
| **ShopForge PRO** | 0.5 TND | 0.8 TND | 2 TND |
| Converty (0.3%) | 0.15 TND | 0.6 TND | 1.5 TND |
| Actuel (3%) | 1.5 TND | 6 TND | 15 TND |

### **Avantages:**

1. **✅ Compétitif sur PRO:**
   - 0.4% vs 0.3% Converty (écart minime)
   - Mais avec 79 TND/mois d'abonnement (MRR stable)

2. **✅ Revenu minimum garanti:**
   - Petites commandes rapportent toujours
   - Évite cannibalisation par low-value orders

3. **✅ Incentive claire pour upgrade:**
   - FREE → STARTER: économie significative
   - STARTER → PRO: meilleur pour gros volumes

4. **✅ Simple à comprendre:**
   - "Max entre 2 TND ou 1.2%"
   - Calculateur facile sur pricing page

5. **✅ Protection marché Tunisia:**
   - Panier moyen 100-200 TND
   - Fixe assure revenu décent

---

## 📈 Projections Revenus

### **Scénario 1: 10 Marchands Actifs**

**Mix:**
- 5 FREE (100 commandes/mois, panier moyen 120 TND)
- 3 STARTER (200 commandes/mois, panier moyen 150 TND)
- 2 PRO (500 commandes/mois, panier moyen 200 TND)

**Revenus Mensuels:**

**FREE:**
```
5 marchands × 100 commandes × 2 TND = 1,000 TND
(car panier 120 TND → 1.44% < 2 TND fixe)
```

**STARTER:**
```
Abonnements: 3 × 29 = 87 TND
Commissions: 3 × 200 × 1 TND = 600 TND
(car panier 150 TND → 0.9% < 1 TND fixe)
TOTAL: 687 TND
```

**PRO:**
```
Abonnements: 2 × 79 = 158 TND
Commissions: 2 × 500 × MAX(0.5, 0.8) = 1,000 × 0.8 = 800 TND
(car panier 200 TND → 0.8% > 0.5 TND fixe)
TOTAL: 958 TND
```

**TOTAL MRR:** 1,000 + 687 + 958 = **2,645 TND/mois**

**Volume Traité:** 360,000 TND
**Marge Effective:** 0.73%

---

### **Scénario 2: 100 Marchands (Scale)**

**Mix:**
- 60 FREE
- 30 STARTER
- 10 PRO

**TOTAL MRR:** ~**26,000 TND/mois** = **312,000 TND/an**

---

## 🚀 Implémentation

### **1. Modifications Base de Données**

```prisma
model PlatformConfig {
  // Ajouter:
  freeFixedFee      Decimal @default(2.0)
  freePercentage    Decimal @default(1.2)

  starterFixedFee   Decimal @default(1.0)
  starterPercentage Decimal @default(0.6)

  proFixedFee       Decimal @default(0.5)
  proPercentage     Decimal @default(0.4)
}
```

### **2. Logique Calcul**

```typescript
function calculateCommission(orderAmount: number, plan: PlanType): number {
  const config = await getCommissionConfig(plan);

  const fixedFee = config.fixedFee;
  const percentage = config.percentage / 100;

  const percentageFee = orderAmount * percentage;

  return Math.max(fixedFee, percentageFee);
}
```

### **3. Affichage Dashboard Marchand**

```
📊 Vos Commissions (Plan FREE):
   • Fixe minimum: 2 TND par commande
   • Pourcentage: 1.2% si > 167 TND

   Exemples:
   - Commande 50 TND  → 2 TND
   - Commande 200 TND → 2.4 TND
   - Commande 500 TND → 6 TND

   💡 Passez à STARTER pour économiser!
```

---

## 📋 Plan de Transition

### **Phase 1: Communication (J-30)**
- Annonce nouveau modèle
- Calculateur interactif sur site
- Email à tous les marchands existants

### **Phase 2: Grandfathering (optionnel)**
- Marchands actuels: ancien modèle pendant 3 mois
- Nouveaux: nouveau modèle immédiat

### **Phase 3: Migration Complète (J+90)**
- Tous sur nouveau modèle
- Support dédié pour questions

---

## 🎯 Conclusion

**Modèle Recommandé:**

```
Commission = MAX(FixedMinimum, OrderAmount × Percentage)

FREE:    MAX(2 TND, 1.2%)
STARTER: MAX(1 TND, 0.6%) + 29 TND/mois
PRO:     MAX(0.5 TND, 0.4%) + 79 TND/mois
```

**Pourquoi:**
- ✅ Compétitif vs Converty sur gros volumes (PRO 0.4% vs 0.3%)
- ✅ Rentable sur petites commandes (2 TND min vs 0.15 TND Converty)
- ✅ Incentive upgrade clair
- ✅ MRR stable via abonnements STARTER/PRO
- ✅ Simple à comprendre et calculer

**Next Steps:**
1. Valider barème avec vous
2. Implémenter dans le code
3. Créer calculateur frontend
4. Tester avec marchands pilotes
5. Déployer progressivement

---

**Votre avis?** Voulez-vous ajuster les montants fixes ou pourcentages?
