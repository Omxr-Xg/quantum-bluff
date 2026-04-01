# Audit de sécurité — Quantum Bluff Backend

## 1. Informations générales

### Projet

Quantum Bluff — plateforme de jeu de poker multijoueur avec :

- authentification utilisateur
- salons d’attente
- parties multijoueurs
- bots
- gestion d’amis
- invitations
- messagerie entre amis
- sockets temps réel

### Périmètre de l’audit

L’audit a porté sur les composants backend suivants :

- auth.routes.ts
- friends.routes.ts
- invitation.routes.ts
- waitingRoom.routes.ts
- game.api.routes.ts
- bot.routes.ts
- game.gateway.ts
- securityLogger.ts
- middleware d’authentification HTTP et socket
- configuration serveur (index.ts)

### Objectifs

L’objectif de cet audit est de :

- identifier les vulnérabilités potentielles
- vérifier la robustesse des mécanismes d’authentification et d’autorisation
- évaluer la protection contre les abus (spam, brute force, flood)
- vérifier la validation et la sanitation des entrées
- contrôler la sécurité des échanges temps réel via Socket.IO
- formuler des recommandations d’amélioration

## 2. Méthodologie

L’audit a été réalisé selon une approche de revue de code statique et de validation logique, avec focalisation sur :

### 2.1 Contrôle des accès

Vérification que les utilisateurs ne peuvent agir que :

- sur leurs propres ressources
- dans leurs propres parties
- sur leurs propres invitations/demandes
- dans les limites de leurs droits

### 2.2 Validation des entrées

Vérification de :

- la présence de schémas de validation
- la sanitation des champs texte
- la robustesse face aux entrées malformées
- la prévention d’inputs incohérents ou dangereux

### 2.3 Protection contre les abus

Vérification de :

- rate limiting
- prévention brute force
- anti-spam
- anti-flood
- détection de comportements anormaux

### 2.4 Sécurité applicative

Analyse de :

- risque d’injection SQL
- risque d’usurpation d’identité
- actions temps réel non autorisées
- logique métier contournable
- exposition excessive d’informations

### 2.5 Journalisation et traçabilité

Analyse de :

- journalisation des événements suspects
- format des logs
- persistance des logs
- capacité de diagnostic a posteriori

## 3. Résumé exécutif

L’audit montre que le backend de Quantum Bluff présente une base de sécurité globalement sérieuse pour un projet académique avancé.

### Points forts principaux
- authentification JWT pour HTTP et sockets
- protection CORS configurée avec liste blanche
- rate limiting global et spécifique sur plusieurs endpoints sensibles
- usage de Prisma, réduisant fortement le risque d’injection SQL
- sanitation de certains champs utilisateurs via sanitize-html
- journalisation des comportements suspects dans un fichier dédié
- détection anti-triche sur les actions temps réel
- segmentation des notifications temps réel par rooms privées Socket.IO
- contrôle d’autorisation sur plusieurs routes métier

### Points d’attention principaux
- validation d’entrée inégale selon les routes
- certaines routes de waitingRoom.routes.ts et game.api.routes.ts reposent encore sur des valeurs reçues du client sans schéma formel uniforme
- audit de sécurité non encore industrialisé (pas de pipeline de tests de sécurité automatisés)
- système d’alertes de sécurité non centralisé ni temps réel
- journalisation de sécurité existante mais encore locale, sans centralisation ni rotation

### Conclusion synthétique

Le niveau de sécurité est bon pour un projet étudiant avancé, avec plusieurs protections pertinentes déjà en place.
Le système est défendable techniquement, mais peut encore être renforcé pour se rapprocher davantage des standards de production entreprise.

## 4. Analyse détaillée par domaine

### 4.1 Authentification et gestion des sessions

#### Éléments observés

Le backend utilise des JWT pour authentifier :

- les requêtes HTTP
- les connexions Socket.IO

Dans auth.routes.ts :

- génération d’un token JWT avec expiration
- login protégé par rate limiting
- logout avec blacklist serveur
- prise en charge d’un second facteur via TOTP lorsque activé

#### Points positifs
- présence d’un JWT_SECRET
- expiration explicite du token (7d)
- middleware d’authentification HTTP
- middleware d’authentification socket
- blacklist côté serveur pour invalider les tokens à la déconnexion
- 2FA disponible pour les comptes configurés

#### Risques résiduels
- secret JWT de fallback présent dans le code (quantum_bluff_secret) : acceptable en développement, déconseillé en production
- durée de vie de 7 jours assez longue selon le niveau de risque
- absence de rotation de token / refresh token séparé

#### Évaluation

Niveau : satisfaisant

