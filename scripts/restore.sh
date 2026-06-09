#!/usr/bin/env bash
# Restaure un dump .sql ou .sql.gz vers DATABASE_URL.
# Usage : DATABASE_URL='postgresql://...' ./scripts/restore.sh backups/prod/quantum_bluff_YYYY-MM-DD.sql.gz
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: DATABASE_URL=... $0 <fichier.sql|fichier.sql.gz>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL requis." >&2
  exit 1
fi

FILE="$1"
if [[ ! -f "$FILE" ]]; then
  echo "❌ Fichier introuvable: $FILE" >&2
  exit 1
fi

echo "⚠️  Restauration vers la base cible de DATABASE_URL."
echo "    Fichier: $FILE"
read -r -p "Tapez RESTORE pour confirmer: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Annulé."
  exit 1
fi

echo "🗄️ Restauration en cours…"
if [[ "$FILE" == *.gz ]]; then
  gunzip -c "$FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
else
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$FILE"
fi

echo "✅ Restauration terminée."
