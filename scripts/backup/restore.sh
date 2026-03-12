#!/bin/bash

# ============================================
# Quantum Bluff - Script de restauration
# ============================================

# Configuration
BACKUP_DIR="/Users/omxxr/Movies/quantum-bluff/backups"
DB_CONTAINER="postgres_db"
DB_USER="admin"
DB_NAME="quantum_bluff"

# Fonction de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Afficher la liste des backups disponibles
list_backups() {
    echo "📋 Backups disponibles:"
    ls -1 "$BACKUP_DIR" | grep "db_.*\.sql\.gz$" | while read file; do
        echo "   - $file"
    done
}

# Si aucun argument, afficher la liste
if [ $# -eq 0 ]; then
    log "❌ Utilisation: ./restore.sh <fichier_backup>"
    list_backups
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_PATH" ]; then
    log "❌ Fichier non trouvé: $BACKUP_PATH"
    list_backups
    exit 1
fi

log "🚀 Début de la restauration: $BACKUP_FILE"

# Demander confirmation
read -p "⚠️  La restauration va écraser la base existante. Continuer? (oui/non) " confirm
if [ "$confirm" != "oui" ]; then
    log "❌ Restauration annulée"
    exit 1
fi

# Décompresser le backup
log "📦 Décompression du backup..."
gunzip -c "$BACKUP_PATH" > "$BACKUP_DIR/temp_restore.sql"

if [ $? -ne 0 ]; then
    log "❌ Erreur lors de la décompression"
    exit 1
fi

# Restaurer la base
log "🔄 Restauration de la base de données..."
cat "$BACKUP_DIR/temp_restore.sql" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
    log "✅ Restauration réussie !"
else
    log "❌ Échec de la restauration"
    rm "$BACKUP_DIR/temp_restore.sql"
    exit 1
fi

# Nettoyer
rm "$BACKUP_DIR/temp_restore.sql"
log "🧹 Nettoyage terminé"

log "🎉 Restauration terminée !"
