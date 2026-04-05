# Rapport de sécurité — Phase 2  
## Quantum Bluff  
### Durcissement et homogénéisation de la protection des routes administratives

---

## 1. Objectif de la phase 2

Après la sécurisation des fondations techniques en phase 1 (configuration, JWT, HTTP, Socket.IO, blacklist), la phase 2 avait pour objectif de renforcer la protection des fonctionnalités administratives de l’application.

L’enjeu principal était d’éliminer les incohérences entre les différentes routes sensibles, en remplaçant des protections dispersées et hétérogènes par une logique centralisée, homogène et explicite.

Cette phase visait en particulier à sécuriser :

- les routes d’administration générale
- les routes de diagnostic runtime Blackjack
- les routes de diagnostic runtime Poker
- la route spéciale d’override Roulette, plus sensible car permettant de forcer un résultat

---

## 2. Problèmes identifiés avant correction

Avant la mise en place de cette phase, plusieurs faiblesses structurelles étaient présentes.

### 2.1 Incohérence des variables de secret admin

Selon les fichiers, différentes variables étaient utilisées :

- `ADMIN_SECRET_TOKEN`
- `ADMIN_API_TOKEN`

Cela posait un problème de cohérence et augmentait le risque :

- de mauvaise configuration
- de divergence de comportement entre routes
- d’utilisation involontaire d’un mauvais secret

### 2.2 Fallback admin faible en environnement de développement

Certaines routes utilisaient un fallback du type :

```ts
process.env.ADMIN_SECRET_TOKEN ?? 'super_admin_secret_dev'
```

Ce type de valeur par défaut est problématique car :

- elle peut être oubliée dans le code
- elle rend les protections triviales si elle reste active
- elle masque les erreurs de configuration

### 2.3 Logiques de protection dupliquées

Chaque route admin gérait son contrôle d’accès avec sa propre implémentation :

- vérification du header dans un fichier
- comparaison directe dans un autre
- `404` dans certains cas
- `403` dans d’autres
- variantes de casse sur les headers (`x-admin-token`, `X-Admin-Token`)

Cela rendait le comportement global moins fiable et plus difficile à auditer.

### 2.4 Comparaison directe des tokens

Certaines routes utilisaient une comparaison simple :

```ts
token === configured
```

Même si cela reste courant, une approche plus robuste consiste à utiliser une comparaison sûre de type `timingSafeEqual`.

### 2.5 Route Roulette Override particulièrement sensible

La route d’override Roulette était une route à haut risque, car elle permettait d’influencer directement le résultat d’un tirage.

Elle devait donc être strictement limitée :

- au développement
- au localhost
- à une activation explicite
- avec un vrai token admin
- avec un vrai JWT utilisateur

### 2.6 Montage incohérent des routes dans `index.ts`

Le montage des routes admin comportait :

- des doublons
- un risque de confusion
- une lisibilité réduite

---

## 3. Travaux réalisés

### 3.1 Création d’un middleware admin centralisé

Un nouveau middleware dédié a été introduit :

- `server/src/middleware/admin.middleware.ts`

#### Rôle de ce middleware

Ce middleware centralise toute la logique de protection des routes sensibles.

Il permet de :

- lire le token admin depuis les headers
- accepter `x-admin-token`
- accepter `Authorization: Bearer ...` pour les routes concernées
- comparer de manière sécurisée le token fourni avec le token attendu
- gérer des comportements distincts selon le type de route
- cacher certaines routes via `404`
- restreindre certaines routes au localhost
- journaliser les refus d’accès

#### Options introduites

Le middleware fonctionne avec des options de type :

```ts
type AdminGuardOptions = {
  routeName: string
  concealWhenDenied?: boolean
  localhostOnly?: boolean
}
```

Cela permet d’adapter précisément la politique de sécurité à chaque route.

#### Avantages

- logique unique
- comportement homogène
- meilleure lisibilité
- meilleure maintenabilité
- réduction du risque d’oubli ou d’incohérence

### 3.2 Normalisation du token admin

La phase 2 a imposé une variable unique logique :

- `ADMIN_API_TOKEN`

Une compatibilité de lecture a été conservée si nécessaire via :

- `ADMIN_SECRET_TOKEN`

mais la logique cible est désormais centrée sur `ADMIN_API_TOKEN`.

#### Validation ajoutée

Le token admin est désormais validé côté configuration :

- présence optionnelle selon les routes
- longueur minimale imposée

Exemple de règle ajoutée :

- `ADMIN_API_TOKEN` doit avoir une longueur d’au moins 16 caractères s’il est défini

#### Résultat

- fin des divergences de nommage
- meilleure lisibilité
- meilleure robustesse

### 3.3 Comparaison sécurisée du token admin

Au lieu d’une comparaison directe, la phase 2 utilise :

- `timingSafeEqual`

