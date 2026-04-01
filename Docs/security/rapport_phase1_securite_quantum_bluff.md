# Rapport de sécurité — Phase 1  
## Quantum Bluff  
### Durcissement des fondations de sécurité : configuration, secrets, JWT, HTTP, Socket.IO, blacklist

---

## 1. Objectif de la phase 1

Cette première phase avait pour objectif de sécuriser les fondations critiques de l’application avant de traiter les couches plus spécifiques comme les routes administrateur, les validations métier avancées ou les protections temps réel détaillées.

L’idée principale était de rendre l’application plus robuste sur les points suivants :

- chargement fiable et centralisé de la configuration
- suppression des fallbacks dangereux
- homogénéisation de l’authentification JWT
- alignement du comportement HTTP et Socket.IO
- refus des tokens révoqués
- échec immédiat du démarrage si une variable critique est absente
- configuration CORS plus stricte et pilotée par environnement

Cette phase constitue le socle de sécurité nécessaire pour tout le reste du projet.

---

## 2. Problèmes identifiés avant correction

Avant intervention, plusieurs points fragiles avaient été relevés.

### 2.1 Secret JWT avec fallback dangereux

Le service JWT utilisait un fallback codé en dur :

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
```

Cela posait plusieurs problèmes :

- si la variable d’environnement n’était pas chargée, l’application continuait quand même
- un secret faible et prévisible pouvait être utilisé involontairement
- des tokens pouvaient être signés différemment selon le contexte de lancement

### 2.2 Chargement d’environnement dispersé

La logique de configuration n’était pas centralisée. Certaines parties lisaient directement `process.env`, ce qui rendait difficile :

- la validation des variables requises
- la cohérence entre environnements
- la traçabilité des comportements

### 2.3 Vérification JWT insuffisamment encadrée

Le payload JWT était peu contrôlé. Il fallait s’assurer que le token vérifié contienne bien les éléments attendus :

- `userId`
- `type`
- `sub`
- `issuer`
- `audience`

### 2.4 Incohérence potentielle entre HTTP et Socket.IO

Il fallait garantir que :

- le même token soit accepté côté HTTP
- le même token soit accepté côté Socket.IO
- un token révoqué soit refusé dans les deux cas

### 2.5 Faux positif possible sur la connexion base de données

Le serveur pouvait logger `database_connected` alors qu’aucune vraie requête SQL n’avait encore été validée.

### 2.6 CORS trop dépendant de valeurs implicites

La configuration CORS devait être pilotée par variables d’environnement et refuser de démarrer en production si la configuration était absente.

---

## 3. Travaux réalisés

### 3.1 Centralisation de la configuration avec `env.ts`

Un nouveau fichier de configuration centralisé a été introduit :

- `server/src/config/env.ts`

#### Rôle de ce fichier

Ce fichier a pour rôle de :

- charger les variables d’environnement
- imposer les variables obligatoires
- valider leur format
- regrouper l’ensemble de la configuration sensible au même endroit
- empêcher les démarrages silencieux avec configuration incomplète

#### Variables prises en charge

La configuration centralisée couvre notamment :

- `NODE_ENV`
- `PORT`
- `TRUST_PROXY`
- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_USERNAME`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CORS_ORIGIN`
- `METRICS_BEARER_TOKEN`
- plus tard : variables admin

#### Règles ajoutées

Les règles suivantes ont été introduites :

- `JWT_SECRET` est obligatoire
- `JWT_SECRET` doit avoir une longueur minimale de sécurité
- `DATABASE_URL` est obligatoire
- `CORS_ORIGIN` est obligatoire en production
- `REDIS_URL` ou `REDIS_HOST` doit être présent
- les entiers doivent être valides
- les booléens doivent être explicitement parsés

#### Bénéfices

- plus de logique critique dispersée
- meilleure lisibilité
- meilleure maintenabilité
- détection immédiate des erreurs de configuration
- base saine pour les phases suivantes

### 3.2 Suppression des fallbacks dangereux

Le fallback JWT codé en dur a été supprimé.

#### Avant

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
```

#### Après

Le secret est obtenu depuis `env.ts`, qui impose sa présence :

```ts
const jwtSecret = getRequiredEnv('JWT_SECRET')
```

#### Résultat

Si `JWT_SECRET` est absent, le serveur refuse maintenant de démarrer.

Cela évite :

- l’utilisation accidentelle d’un secret par défaut
- la signature de tokens avec une clé non maîtrisée
- les écarts entre développement et production

### 3.3 Refonte du service JWT

Le fichier `server/src/auth/jwt.service.ts` a été renforcé.

#### Améliorations introduites

##### a) Algorithme explicite

Le service utilise désormais un algorithme explicitement défini :

- `HS256`