#### Recommandations
- exiger un JWT_SECRET robuste en environnement de production
- supprimer tout secret par défaut en production
- envisager à terme une stratégie access token + refresh token

### 4.2 Protection contre le brute force

#### Éléments observés

Des rate limiters spécifiques sont présents sur :

- /api/auth/login
- /api/auth/register
- /api/auth/check-email
- endpoints de récupération de compte

Les événements de brute force sont journalisés dans security.log.

#### Points positifs
- limitation explicite des tentatives de login
- limitation des créations de compte
- journalisation dédiée des dépassements
- message d’erreur contrôlé

#### Risques résiduels
- la stratégie est principalement par IP
- pas de blocage progressif par compte ou par identifiant ciblé
- pas d’alerte active en cas de multiplication anormale des tentatives

#### Évaluation

Niveau : bon

#### Recommandations
- ajouter éventuellement un mécanisme de verrouillage progressif par compte
- ajouter une alerte sur répétition de BRUTE_FORCE_LOGIN
- corréler IP + email ciblé pour une meilleure détection

### 4.3 Validation et sanitation des entrées

#### Éléments observés

Le projet utilise des schémas de validation sur plusieurs routes, notamment :

- auth
- friends
- bot

La sanitation HTML est utilisée sur plusieurs champs texte (sanitize-html).

#### Points positifs
- usage de schémas de validation sur des routes critiques
- sanitation des champs texte utilisateurs
- contrôles explicites sur plusieurs body et query params
- validation dédiée sur /api/bot/action

#### Points faibles

- La validation n’est pas encore homogène sur tout le backend.
- Plusieurs routes utilisent encore des données reçues du client sans schéma Zod systématique, notamment dans :
  - waitingRoom.routes.ts
  - certaines routes de game.api.routes.ts
  - certaines routes d’invitations

#### Risques
- incohérences métier
- entrées inattendues
- risques de contournement logique
- complexité de maintenance et de preuve de sécurité

#### Évaluation

Niveau : partiellement satisfaisant

#### Recommandations
- uniformiser la validation avec Zod sur toutes les routes POST/PUT/PATCH
- centraliser les schémas par domaine (auth.validation, friends.validation, waitingRoom.validation, etc.)
- normaliser les réponses d’erreur de validation

### 4.4 Risque d’injection SQL

#### Éléments observés

Le backend utilise principalement Prisma ORM pour les accès aux données.

#### Analyse

L’usage de Prisma sur des requêtes ORM classiques réduit fortement le risque de SQL injection, car les paramètres sont gérés de manière structurée par l’ORM et non interpolés manuellement dans des requêtes SQL brutes.

#### Conclusion

Aucune exposition directe à une injection SQL classique n’a été identifiée dans les fichiers audités.

#### Réserve

Ce constat est valable tant que :

- les requêtes restent faites via Prisma ORM
- il n’y a pas de queryRaw / executeRaw non sécurisés ailleurs dans le projet

#### Évaluation

Niveau : bon

#### Recommandations
- éviter l’usage de SQL brut sauf nécessité forte
- si SQL brut utilisé, imposer l’usage de paramètres liés uniquement

### 4.5 Autorisation et cloisonnement des données

#### Éléments observés

Plusieurs contrôles d’autorisation sont en place :

- un utilisateur ne peut consulter que ses propres demandes d’amis
- un utilisateur ne peut accepter que ses propres invitations/demandes
- l’hôte seul peut démarrer certaines actions de salon
- les événements socket comparent l’identité JWT et le playerId

#### Points positifs
- nombreuses vérifications req.userId === ressource.owner
- contrôle strict sur invitations et demandes d’amis
- contrôle d’usurpation d’identité dans les actions socket
- émission ciblée par room privée

#### Points faibles

- Certaines routes de salle d’attente utilisent encore userId transmis dans le body ou en query, là où une authentification HTTP stricte serait préférable sur toutes les routes sensibles.

#### Risques
- confiance excessive dans certaines valeurs client
- incohérences d’autorisation si une route n’est pas systématiquement couverte par authMiddleware

#### Évaluation

Niveau : correct mais améliorable

#### Recommandations
- généraliser authMiddleware sur toutes les routes sensibles
- éviter de dépendre d’un userId envoyé par le client quand le JWT est déjà disponible
- dériver l’identité depuis le token partout où possible

### 4.6 Sécurité Socket.IO

#### Éléments observés

Le système Socket.IO met en place :

- authentification par token JWT
- identification du user à la connexion
- rattachement à une room privée user:<userId>
- contrôle d’identité sur les actions JOIN_GAME et PLAYER_ACTION

#### Points positifs
- connexion socket refusée en cas de token absent ou invalide
- protection contre l’usurpation socket.userId !== playerId
- rooms privées par utilisateur
- excellent cloisonnement pour les notifications temps réel

