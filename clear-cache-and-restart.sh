#!/bin/bash

echo "🧹 Nettoyage complet du cache..."

# Arrêter Next.js
echo "⏸️  Arrêt de Next.js..."
pkill -f "next-server" || true
sleep 2

# Nettoyer le cache Next.js
echo "🗑️  Suppression du cache Next.js..."
cd /home/debian/shopforge.tech/web
rm -rf .next
rm -rf node_modules/.cache

# Redémarrer Next.js
echo "🚀 Redémarrage de Next.js..."
cd /home/debian/shopforge.tech/web
nohup npm run start > /var/log/nextjs.log 2>&1 &

sleep 3

# Vérifier que Next.js tourne
if ps aux | grep -v grep | grep "next-server" > /dev/null; then
    echo "✅ Next.js redémarré avec succès !"
    echo "📍 Les nouvelles pages devraient maintenant être visibles"
    echo ""
    echo "Pages disponibles :"
    echo "  - 🎁 Programme Fidélité : https://app.shopforge.tech/dashboard/loyalty"
    echo "  - 📜 Audit Logs : https://app.shopforge.tech/admin/audit-logs"
else
    echo "❌ Erreur : Next.js n'a pas démarré"
    echo "Vérifiez les logs : tail -f /var/log/nextjs.log"
fi
