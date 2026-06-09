#!/usr/bin/env bash
# Drill restore : vérifie qu'un dump .sql.gz est lisible (sans écraser une BDD).
# Usage : ./scripts/restore-test.sh backups/prod/quantum_bluff_YYYY-MM-DD.sql.gz
set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <fichier.sql.gz>" >&2
  exit 1
fi

echo "🔍 Test intégrité : $BACKUP_FILE"
gunzip -t "$BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | head -n 200 | grep -Eqi 'PostgreSQL|CREATE TABLE|CREATE TYPE'
echo "✅ Dump lisible — pour un vrai restore : CONFIRM=RESTORE ./scripts/restore.sh $BACKUP_FILE"
