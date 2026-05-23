# Quantum Bluff - Notice d'Utilisation Complète

## TABLE DES MATIÈRES
1. Introduction & Démarrage
2. Authentification & Compte
3. Interface Lobby
4. Poker - Cash Games & Tournaments
5. Jeux de Casino (Blackjack, Roulette, Slots)
6. Système de Progression & Récompenses
7. Interactions Sociales
8. Gestion du Portefeuille
9. Conseils & Stratégies
10. Tutoriel Interactif & Aide
11. Feedback & Notation du Jeu

---

## 1. INTRODUCTION & DÉMARRAGE

### 1.1 Qu'est-ce que Quantum Bluff ?
Quantum Bluff est une plateforme de jeu multijoueur offrant :
- **Poker** (parties d'argent et tournois)
- **Jeux de casino** (Blackjack, Roulette, Machines à sous)
- **Systèmes sociaux** (Amis, Prêts, Messages)
- **Progression et gamification** (Niveaux, Badges, XP)
- **Classements** globaux par catégorie

### 1.2 Accès à la Plateforme

**Plateformes Disponibles :**

- **Web** : Accessible via navigateur (responsive design, desktop/mobile)
  - URL : https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/
  
- **Windows Desktop** : Installation locale depuis le dépôt Git
  - Fichier : `Quantum Bluff Setup 1.0.0.exe` (127 MB)
  - Emplacement : `client/dist-electron/` du dépôt Git
  - Double-cliquez sur l'exécutable et suivez l'installation
  
- **Mac Desktop** : Installation locale depuis le dépôt Git
  - Fichier : `Quantum Bluff-1.0.2-arm64.dmg` (175 MB)
  - Emplacement : `Game_Versions/` du dépôt Git
  - Ouvrez le fichier DMG et glissez l'application dans Applications
  
- **Android** : Application native via Capacitor
  - Source : `client/android/` du dépôt Git
  - Compilation : `npx cap build android` pour générer l'APK
  - Installation : Transférez l'APK généré sur votre appareil Android
  - Même expérience que version web
  
- **iOS** : Application native via Capacitor
  - Source : `client/ios/` du dépôt Git
  - Compilation : `npx cap build ios` pour générer le projet Xcode
  - Installation : Compilez avec Xcode et installez sur votre appareil iOS
  - Même expérience que version web

**Langues supportées**: Anglais, Français, Espagnol, Ukrainien, Arabe

**Monnaie du jeu**: Jetons (chips) — pas de vraie monnaie

### 1.3 Configuration Requise
- Connexion internet stable
- Navigateur moderne (Chrome, Firefox, Safari, Edge)
- Résolution minimale: 320px (mobile) à 1920px+ (desktop)

---

## 2. AUTHENTIFICATION & COMPTE

### 2.1 Étapes d'Inscription (Register)

#### Début
1. Écran d'accueil avec citation inspirante (aléatoire parmi 20 citations célèbres de poker)
2. Cliquer "S'inscrire" ou utiliser "Register"

#### Processus
**Étape 1 — Email**
- Saisir adresse email valide
- Le système vérifie la disponibilité
- Codes d'erreur: `EMAIL_ALREADY_EXISTS` (créer nouveau compte ou utiliser "Connexion")

**Étape 2 — Identifiant & Mot de passe**
- **Identifiant**: 3-20 caractères alphanumériques + underscore
- **Mot de passe**: Minimum 8 caractères (recommandé: majuscule, minuscule, chiffre, caractère spécial)
- Confirmation du mot de passe obligatoire

**Étape 3 — Question de Sécurité**
- Sélectionner l'une des 10 questions secrètes proposées
- Répondre avec une phrase (non sensible à la casse)
- Utilisée pour récupération de compte (mot de passe oublié)

**Étape 4 — Date de Naissance**
- Obligatoire pour validation légale (âge minimum: 18 ans)
- Format ISO (aaaa-mm-jj)
- Limites: 18 ans aujourd'hui jusqu'à 120 ans d'âge

**Étape 5 — Activation**
- Compte créé avec 1000 jetons initiaux (balance de démarrage)
- Redirection automatique vers la connexion ou le lobby

### 2.2 Validation d'Âge & Restriction par Pays

**Détection du Pays:**
- Basée sur l'IP de votre requête + en-têtes du CDN (Cloudflare, Vercel, etc.)
- Automatique — vous n'avez rien à faire
- Utilisée uniquement pour la validation légale lors de l'inscription

**Règles d'Âge par Pays:**

| Pays/Région | Âge Minimum | Notes |
|---|---|---|
| **États-Unis (US)** | **21 ans** | Jeux d'argent en ligne réglementés fédéralement |
| **Tous les autres pays** | **18 ans** | Standard international |
| **Arabie Saoudite (SA)** | ❌ Interdit | Les jeux d'argent en ligne ne sont pas autorisés |
| **Iran (IR)** | ❌ Interdit | Les jeux d'argent en ligne ne sont pas autorisés |

**Système de Blocage d'Email:**
- Si vous essayez de vous inscrire avant d'avoir l'âge légal, votre email est automatiquement bloqué
- Vous recevrez l'erreur: *"Cet e-mail ne peut pas être utilisé pour s'inscrire avant la date d'éligibilité liée à votre âge"*
- L'email est débloqué **automatiquement** le jour où vous atteignez l'âge légal (à minuit UTC)
- Exemple: Si vous avez 17 ans le 15 mai 2026, vous pourrez vous inscrire avec ce même email à partir du 15 mai 2027 (à minuit UTC)

**Pays Interdits:**
- Si votre IP provient d'Arabie Saoudite ou d'Iran, l'inscription est **complètement refusée** (code d'erreur 403)
- Message: *"Les jeux d'argent en ligne ne sont pas autorisés depuis votre pays"*
- Aucun système de déblocage futur — c'est une restriction permanente

**Limitation VPN :**
- Si vous utilisez un VPN, le pays détecté est celui de **la sortie du VPN** (pas le VPN lui-même)
- Exemple : VPN basé en Arabie Saoudite mais dont la sortie réelle est aux États-Unis → vous serez traité comme étant aux États-Unis

### 2.3 Connexion (Login)

#### Processus Standard
1. **Email**: Saisir email du compte
   - Vérification: existence du compte
   
2. **Mot de passe**: Saisir mot de passe
   - Affichage contrôlable (icône oeil)
   - Sensible à la casse

#### Redirection Post-Login
- Lobby Poker par défaut
- Peut rediriger vers page précédente (ex: partie en cours)

### 2.3 Récupération de Compte (Mot de passe oublié)

#### Flux
1. Écran "Forgot Password"
2. Saisir email
3. Répondre à la question secrète (même réponse qu'à l'inscription)
4. Saisir nouveau mot de passe + confirmation
5. Succès: redirection vers login

#### Codes d'erreur
- `INVALID_EMAIL`: Email inexistant
- `INVALID_SECURITY_ANSWER`: Mauvaise réponse à la question

### 2.4 Gestion du Compte

#### Profil (Onglet "Mon Compte")
- **Avatar**: Photo/avatar uploadable (PNG, JPG)
- **Nom d'utilisateur**: Modifiable (après déconnexion/reconnexion)
- **Email**: Affiché (non modifiable côté user)
- **Paramètres**: Langue, accessibilité, thème

#### Déconnexion
- Bouton "Déconnexion" → retour Auth
- Session JWT invalide après (token révoqué côté Redis)
- localStorage clearing: avatar, gamification, balance cache

---

## 3. INTERFACE LOBBY

### 3.1 Navigation Principale

#### Onglets
1. **POKER** (par défaut)
   - Parties d'argent (tables multijoueurs)
   - Tournois
   - Regarder les parties en direct
   
2. **MINIGAMES** (Roulette, Machines à sous)
   - Jeux de casino rapides
   - Statistiques personnelles
   
3. **BLACKJACK**
   - Mode solo (1 contre 1 contre le croupier)
   - Multijoueurs (tables avec amis)

4. **PROFIL** 
   - Statistiques personnelles
   - Badges et Niveaux
   - Historique de jeu

5. **AMIS**
   - Liste d'amis
   - Requêtes en attente
   - Messages privés
   - Prêts entre amis

6. **CLASSEMENTS**
   - XP Global
   - Victoires au Poker
   - Plus grands gains au Casino
   - Classements par métrique

### 3.2 Section POKER — Tables Disponibles

#### Structure des Listes
1. **Waiting Rooms** (En attente de démarrage)
   - Affiche: Nom, Small Blind/Big Blind, Joueurs inscrits, Status
   - Filtre: Public / Private
   - Boutons: Rejoindre / Spectate

2. **Games In Progress** (Parties en cours)
   - Affiche: Phase (Preflop, Flop, Turn, River, Showdown)
   - Statut joinable: "Can Join" si siège libre
   - Spectate: Toujours possible

