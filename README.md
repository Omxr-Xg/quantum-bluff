# DOCUMENTATION TECHNIQUE ET ERGONOMIQUE - QUANTUM BLUFF
VERSION 1.0.0 - ÉTAT : PRODUCTION RÉEL

# INTRODUCTION DU SYSTÈME
Quantum Bluff est une plateforme logicielle de Poker Texas Hold'em haute fidélité, conçue pour offrir une expérience analytique augmentée. Le système se distingue par l'intégration d'un moteur de calcul de probabilités en temps réel et d'une interface utilisateur optimisée pour la prise de décision sous pression temporelle. Le projet respecte les standards industriels en termes de développement front-end et d'ingénierie des interfaces homme-machine (IHM).

# 1. ARCHITECTURE TECHNIQUE ET STACK LOGICIELLE
Le développement repose sur une pile technologique moderne garantissant performance, maintenabilité et typage rigoureux :

Environnement d'exécution : React 18.3.1 avec TypeScript pour une gestion stricte des interfaces de données.

Pilotage du routage : React Router v7 utilisant le Data Mode Pattern pour une gestion fluide des états de navigation.

Moteur de rendu CSS : Tailwind CSS v4 assurant une cohérence visuelle via un système de design atomique.

Bibliothèque d'animations : Motion (Framer Motion) pour des transitions d'états fluides et un feedback utilisateur organique.

Gestion d'état global : API Context de React pour la persistance des configurations d'accessibilité et des sessions utilisateurs.

# 2. CADRE ERGONOMIQUE ET LOIS DE CONCEPTION
L'interface a été auditée selon les critères d'ergonomie cognitive pour maximiser l'efficience de l'interaction :

Optimisation de la Loi de Fitts : Les zones d'interaction critiques, notamment le panneau de contrôle de jeu (Fold, Call, Raise), sont dimensionnées à 145px de largeur et positionnées en bas de l'écran pour minimiser la distance de déplacement du pointeur.

Application de la Loi de Hick : La structure décisionnelle du Lobby réduit le nombre d'options simultanées, minimisant ainsi le temps de réaction de l'utilisateur face à des choix multiples.

Divulgation Progressive (Progressive Disclosure) : Les informations complexes, telles que les probabilités détaillées du Quantum HUD ou les paramètres avancés de serveur, sont masquées par défaut et accessibles uniquement à la demande pour éviter la surcharge cognitive.

Visibilité de l'état du système : Utilisation systématique de feedbacks visuels (états de survol, barres de progression, indicateurs de tour) pour informer l'utilisateur de l'évolution de la partie en temps réel.

# 3. PARCOURS UTILISATEUR ET FONCTIONNALITÉS PAGES
L'application est décomposée en modules fonctionnels distincts :

Module d'authentification : Formulaires d'inscription et de connexion incluant une validation sémantique temps réel, des indicateurs de force de mot de passe et des mécanismes de prévention d'erreurs (toggles de visibilité).

Module Lobby : Centre de décision permettant la redirection vers les modes Bot ou Serveur, conçu pour une navigation sans friction.

Module de Configuration : Interface de gestion de serveurs incluant des contrôles hybrides (sliders et inputs numériques) pour une précision de paramétrage optimale.

Interface de Jeu (Game Dashboard) : Table elliptique immersive intégrant le Quantum HUD, un système de chat avec émojis, et une gestion dynamique des tours de parole.

# 4. ACCESSIBILITÉ ET INCLUSIVITÉ (NORMES WCAG)
Quantum Bluff intègre une couche d'accessibilité native pour garantir une utilisation universelle :

Mode Daltonien : Substitution de l'information chromatique par une information de forme (Cercle, Losange, Carré, Triangle) sur les enseignes de cartes.

Feedback Multi-sensoriel : Alertes visuelles (flashs de bordure) pour les utilisateurs malentendants en remplacement des signaux sonores.

Contraste Étendu : Palette de couleurs "Poker Club Privé" optimisée pour un ratio de contraste supérieur aux normes minimales, assurant une lisibilité maximale en toutes circonstances.

# 5. STRUCTURE DU CODE SOURCE
`
.src
├── .app
│   ├── App.tsx (Configuration des Providers et du Router)
│   ├── routes.ts (Définition de l'architecture de navigation)
│   ├── .pages (Vues : Login, Register, Lobby, Game, etc.)
│   ├── .components (Composants UI réutilisables et atomiques)
│   └── .contexts (AccessibilityContext pour la gestion des modes)
├── .styles
│   ├── theme.css (Variables CSS, tokens de design, utilitaires)
│   └── fonts.css (Importation des typographies système)
└── .utils (Algorithmes de calcul, gestion des avatars et utilitaires)
`

# 6. PROCÉDURE DE DÉPLOIEMENT ET RÉFÉRENTIEL
Le projet suit un workflow d'intégration continue standard :
1. Installation des dépendances via `npm install`.
2. Lancement du serveur de développement via `npm run dev` pour le test des composants.
3. Build de production via `npm run build` générant un bundle optimisé et minifié.

# CONCLUSION TECHNIQUE
Quantum Bluff représente une solution logicielle robuste où l'ingénierie logicielle rencontre la psychologie cognitive. Chaque décision de design est étayée par une justification ergonomique, garantissant une plateforme non seulement esthétique, mais surtout performante et inclusive.