via le module `node:crypto`.

#### Pourquoi c’est mieux

Cela permet d’éviter une comparaison naïve des chaînes, et d’adopter une approche plus sérieuse pour une donnée sensible.

#### Résultat

Le contrôle du token admin est plus robuste et plus propre techniquement.

### 3.4 Uniformisation des formats d’auth admin

Le middleware admin supporte désormais :

- `x-admin-token: ...`
- `Authorization: Bearer ...`

#### Intérêt

Cela permet :

- une meilleure compatibilité avec les outils de test
- une meilleure cohérence avec les pratiques API
- une utilisation plus flexible pour les routes admin standards

#### Remarque

Pour la route Roulette Override, on continue de privilégier :

- `Authorization: Bearer <JWT utilisateur>`
- `x-admin-token: <token admin>`

car il faut deux types de credentials différents dans la même requête.

### 3.5 Protection homogène des routes admin standard

La route suivante a été harmonisée :

- `/api/admin/cheaters`

#### Comportement final

- sans token admin → refus
- avec mauvais token admin → refus
- avec bon token admin → accès autorisé

#### Résultat

La route d’administration générale repose désormais sur la même logique que les autres routes sensibles.

### 3.6 Protection homogène des routes runtime Blackjack

Le fichier :

- `server/src/routes/admin.blackjack.runtime.routes.ts`

a été aligné sur le middleware centralisé.

#### Routes concernées

- `/api/admin/blackjack/runtime/metrics`
- `/api/admin/blackjack/runtime/diagnostic/:roomId`

#### Résultat

- plus de logique locale spécifique
- même protection admin que les autres routes
- accès homogène
- gestion claire des erreurs

### 3.7 Protection homogène des routes runtime Poker

Le fichier :

- `server/src/routes/admin.poker.runtime.routes.ts`

a été corrigé et aligné.

#### Routes concernées

- `/api/admin/poker/runtime/metrics`
- `/api/admin/poker/runtime/readiness/:gameId`

#### Correction importante

Un bug fonctionnel avait été observé : la route Poker renvoyait par erreur des données de type `blackjackRecovery`.

Ce problème a été corrigé pour renvoyer correctement :

```json
{
  "pokerRecovery": ...
}
```

#### Résultat

- protection admin cohérente
- contenu métier correct
- cohérence entre l’URL et la donnée renvoyée

### 3.8 Restriction forte de la route Roulette Override

Le fichier :

- `server/src/routes/admin.roulette.override.routes.ts`

a été renforcé via un guard spécifique :

- `requireDevRouletteOverrideAccess(...)`

#### Politique de sécurité appliquée

La route d’override Roulette est maintenant :

- inaccessible en production
- inaccessible si `ENABLE_ADMIN_ROULETTE_OVERRIDE=false`
- inaccessible hors localhost
- inaccessible sans token admin valide
- inaccessible sans JWT utilisateur valide

#### Comportement choisi

Lorsque les conditions ne sont pas réunies, la route répond :

- `404 Not found`

Ce choix permet de masquer l’existence de cette route plutôt que d’indiquer explicitement qu’elle existe mais qu’elle est refusée.

#### Résultat

La route la plus sensible de cette phase est désormais strictement encadrée.

### 3.9 Nettoyage du montage des routes dans `index.ts`

Le fichier :

- `server/src/index.ts`

a été réorganisé pour monter les routes admin de manière claire et sans doublons.

#### Montage final propre

```ts
app.use('/api/admin/blackjack/runtime', adminBlackjackRuntimeRoutes)
app.use('/api/admin/poker/runtime', adminPokerRuntimeRoutes)
app.use('/api/admin/roulette/override', adminRouletteOverrideRoutes)
app.use('/api/admin', adminRoutes)
```

#### Bénéfices

- suppression des doublons
- lisibilité améliorée
- comportement plus prévisible
- réduction des erreurs de routage

---

## 4. Configuration utilisée pour les tests

Pendant les validations, la configuration utile était de ce type :

```env
NODE_ENV=development
PORT=3000

ADMIN_API_TOKEN="uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos="
ENABLE_ADMIN_ROULETTE_OVERRIDE=true
```

Pour le retour au mode normal après les tests :

```env
NODE_ENV=development
ENABLE_ADMIN_ROULETTE_OVERRIDE=false
```

---

## 5. Procédure de tests réalisée

Les tests ont été effectués principalement avec :

- `curl.exe`
- PowerShell
- JWT utilisateur de test généré via le service JWT
- token admin transmis soit via `x-admin-token`, soit via `Authorization: Bearer ...`

### 5.1 Test des routes admin standard sans token

#### Commandes

```powershell
curl.exe -i http://localhost:3000/api/admin/cheaters
curl.exe -i http://localhost:3000/api/admin/blackjack/runtime/metrics
curl.exe -i http://localhost:3000/api/admin/poker/runtime/metrics
```

