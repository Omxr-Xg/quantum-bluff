#!/bin/bash

# ============================================
# Quantum Bluff - Script de backup automatique
# ============================================

# Configuration
BACKUP_DIR="/Users/omxxr/Movies/quantum-bluff/backups"
DB_CONTAINER="postgres_db"
DB_USER="admin"
DB_NAME="quantum_bluff"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
RETENTION_DAYS=7

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Fonction de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

log "🚀 Démarrage du backup $DATE"

# Vérifier que Docker est en cours d'exécution
if ! docker ps >/dev/null 2>&1; then
    log "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

# Vérifier que le conteneur PostgreSQL existe
if ! docker ps | grep -q "$DB_CONTAINER"; then
    log "❌ Conteneur PostgreSQL non trouvé"
    exit 1
fi

# 1. Backup de la base de données
log "📦 Backup de la base de données..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/db_$DATE.sql"

if [ $? -eq 0 ]; then
    log "✅ Backup DB réussi: db_$DATE.sql"
    
    # Compresser le backup
    gzip "$BACKUP_DIR/db_$DATE.sql"
    log "✅ Compression terminée: db_$DATE.sql.gz"
else
    log "❌ Échec du backup DB"
    exit 1
fi

# 2. Backup des fichiers importants (Prisma, .env, etc.)
log "📦 Backup des fichiers de configuration..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    -C /Users/omxxr/Movies/quantum-bluff/server \
    prisma/schema.prisma \
    .env \
    2>/dev/null

if [ $? -eq 0 ]; then
    log "✅ Backup config réussi: config_$DATE.tar.gz"
else
    log "⚠️ Aucun fichier de configuration trouvé"
fi

# 3. Nettoyage des vieux backups (plus de 7 jours)
log "🧹 Nettoyage des backups de plus de $RETENTION_DAYS jours..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "config_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

log "✅ Backup terminé avec succès"

# 4. Vérification de l'espace disque
DISK_USAGE=$(df -h /Users/omxxr/Movies/quantum-bluff | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log "⚠️ ALERTE: Espace disque à ${DISK_USAGE}% !"
else
    log "ℹ️ Espace disque: ${DISK_USAGE}%"
fi

# 5. Lister les backups récents
log "📋 Backups des 7 derniers jours:"
ls -lh "$BACKUP_DIR" | grep -E "db_|config_" | tail -5 | while read line; do
    log "   $line"
done

log "🎉 Backup terminé !"
