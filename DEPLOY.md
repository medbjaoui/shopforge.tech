# ShopForge — Guide de déploiement VPS (Cloudflare Tunnel + Traefik)

Architecture prod : **VPS** (Docker + Traefik) ← → **Cloudflare Tunnel** (outbound) ← → **Internet**
Aucun port entrant requis. Zéro exposition de surface d'attaque. SSL géré par Cloudflare edge.

---

## Prérequis

- VPS Linux (Ubuntu 22.04 recommandé), min 2 vCPU / 2 Go RAM
- Git installé sur le VPS
- Docker + Docker Compose installés
- Domaine `shopforge.tech` géré par Cloudflare (DNS dans Cloudflare)
- Compte Cloudflare Zero Trust (plan gratuit suffisant)

---

## Étape 1 — Créer le Cloudflare Tunnel

1. Aller sur [one.dash.cloudflare.com](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel**
3. Nommer : `shopforge-prod` → **Save**
4. Choisir **Docker** → copier le token affiché (= `CLOUDFLARE_TUNNEL_TOKEN`)
5. Copier aussi l'**UUID du tunnel** affiché (= `CF_TUNNEL_ID`, format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
6. Dans l'onglet **Public Hostname**, configurer ces routes (cible = Traefik interne) :

| Subdomain          | Domain         | Service              |
|--------------------|----------------|----------------------|
| `api`              | `shopforge.tech` | `http://traefik:80` |
| *(vide)*           | `shopforge.tech` | `http://traefik:80` |
| `*`                | `shopforge.tech` | `http://traefik:80` |

> Tout le trafic passe par Traefik qui route selon le `Host` header.
> Les domaines custom marchands sont ajoutés automatiquement via l'API Cloudflare.

---

## Étape 2 — Créer un token API Cloudflare (pour domaines custom)

Ce token permet à ShopForge d'enregistrer automatiquement les domaines custom des marchands dans le tunnel.

1. Aller sur [dash.cloudflare.com → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token → Custom Token**
3. Permissions : **Account → Cloudflare Tunnel → Edit**
4. Copier le token généré (= `CF_API_TOKEN`)
5. Récupérer votre **Account ID** depuis la page d'accueil du dashboard CF (= `CF_ACCOUNT_ID`)

---

## Étape 3 — Préparer le VPS

```bash
# Connexion SSH
ssh user@VOTRE_IP_VPS

# Cloner le dépôt
git clone https://github.com/votre-org/shopforge.tech.git
cd shopforge.tech

# Créer le fichier .env depuis le template
cp .env.production.example .env
nano .env   # Remplir toutes les valeurs
```

Générer des secrets forts :
```bash
# JWT_SECRET (64 chars)
openssl rand -hex 32

# JWT_REFRESH_SECRET (64 chars)
openssl rand -hex 32

# DB_PASSWORD (32 chars)
openssl rand -hex 16
```

---

## Étape 4 — Premier lancement

```bash
# Builder et lancer tous les services
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier que tout tourne (db, traefik, api, web, cloudflared)
docker compose -f docker-compose.prod.yml ps

# Attendre que la DB soit healthy, puis lancer les migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Seed initial (super admin + données de base)
docker compose -f docker-compose.prod.yml exec api npx prisma db seed

# Vérifier les logs cloudflared (doit afficher "Registered tunnel connection")
docker compose -f docker-compose.prod.yml logs cloudflared
```

---

## Étape 5 — Vérification

```bash
# API accessible depuis internet
curl https://api.shopforge.tech/health

# Store d'un tenant (remplacer mon-store par un vrai slug)
curl https://mon-store.shopforge.tech
```

---

## Domaines personnalisés (marchands)

Les marchands peuvent utiliser leur propre domaine (ex: `boutique.domain.com`) à la place de `slug.shopforge.tech`.

### Côté super admin

1. Aller sur le panel admin → **Boutiques** → sélectionner la boutique
2. Dans la section **Domaine personnalisé**, saisir le domaine et cliquer **OK**
3. L'entrée est automatiquement enregistrée dans le tunnel Cloudflare

### Côté marchand (instructions DNS)

Le marchand doit ajouter un CNAME dans son DNS :

```
boutique.domain.com  →  CNAME  →  <CF_TUNNEL_ID>.cfargotunnel.com
```

> Le super admin panel affiche cette cible CNAME automatiquement.
> SSL provisionné automatiquement par Cloudflare. Propagation : 5-30 min.

### Flux technique

```
boutique.domain.com
    │ CNAME → <tunnel-uuid>.cfargotunnel.com
    ▼
Cloudflare Edge (SSL terminé ici)
    ▼
Cloudflare Tunnel → http://traefik:80
    ▼
Traefik (catch-all Host: *)
    ▼
Next.js middleware: GET /tenants/by-domain/boutique.domain.com
    ▼
Rewrite → /store/[slug]/...
```

---

## Mise à jour de l'application

```bash
# Sur le VPS
cd shopforge.tech
git pull origin main

# Rebuild et restart (zéro downtime si DB inchangée)
docker compose -f docker-compose.prod.yml up -d --build

# Si des migrations Prisma sont présentes
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## Commandes utiles

```bash
# Voir les logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un seul service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f cloudflared
docker compose -f docker-compose.prod.yml logs -f traefik

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart api

# Accéder au shell de l'API
docker compose -f docker-compose.prod.yml exec api sh

# Backup de la base de données
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U shopforge shopforge > backup_$(date +%Y%m%d).sql
```

---

## Structure réseau

```
Internet
   │
   └── Cloudflare CDN + WAF + SSL
          │  (HTTPS 443, chiffré Cloudflare ↔ Client)
          │
   Cloudflare Tunnel (connexion SORTANTE depuis VPS)
          │
   ┌──────▼──────────────────────────────────────────────┐
   │  Docker Network (shopforge_network)                  │
   │                                                      │
   │  cloudflared → traefik:80                            │
   │                   │                                  │
   │                   ├── Host: api.shopforge.tech       │
   │                   │        └─► api:3001              │
   │                   │                                  │
   │                   └── Host: * (catch-all)            │
   │                            └─► web:3000              │
   │                                    │                 │
   │  api:3001 ──────────────────── db:5432               │
   │                                                      │
   │  Aucun port exposé au réseau hôte                    │
   └──────────────────────────────────────────────────────┘
```

---

## Variables d'environnement résumé

| Variable                  | Où utilisée       | Description                                        |
|---------------------------|-------------------|----------------------------------------------------|
| `DB_PASSWORD`             | API + DB          | Mot de passe PostgreSQL                            |
| `JWT_SECRET`              | API               | Secret pour access tokens (15min)                  |
| `JWT_REFRESH_SECRET`      | API               | Secret pour refresh tokens (7j)                    |
| `JWT_ADMIN_SECRET`        | API               | Secret pour tokens super admin (8h)                |
| `CLOUDFLARE_TUNNEL_TOKEN` | cloudflared       | Token du tunnel Cloudflare                         |
| `CF_ACCOUNT_ID`           | API               | ID de compte Cloudflare (domaines custom)          |
| `CF_TUNNEL_ID`            | API               | UUID du tunnel Cloudflare (domaines custom)        |
| `CF_API_TOKEN`            | API               | Token API CF avec permission Tunnel:Edit           |
| `NEXT_PUBLIC_API_URL`     | Web (client)      | URL publique API (via Cloudflare)                  |
| `INTERNAL_API_URL`        | Web (SSR)         | URL interne API (Docker network direct)            |
| `SUPER_ADMIN_EMAIL`       | API               | Email du super admin (seed auto)                   |
| `SUPER_ADMIN_PASSWORD`    | API               | Mot de passe super admin (seed auto)               |
| `SMTP_HOST`               | API               | Serveur SMTP pour les emails transactionnels       |
| `SMTP_PORT`               | API               | Port SMTP (ex: 587)                                |
| `SMTP_USER`               | API               | Utilisateur SMTP                                   |
| `SMTP_PASS`               | API               | Mot de passe SMTP                                  |
| `SMTP_FROM`               | API               | Adresse expéditeur (ex: noreply@shopforge.tech)    |

> Les variables `CF_ACCOUNT_ID`, `CF_TUNNEL_ID`, `CF_API_TOKEN` sont optionnelles.
> Si absentes, les domaines custom sont quand même sauvegardés en base mais le tunnel n'est pas mis à jour automatiquement (configuration manuelle requise dans le dashboard CF).
