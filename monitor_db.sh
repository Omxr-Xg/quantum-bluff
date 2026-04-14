#!/bin/bash
DB_CONTAINER="postgres_db"
DB_USER="admin" # Celui qui a marché pour le backup
DB_NAME="quantum_bluff"

echo "--- 🔌 CONNEXIONS ACTIVES ---"
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM pg_stat_activity;"

echo -e "\n--- 🔒 LOCKS EN ATTENTE (DANGER) ---"
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT pid, mode, waitstart FROM pg_locks WHERE granted = false;"

echo -e "\n--- 🐢 REQUÊTES LES PLUS LENTES ---"
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT query, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;" 2>/dev/null || echo "Extension pg_stat_statements non activée."
