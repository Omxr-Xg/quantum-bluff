#!/bin/bash
set -e

echo "🚀 Déploiement Quantum Bluff Backend..."

echo "📦 Installation des dépendances..."
npm ci

echo "🗄️ Migration de la base de données..."
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
npx prisma migrate deploy

echo "🔨 Build du projet..."
npm run build

echo "♻️ Redémarrage du serveur..."
pm2 restart quantum-bluff || pm2 start dist/index.js --name quantum-bluff

echo "✅ Déploiement terminé !"
