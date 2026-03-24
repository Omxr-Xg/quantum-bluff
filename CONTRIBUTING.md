# Guide de Contribution (Quantum Bluff)

Bienvenue dans l`équipe ! Pour que le développement reste fluide, voici les règles à suivre.

## 1. Workflow Git & Branches
Nous utilisons une stratégie de branche basée sur le GANTT pour éviter les conflits :

### main : Code stable uniquement.

### develop : Branche principale de travail.

### feature/[nom] : Une branche par tâche spécifique (ex: ```feature/socket-logic```).

## 2. Standards de Code et Structure
Respectez l`organisation des dossiers mise en place :

### TypeScript : Obligatoire pour le Front et le Back.

### Frontend : Les composants vont dans ```client/src/components/``` et les types dans ```client/src/types/```.

### Backend : Toute la logique serveur doit rester isolée dans le dossier ```/server```.

## 3. Processus de Merge Request (MR)
Avant de fusionner vers ```develop``` :

Vérifiez que le projet compile sans erreur.

Liez votre MR au Milestone correspondant (ex: Milestone 2 pour le Lobby).

Demandez une revue de code par au moins un autre membre de l`équipe.

## 4. Installation & Mise à jour

### Dépendances : Après chaque ```git pull```, lancez ```npm install``` dans les dossiers ```client``` et ```server```.

### Scripts : Utilisez ```npm run dev``` pour lancer les serveurs de développement.