#### Résultat observé

Réponse de type :

```http
HTTP/1.1 403 Forbidden
...
{"error":"Accès administrateur interdit."}
```

#### Conclusion

Les routes admin refusent bien l’accès en l’absence de token.

### 5.2 Test des routes admin avec mauvais token

#### Commandes

```powershell
curl.exe -i -H "x-admin-token: mauvais-token" http://localhost:3000/api/admin/cheaters
curl.exe -i -H "x-admin-token: mauvais-token" http://localhost:3000/api/admin/blackjack/runtime/metrics
curl.exe -i -H "x-admin-token: mauvais-token" http://localhost:3000/api/admin/poker/runtime/metrics
```

#### Résultat observé

Réponse de type :

```http
HTTP/1.1 403 Forbidden
...
{"error":"Accès administrateur interdit."}
```

#### Conclusion

Les routes admin refusent bien l’accès en cas de mauvais token.

### 5.3 Test avec bon token via `x-admin-token`

#### Route `/api/admin/cheaters`

##### Commande

```powershell
curl.exe -i -H "x-admin-token: uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/cheaters
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
[]
```

##### Conclusion

L’accès admin est autorisé.  
Le tableau vide signifie simplement qu’aucun utilisateur suspect n’a été trouvé.

#### Route `/api/admin/blackjack/runtime/metrics`

##### Commande

```powershell
curl.exe -i -H "x-admin-token: uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/blackjack/runtime/metrics
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
{"blackjackRecovery":{"bootRoomsScanned":0,"bootRuntimeAlreadyPresent":0,"bootRehydratedFromSnapshot":0,"bootResetToWaiting":0,"bootRecoveryFailures":0,"cleanupStoreScanned":0,"cleanupStoreDeleted":0,"cleanupSnapshotDeleted":0,"cleanupRoomDeleted":0}}
```

##### Conclusion

La route runtime Blackjack est correctement protégée et fonctionnelle.

#### Route `/api/admin/poker/runtime/metrics`

##### Commande

```powershell
curl.exe -i -H "x-admin-token: uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/poker/runtime/metrics
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
{"pokerRecovery":{"roomsScanned":0,"staleSnapshotsDeleted":0,"orphanSnapshotsDeleted":0}}
```

##### Conclusion

La route runtime Poker est correctement protégée et renvoie désormais les bonnes métriques.

### 5.4 Test avec bon token via `Authorization: Bearer ...`

#### Route `/api/admin/cheaters`

##### Commande

```powershell
curl.exe -i -H "Authorization: Bearer uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/cheaters
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
[]
```

#### Route `/api/admin/blackjack/runtime/metrics`

##### Commande

```powershell
curl.exe -i -H "Authorization: Bearer uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/blackjack/runtime/metrics
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
{"blackjackRecovery":{...}}
```

#### Route `/api/admin/poker/runtime/metrics`

##### Commande

```powershell
curl.exe -i -H "Authorization: Bearer uqMXgvpY0xYZhBkyaLsZnzOPhxoN3YzH3YTi1vFinos=" http://localhost:3000/api/admin/poker/runtime/metrics
```

##### Résultat observé

```http
HTTP/1.1 200 OK
...
{"pokerRecovery":{"roomsScanned":0,"staleSnapshotsDeleted":0,"orphanSnapshotsDeleted":0}}
```

#### Conclusion

Le middleware admin supporte correctement les deux formats :

- `x-admin-token`
- `Authorization: Bearer ...`

pour les routes admin standard.

### 5.5 Test de la roulette override sans token admin

Avant le test, un JWT utilisateur valide a été généré.

#### Corps JSON utilisé

```json
{
  "forceResult": 7,
  "bets": [
    {
      "type": "number",
      "value": 7,
      "amount": 10
    }
  ]
}
```

#### Commande

```powershell
$body = '{"forceResult":7,"bets":[{"type":"number","value":7,"amount":10}]}'

curl.exe -i -X POST `
  -H "Authorization: Bearer <JWT_UTILISATEUR>" `
  -H "Content-Type: application/json" `
  --data-raw $body `
  http://localhost:3000/api/admin/roulette/override/spin
```

#### Résultat observé

```http
HTTP/1.1 404 Not Found
...
{"error":"Not found"}
```

#### Conclusion

La route est correctement masquée lorsqu’aucun token admin n’est fourni.

### 5.6 Test de la roulette override avec mauvais token admin

#### Commande

```powershell
$body = '{"forceResult":7,"bets":[{"type":"number","value":7,"amount":10}]}'

curl.exe -i -X POST `
  -H "Authorization: Bearer <JWT_UTILISATEUR>" `
  -H "x-admin-token: mauvais-token" `
  -H "Content-Type: application/json" `
  --data-raw $body `
  http://localhost:3000/api/admin/roulette/override/spin
