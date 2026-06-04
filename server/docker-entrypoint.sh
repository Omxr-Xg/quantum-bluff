#!/bin/sh
set -e

# Prisma 6 + Supabase : directUrl pour migrate deploy. Sur Render, si seul DATABASE_URL est défini, on réutilise la même URL.
if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DIRECT_URL="$DATABASE_URL"
  echo "ℹ️ DIRECT_URL non défini — utilisation de DATABASE_URL pour les migrations."
fi

echo "🗄️ Exécution des migrations Prisma..."
npx prisma migrate deploy

if [ -f prisma/scripts/supabase-rls-hardening.sql ]; then
  echo "🔒 Durcissement RLS Supabase (tables public)..."
  RLS_URL="${DIRECT_URL:-$DATABASE_URL}"
  npx prisma db execute --file prisma/scripts/supabase-rls-hardening.sql --url "$RLS_URL"
fi

echo "🚀 Démarrage du serveur..."
exec "$@"
