#!/bin/bash

# --- CONFIGURATION ---
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
# Récupère les infos de ton .env ou fixe-les ici
DB_CONTAINER="postgres_db" # Nom du conteneur Docker
DB_USER="admin"              # Ton utilisateur (voir .env)
DB_NAME="quantum_bluff"         # Nom de ta DB

# Créer le dossier de backup s'il n'existe pas
mkdir -p $BACKUP_DIR

echo "🕒 [$(date)] Démarrage de la sauvegarde pour : $DB_NAME..."

# Exécution du dump via Docker
# On utilise -it pour l'interactivité si besoin, mais ici en script on l'évite
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Vérification du succès
if [ $? -eq 0 ]; then
    echo "✅ Sauvegarde réussie : $BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # --- RÉTENTION (DA4) ---
    # On supprime les sauvegardes de plus de 7 jours pour ne pas saturer le disque
    find $BACKUP_DIR -type f -mtime +7 -name "*.sql" -delete
    echo "🧹 Nettoyage des anciens backups terminé."
else
    echo "❌ Erreur lors de la sauvegarde !"
    exit 1
fi