```

#### Résultat observé

```http
HTTP/1.1 404 Not Found
...
{"error":"Not found"}
```

#### Conclusion

La route reste correctement masquée lorsque le token admin est incorrect.

### 5.7 Test de la roulette override avec bon token admin et JWT utilisateur valide

#### Commande

```powershell
$body = '{"forceResult":7,"bets":[{"type":"number","value":7,"amount":10}]}'

curl.exe -i -X POST `
  -H "Authorization: Bearer <JWT_UTILISATEUR>" `
  -H "x-admin-token: <TOKEN_ADMIN_VALIDE>" `
  -H "Content-Type: application/json" `
  --data-raw $body `
  http://localhost:3000/api/admin/roulette/override/spin
```

#### Résultat observé

```http
HTTP/1.1 400 Bad Request
...
{"error":"USER_NOT_FOUND"}
```

#### Analyse

Cette réponse est attendue et valide du point de vue sécurité :

- la route n’est plus cachée
- le token admin a bien été accepté
- le JWT utilisateur a bien été accepté
- la requête atteint bien la logique métier
- l’erreur provient ensuite du fait que l’utilisateur de test n’existe pas dans la base

#### Conclusion

La protection de la route Roulette Override fonctionne correctement.

### 5.8 Comportement attendu en production

La politique de sécurité impose que la route Roulette Override soit masquée en production, même si `ENABLE_ADMIN_ROULETTE_OVERRIDE=true`.

#### Attendu

Avec :

```env
NODE_ENV=production
ENABLE_ADMIN_ROULETTE_OVERRIDE=true
```

la route doit répondre :

```http
404 Not Found
```

#### Conclusion

Cette règle garantit qu’aucune route d’override ne puisse être exposée en environnement de production.

---

## 6. Résultats obtenus

La phase 2 a permis d’obtenir les garanties suivantes.

### 6.1 Centralisation

- une seule logique de protection admin
- une seule politique de lecture du token admin
- une seule logique de refus ou de masquage

### 6.2 Cohérence

- fin des comparaisons dispersées
- fin des fallbacks faibles
- comportement uniforme entre les routes sensibles

### 6.3 Sécurité

- token admin vérifié de manière sécurisée
- possibilité de masquer certaines routes avec `404`
- possibilité de restreindre au localhost
- protection forte de la route d’override

### 6.4 Lisibilité

- code plus auditable
- comportement plus compréhensible
- maintenance facilitée

---

## 7. Fichiers modifiés pendant la phase 2

### Configuration
- `server/src/config/env.ts`

### Middleware
- `server/src/middleware/admin.middleware.ts`

### Routes
- `server/src/routes/admin.routes.ts`
- `server/src/routes/admin.blackjack.runtime.routes.ts`
- `server/src/routes/admin.poker.runtime.routes.ts`
- `server/src/routes/admin.roulette.override.routes.ts`

### Entrée serveur
- `server/src/index.ts`

---

## 8. Commits recommandés pour cette phase

### Commit principal de la phase 2

```bash
git add server/src/middleware/admin.middleware.ts server/src/routes/admin.routes.ts server/src/routes/admin.blackjack.runtime.routes.ts server/src/routes/admin.poker.runtime.routes.ts server/src/routes/admin.roulette.override.routes.ts server/src/index.ts server/src/config/env.ts
git commit -m "feat(security): harden and unify admin route protection"
```

### Commit correctif poker runtime

```bash
git add server/src/routes/admin.poker.runtime.routes.ts server/src/index.ts
git commit -m "fix(security): correct poker admin runtime routing and cleanup duplicate mounts"
```

### Commit de nettoyage après tests

```bash
git add server/src/middleware/admin.middleware.ts server/src/index.ts
git commit -m "chore(security): remove temporary admin debug logs"
```

---

## 9. Limites et suites prévues

Cette phase sécurise la couche admin, mais ne couvre pas encore tout le périmètre applicatif.

Les prochaines étapes prévues concernent notamment :

- validation stricte des payloads HTTP
- validation stricte des payloads Socket.IO
- contrôle d’autorisation par contexte métier
- renforcement des handlers temps réel
- réduction de la confiance côté client
- sécurisation plus fine des actions de jeu et des montants

---

## 10. Conclusion

La phase 2 a permis de transformer un ensemble de protections administratives hétérogènes en une architecture claire, homogène et beaucoup plus robuste.

Les principaux apports sont :

- centralisation complète du contrôle d’accès admin
- normalisation du token administrateur
- suppression des fallbacks faibles
- uniformisation des routes runtime
- protection forte et masquée de la route Roulette Override
- validation concrète par des tests réels sur les routes critiques

Cette phase améliore de façon nette la surface de sécurité de l’application et prépare correctement les travaux de durcissement métier de la suite du projet.

---
