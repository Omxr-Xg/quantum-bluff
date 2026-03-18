# Guide de test pour Quantum Bluff

Ce guide permet à une personne de tester l'application **en local** sur sa machine.

---

## Prérequis

- **Node.js** 18 ou supérieur
- **Docker Desktop** (pour PostgreSQL et Redis) — ou PostgreSQL + Redis installés manuellement
- **npm** ou **pnpm**

---

## Installation

### 1. Cloner / récupérer le projet

```bash
git clone <url-du-repo>
cd quantum-bluff
```

Ou décompresser l’archive si vous avez reçu un ZIP.

### 2. Variables d’environnement

```bash
cp server/.env.example server/.env
```

Modifier `server/.env` avec au minimum :

```env
DATABASE_URL="postgresql://admin:My027@localhost:5433/quantum_bluff?schema=public"
```

(Adapter `admin`, `My027` et `quantum_bluff` à votre config si nécessaire.)

### 3. Base de données (obligatoire)

**Avec Docker :**

```bash
# Démarrer PostgreSQL et Redis
cd database
docker-compose up -d
cd ..
```

**Sans Docker :** PostgreSQL et Redis doivent être installés et lancés sur la machine.

### 4. Migrations Prisma (obligatoire)

Sans ces migrations, inscription, connexion et messages entre amis renverront une erreur 500 :

```bash
cd server
npx prisma migrate deploy
cd ..
```

> **Après un `git pull`** : ré-exécuter `npx prisma migrate deploy` pour appliquer les nouvelles tables (ex. FriendMessage).

### 5. Dépendances

```bash
npm run install:all
```

---

## Lancer l’application

```bash
npm run dev
```

Cela démarre :

- PostgreSQL + Redis (Docker)
- Serveur backend (port 3000)
- Client frontend (port 5173)

Ouvrir **http://localhost:5173** (ou l’URL indiquée dans le terminal).

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Erreur 500 à l’inscription | Exécuter `cd server && npx prisma migrate deploy` et vérifier que PostgreSQL tourne. |
| Erreur 500 sur les messages entre amis | La table `FriendMessage` manque : exécuter `cd server && npx prisma migrate deploy`. |
| La base ne démarre pas | Vérifier que Docker est lancé, puis `cd database && docker-compose up -d`. |
| `DATABASE_URL` manquant | Copier `server/.env.example` vers `server/.env` et le configurer. |
| Port déjà utilisé | Arrêter le processus qui utilise le port 3000 ou 5173. |

---

## Résumé rapide

```bash
cd quantum-bluff
cp server/.env.example server/.env
cd database && docker-compose up -d
cd ../server && npx prisma migrate deploy
cd ..
npm run install:all
npm run dev
```

Puis ouvrir http://localhost:5173 dans le navigateur.
