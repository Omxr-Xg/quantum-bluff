# Quantum Bluff --- README du Projet

**Quantum Bluff** est une plateforme de poker combinant analyse
comportementale, jeu stratégique et traitement de données.\
Le projet repose sur une architecture modulaire permettant d'intégrer
une API, une base de données PostgreSQL dockerisée ainsi qu'un pipeline
d'analyse.

------------------------------------------------------------------------

## 1. Objectifs du bdd

-   Concevoir une plateforme capable de gérer des utilisateurs, des
    sessions de jeu et des données comportementales.
-   Fournir une API propre et extensible.
-   Assurer une persistance fiable via PostgreSQL.
-   Permettre un déploiement reproductible grâce à Docker.
-   Faciliter l'évolution du projet via une architecture modulaire.

------------------------------------------------------------------------

## 2. Architecture générale

### Structure du projet

``` bash
quantum-bluff/
│── CODEOWNERS
│── README.md
│── Docs/
│── database/
│   │── Dockerfile
│   │── docker-compose.yml
│   └── init.sql
└── src/ (API, logique métier, etc.)
```

### Composants principaux

-   **API Backend** : gère les endpoints, la logique métier et la
    communication avec la base.
-   **Base de données PostgreSQL** : stocke les utilisateurs, sessions,
    résultats, etc.
-   **Docker** : assure un environnement reproductible pour le backend
    et la base.
-   **Documentation** : centralise les guides techniques et
    fonctionnels.

------------------------------------------------------------------------

## 3. Installation et prérequis

### 3.1 Prérequis

-   Git
-   Docker
-   Docker Compose
-   Python / Node (selon le backend utilisé)

### 3.2 Cloner le projet

``` bash
git clone https://github.com/.../quantum-bluff.git
cd quantum-bluff
```

------------------------------------------------------------------------

## 4. Base de données (PostgreSQL + Docker)

La base de données est entièrement dockerisée et se trouve dans le
dossier `database/`.

### 4.1 Lancer la base

``` bash
cd database
docker-compose up --build
```

### 4.2 Accéder au conteneur

``` bash
docker exec -it postgres_db bash
psql -U admin -d quantumdb
```

### 4.3 Structure initiale

Le script `init.sql` :

-   crée la base `quantumdb`,
-   crée la table `users`,
-   insère deux utilisateurs (`admin`, `guest`).

------------------------------------------------------------------------

## 5. API Backend

*(À compléter selon ton implémentation : JavaFx, Node.js, Django,
etc.)*

### Exemple de structure attendue

``` bash
src/
│── app/
│   │── main.py
│   │── routes/
│   │── models/
│   └── services/
└── requirements.txt
```

### Exemple de lancement (FastAPI)

``` bash
uvicorn app.main:app --reload
```

### Connexion à PostgreSQL

Depuis un service Docker :

``` text
postgresql://admin:motdepasse@db:5432/quantumdb
```

Depuis la machine hôte :

``` text
postgresql://admin:motdepasse@localhost:5432/quantumdb
```

------------------------------------------------------------------------

## 6. Dockerisation complète (API + DB)

Une version étendue du `docker-compose.yml` pourra inclure :

-   le service `db`,
-   le service `api`,
-   un réseau interne,
-   des volumes persistants.

### Exemple minimal

``` yaml
services:
  api:
    build: ../src
    depends_on:
      - db
    ports:
      - "8000:8000"

  db:
    build: .
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: motdepasse
      POSTGRES_DB: quantumdb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

------------------------------------------------------------------------

## 7. Workflow Git

### Branches principales

-   `main` : version stable
-   `develop` : intégration continue
-   branches thématiques : `database`, `api`, `feature/...`

### Exemple de workflow

``` bash
git checkout develop
git pull
git checkout -b feature/new-endpoint
git commit -m "Add new endpoint"
git push origin feature/new-endpoint
```

------------------------------------------------------------------------

## 8. Documentation

Toute la documentation technique se trouve dans `Docs/`.

### Contenu recommandé

-   Architecture générale
-   Modèle de données
-   API (endpoints, schémas)
-   Dockerisation
-   Guide d'installation
-   Guide de contribution

------------------------------------------------------------------------

## 9. Contribution

1.  Créer une branche depuis `develop`
2.  Implémenter la fonctionnalité
3.  Ajouter tests + documentation
4.  Ouvrir une Pull Request
5.  Attendre la revue