#### Risques résiduels
- logique critique concentrée dans le gateway, qui doit rester cohérente avec l’évolution du reste du backend
- absence de monitoring centralisé des anomalies socket au-delà du fichier local

#### Évaluation

Niveau : bon

#### Recommandations
- garder la logique d’autorisation centralisée dans le gateway
- ajouter, à terme, des métriques de sécurité socket
- prévoir un suivi plus avancé en production

### 4.7 Notifications amis sécurisées

#### Éléments observés

Les notifications liées aux amis utilisent :

- rooms privées utilisateur
- émissions ciblées au destinataire correct
- événements temps réel dédiés

#### Points positifs
- pas de broadcast global
- segmentation stricte par room utilisateur
- contrôle des identifiants avant émission
- aucune fuite fonctionnelle observée dans le modèle final retenu

#### Évaluation

Niveau : très satisfaisant

#### Conclusion

Cette partie est bien sécurisée et bien conçue pour le périmètre du projet.

### 4.8 Protection anti-triche / abus temps réel

#### Éléments observés

Un dispositif anti-cheat a été mis en place avec :

- journalisation des comportements suspects
- détection de fréquence anormale d’actions
- refus de certaines actions invalides
- contrôle d’identité entre socket et joueur

#### Exemples de cas gérés
- action hors tour
- playerId ne correspondant pas au token
- tentative d’action sur partie inexistante
- relance invalide
- trop d’actions en peu de temps

#### Points positifs
- bonne couverture des cas évidents d’abus
- mécanisme centralisé dans game.gateway.ts
- logs persistés dans logs/security.log

#### Limites
- détection basée sur des seuils simples
- pas de moteur d’analyse comportementale avancé
- pas d’escalade automatique autre qu’un refus ou un log

#### Évaluation

Niveau : bon pour le contexte

#### Recommandations
- ajouter à terme des niveaux de sévérité
- compléter avec une logique d’alertes critiques
- prévoir éventuellement une mise en quarantaine temporaire de certaines sessions abusives

### 4.9 Rate limiting avancé

#### Éléments observés

Le système applique :

- un rate limiting global
- des rate limiters dédiés sur auth
- des rate limiters ciblés proposés/ajoutés sur plusieurs routes sensibles :
  - bot
  - friends
  - invitations
  - waiting-room
  - game API

#### Points positifs
- défense en profondeur
- approche par endpoint sensible
- réduction du spam métier
- début de protection anti-DDoS basique

#### Limites
- seuils encore empiriques
- pas de différenciation par rôle ou par environnement
- pas de synchronisation distribuée multi-instance mentionnée

#### Évaluation

Niveau : bon

#### Recommandations
- documenter les seuils choisis
- ajuster les limites selon l’usage réel
- prévoir un backend partagé de rate limiting si déploiement multi-instance

### 4.10 Journalisation de sécurité

#### Éléments observés

Le projet dispose désormais d’un logger dédié :

- securityLogger.ts
- écriture dans logs/security.log
- format JSON
- conservation parallèle dans la console via console.warn

#### Points positifs
- journal dédié distinct de la console brute
- format structuré JSON
- exploitable pour post-analyse
- bonne base pour industrialisation future

#### Limites
- pas de rotation de fichier
- pas de séparation entre warning et critical
- pas de centralisation externe
- pas d’alerting temps réel

#### Évaluation

Niveau : satisfaisant pour un projet académique, intermédiaire pour un usage production

#### Recommandations
- ajouter une rotation des logs
- ajouter un fichier alerts.log ou un niveau critical
- prévoir une centralisation future (Pino, Winston, ELK, Datadog, etc.)

## 5. Vulnérabilités ou faiblesses identifiées

### 5.1 Validation hétérogène selon les routes

Certaines routes restent moins strictement validées que d’autres.

- **Risque** : moyen
- **Impact** : erreurs métier, entrées incohérentes, maintenance plus fragile
- **Priorité** : élevée

### 5.2 Dépendance à des identifiants fournis par le client sur certaines routes

Certaines routes de salon utilisent encore userId dans le body/query au lieu de s’appuyer uniquement sur le JWT.

- **Risque** : moyen
- **Impact** : risque de confusion d’autorisation si une route est mal protégée
- **Priorité** : élevée

### 5.3 Système d’alertes non encore industrialisé

Les événements suspects sont journalisés, mais pas encore promus en alertes critiques.

- **Risque** : faible à moyen
- **Impact** : visibilité limitée sur les incidents
- **Priorité** : moyenne

### 5.4 Logs locaux non rotatifs