3. **Tournaments** (Tournois)
   - **Ouvertes**: En inscription (affiche date/heure démarrage local)
   - **En cours**: Tables brackets en live
   - **Fermées**: Résultats finaux

#### Filtres & Recherche
- **Blind Range**: Slider pour min/max big blind
- **Players**: Nombre de joueurs minimum
- **Status**: Public/Private/All
- **Search**: Nom table/tournoi

### 3.3 Création d'une Table

#### Dialog "Create New Table"
**Paramètres obligatoires:**
- **Nom**: Titre de la table (visible aux autres)
- **Visibility**: PUBLIC (visible tous) / PRIVATE (invite uniquement)
- **Max Players**: 2-9 (heads-up à 9-max)
- **Small Blind**: ex. 5, 10, 25
- **Big Blind**: Doit être > Small Blind
- **Min Balance**: Balance minimale requise pour jouer (optionnel, ex: 2× BB)
- **Turbo Mode** (checkbox): Blind increase rapide

**Validation:**
- Vérifie solde joueur ≥ 2× Big Blind (buy-in initial)
- Vérifie niveau déverrouille les blinds si limites par niveau
- Max tables simultanées par joueur: ~5

**Après création:**
- Joueur crée automatiquement "host" (control de la table)
- Redirection vers Waiting Room
- Autres joueurs peuvent rejoindre

### 3.4 Rejoindre une Table (Cash Game)

#### Dialog "Join Game"
1. Sélectionner table
2. Saisir buy-in (recommandation: 20-100× BB)
3. Upload avatar (optionnel)
4. Confirmer

**Limites de buy-in:**
- Minimum: 2× BB
- Maximum: Solde du joueur ou plafond table
- Auto-ajust: si solde insuffisant → erreur `INSUFFICIENT_CHIPS`

**Placement:**
- Joueur assis au prochain siège libre (ordre circulaire)
- Rôle initial: PLAYER
- Premier dealer button position aléatoire ou après départ

### 3.5 Création d'un Tournoi

#### Dialog "Create Tournament"
**Paramètres:**
- **Nom**: Titre du tournoi
- **Max Players**: 2-128 (détermine structure brackets)
- **Blinds Structure**: 
  - Preset: Micro (5/10), Small (10/20), Medium (25/50), Large (100/200)
  - Augmentation: 10-30 min par level par défaut
- **Stack Inicial**: Jetons de départ par joueur (ex: 1500)
- **Buy-in**: Coût d'inscription (jetons)
- **Date/Heure démarrage**: Format local (datetime-local)
- **Turbo Mode**: Blind increase 2× plus rapide

**Coûts:**
- Buy-in déduit du solde joueur
- Fondateur inscrit automatiquement

**Inscription:**
- Joueurs rejoignent via Lobby
- Status: `En attente` jusqu'à heure démarrage
- Après démarrage: Status `En cours` → brackets tournoi
- Max 1 tournoi/joueur simultanément

### 3.6 Tableau de Bord Personnel

#### Widgets
1. **Solde**: Jetons disponibles actuels
2. **Niveau & XP**: Progression vers prochain level (barre)
3. **Récent**: Dernière action (partie jouée, gain/perte)
4. **Amis en ligne**: Avatar + statut (playing/idle)
5. **Défi du jour**: Challenge quotidien + progression
6. **Recharge gratuite** (si code QUANTUM valide): Bouton "Top-up gratuit"

#### Challenge Quotidien
- Un challenge par jour (minuit UTC)
- Exemples: "Win 3 poker hands", "Spin roulette 5 times"
- Récompense XP + bonus chips si complété
- Réinitialise automatiquement J+1

#### Recharge Gratuite
- Code promo: `QUANTUM` (par défaut dev/staging)
- Ajoute 1000 jetons
- Utilisable une fois par jour (24h cooldown)

---

## 4. POKER — CASH GAMES & TOURNAMENTS

### 4.1 Règles Fondamentales du Poker (Texas Hold'em)

#### Variante
- **Texas Hold'em** (seule variante supportée)
- 2-9 joueurs par table
- Cartes communes: 5 (Flop 3 + Turn 1 + River 1)
- Main finale: 5 cartes parmi 7 (2 privées + 5 communes)

#### Rôles & Positions

**Heads-up (2 joueurs)**
- Button = Small Blind (agit en dernier postflop, agit en premier preflop)
- Autre joueur = Big Blind (agit en premier postflop)

**3+ joueurs**
- **Dealer Button (D)**: Marque par jeton "D", tourne clockwise
- **Small Blind (SB)**: À gauche du dealer, mise SB avant cartes
- **Big Blind (BB)**: À gauche du SB, mise BB avant cartes
- **Autres**: PLAYER (positions UTG, UTG+1, … CO, etc.)

**Ordre d'action preflop**
1. UTG (Under The Gun) — 1e à gauche du BB
2. UTG+1, UTG+2, … CO (Cutoff)
3. Button
4. Small Blind
5. Big Blind

**Ordre postflop (Flop, Turn, River)**
1. Small Blind (si actif)
2. Big Blind
3. UTG, UTG+1, … Button (si actifs)

#### Phases du Jeu
1. **Pre-Game**: Joueurs s'assoient, chips distribuées
2. **Preflop**: Blinds postées, cartes distribuées (2 par joueur)
3. **Action Preflop**: Mise/fold/check/raise jusqu'à égalisation ou 1 seul restant
4. **Flop**: 3 cartes communautaires révélées
5. **Action Flop**: Mise/check/fold/raise
6. **Turn**: 4e carte communautaire
7. **Action Turn**: Même mécanique
8. **River**: 5e et dernière communautaire
9. **Action River**: Mise/check/fold/raise
10. **Showdown**: Meilleures mains comparées, pot distribué

#### Possibilités d'Action

