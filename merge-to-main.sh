#!/bin/bash

echo "🚀 Fusion de develop vers main..."

# Sauvegarde de la branche courante
CURRENT_BRANCH=$(git branch --show-current)

# Mise à jour de develop
echo "📦 Mise à jour de develop..."
git checkout develop
git pull origin develop

# Mise à jour de main
echo "🎯 Mise à jour de main..."
git checkout main
git pull origin main

# Fusion
echo "🔀 Fusion de develop dans main..."
git merge develop --no-ff -m "Merge develop into main for release"

# Push
echo "📤 Push vers le dépôt distant..."
git push origin main

# Retour sur la branche précédente
git checkout $CURRENT_BRANCH

echo "✅ Fusion terminée !"