Le fichier security.log peut croître sans contrôle dans le temps.

- **Risque** : faible
- **Impact** : volumétrie, maintenance, lisibilité
- **Priorité** : moyenne

### 5.5 Secrets de fallback en développement

Présence de valeurs par défaut dans certains secrets (JWT_SECRET fallback).

- **Risque** : faible en dev, élevé si oublié en prod
- **Impact** : compromission potentielle
- **Priorité** : élevée pour déploiement production

## 6. Tests et vérifications effectués / attendus

### 6.1 Tests déjà réalisables
- tentative de login répétée pour déclencher le brute force limiter
- action socket avec mauvais playerId
- action hors tour
- relance invalide
- spam d’actions pour déclencher TOO_MANY_ACTIONS
- vérification que les notifications amis ne sont reçues que par le bon utilisateur

### 6.2 Tests complémentaires recommandés
- corpus systématique d’entrées invalides sur toutes les routes POST/PUT
- tentative d’accès aux ressources d’un autre utilisateur
- tests de salons privés avec utilisateurs non autorisés
- tests de flood sur messages/invitations/waiting-room
- tests de cohérence entre HTTP auth et socket auth

## 7. Conformité aux tâches de sécurité du projet

### SA1 — Authentification sockets

**Statut** : conforme

**Motif** :
- auth JWT socket en place
- rooms privées utilisateur
- identité liée à la session socket

### SA2 — Validation des actions des bots

**Statut** : conforme après sécurisation de /api/bot/action

**Motif** :
- limitation à 10 req/s
- validation de la requête
- sanitation/normalisation des cartes
- revalidation de la décision bot avant réponse

### SA3 — Notifications amis sécurisées

**Statut** : conforme

**Motif** :
- notifications envoyées uniquement au bon utilisateur
- cloisonnement par room privée
- contrôle des identifiants avant émission

### SA4 — Protection anti-triche

**Statut** : conforme

**Motif** :
- journalisation des comportements suspects
- détection des actions anormales
- blocage des abus les plus évidents

### SA5 — Audit de sécurité

**Statut** : conforme avec le présent rapport

**Motif** :
- revue structurée réalisée
- protections analysées
- vulnérabilités et recommandations formalisées

### SA6 — Rate limiting avancé

**Statut** : conforme si les limiters spécifiques ont bien été appliqués aux endpoints sensibles

**Motif** :
- auth, bot, friends, invitations, waiting-room, game API couverts

### SA7 — Journalisation des actions suspectes

**Statut** : partiellement conforme à ce stade

**Motif** :
- journalisation : oui
- alerting avancé : encore améliorable

## 8. Recommandations prioritaires

### Priorité 1
- généraliser la validation Zod sur toutes les routes sensibles
- remplacer partout les userId client par l’identité issue du JWT quand possible
- supprimer les secrets de fallback en production

### Priorité 2
- ajouter un système d’alertes critiques séparé du simple logging
- classer les événements sécurité par niveau (warning, critical)
- ajouter une rotation du fichier security.log

### Priorité 3
- centraliser les logs à terme
- documenter les politiques de rate limiting
- enrichir les tests de sécurité automatisés

## 9. Conclusion finale

L’audit montre que Quantum Bluff dispose d’une architecture de sécurité déjà solide pour un projet académique :

- authentification HTTP et socket cohérente
- protections anti-abus pertinentes
- notifications temps réel bien cloisonnées
- mécanismes anti-triche opérationnels
- journalisation de sécurité structurée

Les principaux axes d’amélioration concernent surtout :

- l’harmonisation de la validation d’entrée
- l’industrialisation du logging/alerting
- la formalisation des pratiques pour se rapprocher davantage d’un standard production

### Conclusion synthétique

Le backend peut être considéré comme sécurisé à un niveau sérieux et crédible pour le cadre du projet, avec des améliorations encore possibles pour atteindre un niveau plus proche des pratiques d’entreprise en production.

## 10. Annexe — protections observées

### Authentification
- JWT HTTP
- JWT Socket.IO
- blacklist logout
- 2FA TOTP

### Contrôle d’accès
- middleware auth
- vérification des propriétaires/destinataires
- rooms privées utilisateur

### Validation / sanitation
- Zod sur plusieurs domaines
- sanitize-html pour plusieurs entrées texte
- normalisation des cartes côté bot

### Anti-abus
- rate limiting global
- rate limiting auth
- rate limiting bot
- rate limiting friends/invitations/waiting-room/game API

### Anti-triche
- détection d’actions trop fréquentes
- logs des comportements suspects
- contrôle d’identité socket/joueur
- vérification hors tour et actions invalides

### Journalisation
- security.log
- format JSON
- console + persistance fichier