**Main Normale (joueur toujours actif avec chips)**
- **FOLD**: Abandonner la main (chips en jeu perdus)
- **CHECK**: Passer tour sans miser (seulement si personne n'a misé)
- **CALL**: Égaliser la mise précédente
- **RAISE**: Miser plus (minimum: big blind ou relance précédente)
- **ALL-IN**: Engager tous ses chips restants (peut être < mise requise)

**Variantes**
- **Check-Raise**: Check puis relancer après relance (stratégique)
- **Min-Raise**: Relancer du minimum légal (rare, souvent mauvaise forme)

#### Règles de Mise

**Montants Minimum**
- Preflop : Big Blind = unité minimale
- Postflop : Relance précédente ou big blind
- Relance : Au minimum égaler le dernier pari + 1 BB

**All-in Dynamique**
- Si joueur sans chips mais main active → pot compétitif créé
- Joueurs restants continuent à jouer
- Runout (tous les 5 cartes communautaires) joué après tous-in
- Pot côté réparti selon participation

**Plafond de Mise (Dépendant de la table)**
- Certaines tables : cap de pari (ex : 3 relances par street)
- Généralement : pas de limite (No-Limit Texas Hold'em)

#### Évaluation des Mains
**Classement (du meilleur au pire) :**
1. **Royal Flush** : A-K-Q-J-10 même couleur
2. **Straight Flush** : 5 cartes consécutives même couleur
3. **Quads (Carré)** : 4 cartes identiques
4. **Full House** : Brelan + Paire
5. **Flush** : 5 cartes même couleur
6. **Straight** : 5 cartes consécutives (couleurs mixtes)
7. **Three of a Kind (Brelan)** : 3 cartes identiques
8. **Two Pair (Deux paires)** : 2 paires différentes
9. **Pair (Paire)** : 2 cartes identiques
10. **High Card** : Carte la plus haute

**Tie-breaking (Départage)**
- Kickers (cartes non-appariées) comparées si même type
- Ex : Paire de Rois + A-K-Q vs Paire de Rois + A-J-T → 1ère main gagne (meilleur kicker)

### 4.2 Gameplay - Cycle de Jeu Typique

#### Avant une Main
1. **Setup table**: 2-9 joueurs assis
2. **Blinds postées**: Automatiquement débités
3. **Cartes distribuées**: 2 cartes hole privées par joueur (visibles côté)

#### Action Preflop
- **Joueur 1 (UTG)** : 
  - Options : Fold, Call BB, Raise
  - Exemple : Raise à 60 (3× BB de 20)
  
- **Joueur 2** : 
  - Options : Fold, Call 60, Raise à 150+
  - Exemple : Fold (perd l'antes)
  
- **Small Blind / Big Blind** :
  - Peuvent fold, call ou raise
  - SB : Peut appeler 10 jetons supplémentaires (solde 20 total)
  - BB : Peut appeler 40 jetons supplémentaires ou raise

- **Continuer jusqu'à** :
  - Tous sauf 1 joueur ont foldé → main terminée (pot au dernier restant) — WIN_BY_FOLD
  - Ou tous les joueurs actifs ont égalisé le pari → phase suivante

#### Fenêtre des Paris en Direct (Cash Multijoueurs)
- **Fenêtre PRE-HAND** (5 secondes) : Fenêtre pour paris cachés (voir section 4.5)
- **Fenêtres Entre Streets** : Entre Flop/Turn/River (LIVE_FLOP, LIVE_TURN, LIVE_RIVER)
- L'action de poker est **gelée** pendant ces fenêtres
- Interface verrouillée (pas de boutons d'action)

#### Flop, Turn, River
- Même structure : small blind agit en premier (s'il est actif)
- Les pots s'accumulent à chaque street

#### Showdown
- Les joueurs restants abattent les cartes
- La meilleure main remporte le pot principal
- En cas d'égalité : Split pot (partage équitable)
- Interface affiche : Les meilleures mains, valeur du pot, comment il est distribué

**Exemple de showdown :**
```
Joueur A : A-K (flush) vs Joueur B : Q-Q (brelan)
Pot : 1200
Gagnant : Joueur A (flush > brelan)
Changements de balance : A +1200, B -1200
```

#### Main Suivante
- Le dealer button tourne dans le sens horaire
- Les blinds sont repositionnées
- Les cycles se répètent

### 4.3 Cash Game Multipos — Particularités

#### Buy-in et Stack
- **Stack Initial** : Déterminé par le joueur à l'arrivée (ex : 1000 jetons, montant entre 100 et 10 000 max)
- **Rebuy** : Si le stack diminue, acheter plus de jetons (optionnel, via balance portefeuille)
- **Leave** : Quitter la table à tout moment (entre deux mains) → l'argent casé-out est crédité au portefeuille

#### Avatars Personnalisés
- Chaque joueur peut télécharger un avatar à l'arrivée
- Affiché sur le siège (petit portrait)
- Visible par tous les joueurs
- Reset : Avatar par défaut utilisé si aucun téléchargement

#### Timeout d'Action
- **Limite de Temps** : 30-60 secondes par joueur (selon la configuration de la table)
- Dépassement : Fold automatique
- Avertissement : Compteur visuel compte à rebours

#### Mode Spectateur & Rejoin à la Prochaine Manche

**Spectateur**
- Vous pouvez regarder une main en cours en tant que spectateur
- Accès: Bouton "Spectate" depuis lobby ou pendant partie
- Visibilité: Voyez les cartes communautaires, pas les trous des autres joueurs

**Rejoin Automatique à la Prochaine Manche**
- Après une main, si vous quittez ou restez spectateur → vous pouvez vous inscrire pour rejoindre la manche suivante
- File de rejoin: Attendez jusqu'au prochain démarrage (10-30 sec countdown inter-mains)
- Condition: Vous devez avoir au minimum le defaultBuyIn en portefeuille pour être réintégré
- Placement: Asseyez-vous au prochain siège disponible (ordre circulaire)
- Note: Spectateurs réinscrits en priorité selon ordre d'inscription

### 4.4 Paris Cachés (Side Bets Multijoueurs)

#### Concept
- **Quote/Place (Paris annexes)** : Parier sur les résultats d'autres joueurs
- **Disponible** : Parties d'argent multijoueurs uniquement
- **Statut** : Optionnel, non-bluffant (gains/pertes séparés du pot principal)

#### Flux

**FENÊTRE PRE-HAND (5 sec)**
- Fenêtre ouverte avant chaque main
- Les joueurs peuvent placer des paris sur la main suivante (si l'ID de la main est connu)
- Options : Quote (le joueur gagne), Place (le joueur perd)
- Montants : Libre (limité à la balance)

**Windows d'Action** (LIVE_FLOP, LIVE_TURN, LIVE_RIVER)
- Fenêtres gelées entre les streets
- L'action de poker sur la table est **en pause** (pas de boutons)
- Les résultats des paris sont révélés après que l'action de poker continue

**Résultats**
- Au showdown : Les paris sont réglés
- Gains/pertes hydratés dans la balance
- Historique : Table visible, date/heure, montants

#### Transactions du Ledger
- Chaque pari enregistré dans le ledger du portefeuille
- Type : "HIDDEN_BET_SETTLED" (ex : +250 chips pour une quote gagnante)
- Dashboard : Historique accessible via l'icône historique

### 4.5 Tournaments

#### Structure d'Un Tournoi

**Avant**
- Registration window ouverte (date_start - temps X)
- Joueurs s'inscrivent via Lobby (pay buy-in)
- Max players atteint ou temps registration fermé → start
- Stack initial distribué à chaque joueur

**Pendant**
- **Blind Levels**: Augmentation programmée (10-30 min par défaut)
- **Brackets**: Joueurs assignés à tables par algo
- **Elimination**: Si stack = 0 → joueur éliminé
- **Advancement**: Tables réduites (7-6-5-4...) à mesure éliminations
- **Final Table**: Dernière table de 6-9 joueurs

**Après**
- Gagnant = dernier joueur avec chips
- Payout structure: 1st place > 2nd > 3rd... (configurable)
- Historique: Tournoi affiché dans stats

#### Bracket & Avancement

**Structure Multi-Leveled:**
- Table 1, Table 2, … selon joueurs
- Jouer 1-2 niveaux par round
- Tables balancées: move winning joueurs vers "stronger" tables (optionnel)

**Élimination:**
- Joueur out (0 chips) → marked as "Eliminated"
- Placement: Position finale (ex: 45th, 23rd, 1st)
- Rewards: Distribuées selon placement

#### Récompenses Tournoi

**Payout Structure (Exemple 64 joueurs):**
```
1st:  5000 chips
2nd:  3000 chips
3rd:  2000 chips
4-6:  1200 chips
7-12: 600 chips
13-24: 300 chips
25+: Pas de payout
```

**XP Rewards:**
- Tous recevaient XP (même éliminés tôt)
- Bonus XP si avancer rounds: +10 XP par round
- Bonus XP si placer: +50 XP top 3, +25 XP top 10

#### Spectate Tournament
- Bouton "Spectate" sur tournois en cours
- Voir tables en live, action temps-réel
- Chat spectators-only
- Avertir amis (pas de mute)

#### Ready-Check Inter-Mains & Auto-Élimination

**Après chaque main (entre deux mains)**
- Fenêtre "Prêt" s'affiche pour tous les survivants
- Délai: **30 secondes** pour cliquer "Prêt"
- Dépassement: Joueur considéré **AFK (Away From Keyboard)** → **AUTO-ÉLIMINÉ du tournoi**
  - Élimination enregistrée en DB
  - Client reçoit event "PLAYER_BUSTED" avec raison "AFK"

**Gestion des AFK (30 sec timeout)**
- Si **0 joueur prêt** (tous AFK): Le joueur avec le plus de jetons l'emporte (ou départage par userId)
- Si **1+ joueur prêt**: Main continue avec joueurs prêts, AFK sont éliminés
- Si **≥2 survivants** après élimination: Main suivante démarre automatiquement
- Si **1 seul survivant**: Table terminée, joueur qualifié pour prochain round

### 4.6 Bot Tables - Practice & Expert Mode

#### Purpose
- **Easy, Medium, Hard** : Entraînement contre IA variable (solde stable)
- **Expert** : Défi contre IA très entraînée + jetons réels en jeu
- Accessible sans amis
- Progressif: difficulté augmente par niveau

#### Accès
- Lobby → "Play with Bots" ou "Practice Game"
- Sélectionner difficulté:
  - **Easy / Medium / Hard** : Entraînement (solde virtuel)
  - **Expert** : IA très entraînée, jetons réels en jeu
- Stack initial: Personnalisable (mini 100 jetons)
- Blinds: 50/100 presets

#### Bots Comportement
- **Easy / Medium / Hard** : Varié playstyle (tight/loose/aggressive/passive)
- **Expert** : IA très entraînée, décisions sophistiquées
- Balanced (tous niveaux): Pas toujours best play (erreurs humaines intégrées)
- Bots reset jetons entre sessions (unlimited funds)

#### Rewards & Jetons

**Easy / Medium / Hard (Entraînement - Solde Stable)**
- XP reçu normal (12 XP/main preflop, 35 XP win)
- Chips gagnés/perdus **NON crédités au portefeuille** (solde reste stable)
- Parfait pour apprentissage sans risque

**Expert (Mode Compétitif - Jetons Réels)**
- XP reçu normal
- Chips gagnés/perdus **CRÉDITÉS au portefeuille réel**
- IA très entraînée, vraie monnaie du jeu en jeu
- À réserver aux joueurs confirmés

### 4.7 Outils et Interface In-Game

**Tous les trois outils sont implémentés et accessibles en bas à droite de l'écran pendant le jeu :**
- **CHAT** — Bouton message, ouvre panel émojis + messages rapides
- **COMBIS** — Bouton "Classement des combinaisons", ouvre panel 11 mains poker avec exemples
- **PROBAS** — Bouton affichage probabilités, affiche pourcentages gagnants en temps réel

#### 4.7.1 CHAT — Communication Émojis et Messages Rapides

**Accès:**
- Bouton **"CHAT"** en bas à gauche de l'écran (avant les action buttons)
- Clic → ouvre **panel deux onglets** : Emojis + Messages rapides
- Accessible avant, pendant, après action

**Onglet Emojis (20 Réactions Prédéfinies):**
Grille de 20 emojis représentant réactions communes au poker:
```
🃏 Cartes (2 emojis)      📱 Casino        🔥 Dynamique
💎 Diamants               😎 Cool          🚀 Rapid
🤔 Pensif                 😰 Nerveux        👑 Royal  
⚡ Éclairs               🏆 Trophée        🎉 Party
😲 Choqué                 🤯 Mind Blown    ❄️ Froid
💰 Riche
```
- **Interaction:** Cliquez emoji pour envoyer à la table
- **Organisation:** Grille 5 colonnes (mobile) ou 6 colonnes (desktop)
- **Rendu:** Emoji visible immédiatement pour vous; apparaît sur seats autres joueurs

**Onglet Messages Rapides (12 Messages Préécrits):**
Liste scrollable de 12 messages de poker communs (français/anglais selon langue):
```
1. "Bien joué!" (Well played!)
2. "Tapis!" (All-in!)
3. "Je bluff" (Bluffing)
4. "Quelle main!" (What a hand!)
5. "Coup de chance" (Lucky shot)
6. "On s'échauffe!" (Heating up!)
7. "Impressionnant" (Impressive)
8. "GG WP" (Good game, well played)
9. "Risqué" (Risky)
10. "Facile" (Easy)
11. "Oups" (Oops)
12. "Incroyable" (Incredible)
```
- **Interaction:** Cliquez message pour envoyer instantanément
- **Affichage:** Message apparaît texte au-dessus seat du joueur
- **Limite:** Max 500 caractères message (si custom input future)

**Visibilité:**
- Emojis/Messages visibles à **tous les joueurs** (assis + spectateurs)
- Timestamp: Heure relative ("à l'instant", "5 sec ago")
- Pas de filtrage ou censure

**Utilité:**
- Sociabilité: Engager conversation pendant partie
- Strategy signals: Indiquer bluff/value sans vraies paroles (mind games)
- Fun: Célébrer wins, réagir coups spectaculaires

#### 4.7.2 COMBIS — Référence Classements Mains Poker

**Accès:**
- Bouton **"COMBIS"** en bas à droite de l'écran (à côté de CHAT)
- Clic → ouvre **panel sur la gauche** : "Classement des combinaisons"
- Accessible pendant partie, avant l'action, après main

**Contenu — 11 Classements Mains (du Meilleur au Pire):**

| Rang | Combinaison | Description | Exemple |
|---|---|---|---|
| 1 | **Royal Flush** | A-K-Q-J-10 même couleur (meilleure main) | A♠K♠Q♠J♠10♠ |
| 2 | **Straight Flush** | 5 cartes consécutives même couleur | 9♥8♥7♥6♥5♥ |
| 3 | **Quads** (Carré) | 4 cartes identiques | K♠K♥K♦K♣ |
| 4 | **Full House** | Brelan + Paire | J♠J♥J♦6♣6♥ |
| 5 | **Flush** | 5 cartes même couleur (ordre libre) | K♣9♣7♣5♣2♣ |
| 6 | **Straight** | 5 cartes consécutives (couleurs mixtes) | 8♠7♥6♦5♣4♠ |
| 7 | **Trips** (Brelan) | 3 cartes identiques | 5♠5♥5♦ + kickers |
| 8 | **Two Pair** | 2 paires différentes | Q♠Q♥3♦3♣ + kicker |
| 9 | **Pair** | 2 cartes identiques | 10♠10♥ + 3 kickers |
| 10 | **High Card** | Carte la plus haute (aucune paire) | A♠K♣Q♦J♥9♠ |

**Affichage Visuel:**
- Chaque combinaison affiche **exemples de cartes** (PNG/SVG visuels)
- Code couleur: Couleurs réelles (♠ noir, ♥/♦ rouge)
- Textuel: Description claire pour chaque combinaison

**Tie-breaking (Kickers):**
- Explique comment comparer si 2 joueurs même classement
- Exemple: "Paire de Rois avec A-K-Q bat Paire de Rois avec A-J-T"
- Visuel: Cartes kickers surlignées

**Utilité:**
- **Apprentissage:** Référence rapide force mains
- **Stratégie:** Identifier si main nécessite compétitivité
- **Clarté:** Résout disputes showdown (impossible avec UI)

#### 4.7.3 PROBAS — Affichage Probabilités et Main Actuelle

**Accès:**
- Bouton **"PROBAS"** en bas à droite de l'écran (après COMBIS)
- Affiche **temps réel** : % win chance (pourcentage gagnant) + main actuelle
- Panel **repositionnable** (draggable par header)
- Position sauvegardée en localStorage

**Contenu — 2 Sections:**

**1. Win Probability Gauge (Jauge de Pourcentage)**
- **Valeur numérique:** "67% win chance" (en gros texte)
- **Gradient bar visuel:**
  - Vert (80-100%): Forte main (favourite)
  - Jaune (50-79%): Competitive (coin flip) 
  - Rouge (0-49%): Faible main (underdog)
- **Mise à jour:** Temps réel (chaque street: flop, turn, river)
- **Calcul:** Basé cartes visibles + community cards + équité vs opponents
- **Caveat:** Hypothèse opponent random hand (pas lire/bluff)

**2. Current Hand Display**
- **Nom main:** Ex: "Paire de Rois" | "Flush" | "Straight Draw"
- **Cartes visuelles:** Affiche vos 2 hole cards + meilleures 5 community
- **Valeur main:** Classement (High card à Royal Flush)
- **Updated:** Recalculé chaque street (flop, turn, river)

**Contrôles:**
- **Header draggable:** Cliquez + glissez pour repositionner panel dans viewport
- **Position sauvegardée:** localStorage retient position (réapparaît à même endroit prochaine session)
- **Redimensionnable:** Coin drag pour agrandir/réduire (optionnel)
- **Fermer:** Bouton × (rouvrez via "PROBAS")

**Affichage Physique:**
- **Positionnement:** Par défaut bas-droit (ne cache pas action buttons)
- **Transparence:** Légèrement transparent pour voir table derrière
- **Contraste:** Texte blanc sur fond semi-noir lisible
- **Responsive:** Adjust automatiquement mobile (peut être resizé)

**Utilité:**
- **Décision rapide:** Évaluer force main avant agir
- **Apprentissage:** Comprendre équité situations courantes
- **Stratégie:** Identifier draw vs made hand rapidement
- **Réduction variance mentale:** Moins "felt bad" bad beats si saviez odds

---

## 5. JEUX DE CASINO

### 5.1 BLACKJACK

#### Objectif
- Obtenir main plus proche de 21 que croupier (sans bust)
- Beat croupier sans busting

#### Règles (MVP)

**Deck**
- 6 jeux (sabot 312 cartes)
- Shufflé automatiquement par session
- Pas de card counting possible (RNG crypto)

**Cartes & Valeurs**
- Numérique (2-10): Face value
- Figures (J, Q, K): 10 points
- As (A): 11 ou 1 (best value ≤ 21)
- *Soft hand*: Hand with Ace = 11 (ex: A+6 = 17 soft) — peut tirer without bust risk

**Natural Blackjack**
- As + Figure/10 en 2 cartes
- Bat le non-BJ automatiquement
- Payout : 3:2 (gain net = mise × 1.5, rendu = mise + gain)
- Si le croupier a aussi BJ → Push (argent rendu)

**Croupier Stand/Hit**
- Le croupier joue selon une règle fixe (pas de décision)
- **Hit si** : Total < 17
- **Stand si** : Total ≥ 17
- **Soft 17 (A+6)** : Stand (règle commune) — ne pas tirer

**Paiements**
```
Joueur BJ vs Croupier non-BJ : 1.5 × mise (plus mise initiale)
Joueur gagne normal :          2 × mise (mise + gain)
Push (égalité) :               1 × mise (remboursé)
Joueur bust :                  0 (perte de mise)
Croupier bust :                2 × mise
```

#### Actions Disponibles

**2 Cartes**
- **Hit** : Tirer 1 carte supplémentaire
- **Stand** : Arrêter, comparer au croupier
- **Double Down** : Doubler la mise, tirer exactement 1 carte (fin de main)
  - Condition : Uniquement avec 2 cartes initiales
  - Ex : Joueur A-10, mise 50 → double à 100, tirer 1 carte → fin

**Pas de Split** (MVP v1)
- Pas de possibilité de diviser une paire (ex : 8-8 → deux mains séparées)
- Développement futur

#### Gameplay Typique

1. **Entrer la Mise** : 10-1000 jetons
2. **Cartes Distribuées** : Joueur 2 cartes (visibles), croupier 1 visible + 1 cachée
3. **Décision du Joueur** :
   - Hit → nouvelle carte affichée (valeur mise à jour)
   - Stand → fin de l'action du joueur
   - Double (si 2 cartes) : Mise × 2, 1 carte bonus, fin
   - Bust (> 21) ? → Perte instantanée, pot perdu
4. **Le Croupier Joue** : Hit jusqu'à ≥ 17
5. **Résultat Affiché** : Mains comparées, payout calculé
6. **Balance Mise à Jour** : Ajout gain ou débit perte

#### Stratégie Basique (Conseil Joueur)

**Hard Hands (pas d'As compté 11):**
```
8-11:     Toujours double (sauf très faible dealer)
12:       Hit sauf dealer 4-6 → Stand
13-16:    Hit vs dealer 7+ ; Stand vs 2-6
17+:      Toujours Stand
```

**Soft Hands (As = 11):**
```
A+2, A+3: Hit
A+4, A+5: Double si dealer 4-6, sinon Hit
A+6:      Double si dealer 3-6, sinon Hit (soft 17)
A+7:      Stand vs 2,7,8; Double vs 3-6; Hit vs 9-K
A+8, A+9: Toujours Stand
```

### 5.2 ROULETTE EUROPÉENNE

#### Objectif
- Parier numéro/couleur/section → Roue tourne → Match résultat

#### Roue & Numéros

**Roue**
- 37 cases: 0 (vert) + 1-36 (rouge/noir)
- Classement physique: Ordre spécifique (wheel order constant)

**Numérotation Rouge/Noir** (Mnemonic)
```
Rouge: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
Noir: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
Vert: 0
```

**Sections**
- **Douzaine**: 1st (1-12), 2nd (13-24), 3rd (25-36)
- **Colonne**: Col 1 (1,4,7,...34), Col 2, Col 3
- **Pair/Impair**: 1-36 (pair skip 0)
- **Haut/Bas**: Low (1-18), High (19-36)

#### Types de Paris

| Type | Coverage | Payout | Exemples |
|------|----------|--------|----------|
| **Straight** | 1 numéro | 36:1 | Parier "17" |
| **Split** | 2 numéros adjacents | 18:1 | "16-17" ou "0-1" |
| **Street** | 3 numéros en ligne | 12:1 | "1-2-3" |
| **Corner** | 4 numéros carré | 9:1 | "1,2,4,5" |
| **Six Line** | 6 numéros 2 lignes | 6:1 | "1-2-3-4-5-6" |
| **Dozen** | 12 numéros (1-12, 13-24, 25-36) | 3:1 | "First dozen" |
| **Column** | 12 numéros colonne | 3:1 | "Col 1" |
| **Red/Black** | 18 numéros couleur | 2:1 | "Red" |
| **Even/Odd** | 18 numéros pair/impair | 2:1 | "Odd" |

**Payout Calcul**
```
Win = Mise × Multiplicateur
Remboursement = Mise + Win
Perte = 0 (mise perdue si lose)
```

#### Limites

| Limite | Valeur |
|--------|--------|
| Min Bet / Ligne | 10 jetons |
| Max Bet / Ligne | 750 jetons |
| Max Stake Total | 5000 jetons (toutes lignes confondues) |
| Max Bets/Spin | 40 paris |

#### Stratégies Courantes

**Martingale** (non-recommandée):
- Double bet après perte → stop après win
- Risque: Streak perdu peut créer énorme bet final (bust bankroll)

**D'Alembert**:
- +1 bet unit après perte, -1 après win
- Plus stable mais edge toujours -2.7% (0 kills maison avantage)

**Outside Bets Seulement**:
- Rouge/Noir/Pair/Impair (nearly 50% win, 2:1 payout)
- Lower variance, longer sessions

**Gestion Bankroll**:
- Limit session to 5-10 buyin
- Quit ahead (win limit 20-30% bankroll)
- Never chase losses

### 5.3 SLOT MACHINE

#### Objectif
- Spin 3 rouleaux → match symboles → win jetons

#### Symboles & Poids

| Symbole | Poids | Fréquence | Gain (3 identiques) |
|---------|-------|-----------|-------------------|
| Cerise | 32 | 32% | 5× mise |
| Citron | 24 | 24% | 8× mise |
| Cloche | 18 | 18% | 10× mise |
| Sept | 14 | 14% | 15× mise |
| Diamant | 8 | 8% | 20× mise |

**Total poids: 96 (pairwise distribution)**

#### Règles de Payout

**3 Identiques (Brelan)**
```
Winnings = Mise × Multiplicateur (symbol-dependant)
Remboursement = Mise + Winnings
Exemple: 50 jetons × 10 (Bell) = 500 remboursé
```

**2 Identiques (Paire)**
```
Winnings = 1× Mise (remboursement mise seulement)
Exemple: 50 jetons paire = 50 jetons remboursé (no profit, break-even)
```

**Aucun Match**
```
Loss = Mise perdue entièrement
```

#### Limites

| Paramètre | Valeur |
|-----------|--------|
| Min Bet | 10 jetons |
| Max Bet | 1000 jetons |
| Max Bet (Niveau ≤ 25) | Progressif (500 niveau 1 → 1000 niveau 25+) |

#### RTP (Return to Player) Théorique

```
RTP = (Sum of all payouts) / (Sum of all bets)
Quantum Bluff Slot: ~88-92% (standard)
Meaning: Over infinite spins, expect lose 8-12% edge house
```

#### Stratégies

**Bankroll Management**:
- Spin limit: Session max 50 spins
- Win target: 30-50% bankroll profit → quit
- Bet sizing: 1-2% bankroll per spin (prevents ruin)

**Symbol Frequency**:
- Cherry (32%) vs Diamond (8%) highly différence
- Low variance/high hit: Cherry + Lemon
- High variance/potential: Diamond only

**No "Hot Streak"**:
- RNG crypto → chaque spin independent
- Passé results n'influence future
- Ne pas "double down" après losses (sauf stratégie)

### 5.4 Accès Jeux Casino

#### Depuis Lobby
1. Onglet "MINIGAMES" → Sélectionner Roulette/Slots/Blackjack
2. Click jeu → redirect à page (Black jack → auto-create solo game)

#### Balance Wallet
- Balance affichée en haut page
- Mise saisie: Auto-validate insuffisance jetons
- Post-spin: Balance updated (live) + ledger enregistré

#### Historique

**Ledger Entries (visible Wallet)**
- Type: "ROULETTE_SPIN", "SLOT_SPIN", "BLACKJACK_HAND"
- Montant: ±chips
- Timestamp: Heure UTC spin
- Game ID: Référence

**Stats Personnelles**
- Biggest win roulette/slot/blackjack
- Total hands blackjack
- Win rate par game

---

## 6. SYSTÈME DE PROGRESSION & RÉCOMPENSES

### 6.1 Niveaux & XP

#### Système XP

**Seuil par Niveau**
```
Formula: XP_threshold(L) = 50 × L × (L - 1)

Niveau 1: 0 XP (start)
Niveau 2: 100 XP
Niveau 3: 300 XP (200 XP depuis Lvl 2)
Niveau 4: 600 XP (300 XP depuis Lvl 3)
Niveau 5: 1000 XP (400 XP depuis Lvl 4)
...
Niveau 99: 482,550 XP (max level)
```

**Progression Joueur**
- Total XP tracké (cumulative)
- Niveau automatiquement calculé (live)
- XP to Next: UI affiche progrès barre

**Max Niveau**
- Plafond: Niveau 99
- Pas d'XP après Lvl 99 (ou counts mais pas utilisé)

#### Sources d'XP

| Source | XP Reçu | Condition |
|--------|---------|-----------|
| **Poker Hand (Bot)** | 12 | Preflop joué sans fold |
| **Poker Hand Win (Bot)** | +20 | Win hand vs bots |
| **Poker Showdown Win** | 35 | Cash/tournament showdown win |
| **Poker Showdown Loss** | 10 | Showdown participated (not winning) |
| **Slot Spin** | 4 | Chaque spin (win ou lose) |
| **Slot Win Bonus** | +8 | Win match (paire+ symboles) |
| **Roulette Spin** | 4 | Chaque spin |
| **Roulette Win Bonus** | +10 | Win roulette pari |
| **Blackjack Hand** | 5 | Chaque main jouée |
| **Blackjack Win** | +10 | Hand gagnée |
| **Login Streak** | 5/day | Chaque jour nouvelle session |

#### Badges - Déblocage par Niveau

| Badge | Niveau Requis | Description |
|-------|--------------|-------------|
| Novice | 2 | Nouveau joueur |
| Joueur | 3 | Habitué des tables |
| Bluffeur | 5 | Sens du jeu et du faux jet |
| Stratège | 7 | Lecture de table |
| High Roller | 10 | Style grosses enjeux |
| Expert | 12 | Maîtrise avancée |
| Élite | 15 | Rang d’élite |
| Maître | 18 | Maîtrise complète |
| Champion | 22 | Réussite de haut niveau |
| Légende | 25 | Statut mythique |

**Déblocage Automatique**
- Atteindre seuil niveau → badge instantanément added
- Historique: Affichage date unlock profile

**Affichage Badges**
- Profil public: Tous badges visibles
- Leaderboard: Badge highest affichée beside name
- Lobby widgets: Recent unlock toast

### 6.2 Limites de Mise par Niveau

#### Casino Games Max Bets

**Blackjack**
```
Max Bet = 1000 jetons (fixe tous niveaux)
```

**Slot Machine**
```
Niveau 1: 500 jetons
Niveau 5: 600 jetons
Niveau 15: 850 jetons
Niveau 25+: 1000 jetons (plafond)
Formula: base=500, span=500, t=(L-1)/24 capped [0,1]
```

**Roulette**
```
Max par Ligne: 750 jetons (fixe)
Max Total Stake: 5000 jetons (toutes mises confondues)
```

#### Poker Cash Games

**Blinds Disponibles** (par niveau)
```
Niveau 1: 5/10, 10/20
Niveau 5: 5/10, 10/20, 25/50
Niveau 10: 5/10, 10/20, 25/50, 50/100
Niveau 15+: Tous blinds disponibles
```

**Min Balance Requis** (table dépendant)
```
Table demande: Min balance = 2× BB (ex: 50/100 → 200 jetons min)
Vérification server-side avant join
```

### 6.3 Daily Challenges & Login Streak

#### Daily Challenges (Défis Quotidiens)

**Reset**
- Minuit UTC chaque jour
- Nouveau challenge automatiquement assigné
- Max 1 challenge actif par jour

**Exemples**
- "Win 3 poker hands vs opponents"
- "Spin roulette 5 times"
- "Play 2 blackjack hands"
- "Complete 1 full poker tournament"

**Récompense**
- Bonus XP: +25 XP (si complété)
- Bonus chips: +100-200 jetons (optional, vary)
- Visible dashboard lobby (progress bar)

**Affichage**
- Card widget: Challenge texte + progression (ex: "2/3 wins")
- Countdown: Temps avant reset
- Complete notification: Toast "Challenge completed!"

#### Login Streak

**Mécanique**
- Jour 1 login: Streak = 1
- Jour 2 login (< 24h après jour 1): Streak = 2
- Jour 3 login (< 24h après jour 2): Streak = 3
- Manquer jour: Streak reset à 1

**Rewards Streak**
```
Jour 1: 5 XP
Jour 2: 10 XP
Jour 3: 15 XP
Jour 4: 20 XP
Jour 5: 25 XP (cap)
```

**Affichage**
- Profile page: Streak counter ("X day streak")
- Lobby dashboard: Calendar visual (checked days)
- Notification: Streak maintained/reset alert

### 6.4 Récompenses Casino & Poker

#### Cash Game Rewards
- Chips gagnés: Transféré directement balance
- XP: Via formule par action
- Pas de bonus fixed (autre than XP)

#### Tournament Rewards

**Distribution Prizes** (structurée)
- Customizable par créateur tournoi
- Typical: Top 3 guaranteed, remaining diluted
- Exemple 128 joueur turnamen:
  - 1st: 5000 chips
  - 2nd: 3000 chips
  - 3-6: 1200 jetons
  - 7-15: 500 jetons
  - Rest: Niente

**Bonus XP Tournoi**
```
Élimination round 1-4: +10 XP × (numéro du round)
Placement top 10: +50 XP
1ère place: +100 XP (cumulatif)
```

---

## 7. INTERACTIONS SOCIALES

### 7.1 Système d'Amis

#### Ajouter un Ami

**Recherche Utilisateur**
1. Onglet "Friends" → "Find Friends" search bar
2. Taper username ou email (partial search supported)
3. Résultats affichent user card: Avatar, Level, Stats, Action button

**Envoyer Requête**
- Click "Add Friend" button
- État change "Request Sent"
- Notification côté destinataire: Toast + badge Friends tab

**Acceptance**
- Destinataire: Friends tab → "Pending Requests"
- Accept/Decline buttons
- Si accept: Bidirectional friendship créée
- Si decline: Request removed, pas d'amitié

#### Gestion Liste Amis

**Affichage**
- Avatar, Username, Level, Status (Online/Offline/Playing)
- Filtre: Online/Offline/All
- Sort: Recent, Oldest, Alphabetical

**Actions**
- Click ami → profile popup (stats, level, join game)
- "Invite to Game" → invite table/tournament
- "Block" → utilisateur blocked (no further contact)
- "Remove Friend" → friendhip deleted
- "Message" → opens DM chat

### 7.2 Système de Messages Privés

#### Envoyer Message

1. Click ami → open chat panel
2. Saisir texte message
3. Click send ou appuyer Enter
4. Message livré (queue live socket)

**Règles Messages**
- Max 500 chars per message
- Link censoring: URLs rewritten ou removed (anti-spam)
- Timestamp affiché: Heure UTC
- Seen status: "Delivered" / "Seen"

#### Chat History
- Conversations anciennes loaded (pagination)
- Limite: Derniers 100 messages per conversation
- Clear history: Bouton purge (irreversible)

#### Notifications
- Friend login: Toast "X came online"
- New message: Toast + badge Friends tab
- Sound alert: Optional (settings control)

### 7.3 Système de Prêts Entre Amis

#### Concept
- Joueur A prête chips à Joueur B
- Taux intérêt annuel configuré
- Remboursement: B paie principal + intérêt
- Automatique: Portion gains repayment deducted

#### Créer un Prêt

**Dialog "Request Loan"**
1. Sélectionner ami emprunteur
2. Montant principal (ex: 500 jetons)
3. Taux remboursement choix (10%, 15%, 20%, 25%, 30%, 40%, 50%)

**Taux d'Intérêt Annuel** (basé remboursement taux)
```
Remboursement % | Intérêt Annuel %
10%             | 30%
15%             | 24%
20%             | 18%
25%             | 14%
30%             | 10%
40%             | 7%
50%             | 5%
```

**Calcul Montant Due**
```
Total Due = Principal + (Principal × Interest% / 100)
Exemple: 500 principal @ 20% rate (18% annual)
Interest = 500 × 18 / 100 = 90 jetons
Total Due = 590 jetons
```

**Frais Validation**
- Prêteur balance ≥ principal (sinon error `INSUFFICIENT_CHIPS`)
- Emprunteur accepte terms

#### Gestion Prêts

**Status Prêt**
- **PENDING**: Emprunteur not yet accepted
  - Emprunteur: Requête notification, Accept/Decline buttons
  - Prêteur: Attendre réponse
  
- **ACTIVE**: Prêt en cours
  - Timer: Montrer intérêt accumulé (live calc)
  - Remaining Due: Principal + intérêt accumulé actuel
  - Gain monitoring: Emprunteur gains trackés (auto-repay détecté)
  
- **REPAID**: Fully settled
  - Historique: Visible dans loan history
  - Date/Montants affichés

- **CANCELLED**: Annulé
  - Par prêteur avant acceptance
  - Jetons retournés prêteur

#### Remboursement Automatique

**Mécanique**
1. Emprunteur joue & gagne chips
2. Gain calcul: Payout - Buy-in
3. Repayment slice = Gain × (Taux remboursement %) / 100
4. Slice caps at remaining due
5. Slice autom déduit, prêteur reçoit

**Exemple**
```
Loan: 500 principal, 20% repayment rate (18% annual)
Total Due initially: 590 jetons
Emprunteur joue hand:
  - Bet 50, win 200 → Gross gain = 150 jetons
  - Repayment slice = 150 × 20% = 30 jetons
  - Balance after auto-repay: 150 - 30 = 120 jetons (new balance)
  - Prêteur reçoit: +30 jetons
  - Remaining Due: 590 - 30 = 560 jetons

Prochaine win:
  - Bet 100, win 300 → Gross = 200
  - Slice = 200 × 20% = 40
  - Remaining Due: 560 - 40 = 520 jetons
```

**Limites**
- Max 1 prêt actif par emprunteur (cannot stack)
- Max montant: Prêteur balance (min check)
- Min montant: 10 jetons
- Auto-repay stop: Emprunteur balance = 0 (no more slices possible)

#### Historique Prêts

**Loans Panel**
- List all prêts (active + closed)
- Filtre: Active/Completed
- Détails: Principal, Taux, Intérêt accumulé, Total Due, Status
- Timeline: Date ouvert/repaid

### 7.4 Invitations & Joins

#### Inviter Ami à Table

**Method 1: Depuis Table**
1. Créer/rejoindre table
2. Menu → "Invite Friend"
3. Sélectionner ami
4. Invitation envoie (direct message + notification)

**Method 2: Depuis Friends Panel**
1. Click ami → Profile popup
2. Button "Invite to Game"
3. Sélect game/table (si multiples)
4. Envoyer invitation

#### Accepter Invitation
- Notification toast: "X invited you to [Table Name]"
- Click → auto-navigate table lobby
- Join button active (si siège dispo)

#### Bloquer / Unblock

**Bloquer Utilisateur**
1. Friends tab → Action menu utilisateur
2. Click "Block"
3. Utilisateur blocked: Cannot message, invite, send requests

**Unblock**
- Friends tab → "Blocked Users" list
- Click user → "Unblock"
- Blocker cleared, normal interaction restored

---

## 8. GESTION DU PORTEFEUILLE

### 8.1 Balance & Chips

#### Affichage Balance
- **Header top**: Chips counter prominent (ex: "12,450 chips")
- **Games**: Updated live post-hand
- **Sync**: Auto-fetch server every 30 sec (ensures correctness)

#### Historique Transactions

**Ledger Types**
```
POKER_CASH_GAME     Poker cash win/loss
POKER_TOURNAMENT    Tournament payout
BLACKJACK_HAND      Blackjack spin result
ROULETTE_SPIN       Roulette spin result
SLOT_SPIN           Slot spin result
HIDDEN_BET_SETTLED  Hidden bet (prop bet) settled
GIFT_CODE_REDEEMED  Gift code bonus
PROMO_CODE_REDEEMED Promo code bonus
FRIEND_LOAN_CREATED Loan principal debit (lender) or credit (borrower)
FRIEND_LOAN_REPAID  Auto-repay debit (borrower) or credit (lender)
```

**Détails Affichés**
- Type: Catégorie transaction
- Montant: ±chips
- Timestamp: UTC time
- Game ID: Reference jeu (si applicable)
- Balance Before/After: Solde avant et après

#### Rechargement Gratuit

**Promo Code: QUANTUM**
- Défaut dev/staging (peut être changé prod)
- Ajoute 1000 jetons
- Cooldown: 24 heures entre utilisations
- Button "Free Recharge" lobby si disponible

**Validation**
- Server-side validation (anti-exploit)
- Une fois/jour par user
- Jetons ajoutés directement balance

### 8.2 Cheat Prevention

#### Validations Server
- Balance check pré-action (insuffisance chips reject)
- Mise validation: Min/max caps contrôlés
- RNG crypto: Tous résultats game proviennent RNG serveur
- Ledger immutable: Transactions enregistrées irreversibly

#### Rate Limiting
- API endpoints throttled (prevent abuse)
- Websocket message queuing (limit Flood)
- Login attempts: Max 5/minute per IP (account protection)

---

## 9. CONSEILS & STRATÉGIES

### 9.1 Poker - Conseils Fondamentaux

#### Position Importance
**Early Position (UTG, UTG+1)**
- Play tight: Top 15% mains (AA, KK, QQ, AK)
- Avoid marginal hands
- Raison: Beaucoup joueurs à agir après = high chance meilleur main vs toi

**Middle Position (MP1, MP2)**
- Étendu légèrement: Top 20% mains
- Include mid-pairs (TT, JJ), good aces (AJ+)

**Late Position (CO, Button)**
- Widen range: Top 30% mains, plus combos (suited connectors)
- Steal blinds with wide range if aggressive image
- Advantage: Agir dernier postflop

**Blind Positions (SB, BB)**
- Défendre: Call raises avec wider range
- BB: Check option si personne raise (free look flop)
- SB: Réductive range (2nd position inconfort)

#### Bet Sizing
- **Preflop raise**: 3-3.5× BB (standard)
- **Postflop bet**: 50-75% pot
- **Relance**: Min 1× précédent bet
- **All-in**: Only quand necesary (short stack, premium hand)
- **Bluff**: Moins fréquent early stages; augmente deep stacks

#### Fold Equity & Showdown Value
- **Fold equity**: Chance adversaire fold vs bluff
- **Showdown value**: Hand strength absolute (high card pair+)
- Mix bluffs et value bets pour balance
- Tight image = bluffs work better; loose image = need value

#### Bankroll Management
- Never play above comfort level
- Min 20 buyins cash game, 50 tournoi
- Stop loss: Walk away après perte fixed amount (ex: 5 buyins)
- Win rate tracking: Know expect hourly profit

### 9.2 Casino - Variance & Expectation

#### Slots - House Edge
- RTP ~90%: Average lose 10% jetons long term
- Volatility haute: Variance significante (big wins/losses normal)
- Sessions courtes: Profiter randomness (lucky days possible)
- Never chase: Pertes passées ne predisent futures

#### Roulette - Edge Math
- House edge: 2.7% (zéro unique)
- Tous paris: Même house edge (pas "better" bets)
- Trends non-existent: Chaque spin indépendent
- Martingale risk: Losing streaks create unfunded bets

#### Blackjack - Basic Strategy Valeur
- Basic strategy: Réduit house edge ~0.5%
- Card counting impossible (shoes reshuffled constantly)
- Insurance: Avoid (mauvaise EV long term)
- Soft 17: Hit A+6 vs dealer (not stand)

### 9.3 Leveling Efficiently

#### XP Optimal Farm
1. **Bot Tables**: 12 XP/hand (reliable, available always)
2. **Roulette Spins**: 4 XP + 10 potential (if win)
3. **Slot Spins**: 4 XP + 8 potential (if win)
4. **Cash Games**: High variance, but 35 XP per win

#### Progression Timeline
```
Level 1-5: Bot tables (quick learning, easy XP)
Level 5-15: Mix cash games + casino (XP plateau, but socializing)
Level 15+: Focus cash/tournaments (higher stakes, better peers)
```

#### Daily Routine
1. Login: +5 XP streak
2. Daily challenge: +25 XP (if completed)
3. 10 bot hands: +120 XP
4. Few roulette spins: +40-60 XP
5. Total: ~200 XP/day (conservative)

### 9.4 Gestion Bankroll

#### Allocation Stratégie
```
Total Balance: 10,000 jetons
Cash Games (60%): 6000 jetons → 20 buyins @ 300
Casino (20%): 2000 jetons → 200 spins @ 10 avg
Tournaments (20%): 2000 jetons → 2-4 tournois @ 500-1000
```

#### Risk Management
- Never play bankroll entier une session
- Max loss/session: 10-20% bankroll
- Win target: 30-50% session → leave table
- Track win rate: Adjust blind/stake level if downswing

#### Regain from Losses
- Reduce stakes (move down blind levels)
- Increase casino play (higher RTP odds)
- Focus bot tables (consistent XP, minimize variance)
- Ask friend loan if motivated (pay back via winning)

### 9.5 Milestones & Checkpoints

| Niveau | Milestone | Badges |
|--------|-----------|--------|
| Lvl 1-3 | First 100 hands poker | Novice → Joueur |
| Lvl 5 | First big win casino | Bluffeur |
| Lvl 10 | First tournament cash | High Roller |
| Lvl 15 | 1000 total XP | Élite |
| Lvl 25 | 5000 total XP | Légende |
| Lvl 50 | 50,000 XP cumulée | Progression XP (plafonds casino montent encore) |

---

## 10. TUTORIEL INTERACTIF & AIDE

### 10.1 Démarrage Guidé (First-Time Experience)

**Déclenchement automatique:**
- À votre première connexion après inscription, un tutoriel s'affiche automatiquement
- Lancé 450ms après entrée au lobby pour laisser l'interface charger
- Vous n'êtes **pas obligé** de le suivre — vous pouvez le sauter à tout moment

**Durée & Difficulté:**
- 13 étapes du lobby + 8-10 étapes de partie (optionnel)
- Durée totale: environ 5-8 minutes
- Aucune mécanique complexe — introduction douce aux concepts clés

### 10.2 Tutoriel du Lobby (13 étapes)

Le spotlight pédagogique vous guide à travers chaque zone:

| Étape | Zone Surlignée | Apprentissage |
|-------|---|---|
| 1 | Welcome | Bienvenue & objectifs du jeu |
| 2 | Header | Navigation supérieure (profil, settings) |
| 3 | Onglets | Poker / Minigames / Blackjack |
| 4 | Bot Practice | Entraînement seul contre IA |
| 5 | Multiplayer | Rejoindre tables vraies joueurs |
| 6 | Waiting Rooms | Comprendre listes d'attente |
| 7 | Games in Progress | Spectate parties en live |
| 8 | Minigames | Roulette & Slots rapides |
| 9 | Blackjack | Jeu 21 solo & multijoueur |
| 10 | Daily Challenges | Défis quotidiens pour XP |
| 11 | Friends | Liste amis & messages privés |
| 12 | Done | Résumé & fin du tuto lobby |

**Contrôles:**
- **Suivant**: Bouton avec chevron droit → avance étape
- **Précédent**: Bouton avec chevron gauche → revient arrière
- **Sauter**: Bouton × → ferme et continue en libre

### 10.3 Tutoriel de Partie (Optionnel)

**Accès:**
- Proposé à la fin du tutoriel lobby (bouton "Suivant : ta première main")
- Ou retrouvez-le via bouton **?** en haut du lobby

**Contenu:**
- Partie de poker heads-up complète contre un bot scriptée
- Vous êtes BTN+SB, le bot est BB
- Main de poker entièrement guidée (preflop → flop → turn → river → showdown)

**Étapes type :**
1. Règles des blinds (expliqué visuellement)
2. Vos cartes fermées (K♠Q♠)
3. Action preflop (vous décidez : fold/check/raise)
4. Bot répond automatiquement
5. Flop → cartes communautaires révélées
6. Votre action au flop (check/bet/raise)
7. Turn et River (même système)
8. Showdown — comparaison des mains et classements
9. Votre classement affiché (ex : "Paire de Rois")

**Spotlight pédagogique:**
- Zones surlignées: pot, cartes hero, cartes bot, actions, tableau des classements
- Textes explicatifs détaillés pour chaque concept
- Vous ne pouvez progresser que si vous cliquez l'action attendue

**Fin:**
- Bouton vert **TERMINER** après showdown
- Vous êtes ramené au lobby
- Tutoriel marqué comme "complété" côté serveur

### 10.4 Accéder au Tutoriel Plus Tard

**Depuis n'importe où (Lobby ou Partie):**
- Cherchez le **bouton circulaire violet avec icône ?** en **bas à gauche** de l'écran (fixed position)
- Clic → ouvre une modal d'aide avec sections détaillées
- Accessible partout: lobby, pendant partie, spectate, etc.
- Fermer: Cliquez "Compris !" button ou cliquez en dehors modal

**Paramètres (Settings) :**
- Bouton de paramètres en haut du lobby
- Accède aux réglages Audio, Esthétique, Accessibilité
- Vous pouvez aussi noter le jeu depuis là (voir section 11)

### 10.5 Conseils pour le Tutoriel

- **Suivez à votre rythme** — pas de limite de temps par étape
- **Cliquez sur la zone surlignée** si vous voulez voir plus de détails
- **Revenez en arrière** avec le bouton "Précédent" si vous avez manqué quelque chose
- **Après le tutoriel**, le jeu est déverrouillé — jouez sans restrictions
- **Rejouez quand vous voulez** — le tutoriel est répétable depuis le lobby

---

## 11. FEEDBACK & NOTATION DU JEU

### 11.1 Système de Notation

**Pourquoi noter?**
- Nous collectons votre feedback pour améliorer le jeu
- Vos notes & commentaires aident notre équipe de dev
- Chaque évaluation est prise au sérieux

**Déclenchement automatique:**
- Après chaque **5ème partie complétée** (5, 10, 15, 20... parties)
- Modal léger s'affiche à la fin de partie
- Complètement optionnel — vous pouvez toujours répondre "Plus tard"

**Anti-spam:**
- Chaque partie est comptabilisée une seule fois (pas de doublon même avec multi-onglets)
- Vous n'êtes sollicités qu'une fois tous les 5 matchs

### 11.2 Modal "Noter le Jeu"

**Apparence :**
```
┌─────────────────────────────────────┐
│  NOTER LE JEU                       │
├─────────────────────────────────────┤
│  Vous aimez Quantum Bluff ?         │
│                                      │
│  [☆][☆][☆][☆][☆]                   │  1-5 étoiles (cliquables)
│                                      │
│  Commentaire (optionnel) :          │
│  [Votre avis sur le jeu...]         │  max 2000 caractères
│                                      │
│  [Plus tard]      [Envoyer]         │
└─────────────────────────────────────┘
```

**Étapes :**
1. **Sélectionner une note** : Cliquez 1 à 5 étoiles (5 = excellent)
   - Les étoiles se remplissent en doré
   - Vous pouvez changer avant de soumettre
   
2. **Ajouter un commentaire** (facultatif) :
   - Zone texte pour vos remarques
   - Limité à 2000 caractères
   - Suggestions : "J'aime le poker mais il y a un bug au blackjack", "Interface claire et fluide", etc.
   
3. **Soumettre ou reporter** :
   - **Envoyer** : Valide et envoie vos données
   - **Plus tard** : Ferme le modal (vous serez ressollicité dans 5 matchs)

### 11.3 Notation Manuelle (Paramètres)

**Accès :**
- Depuis n'importe où : cliquez le bouton Paramètres (Settings)
- Modal Paramètres s'ouvre avec 3 onglets : Esthétique, Audio, Accessibilité
- **En bas du modal** : Bouton pour noter le jeu

**Différences :**
- Pas de déclenchement automatique
- Même modal de notation s'affiche
- Vous pouvez noter autant de fois que vous le souhaitez manuellement

### 11.4 Ce que Nous Faisons avec Vos Notes

**Stockage:**
- Vos notes sont envoyées à `/api/feedback/game-rating`
- Stockées sécurisées côté serveur (associées à votre compte)
- Jamais partagées publiquement

**Analyse:**
- **Ratings globaux**: moyenne générale (ex: "4.8/5 stars")
- **Tendances**: suivi dans le temps (si rating baisse, on enquête)
- **Commentaires**: lus manuellement par l'équipe support

**Actions:**
- Rating ≤ 2 stars + commentaire → priorité support (on vous contacte)
- Feedback négatif répété → analyse bugs
- Feedback positif → motivation de l'équipe & roadmap

### 11.5 FAQ Notation

**Q: Mes notes sont-elles anonymes?**
A: Non, elles sont associées à votre compte. Mais votre feedback est respecté & jamais utilisé contre vous. Soyez honnête!

**Q: Je peux changer d'avis après avoir noté?**
A: Actuellement non (une note = définitive). Mais si vous avez un retour, contactez support & nous corrigerons.

**Q: 5 étoiles obligatoire?**
A: Vous devez noter au moins 1 étoile pour soumettre. Mais rien ne vous oblige à être enthousiaste — 2-3 étoiles critiques nous aident aussi!

**Q: Et si j'ai un bug à signaler?**
A: Notes < 3 stars avec description détaillée → incluez: nom du bug, quand ça s'est produit, et comment le reproduire.

---

## GLOSSAIRE

- **All-in**: Engager tous chips restants
- **Blind**: Mise forcée petite/grosse avant cartes
- **Bluff**: Miser main faible espérant fold adversaires
- **Buy-in**: Montant chips pour jouer table
- **Bust**: Dépasser 21 au blackjack
- **Call**: Égaliser mise
- **Chip**: Unité monnaie jeu virtuel
- **Flop**: 3 premières cartes communautaires
- **Fold**: Abandonner main
- **Head-up**: Poker 2-joueurs
- **Kicker**: Carte non-appariée assist au tie-break
- **Level**: Progression joueur (1-99)
- **Pot**: Montant chips au centre (accumulé)
- **Raise**: Augmenter mise
- **River**: 5ème dernière communautaire
- **Showdown**: Cartes révélées, winner déterminé
- **Soft Hand**: Main avec As compte 11
- **Stack**: Total chips joueur
- **Street**: Round action (preflop, flop, turn, river)
- **Turn**: 4ème communautaire
- **Wallet**: Balance personnelle jetons

---

## SUPPORT & DÉPANNAGE

### Questions Fréquemment Posées

**Q : Mot de passe oublié ?**  
R : Menu Auth → « Mot de passe oublié » → répondre à la question de sécurité → définir un nouveau mot de passe

**Q : Où trouver mon avatar ?**  
R : Profil → Modifier → section Avatar (téléverser une image)

**Q : Comment débloquer toutes les blindes ?**  
R : Progression du niveau (niveau 15+ débloque toutes les blindes)

**Q : Peut-on annuler un prêt entre amis ?**  
R : Le prêteur peut annuler si l’emprunteur n’a pas encore accepté.  
Sinon : le remboursement automatique continue jusqu’au règlement complet

**Q : Le RNG est-il équitable ?**  
R : RNG cryptographique côté serveur, non côté client, avec seed vérifiée

### Contacter le Support
- **Email** : support@quantumbluff.com

---

## VERSION & JOURNAL DES MODIFICATIONS

**Version** : 1.0 (MVP)  
**Date** : Mai 2026  
**Dernière mise à jour** : 2026-05-16

### Fonctionnalités Implémentées
- Parties de poker cash game & tournois
- Blackjack solo + multijoueur
- Roulette & Machines à sous
- XP/Niveaux/Badges
- Amis & Messages
- Prêts entre amis
- Classements
- Applications mobiles (iOS/Android via Capacitor)

### À venir prochainement
- 2FA (Authentification à deux facteurs) – Backend implémenté, interface en cours
- Option Split au Blackjack
- Plus de jeux de casino (Baccarat, Craps)
- Vidéo poker
- Variantes de poker (Omaha, Stud)
- Système de clans/équipes
- Tournois en direct
- Système de sponsoring

---

## FIN DU GUIDE UTILISATEUR

*Document complet généré pour les nouveaux et anciens utilisateurs. À partager largement et à mettre à jour régulièrement avec les nouvelles fonctionnalités.*