##### b) Ajout de `issuer` et `audience`

Les tokens sont signés et vérifiés avec :

- `issuer`
- `audience`

Cela permet de mieux encadrer leur validité.

##### c) Payload d’accès structuré

Le payload est désormais de type :

```ts
export interface AccessTokenPayload extends JwtPayload {
  userId: string
  type: 'access'
  sub: string
}
```

##### d) Validation stricte du payload

Une fonction de garde vérifie que le payload contient bien les champs attendus :

- `userId` valide
- `type === 'access'`
- `sub === userId`

##### e) Extraction propre du Bearer token

Une fonction dédiée extrait correctement le token depuis :

- `Authorization: Bearer ...`
- ou valeur brute si nécessaire

#### Résultat

Le service JWT est devenu :

- plus strict
- plus prévisible
- plus homogène
- mieux aligné sur de bonnes pratiques d’authentification

### 3.4 Alignement du middleware HTTP

Le fichier `server/src/middleware/auth.middleware.ts` a été ajusté pour utiliser la nouvelle logique centralisée.

#### Comportement final

Le middleware :

1. extrait le token depuis `Authorization`
2. rejette si le token est absent ou mal formé
3. vérifie si le token est blacklisté
4. vérifie sa validité via `verifyToken`
5. injecte `req.userId`
6. poursuit la requête si tout est correct

#### Messages de rejet gérés

- `Token manquant ou mal formé`
- `Token révoqué`
- `Token invalide`

#### Résultat

Toutes les routes HTTP protégées par ce middleware bénéficient désormais du même niveau de contrôle.

### 3.5 Alignement du middleware Socket.IO

Le fichier `server/src/middleware/socketAuth.middleware.ts` a été harmonisé avec la logique HTTP.

#### Comportement final

Le middleware Socket :

1. lit le token depuis `socket.handshake.auth.token` ou l’en-tête d’autorisation
2. extrait correctement le bearer token
3. vérifie la blacklist
4. vérifie le JWT via le même service que HTTP
5. stocke `socket.data.userId`
6. autorise ou refuse la connexion

#### Résultat

L’authentification temps réel est désormais cohérente avec l’authentification HTTP.

Un même token :

- est accepté dans les deux contextes s’il est valide
- est rejeté dans les deux contextes s’il est invalide ou révoqué

### 3.6 Renforcement du démarrage base de données

Le fichier `server/src/config/database.ts` a été ajusté pour éviter les faux positifs de connexion.

#### Problème initial

Le serveur pouvait logger :

- `database_connected`

après `prisma.$connect()`, alors qu’aucune vraie requête SQL n’avait encore été exécutée.

#### Correction

Un ping SQL explicite a été ajouté :

```ts
await prisma.$queryRaw`SELECT 1`
```

avant le log de succès.

#### Résultat

Le serveur ne considère maintenant la base comme connectée que si une vraie requête SQL passe correctement.

### 3.7 Durcissement de la configuration Redis

Le fichier `server/src/config/redis.config.ts` a été révisé pour utiliser `env.ts`.

#### Améliorations

- configuration centralisée
- meilleur contrôle des paramètres
- gestion plus propre du comportement en CI/Jest
- conservation de la logique de fallback léger pour les tests

#### Résultat

La configuration Redis est désormais alignée sur la stratégie de centralisation.

### 3.8 Renforcement de l’entrée serveur `index.ts`

Le fichier `server/src/index.ts` a été ajusté sur plusieurs points.

#### Changements principaux

##### a) Désactivation de `x-powered-by`

Réduction d’un petit élément de fingerprinting HTTP.

##### b) Utilisation de `env.trustProxy`

Le comportement proxy passe par la configuration centralisée.

##### c) CORS piloté par environnement

Les origines autorisées proviennent désormais de `env.corsOrigins`.

##### d) Refus explicite d’origines non autorisées

Un log est généré en cas de rejet CORS.

##### e) Socket.IO aligné sur les mêmes origines

La configuration WebSocket reprend le même jeu d’origines.

##### f) Démarrage plus strict

Le boot serveur s’arrête proprement en cas d’échec de connexion ou de configuration critique.

---

## 4. Exemple de configuration utilisée

Le fichier `.env` de travail utilisé pendant les tests contenait une structure de ce type :

```env
NODE_ENV=development
PORT=3001
TRUST_PROXY=1

DATABASE_URL="postgresql://admin:***@localhost:5433/quantum_bluff?schema=public"

JWT_SECRET="change-this-to-a-long-random-secret-with-at-least-32-characters"
JWT_EXPIRES_IN=7d
JWT_ISSUER=quantum-bluff-api
JWT_AUDIENCE=quantum-bluff-client

CORS_ORIGIN=["http://localhost:5173","http://localhost:5174","http://localhost:5175","http://localhost:5176","http://localhost:5177","http://127.0.0.1:5173","http://127.0.0.1:5174","http://127.0.0.1:5175","capacitor://localhost","http://localhost"]

REDIS_URL=redis://localhost:6379

METRICS_BEARER_TOKEN="change-this-too"

ADMIN_API_TOKEN="change-this-admin-token-with-at-least-16-chars"
ENABLE_ADMIN_ROULETTE_OVERRIDE=false
```

