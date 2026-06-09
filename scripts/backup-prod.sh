#!/usr/bin/env bash
# Sauvegarde PostgreSQL production (Supabase / DATABASE_URL direct port 5432).
# Usage : DATABASE_URL='postgresql://...' ./scripts/backup-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/prod}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL requis (connexion directe, port 5432 recommandé pour pg_dump)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/quantum_bluff_${TIMESTAMP}.sql.gz"

echo "🕒 Backup → $OUT"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip -9 > "$OUT"

if [[ ! -s "$OUT" ]]; then
  echo "❌ Fichier backup vide." >&2
  exit 1
fi

echo "✅ Backup OK ($(du -h "$OUT" | cut -f1))"
find "$BACKUP_DIR" -type f -name 'quantum_bluff_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "🧹 Rétention ${RETENTION_DAYS} jours appliquée."
