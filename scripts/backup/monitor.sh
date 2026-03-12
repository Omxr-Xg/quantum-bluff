#!/bin/bash

# ============================================
# Quantum Bluff - Script de monitoring
# ============================================

# Configuration
BACKUP_DIR="/Users/omxxr/Movies/quantum-bluff/backups"
DB_CONTAINER="postgres_db"
LOG_FILE="$BACKUP_DIR/monitor.log"
ALERT_THRESHOLD=90
BACKUP_AGE_THRESHOLD=86400 # 24 heures en secondes

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 Démarrage du monitoring"

# 1. Vérifier l'espace disque
DISK_USAGE=$(df -h /Users/omxxr/Movies/quantum-bluff | awk 'NR==2 {print $5}' | sed 's/%//')
log "💾 Espace disque: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD" ]; then
    log "⚠️ ALERTE: Espace disque critique !"
fi

# 2. Vérifier que le conteneur PostgreSQL tourne
if docker ps | grep -q "$DB_CONTAINER"; then
    log "✅ Conteneur PostgreSQL OK"
else
    log "❌ ERREUR: Conteneur PostgreSQL ne tourne pas !"
fi

# 3. Vérifier la taille de la base
DB_SIZE=$(docker exec $DB_CONTAINER psql -U admin -d quantum_bluff -t -c "SELECT pg_database_size('quantum_bluff');" | xargs)
DB_SIZE_MB=$((DB_SIZE / 1024 / 1024))
log "📊 Taille base de données: ${DB_SIZE_MB} MB"

# 4. Vérifier l'âge du dernier backup
LAST_BACKUP=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
if [ -n "$LAST_BACKUP" ]; then
    LAST_BACKUP_TIME=$(stat -f %m "$LAST_BACKUP")
    CURRENT_TIME=$(date +%s)
    BACKUP_AGE=$((CURRENT_TIME - LAST_BACKUP_TIME))
    
    if [ "$BACKUP_AGE" -gt "$BACKUP_AGE_THRESHOLD" ]; then
        log "⚠️ ALERTE: Dernier backup datant de plus de 24h !"
    else
        log "✅ Dernier backup: $(basename "$LAST_BACKUP") (il y a $((BACKUP_AGE / 3600)) heures)"
    fi
else
    log "❌ ERREUR: Aucun backup trouvé !"
fi

# 5. Vérifier les connexions actives
CONNECTIONS=$(docker exec $DB_CONTAINER psql -U admin -d quantum_bluff -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'quantum_bluff';" | xargs)
log "👥 Connexions actives: $CONNECTIONS"

# 6. Vérifier les performances (requêtes lentes)
SLOW_QUERIES=$(docker exec $DB_CONTAINER psql -U admin -d quantum_bluff -t -c "
    SELECT count(*) FROM pg_stat_statements 
    WHERE mean_time > 1000 
    AND calls > 10
    AND query NOT LIKE '%pg_%'
    AND query NOT LIKE '%_prisma_%'
    LIMIT 1;" 2>/dev/null | xargs)

if [ -n "$SLOW_QUERIES" ] && [ "$SLOW_QUERIES" -gt 0 ]; then
    log "⚠️ Attention: Des requêtes lentes détectées"
fi

log "✅ Monitoring terminé"