---

## 5. Procédure de tests réalisée

Cette phase a été validée par des tests concrets en terminal, côté HTTP et côté Socket.IO.

### 5.1 Vérification du démarrage normal avec `.env`

#### Commande

```bash
cd /mnt/c/Users/linda/lili/quantum-bluff/server
npm run dev
```

#### Résultat observé

Le serveur a bien démarré et a loggé notamment :

```text
{"level":30,"msg":"database_connected"}
{"level":30,"msg":"server_listen","port":3001}
SERVER_READY_ON_PORT = 3001
```

#### Conclusion

Le serveur démarre correctement lorsque les variables critiques sont présentes.

### 5.2 Génération d’un token valide de test

#### Commande

```bash
cd /mnt/c/Users/linda/lili/quantum-bluff/server
VALID_TOKEN=$(npx tsx -e "import { generateToken } from './src/auth/jwt.service.ts'; process.stdout.write(generateToken({ userId: 'phase1-test-user' }))")
echo $VALID_TOKEN
```

#### Résultat

Un JWT valide a été généré, signé avec la configuration réelle du projet.

#### Conclusion

Le service JWT produit bien un token d’accès valide.

### 5.3 Test HTTP avec token valide

Une route de diagnostic temporaire protégée a été utilisée pendant la validation :

```ts
app.get('/api/debug/auth-check', authMiddleware, (req, res) => {
  res.json({
    ok: true,
    userId: req.userId,
  })
})
```

#### Commande

```powershell
curl.exe -i -H "Authorization: Bearer <TOKEN_VALIDE>" http://localhost:3001/api/debug/auth-check
```

#### Résultat observé

```http
HTTP/1.1 200 OK
...
{"ok":true,"userId":"phase1-test-user"}
```

#### Conclusion

Le token valide est correctement accepté côté HTTP.

### 5.4 Test HTTP avec faux token

#### Commande

```powershell
curl.exe -i -H "Authorization: Bearer fake-token" http://localhost:3001/api/debug/auth-check
```

#### Résultat observé

```http
HTTP/1.1 401 Unauthorized
...
{"error":"Token invalide"}
```

#### Conclusion

Un faux token est correctement rejeté côté HTTP.

### 5.5 Test Socket.IO avec le même token valide

#### Commande PowerShell

```powershell
$env:TOKEN="<TOKEN_VALIDE>"
node --input-type=module -e "import { io } from 'socket.io-client'; const socket = io('http://localhost:3001', { auth: { token: process.env.TOKEN }, transports: ['websocket'] }); socket.on('connect', () => { console.log('SOCKET_OK', socket.id); socket.close(); process.exit(0); }); socket.on('connect_error', (err) => { console.error('SOCKET_KO', err.message); process.exit(1); });"
```

#### Résultat observé

```text
SOCKET_OK bAPNm2nt0uP9dkIiAAAB
```

#### Conclusion

Le même token est correctement accepté côté Socket.IO.

### 5.6 Test de révocation de token avec Redis blacklist

Le mécanisme de blacklist repose sur :

- `server/src/auth/tokenBlacklist.ts`

Principe :

- le token est hashé en SHA-256
- la clé est stockée dans Redis avec TTL
- HTTP et Socket consultent Redis avant d’accepter le token

#### Ajout du token à la blacklist

##### Commande

```powershell
$env:TOKEN="<TOKEN_VALIDE>"
npx tsx -e "import { addToBlacklist } from './src/auth/tokenBlacklist.ts'; (async () => { await addToBlacklist(process.env.TOKEN); console.log('TOKEN_BLACKLISTED'); })();"
```

#### Résultat observé

```text
TOKEN_BLACKLISTED
```

#### Vérification de la blacklist

##### Commande

```powershell
npx tsx -e "import { isBlacklisted } from './src/auth/tokenBlacklist.ts'; (async () => { const result = await isBlacklisted(process.env.TOKEN); console.log('IS_BLACKLISTED =', result); })();"
```

#### Résultat observé

```text
IS_BLACKLISTED = true
```

#### Conclusion

Le token a bien été ajouté dans la blacklist Redis.

### 5.7 Test HTTP avec token blacklisté

#### Commande

```powershell
curl.exe -i -H "Authorization: Bearer $env:TOKEN" http://localhost:3001/api/debug/auth-check
```

#### Résultat observé

```http
HTTP/1.1 401 Unauthorized
...
{"error":"Token révoqué"}
```

#### Conclusion

Un token révoqué est correctement refusé côté HTTP.

### 5.8 Test Socket.IO avec token blacklisté

#### Commande

```powershell
node --input-type=module -e "import { io } from 'socket.io-client'; const socket = io('http://localhost:3001', { auth: { token: process.env.TOKEN }, transports: ['websocket'] }); socket.on('connect', () => { console.log('SOCKET_OK', socket.id); socket.close(); process.exit(0); }); socket.on('connect_error', (err) => { console.error('SOCKET_KO', err.message); process.exit(1); });"
```

#### Résultat observé

```text
SOCKET_KO Token revoked
```

#### Conclusion

Un token révoqué est également correctement refusé côté Socket.IO.

### 5.9 Test d’échec si `JWT_SECRET` manque

#### Méthode

Suppression temporaire de `JWT_SECRET` dans le `.env`, puis relance du serveur.

#### Résultat observé

```text
Error: JWT_SECRET is required
```

#### Conclusion

Le serveur refuse bien de démarrer si le secret JWT est absent.

### 5.10 Test d’échec si `CORS_ORIGIN` manque en production

#### Méthode

Passage temporaire en :

```env
NODE_ENV=production
```

avec suppression de `CORS_ORIGIN`, puis relance du serveur.

#### Résultat observé

```text
Error: CORS_ORIGIN is required in production
```

#### Conclusion

Le serveur refuse bien de démarrer en production si la configuration CORS critique est absente.

---

## 6. Résultats de la phase 1

La phase 1 a permis d’obtenir les garanties suivantes.

### 6.1 Configuration

- configuration sensible centralisée
- validation des variables critiques
- démarrage impossible en cas de configuration incomplète

### 6.2 JWT

- suppression des secrets par défaut
- algorithme explicite
- `issuer` et `audience` contrôlés
- payload JWT validé strictement

### 6.3 HTTP

- extraction Bearer propre
- rejet correct des tokens invalides
- rejet correct des tokens révoqués

### 6.4 Socket.IO

- même logique d’authentification que HTTP
- rejet correct des tokens invalides
- rejet correct des tokens révoqués

### 6.5 Base de données

- vraie vérification SQL avant de déclarer la base connectée

### 6.6 CORS

- configuration par environnement
- obligation de configuration en production

---

## 7. Fichiers modifiés pendant cette phase

### Configuration

- `server/src/config/env.ts`
- `server/src/config/database.ts`
- `server/src/config/redis.config.ts`

### Authentification

- `server/src/auth/jwt.service.ts`
- `server/src/auth/tokenBlacklist.ts` utilisé pour la validation
- `server/src/middleware/auth.middleware.ts`
- `server/src/middleware/socketAuth.middleware.ts`

### Entrée serveur

- `server/src/index.ts`

---

## 8. Commits recommandés pour cette phase

### Commit principal de la phase 1

```bash
git add server/src/config/env.ts server/src/auth/jwt.service.ts server/src/middleware/auth.middleware.ts server/src/middleware/socketAuth.middleware.ts server/src/config/database.ts server/src/config/redis.config.ts server/src/index.ts
git commit -m "feat(security): harden env loading and unify jwt auth across http and sockets"
```

### Commit de nettoyage après tests

```bash
git add server/src/index.ts server/src/middleware/auth.middleware.ts server/src/middleware/socketAuth.middleware.ts server/src/auth/jwt.service.ts
git commit -m "chore(security): remove temporary phase 1 auth diagnostics"
```

---

## 9. Limites et suites prévues

Cette phase ne couvre pas encore toute la sécurité du projet. Elle prépare le terrain pour les phases suivantes, notamment :

- sécurisation complète des routes admin
- uniformisation des contrôles d’accès sensibles
- validation stricte des payloads HTTP et Socket
- limitation d’abus plus fine par endpoint
- réduction de la confiance côté client
- audit métier des actions temps réel
- durcissement des handlers Socket.IO comme véritables API publiques

---

## 10. Conclusion

La phase 1 a permis de transformer une base fonctionnelle mais encore permissive en un socle beaucoup plus fiable.

Les principaux apports sont :

- centralisation et validation stricte des secrets et variables d’environnement
- suppression des fallbacks dangereux
- unification réelle de l’authentification JWT entre HTTP et Socket.IO
- prise en charge effective de la révocation des tokens par blacklist Redis
- échec explicite du démarrage lorsque la configuration critique est absente

Cette phase apporte une amélioration concrète, mesurable et testée de la sécurité du projet, tout en posant les bases nécessaires pour les renforcements des phases suivantes.

---
