#!/usr/bin/env node
/**
 * Génère Docs/RAPPORT_COMPLET_QUANTUM_BLUFF.txt — rapport exhaustif du projet.
 * Usage : node scripts/generate-full-report.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'Docs/RAPPORT_COMPLET_QUANTUM_BLUFF.txt');

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'dist-electron', 'coverage', '.git', 'generated',
  'Game_Versions', '.cursor',
]);

function walk(dir, exts = null, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, exts, out);
    } else if (!exts || exts.some((x) => e.name.endsWith(x))) {
      out.push(full);
    }
  }
  return out.sort();
}

function rel(p) {
  return path.relative(ROOT, p);
}

function padLines(text, prefix = '') {
  return text.split('\n').map((l) => (l ? prefix + l : '')).join('\n');
}

const lines = [];
const emit = (s = '') => lines.push(s);

// ─── En-tête ───────────────────────────────────────────────────────────────
emit('================================================================================');
emit('                    RAPPORT TECHNIQUE COMPLET — QUANTUM BLUFF');
emit('================================================================================');
emit(`Date de génération : ${new Date().toISOString()}`);
emit('Dépôt              : quantum-bluff-monorepo');
emit('Public cible       : lecteur sans connaissance préalable du projet');
emit('Objectif           : compréhension intégrale à 100 % de l\'application');
emit('Format             : texte brut (.txt), sections numérotées');
emit('================================================================================');
emit('');

// Table des matières
const TOC = [
  ['1', 'Vision produit'],
  ['2', 'Architecture globale'],
  ['3', 'Monorepo et arborescence'],
  ['4', 'Stack technique'],
  ['5', 'Déploiement et environnements'],
  ['6', 'Base de données Prisma'],
  ['7', 'Redis et état distribué'],
  ['8', 'Sécurité complète'],
  ['9', 'Authentification et admin'],
  ['10', 'API REST exhaustive'],
  ['11', 'Socket.IO et temps réel'],
  ['12', 'Économie jetons et ledger'],
  ['13', 'Gamification et récompenses'],
  ['14', 'Poker Texas Hold\'em'],
  ['15', 'Tournois'],
  ['16', 'Hidden Bets'],
  ['17', 'Belote'],
  ['18', 'Blackjack'],
  ['19', 'Roulette'],
  ['20', 'Machine à sous'],
  ['21', 'Crash'],
  ['22', 'Mines'],
  ['23', 'Wheel of Fortune'],
  ['24', 'Lucky Number'],
  ['25', 'Bots, tutoriel, practice'],
  ['26', 'Amis et invitations'],
  ['27', 'Prêts entre amis'],
  ['28', 'Voix WebRTC'],
  ['29', 'Site marketing'],
  ['30', 'Client React — architecture'],
  ['31', 'Routes et navigation'],
  ['32', 'Pages'],
  ['33', 'Composants (catalogue)'],
  ['34', 'Contextes, hooks, API client'],
  ['35', 'Modules features/'],
  ['36', 'Internationalisation'],
  ['37', 'Assets et PWA'],
  ['38', 'Electron et Capacitor'],
  ['39', 'Tests et CI/CD'],
  ['40', 'Observabilité'],
  ['41', 'Scénarios utilisateur'],
  ['42', 'Glossaire'],
  ['43', 'Index fichiers'],
];
emit('TABLE DES MATIÈRES');
emit('------------------');
TOC.forEach(([n, t]) => emit(`  ${n.padStart(2)}. ${t}`));
emit('');

function section(num, title) {
  emit('');
  emit('='.repeat(78));
  emit(`SECTION ${num} — ${title.toUpperCase()}`);
  emit('='.repeat(78));
  emit('');
}

function subsection(title) {
  emit('');
  emit(`--- ${title} ---`);
  emit('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — VISION
// ═══════════════════════════════════════════════════════════════════════════
section('1', 'Vision produit');
emit(padLines(`
Quantum Bluff est un hub de divertissement en ligne centré sur les cartes et le casino
virtuel. Les jetons (chips) sont la monnaie interne : ils ne sont pas de l'argent réel
mais structurent toute la progression et les mises.

JEUX MULTIJOUEUR TEMPS RÉEL
  • Poker Texas Hold'em No-Limit : salles d'attente, buy-in, spectateurs, chat table
  • Tournois : brackets, élimination, prix en jetons, paris sur le vainqueur
  • Belote : 4 joueurs en équipes, enchères, variantes régionales
  • Blackjack multijoueur : jusqu'à plusieurs sièges, croupier partagé

JEUX SOLO / CASINO (autorité serveur)
  • Crash : multiplicateur exponentiel, cashout avant crash
  • Mines : grille 5×5, mines cachées, multiplicateur croissant
  • Wheel : roue à segments avec jackpot
  • Lucky Number : numéro 1-10, gain ×8 si match
  • Roulette européenne : tapis complet, limites par case et total
  • Machine à sous : 3 rouleaux, symboles pondérés

SOCIAL ET ENGAGEMENT
  • Liste d'amis, demandes, blocage, profils publics
  • Messages privés entre amis
  • Invitations directes vers salles poker / belote / blackjack
  • Appels vocaux 1v1 et sur tables (WebRTC mesh + signaling Socket.IO)
  • Prêts de jetons entre amis avec intérêts et remboursement auto sur gains
  • Défis quotidiens, streak connexion, recharge gratuite, codes cadeaux
  • Classement : XP, jetons, victoires poker/belote, records casino

SITE PUBLIC (non connecté)
  • Landing marketing longue (hero, jeux, FAQ, CTA)
  • Pages Discover, About, Contact, Privacy, Terms, News/blog

PRINCIPE D'ÉQUITÉ
  Toute décision à enjeu financier (jetons) est prise côté serveur avec RNG crypto,
  validation Zod, transactions Prisma atomiques et journal ledger immuable.
`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════
section('2', 'Architecture globale');
emit(padLines(`
COUCHE PRÉSENTATION (client/)
  React 19 SPA, Vite bundler, Tailwind CSS, Radix UI (shadcn).
  Builds : web (Vercel), Capacitor (APK/IPA), Electron (installateurs).

COUCHE API (server/)
  Express 4, routes modulaires sous /api/*.
  Middleware global : helmet, cors, rate-limit, json 2.5mb, anti-cheat, timeout, idempotency.

COUCHE TEMPS RÉEL
  Socket.IO sur le même port HTTP.
  GameGateway central : poker, blackjack multi, présence, invitations.
  Handlers séparés : belote.gateway.handlers, voice.gateway.handlers.

COUCHE MÉTIER (server/src/logic/)
  Moteurs purs sans I/O : GameTable, Evaluator, belote/*, blackjack, roulette, slot, crash, mines, wheel, luckyNumber.

COUCHE PERSISTANCE
  PostgreSQL via Prisma ORM (User.chips, historiques, social, tournois, ledger).
  Redis : présence, blacklist JWT, idempotence casino, adapter Socket.IO multi-instance, voice calls.

COUCHE OPTIONNELLE
  ai-service/ (Python Flask) : décisions bot niveau expert poker.

DIAGRAMME LOGIQUE
  Client --REST--> Routes --> Services --> Prisma --> PostgreSQL
  Client --WS--> GameGateway --> Controllers --> Logic --> Prisma/Redis
  Casino routes --> logic/*.ts --> crashRoundStore (mémoire) + ledger
`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — MONOREPO
// ═══════════════════════════════════════════════════════════════════════════
section('3', 'Monorepo et arborescence');
emit('Racine du dépôt (/quantum-bluff/) :');
const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
for (const e of rootEntries) {
  if (e.name.startsWith('.') && e.name !== '.gitlab-ci.yml') continue;
  if (e.name === 'node_modules') continue;
  const mark = e.isDirectory() ? '[DIR]' : '[FILE]';
  emit(`  ${mark} ${e.name}`);
}
emit('');
subsection('Scripts racine (package.json)');
emit(padLines(`
  npm run dev          — Lance DB Docker + AI + serveur + client (concurrently)
  npm run dev:db       — docker-compose dans database/
  npm run dev:server   — nodemon server
  npm run dev:client   — vite client :5175
  npm run dev:ai       — scripts/dev-ai.js → Python ai-service
  npm run test:coverage— Jest server + Vitest client
  npm run package:*    — Scripts APK/iOS pour rendu académique
`));

// List all route files
subsection('Fichiers routes serveur');
walk(path.join(ROOT, 'server/src/routes'), ['.ts']).forEach((f) => {
  emit(`  ${rel(f)}`);
});

// List all client pages
subsection('Fichiers pages client');
walk(path.join(ROOT, 'client/src/pages'), ['.tsx', '.ts']).forEach((f) => {
  emit(`  ${rel(f)}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — STACK
// ═══════════════════════════════════════════════════════════════════════════
section('4', 'Stack technique détaillée');
const stack = {
  'Frontend': [
    'React 19.0', 'React DOM 19', 'React Router DOM 7',
    'Vite 7', '@vitejs/plugin-react', 'vite-plugin-pwa',
    'TypeScript 5.x', 'Tailwind CSS 3/4', 'motion (Framer Motion)',
    'i18next + react-i18next + language detector',
    'Socket.IO client 4.x', '@reduxjs/toolkit (RTK Query)',
    'Radix UI primitives (40+ composants ui/)',
    'lucide-react icônes', 'recharts graphiques',
    'Capacitor 8 (Android/iOS)', 'Electron 40 + electron-builder + electron-updater',
    'Vitest + @testing-library/react', 'Playwright e2e',
    'sharp (dev) conversion WebP assets',
  ],
  'Backend': [
    'Node.js 20+ ESM', 'Express 4', 'Socket.IO 4',
    'Prisma ORM + @prisma/adapter-pg', 'PostgreSQL 16',
    'ioredis', 'bcryptjs', 'jsonwebtoken (HS256)',
    'speakeasy TOTP 2FA', 'zod validation',
    'helmet', 'cors', 'express-rate-limit', 'rate-limit-redis',
    'sanitize-html', 'pino logger', 'prom-client métriques',
    'OpenTelemetry (optionnel)', 'Jest + supertest + socket.io-client',
    'swagger-jsdoc (dev /api-docs)',
  ],
  'Infra': [
    'Vercel (frontend)', 'Render (API)', 'Supabase (Postgres)',
    'GitLab CI (pas GitHub Actions)', 'Docker Compose prod',
    'nginx reverse proxy (option VM)', 'Kaniko images CI',
  ],
};
for (const [cat, items] of Object.entries(stack)) {
  subsection(cat);
  items.forEach((i) => emit(`  • ${i}`));
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — DEPLOY
// ═══════════════════════════════════════════════════════════════════════════
section('5', 'Déploiement et environnements');
emit(padLines(`
ENVIRONNEMENT LOCAL
  1. cd database && docker-compose up -d  → Postgres :5433, Redis :6379
  2. cd server && cp .env.example .env    → DATABASE_URL, JWT_SECRET, REDIS_*
  3. npx prisma migrate dev
  4. npm run dev (racine)                 → tout démarre

  Client Vite : http://localhost:5175
  API         : http://localhost:3000
  Proxy Vite  : /api et /socket.io → :3000

PRODUCTION WEB (Vercel)
  Fichier : client/vercel.json
  Build   : npm run build:web (VITE_BASE_PATH=/)
  Domaine : quantum-bluff.com
  Variables : VITE_API_URL, VITE_SOCKET_URL pointant vers Render

PRODUCTION API (Render)
  Dockerfile : server/Dockerfile (Node 20 Alpine, heap 384MB)
  Domaine    : api.quantum-bluff.com
  Variables  : DATABASE_URL (pooler Supabase), DIRECT_URL (migrations),
               JWT_SECRET, REDIS_URL, CORS_ORIGIN=https://www.quantum-bluff.com

DOCKER SELF-HOSTED
  docker-compose.prod.yml : postgres, redis, backend, ai-service, frontend nginx, nginx TLS
  scripts/compose-prod.sh charge .env

ELECTRON UPDATES
  electron-updater → https://api.quantum-bluff.com/updates/latest.yml

CAPACITOR MOBILE
  appId : com.quantumbluff.app
  build :cap → dist/ → cap sync → Android Studio / Xcode
`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6 — DATABASE
// ═══════════════════════════════════════════════════════════════════════════
section('6', 'Base de données Prisma');
const schemaPath = path.join(ROOT, 'server/prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const models = [...schema.matchAll(/^model (\w+)/gm)].map((m) => m[1]);
  const enums = [...schema.matchAll(/^enum (\w+)/gm)].map((m) => m[1]);
  emit(`Fichier schéma : server/prisma/schema.prisma (${schema.split('\n').length} lignes)`);
  emit(`Nombre de modèles : ${models.length}`);
  emit(`Nombre d'enums : ${enums.length}`);
  emit('');
  subsection('Modèles Prisma');
  const modelDescriptions = {
    User: 'Compte joueur : email, username, password hash, chips, avatar BYTEA, 2FA, ban, XP, level, country, lastIp, antiCheatAlerts',
    EmailRegistrationAgeBlocklist: 'Blocage inscription mineurs par email hashé',
    GameRating: 'Note 1-5 + commentaire post-partie',
    PlayerReport: 'Signalement joueur (triche, harcèlement, etc.)',
    UserStats: 'Stats agrégées utilisateur',
    GameHistory: 'Historique parties poker terminées',
    FriendRequest: 'Demande d\'ami pending/accepted/rejected',
    Friendship: 'Relation ami confirmée (bidirectionnelle logique)',
    UserBlock: 'Utilisateur bloqué',
    LoanRequest: 'Demande prêt entre amis',
    Loan: 'Prêt actif avec montant, taux remboursement, échéance',
    LoanRepayment: 'Tranche remboursée',
    LoanLedgerEvent: 'Journal audit prêts',
    FriendMessage: 'Message privé entre amis',
    WaitingRoom: 'Salle d\'attente poker (host, blinds, buy-in, visibility)',
    JoinRequest: 'Demande rejoindre salle privée',
    RoomPlayer: 'Joueur assis en salle d\'attente',
    GameAction: 'Action poker persistée (audit)',
    GameResult: 'Résultat main poker',
    PlayerStats: 'Stats par joueur par partie',
    GameInvitation: 'Invitation ami vers salle',
    BlackjackRoom: 'Salle blackjack multi',
    BlackjackRoomSnapshot: 'Snapshot Redis état table BJ',
    BlackjackRoomSeat: 'Siège joueur BJ',
    BlackjackRoomInvitation: 'Invitation salle BJ',
    BeloteRoom: 'Salle belote (variante, buy-in, host)',
    BeloteRoomSeat: 'Siège belote',
    BeloteJoinRequest: 'Demande accès belote privée',
    BeloteRoomInvitation: 'Invitation belote',
    BeloteGameSnapshot: 'Snapshot partie belote',
    BeloteGameResult: 'Résultat partie belote',
    BeloteGameResultPlayer: 'Score individuel belote',
    BelotePlayerStats: 'Stats belote cumulées',
    CasinoStats: 'Records casino (slotBiggestWin, rouletteBiggestWin, etc.)',
    UserBadge: 'Badge cosmétique débloqué',
    WalletLedgerEntry: 'Journal immuable mouvements jetons (intégrité hash)',
    FreeRecharge: 'Cooldown recharge gratuite',
    GiftCode: 'Code promo cadeau jetons',
    GiftCodeUsage: 'Utilisation code par user',
    HiddenBetTicket: 'Ticket pari latéral poker',
    HiddenBetSelection: 'Sélection marché hidden bet',
    HiddenBetHandResolution: 'Résolution main hidden bet',
    DailyChallengeProgress: 'Progression défi quotidien',
    Tournament: 'Métadonnées tournoi (buy-in, status, bracket)',
    TournamentPlayer: 'Inscrit tournoi',
    TournamentRound: 'Round bracket',
    TournamentTable: 'Table assignée dans round',
    TournamentRewardLedger: 'Distribution prix tournoi',
    TournamentRoundReady: 'Joueur prêt entre mains tournoi',
    TournamentWinnerBet: 'Pari spectateur sur vainqueur tournoi',
  };
  models.forEach((m) => {
    emit(`  MODEL ${m}`);
    emit(`    ${modelDescriptions[m] || 'Voir schema.prisma pour champs détaillés'}`);
    const block = schema.split(`model ${m}`)[1]?.split(/\nmodel |\nenum /)[0] || '';
    const fields = [...block.matchAll(/^\s+(\w+)\s+/gm)].map((x) => x[1]).filter((f) => !['@@', '//'].some((p) => f.startsWith(p)));
    if (fields.length) emit(`    Champs : ${fields.slice(0, 20).join(', ')}${fields.length > 20 ? '...' : ''}`);
    emit('');
  });
  subsection('Enums Prisma');
  enums.forEach((e) => emit(`  • ${e}`));
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7 — REDIS
// ═══════════════════════════════════════════════════════════════════════════
section('7', 'Redis et état distribué');
emit(padLines(`
Usages Redis dans Quantum Bluff :

  1. TOKEN BLACKLIST — auth/tokenBlacklist.ts
     Hash SHA-256 du JWT stocké avec TTL = durée restante du token (logout).

  2. IDEMPOTENCE — middleware/idempotency.middleware.ts + casino/idempotency.service.ts
     Header x-idempotency-key : évite double débit sur retry réseau (casino, blackjack).

  3. PRÉSENCE — services/presence.service.ts
     Clé par userId : online, activity (lobby/game/waiting), lastSeenAt.
     TTL configurable PRESENCE_REDIS_TTL_SEC.

  4. SOCKET.IO ADAPTER — config/socketIoRedis.ts
     Pub/sub pour plusieurs instances Render derrière load balancer.
     Activer SOCKET_IO_REDIS_ADAPTER=1.

  5. POKER STATE STORE — poker/createPokerStateStore.ts
     Option POKER_STATE_STORE=redis : snapshots GameTable debounced.

  6. BLACKJACK STATE — blackjack/store/
     BLACKJACK_STATE_STORE : persistance tables multi entre redémarrages.

  7. VOICE CALLS — voice/voiceCallStore.ts
     État appels 1v1 : sonnerie 15s, participants, ICE relay.

  8. RATE LIMITING — rate-limit-redis store distribué.

  9. ACTION LOG — config/redis.config.ts appendActionLog (debug/audit poker).
`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8 — SECURITY
// ═══════════════════════════════════════════════════════════════════════════
section('8', 'Sécurité complète');
const securityTopics = [
  ['Helmet CSP', 'Content-Security-Policy, X-Frame-Options, CORP cross-origin pour avatars'],
  ['CORS strict', 'Whitelist CORS_ORIGIN + CORS_EXTRA_ORIGIN ; capacitor://localhost toujours OK'],
  ['Rate limiting global', '15 min window, skip GET polling (balance, waiting-room, presence)'],
  ['Rate limiting par route', 'login, register, 2FA, friends write, hidden bets, casino spins'],
  ['Anti-cheat HTTP', 'middleware log IP, vérifie bannedUntil, multi-compte même IP'],
  ['Anti-cheat socket', 'AntiCheatMonitor 8 actions/3s, bot speed <200ms détecté'],
  ['Ban automatique', '5 alertes anti-cheat → ban 24h'],
  ['Timeout requêtes', 'GET 12s, POST/PATCH 8s'],
  ['Idempotency', 'x-idempotency-key Redis SET NX'],
  ['Validation Zod', 'Tous inputs auth, friends, game, reports, tournaments'],
  ['sanitize-html', 'Email/username à l\'inscription et profil'],
  ['Chat link censor', 'utils/chatLinkCensor.ts filtre URLs en chat table'],
  ['Age gate', 'registerAgeGate.ts + EmailRegistrationAgeBlocklist'],
  ['Password policy', 'strongPasswordSchema : longueur, complexité'],
  ['Secret answer', 'Question secrète normalisée pour reset password'],
  ['Avatar URL sanitize', 'sanitizePublicAvatarUrl : https, data:image limitée, /api/auth/avatars/uuid'],
  ['TOTP encryption', 'Secrets 2FA chiffrés AES-256-GCM dérivés JWT_SECRET'],
  ['Admin séparation', 'JWT admin role=admin rejeté sur routes joueur et inversement'],
  ['Prod admin routes off', 'Runtime poker/BJ/roulette override désactivés en NODE_ENV=production'],
  ['Metrics protégés', 'GET /metrics exige METRICS_BEARER_TOKEN en prod'],
  ['Semgrep CI', 'security:trivy + npm audit GitLab (allow_failure)'],
  ['Friend loan anti-abuse', '1 prêt actif/emprunteur, montants bornés, whitelist taux 10-50%'],
  ['Wallet integrity', 'integrityHash sur WalletLedgerEntry'],
  ['Prisma transactions', 'Tous mouvements jetons atomiques'],
  ['Trust proxy', 'TRUST_PROXY pour IP réelle derrière Render/nginx'],
];
securityTopics.forEach(([t, d]) => emit(`  [${t}] ${d}`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9 — AUTH
// ═══════════════════════════════════════════════════════════════════════════
section('9', 'Authentification et admin');
emit(padLines(`
INSCRIPTION (/api/auth/register)
  1. Zod registerSchema valide email, username, password, pays, date naissance
  2. Vérification age gate + blocklist email
  3. bcrypt hash password (cost ~10)
  4. Création User + UserStats + solde initial jetons
  5. JWT access token retourné

CONNEXION (/api/auth/login)
  1. Vérification email/password
  2. Si 2FA activé : exiger code TOTP
  3. signAccessToken HS256, issuer/audience fixes
  4. Client stocke token : sessionStorage (web) ou localStorage (Capacitor/Electron)

MIDDLEWARE authMiddleware
  1. Extrait Bearer token
  2. Vérifie blacklist Redis (logout)
  3. jwt.verify + charge userId
  4. Rejette si bannedUntil > now
  5. Rejette tokens admin sur routes joueur

SOCKET socketAuth
  Même logique via handshake.auth.token

2FA (/api/auth/2fa)
  POST /enable → génère secret speakeasy + QR
  POST /verify → active 2FA
  POST /disable → désactive avec code

ADMIN CONSOLE
  POST /api/auth/admin/login → username + ADMIN_CONSOLE_PASSWORD_HASH (bcrypt)
  JWT avec role admin + ADMIN_CONSOLE_JWT_USER_ID
  Routes /api/admin/console/* : users, games, tournaments, reports, gift codes, force-close

PROFIL
  PATCH /api/auth/profile : username, email, password, avatar (data URL JPEG compressé ou preset)
  GET /api/auth/avatars/:userId : sert image BYTEA
`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10 — API REST
// ═══════════════════════════════════════════════════════════════════════════
section('10', 'API REST exhaustive');
const apiEndpoints = [
  ['GET /', 'Health message'],
  ['GET /api/health', 'Health check'],
  ['GET /api/health/live', 'Liveness probe'],
  ['GET /api/health/ready', 'Readiness probe (DB)'],
  ['GET /metrics', 'Prometheus (Bearer token prod)'],
  ['GET /api-docs', 'Swagger UI (dev only)'],
  ['GET /api/games', 'Legacy list games'],
  ['POST /api/games', 'Legacy create'],
  ['POST /api/games/:id/join', 'Legacy join'],
  ['GET /api/games/:id', 'Legacy state'],
  ['POST /api/games/:id/start', 'Legacy start'],
  ['POST /api/games/:id/action', 'Legacy action'],
  ['GET /api/auth/avatars/:userId', 'Avatar image'],
  ['POST /api/auth/check-email', 'Email disponible'],
  ['POST /api/auth/register', 'Inscription'],
  ['POST /api/auth/recovery-question', 'Question secrète'],
  ['POST /api/auth/reset-password', 'Reset mot de passe'],
  ['POST /api/auth/login', 'Connexion'],
  ['POST /api/auth/logout', 'Logout + blacklist'],
  ['GET /api/auth/lobby-tutorial-status', 'État tutoriel lobby'],
  ['POST /api/auth/lobby-tutorial/complete', 'Marquer tutoriel fait'],
  ['PATCH /api/auth/profile', 'Maj profil'],
  ['GET /api/auth/gamification', 'XP, level, badges'],
  ['GET /api/auth/balance', 'Solde jetons'],
  ['GET /api/auth/balance-history', 'Historique solde'],
  ['POST /api/auth/validate-topup-promo', 'Code promo top-up'],
  ['POST /api/auth/add-dev-money', 'Jetons dev (gated prod)'],
  ['POST /api/auth/withdraw-money', 'Retrait jetons'],
  ['POST /api/auth/sync-balance', 'Sync solde'],
  ['POST /api/auth/admin/login', 'Login admin console'],
  ['GET/POST /api/auth/admin/gift-codes', 'Admin gift codes'],
  ['POST /api/auth/2fa/enable|verify|disable', '2FA TOTP'],
  ['POST /api/friends/send', 'Invitation partie ami'],
  ['GET /api/friends/received', 'Invitations reçues'],
  ['POST /api/friends/:id/accept|reject', 'Réponse invitation'],
  ['POST /api/friends/loans/requests', 'Demande prêt'],
  ['GET /api/friends/loans', 'Liste prêts'],
  ['GET /api/friends/loans/:loanId', 'Détail prêt'],
  ['POST /api/friends/loans/requests/:id/accept|reject|cancel', 'Actions prêt'],
  ['POST /api/friends/inbox-seen', 'Marquer inbox vu'],
  ['GET /api/friends/pending-social', 'Événements sociaux pending'],
  ['GET/POST /api/friends/messages', 'DM amis'],
  ['GET /api/friends/search', 'Recherche utilisateurs'],
  ['POST /api/friends/request', 'Demande ami'],
  ['GET /api/friends/requests/:userId', 'Demandes entrantes'],
  ['PUT /api/friends/request/:requestId', 'Accepter/refuser ami'],
  ['GET /api/friends/blocked', 'Liste bloqués'],
  ['POST/DELETE /api/friends/block', 'Bloquer/débloquer'],
  ['GET /api/friends/profile/:friendId', 'Profil ami'],
  ['GET /api/friends/:userId', 'Liste amis + présence'],
  ['GET /api/waiting-room', 'Liste salles poker'],
  ['GET /api/waiting-room/active/games', 'Jeux actifs publics'],
  ['GET /api/waiting-room/games-in-progress', 'Mes parties en cours'],
  ['POST /api/waiting-room/create', 'Créer salle'],
  ['POST /api/waiting-room/rematch', 'Revanche'],
  ['GET /api/waiting-room/:roomId', 'Détail salle'],
  ['POST /api/waiting-room/:roomId/join|leave|start', 'Cycle salle'],
  ['PUT /api/waiting-room/:roomId/ready', 'Toggle prêt'],
  ['GET /api/waiting-room/:roomId/join-requests', 'Demandes privées'],
  ['POST /api/waiting-room/:roomId/join-requests/:id/accept|reject', 'Host gère demandes'],
  ['DELETE /api/waiting-room/:roomId', 'Supprimer salle'],
  ['POST /api/tournaments', 'Créer tournoi'],
  ['GET /api/tournaments', 'Liste tournois ouverts'],
  ['GET /api/tournaments/live-spectate', 'Tournois spectables live'],
  ['GET /api/tournaments/:id', 'Détail tournoi'],
  ['GET /api/tournaments/:id/results', 'Résultats finaux'],
  ['POST /api/tournaments/:id/join|leave|kick|start', 'Gestion tournoi'],
  ['GET /api/tournaments/:id/bets/pool|mine', 'Paris vainqueur'],
  ['POST /api/tournaments/:id/bets', 'Placer pari vainqueur'],
  ['POST /api/game/bot/start', 'Partie practice vs bots'],
  ['GET /api/game/:gameId', 'État partie HTTP'],
  ['GET /api/game/:gameId/room-info', 'Métadonnées salle'],
  ['GET /api/game/:gameId/action-log', 'Log actions'],
  ['POST /api/game/:gameId/action', 'Action poker HTTP fallback'],
  ['POST /api/game/sync-balance', 'Sync jetons'],
  ['POST /api/game/record-result', 'Persister résultat'],
  ['GET /api/game/active/list', 'Parties actives'],
  ['GET /api/game/history/:gameId', 'Historique'],
  ['GET /api/game/stats/:playerId', 'Stats joueur'],
  ['POST /api/bot/action', 'Décision bot'],
  ['POST /api/bot/evaluate-winner', 'Évaluation gagnant'],
  ['POST /api/slot/spin', 'Tour machine à sous'],
  ['GET /api/slot/config', 'Config slot (limites)'],
  ['POST /api/roulette/spin', 'Lancer roulette'],
  ['GET /api/roulette/config', 'Config roulette'],
  ['GET /api/crash/active', 'Manche crash en cours'],
  ['POST /api/crash/start', 'Démarrer crash'],
  ['POST /api/crash/cashout', 'Encaisser crash'],
  ['POST /api/crash/settle', 'Clôturer crash (auto crash)'],
  ['GET /api/mines/active', 'Manche mines en cours'],
  ['POST /api/mines/start', 'Démarrer mines'],
  ['POST /api/mines/reveal', 'Révéler case'],
  ['POST /api/mines/cashout', 'Encaisser mines'],
  ['POST /api/mines/status', 'Statut manche mines'],
  ['POST /api/wheel/spin', 'Tour roue fortune'],
  ['POST /api/lucky-number/play', 'Jouer lucky number'],
  ['POST /api/blackjack/start', 'BJ solo start'],
  ['POST /api/blackjack/action', 'BJ solo hit/stand/double'],
  ['POST /api/blackjack-tables', 'Créer salle BJ multi'],
  ['GET /api/blackjack-tables', 'Liste salles BJ'],
  ['GET /api/blackjack-tables/:roomId', 'Détail salle'],
  ['POST /api/blackjack-tables/:roomId/join|leave|start', 'BJ multi lobby'],
  ['PATCH /api/blackjack-tables/:roomId/ready', 'Prêt BJ'],
  ['DELETE /api/blackjack-tables/:roomId', 'Supprimer salle BJ'],
  ['GET /api/blackjack-tables/game/:gameId/state', 'État table BJ'],
  ['POST /api/blackjack-tables/game/:gameId/bet|deal|action', 'Actions BJ multi'],
  ['POST /api/belote-rooms/create', 'Créer salle belote'],
  ['GET /api/belote-rooms', 'Liste salles belote'],
  ['GET /api/belote-rooms/games-in-progress', 'Belote en cours'],
  ['GET /api/belote-rooms/:id', 'Détail salle belote'],
  ['POST /api/belote-rooms/:id/join|leave|ready|start|request-join', 'Cycle belote'],
  ['POST /api/belote-rooms/invitations', 'Inviter belote'],
  ['POST /api/belote-rooms/invitations/:id/accept|reject', 'Réponse invite belote'],
  ['GET /api/belote-rooms/game/:gameId/state', 'État partie belote'],
  ['GET /api/belote/history', 'Historique belote user'],
  ['POST /api/hidden-bets/quote', 'Devis pari latéral'],
  ['POST /api/hidden-bets/place', 'Placer hidden bet'],
  ['GET /api/hidden-bets/markets', 'Marchés disponibles'],
  ['GET /api/hidden-bets/history', 'Historique hidden bets'],
  ['GET /api/hidden-bets/:ticketId', 'Détail ticket'],
  ['POST /api/feedback/game-rating', 'Noter partie'],
  ['POST /api/reports/player', 'Signaler joueur'],
  ['GET /api/daily-challenges/me', 'Mes défis du jour'],
  ['POST /api/daily-challenges/:code/claim', 'Réclamer défi'],
  ['GET /api/daily-login/me', 'Streak connexion'],
  ['POST /api/daily-login/claim', 'Réclamer connexion'],
  ['GET /api/free-recharge/status', 'Cooldown recharge gratuite'],
  ['POST /api/free-recharge/claim', 'Réclamer recharge'],
  ['GET /api/gift-codes/available', 'Codes disponibles'],
  ['POST /api/gift-codes/validate', 'Valider code'],
  ['GET /api/wallet/history', 'Historique wallet ledger'],
  ['GET /api/leaderboard', 'Classement (?category=)'],
  ['GET /updates/latest', 'Electron auto-update manifest'],
];
apiEndpoints.forEach(([ep, desc], i) => emit(`  ${String(i + 1).padStart(3)}. ${ep.padEnd(52)} — ${desc}`));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11 — SOCKETS
// ═══════════════════════════════════════════════════════════════════════════
section('11', 'Socket.IO et temps réel');
const socketEvents = [
  ['JOIN_USER_ROOM', 'Rejoindre room personnelle user:{id} pour notifications'],
  ['USER_ACTIVITY_CHANGED', 'Maj activité présence (lobby, game, waiting)'],
  ['JOIN_TOURNAMENT_ROOM / LEAVE', 'Subscription tournoi actif'],
  ['JOIN_TOURNAMENT_LOBBY / LEAVE', 'Lobby global tournois'],
  ['join-room / leave-room', 'Subscription salle d\'attente poker'],
  ['invite-to-room', 'Invitation ami salle poker'],
  ['invite-to-blackjack-room', 'Invitation salle blackjack'],
  ['JOIN_GAME', 'Rejoindre table poker active'],
  ['JOIN_SPECTATE', 'Mode spectateur poker'],
  ['JOIN_BLACKJACK_TABLE / LEAVE', 'Table blackjack multi'],
  ['SPECTATOR_QUEUE_JOIN / LEAVE', 'File reprise cash game'],
  ['PLAYER_ACTION', 'Action poker (fold, call, raise, check, all-in)'],
  ['GAME_CHAT', 'Chat table poker'],
  ['CASH_SIT / CASH_LEAVE / CASH_REBUY', 'Gestion sièges cash'],
  ['CASH_NEXT_HAND_READY', 'Prêt main suivante (tournoi aussi)'],
  ['RECONNECT_GAME', 'Reconnexion après déco'],
  ['GAME_UPDATE / GAME_STATE_UPDATED', 'État table émis serveur'],
  ['SHOWDOWN_REVEAL / HAND_STATE_CHANGED', 'Showdown et transitions'],
  ['BALANCE_UPDATED', 'Sync solde après main'],
  ['FRIEND_REQUEST_RECEIVED / ACCEPTED', 'Notifications amis'],
  ['GAME_INVITATION_RECEIVED', 'Invitation partie'],
  ['JOIN_REQUEST_*', 'Demandes salle privée'],
  ['JOIN_BELOTE_ROOM / LEAVE', 'Lobby belote'],
  ['JOIN_BELOTE_GAME / LEAVE / SPECTATE', 'Table belote'],
  ['BELOTE_ACTION', 'Action belote (bid, play card, etc.)'],
  ['BELOTE_CHAT', 'Chat belote'],
  ['BELOTE_GAME_UPDATE', 'État belote'],
  ['VOICE_JOIN / SWITCH / LEAVE', 'Canal vocal table/waiting'],
  ['VOICE_SETTINGS', 'Préférences micro/sortie'],
  ['VOICE_PEER_MUTE', 'Mute pair'],
  ['VOICE_SPEAKING', 'Indicateur parole'],
  ['VOICE_SIGNAL', 'Relais SDP/ICE WebRTC'],
  ['VOICE_CALL_START / RESPOND / END / CANCEL', 'Appel ami 1v1'],
  ['VOICE_CALL_INCOMING / CONNECTED / UNANSWERED', 'Cycle appel'],
  ['VOICE_ROSTER', 'Liste participants canal'],
  ['LOAN_*', 'Notifications prêts entre amis'],
  ['TOURNAMENT_LOBBY_UPDATED', 'Maj lobby tournoi'],
  ['disconnect', 'Cleanup présence, voice, timers'],
];
socketEvents.forEach(([ev, desc]) => emit(`  • ${ev.padEnd(35)} — ${desc}`));

section('12', 'Économie jetons et ledger');
emit(padLines(`
SOURCE DE VÉRITÉ : User.chips (INTEGER Postgres) — jamais faire confiance au solde client seul.
SYNC : GET /api/auth/balance + événement socket BALANCE_UPDATED + BALANCE_CHANGED_EVENT client.

FLUX DÉBIT/CRÉDIT :
  1. Route reçoit action (mise, buy-in, spin...)
  2. prisma.$transaction ou updateMany avec condition chips >= amount
  3. appendWalletLedgerEntry({ reason, amount, balanceBefore, balanceAfter, context })
  4. integrityHash sur entrée ledger (audit)
  5. Réponse JSON inclut chips mis à jour → client updateUserBalance()

createCasinoRoundContext : roundId UUID, actionId UUID, gameType, userId — traçabilité.

REMBOURSEMENT PRÊT AMI :
  applyRepaymentOnPositiveWin sur gains casino positifs
  applyRepaymentOnPokerSettlement sur gains poker showdown
  Slice configurable 10-50% du gain brut avant crédit joueur

HISTORIQUE :
  GET /api/wallet/history — pagination ledger
  GET /api/auth/balance-history — résumé mouvements récents
`));

section('13', 'Gamification et récompenses');
emit(padLines(`
XP & NIVEAUX (logic/gamification.ts) :
  awardXpInTransaction après parties terminées
  Seuils levelUp — affichés profil et lobby

DÉFIS QUOTIDIENS (dailyChallenges/) :
  WIN_WITH_PAIR, WIN_200_ROULETTE, PLAY_5_TIMES, WIN_200_SLOT
  GET /api/daily-challenges/me — progression
  POST /api/daily-challenges/:code/claim — récompense jetons/XP

CONNEXION QUOTIDIENNE (dailyLogin/) :
  Streak jours consécutifs, bonus croissant
  DailyLoginModal.tsx client

RECHARGE GRATUITE (freeRecharge/) :
  Cooldown entre réclamations, FreeRechargeButton.tsx

CODES CADEAUX (giftCodes/) :
  Admin crée codes, joueurs valident GET/POST gift-codes

CLASSEMENT (leaderboard.routes.ts) :
  Catégories xp, chips, poker_wins, belote_wins, slot_biggest, roulette_biggest, blackjack_biggest
  Leaderboard.tsx client avec onglets

NOTATION PARTIE :
  RateGameModal.tsx → POST /api/feedback/game-rating
`));

// Game sections 14-24 - detailed per game
const gameSections = [
  ['14', 'Poker Texas Hold\'em', `
MOTEUR : server/src/logic/GameTable.ts + CashGameController.ts
ÉVALUATION MAINS : server/src/logic/Evaluator.ts
RÈGLES : No-Limit Hold'em, blinds, button rotation, side pots, showdown, rake 0 (jetons virtuels)
PHASES : WAITING → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → BETWEEN_HANDS
TIMEOUT TOUR : 30s (10s mode turbo salle)
CLIENT : client/src/pages/Game.tsx (table principale, 5700+ lignes)
         client/src/pages/WaitingRoom.tsx
         client/src/components/game/PokerTable.tsx, ActionControls.tsx
         client/src/components/PokerCard.tsx, CommunityCards.tsx
         client/src/components/HiddenBetsPanel.tsx
         client/src/hooks/usePokerSocket.ts
FLUX :
  1. Host crée salle POST /api/waiting-room/create (blinds, buy-in min/max, public/private)
  2. Joueurs join, toggle ready PUT /ready
  3. Host start → CashGameController instancié, buy-in débité (CASH_POKER_BUY_IN ledger)
  4. Socket JOIN_GAME → état initial émis
  5. À son tour : PLAYER_ACTION { action: fold|check|call|raise|allin, amount? }
  6. Orchestrateur valide, met à jour GameTable, broadcast GAME_UPDATE
  7. Showdown : Evaluator classe mains, potSettlement distribue, CASH_POKER_HAND_RESULT
  8. Entre mains : countdown, CASH_NEXT_HAND_READY pour tournois
SPECTATEUR : JOIN_SPECTATE, file SPECTATOR_QUEUE pour reprendre siège
PRACTICE BOT : POST /api/game/bot/start → bots qb-bot-N, botAI.ts décisions
`],
  ['15', 'Tournois poker', `
SERVICE : server/src/tournament/tournament.service.ts
BRACKET : server/src/tournament/bracket/TournamentBracketBuilder.ts
RUNTIME : tournament.runtime.service.ts — élimination, fusion tables
SCHEDULER : tournament.scheduler.ts — démarrages programmés
CLIENT : features/tournament/pages/TournamentRoom.tsx, TournamentWaiting.tsx, TournamentResults.tsx
         TournamentWinnerBetsPanel.tsx, ZipRushMiniGame.tsx (mini-jeu lobby)
FLUX :
  1. POST /api/tournaments { buyIn, maxPlayers, startAt, visibility }
  2. Joueurs POST /:id/join → entry fee débité (tournament.entryFee.ts)
  3. Host POST /:id/start → bracket généré, tables créées (même moteur poker, stacks virtuels)
  4. Élimination → notifyTournamentTableFinished → merge ou fin
  5. Dernier survivant → tournament.reward.service.ts crédite prix
PARIS VAINQUEUR : tournamentWinnerBet.service.ts — spectateurs parient sur gagnant final
`],
  ['16', 'Hidden Bets', `
MARCHÉS parallèles sur mains poker : PRE_HAND et LIVE (fenêtre entre streets)
MOTEUR : server/src/poker/hiddenBets/ (pricing, resolution)
CLIENT : HiddenBetsPanel.tsx, HiddenBetsResultsModal.tsx, hiddenBetsApi.ts
API : POST /quote, /place, GET /markets, /history
Résolution automatique à la fin de main via resolveHiddenBetsForHand dans gateway
`],
  ['17', 'Belote', `
VARIANTES : CLASSIQUE, COINCHE, CONTEE, MODERNE (beloteVariants.ts)
CONTRÔLEUR : BeloteTableController.ts
4 joueurs, équipes 0+2 vs 1+3, phases enchères puis jeu plis
CLIENT : BeloteWaitingRoom.tsx, BeloteGame.tsx, components/belote/*
SOCKET : BELOTE_ACTION validé par beloteAction.validation.ts (Zod)
BUY-IN : chargeBeloteBuyIns au start, pot 4× buy-in, BELOTE_POT_WIN
TIMER : 30s par tour, 60s déco = forfait
`],
  ['18', 'Blackjack', `
SOLO : logic/blackjack.ts, blackjackSessionStore.ts (mémoire/user)
       Routes /api/blackjack/start|action
       Client Blackjack.tsx → crée table 1 siège multi et redirige
MULTI : BlackjackTableController.ts, phases betting→player_turn→dealer→payout
        Routes /api/blackjack-tables/*
        Client BlackjackMultiLobby.tsx, BlackjackMultiTable.tsx
RÈGLES : 6 decks, BJ 3:2, dealer stand soft 17, double 2 cartes, pas split
RECOVERY : blackjackRecovery.service.ts + Redis snapshots
`],
  ['19', 'Roulette', `
LOGIC : logic/roulette.ts — roue européenne 0-36
Mises : straight, split, street, corner, six-line, dozen, column, rouge/noir, pair/impair...
Limites : min 10, max 750/ligne, max 5000 total, max 40 mises/spin
CLIENT : Roulette.tsx (aussi /tutorial/roulette avec tutorialMode)
IDEMPOTENCE : x-idempotency-key obligatoire
`],
  ['20', 'Machine à sous', `
LOGIC : logic/slotMachine.ts — 3 rouleaux, symboles pondérés (cherry, lemon, bell, seven, diamond)
Payouts : paire = remboursement mise, brelan = 5× à 20×
CLIENT : SlotMachine.tsx via MiniGames.tsx?game=slot et RetroCasinoGames.tsx
`],
  ['21', 'Crash', `
LOGIC : logic/crash.ts — m(t) = e^(0.21×t), crashPoint serveur secret
STORE : crashRoundStore.ts + crashRoundReconcile.ts (abandon auto 90s)
ROUTES : GET /active, POST /start, /cashout, /settle
CLIENT : Crash.tsx, features/crash/crashMath.ts
RECOVERY : recoverActiveRound.ts reprise manche au mount
`],
  ['22', 'Mines', `
LOGIC : logic/mines.ts — grille 5×5, 1-20 mines, multiplicateur safe reveals, edge 4%
STORE : minesRoundStore.ts, abandon 5 min
ROUTES : GET /active, POST /start, /reveal, /cashout, /status
CLIENT : Mines.tsx, features/mines/minesMath.ts
`],
  ['23', 'Wheel of Fortune', `
LOGIC : logic/wheel.ts — 12 segments (x0, x0.5, x1, x1.5, x2, x3, x5, jackpot x20)
LOCK : wheelSpinLock.ts 15s anti double-spin
CLIENT : Wheel.tsx, features/wheel/wheelMath.ts
`],
  ['24', 'Lucky Number', `
LOGIC : logic/luckyNumber.ts — choix 1-10, tirage serveur, ×8 si match
CLIENT : LuckyNumber.tsx
`],
];

gameSections.forEach(([num, title, body]) => {
  section(num, title);
  emit(padLines(body.trim()));
});

// Sections 25-28
section('25', 'Bots, tutoriel, practice');
emit(padLines(`
BOT AI server/src/logic/botAI.ts : 4 niveaux easy/medium/hard/expert
  Expert peut appeler ai-service Python (botAi.service.ts) si AI_SERVICE_ENABLED=1
botDecisionSanitize.ts : empêche décisions invalides
POST /api/bot/action : endpoint décision externe

PRACTICE : POST /api/game/bot/start
  practiceBotGames.ts préfixe IDs
  practiceBotTurns.service.ts enchaîne tours bots automatiquement
  Client BotConfiguration.tsx → /bot-configuration

TUTORIEL CLIENT-ONLY (pas de jetons réels) :
  TutorialGame.tsx + tutorialHandScript.ts + TutorialSpotlight.tsx
  Roulette tutorialMode sur /tutorial/roulette
  LobbyInteractiveTour.tsx, GameInteractiveTour.tsx
`));

section('26', 'Amis et invitations');
emit(padLines(`
Pages : Friends.tsx, FriendProfile.tsx
Composants : FriendsList.tsx, FriendSearch.tsx, InvitationBanner.tsx
RTK Query : searchUsers, sendFriendRequest, getFriendMessages, blockUser, reportPlayer
Socket : FRIEND_REQUEST_*, GAME_INVITATION_RECEIVED
InvitationAcceptContext : modal quitter partie en cours pour accepter invite
useWaitingRoomInvitationAccept.ts
`));

section('27', 'Prêts entre amis');
emit(padLines(`
friendLoan.service.ts : création, acceptation, remboursement automatique
friendLoan.interest.ts : computeTotalDue, taux intérêt
Remboursement slice sur gains casino et poker via applyRepaymentOnPositiveWin / applyRepaymentOnPokerSettlement
Client FriendLoansPanel.tsx, friendLoanPreview.ts
Limites : 100-1M jetons, 1 prêt actif, amitié requise, TTL demande 7j
`));

section('28', 'Voix WebRTC');
emit(padLines(`
VoiceContext.tsx : orchestration globale
WebRTCVoiceMesh.ts : mesh P2P entre participants canal
VoiceCallManager.ts : appels 1v1 (sonnerie 15s)
voice.gateway.handlers.ts : signaling VOICE_SIGNAL
Canaux : waiting:{roomId}, table:{gameId}, call:{callId}
ICE/TURN via VITE_ICE_SERVERS client
useTableVoiceChat.ts sur tables poker/belote/blackjack
`));

section('29', 'Site marketing');
emit(padLines(`
Pages publiques sans auth : /, /discover, /about, /contact, /privacy-policy, /terms-of-service, /news
Contenu : content/marketing/siteContent.ts (FR + EN, ~1086 lignes)
  home, discover, about, contact, privacy, terms, news (12+ articles changelog)
PublicSiteShell.tsx : header, LanguageSwitcher, footer
HomePage.tsx via StartScreen.tsx (redirect /lobby si token)
`));

// Section 30-35 client
section('30', 'Client React — architecture');
emit(padLines(`
Entry : main.tsx → Provider tree → App.tsx
Providers (ordre) : ErrorBoundary, Loader, Redux, Toast, User, Socket, QuantumHUD,
  HiddenBets (stub), Audio, puis dans App : Accessibility, TableTheme, Voice, InvitationAccept, Layout

État :
  - RTK Query api slice (cache serveur amis/auth)
  - Contexts pour temps réel et UI globale
  - localStorage + events DOM (auth-changed, BALANCE_CHANGED_EVENT)
  - useState local dans pages jeu (Game.tsx énorme état table)

Build modes Vite : default (web+PWA), capacitor, electron
`));

section('31', 'Routes et navigation');
const routes = [
  ['/', 'StartScreen → HomePage ou redirect lobby'],
  ['/discover', 'DiscoverPage'],
  ['/about', 'AboutPage'],
  ['/contact', 'ContactPage'],
  ['/privacy-policy', 'PrivacyPolicyPage'],
  ['/terms-of-service', 'TermsOfServicePage'],
  ['/news', 'NewsIndexPage'],
  ['/news/:slug', 'NewsArticlePage'],
  ['/auth', 'Auth login/register'],
  ['/auth/admin', 'AdminAuth'],
  ['/admin/console', 'AdminConsole'],
  ['/lobby', 'Lobby hub principal'],
  ['/bot-configuration', 'BotConfiguration'],
  ['/minigames', 'MiniGames hub'],
  ['/minigames/quick-solo', 'QuickSoloGames'],
  ['/minigames/retro-casino', 'RetroCasinoGames'],
  ['/minigames/crash', 'Crash'],
  ['/minigames/mines', 'Mines'],
  ['/minigames/wheel', 'Wheel'],
  ['/minigames/lucky-number', 'LuckyNumber'],
  ['/blackjack', 'Blackjack solo'],
  ['/blackjack/lobby', 'BlackjackMultiLobby'],
  ['/blackjack/lobby/:roomId', 'BlackjackMultiLobby'],
  ['/blackjack/table/:gameId', 'BlackjackMultiTable'],
  ['/waiting-room', 'WaitingRoom poker'],
  ['/belote/waiting-room', 'BeloteWaitingRoom'],
  ['/belote/game', 'BeloteGame'],
  ['/tournaments/:id', 'TournamentRoom'],
  ['/tournaments/:id/waiting', 'TournamentWaiting'],
  ['/tournaments/:id/results', 'TournamentResults'],
  ['/game', 'Game poker table'],
  ['/game-deal', 'GameDeal'],
  ['/game-example', 'GameExample'],
  ['/results', 'HiddenBetsResult'],
  ['/leaderboard', 'Leaderboard'],
  ['/profile', 'Profile'],
  ['/friends', 'Friends'],
  ['/friends/:friendId', 'FriendProfile'],
  ['/edit-profile', 'EditProfile'],
  ['/tutorial/game', 'TutorialGame'],
  ['/tutorial/roulette', 'Roulette tutorial'],
];
routes.forEach(([r, c]) => emit(`  ${r.padEnd(32)} → ${c}`));

section('33', 'Composants — catalogue complet');
const compFiles = walk(path.join(ROOT, 'client/src/components'), ['.tsx']);
const compDescriptions = {
  'Layout.tsx': 'Barre supérieure, wallet, navigation, notifications, menu paramètres',
  'ProtectedRoute.tsx': 'Redirige vers /auth si pas de token',
  'AdminProtectedRoute.tsx': 'Gate rôle admin',
  'PokerTable.tsx': 'Table poker (racine, legacy)',
  'game/PokerTable.tsx': 'Table poker principale avec sièges',
  'PokerCard.tsx': 'Carte animée (SVG public/cards ou back.webp)',
  'CommunityCards.tsx': 'Board flop/turn/river',
  'ActionButtons.tsx': 'Boutons fold/call/raise',
  'game/ActionControls.tsx': 'Contrôles mise slider',
  'QuantumHUD.tsx': 'Overlay équité Monte Carlo',
  'HiddenBetsPanel.tsx': 'Paris latéraux poker',
  'VoiceCallIncomingBanner.tsx': 'Bannière appel entrant',
  'LobbyBeloteSection.tsx': 'Section belote dans lobby',
  'LobbyBlackjackMultiSection.tsx': 'Section blackjack multi lobby',
  'PublicSiteShell.tsx': 'Shell pages marketing',
  'ClientAuthShellBackground.tsx': 'Fond pages auth/marketing',
};
compFiles.forEach((f) => {
  const r = rel(f);
  const name = path.basename(f);
  emit(`  ${r}`);
  emit(`    → ${compDescriptions[r] || compDescriptions[name] || 'Composant UI jeu ou shell application'}`);
});

section('34', 'Contextes, hooks, API client');
emit(padLines(`
CONTEXTES (client/src/contexts/) :
  UserContext, SocketContext, ToastContext, LoaderContext, MusicContext,
  QuantumHUDContext, HiddenBetsContext, VoiceContext, InvitationAcceptContext,
  AccessibilityContext, TableThemeContext, TopBarContext

HOOKS (client/src/hooks/) :
  useUser, useSocket, usePokerSocket, usePokerGame, usePokerDeck,
  useAvatar, useDeadlineCountdown, useNumberFieldInput, useWaitingRoomInvitationAccept

RTK QUERY (services/api.ts) :
  login, register, friends CRUD, messages, loans, block, report, profile avatar

UTILS CLÉS :
  apiBase.ts, authStorage.ts, userProfile.ts, socketConnect.ts, avatars.ts,
  gamificationStorage.ts, chips.ts (client mirror)
`));

section('35', 'Modules features/');
walk(path.join(ROOT, 'client/src/features'), ['.ts', '.tsx']).forEach((f) => {
  emit(`  ${rel(f)}`);
});

// i18n, assets, mobile, tests
section('36', 'Internationalisation');
emit(padLines(`
i18next config : src/i18n/config.ts
Locales : en (fallback), fr, es, ar (RTL), uk
Fichiers : src/i18n/locales/{lang}/translation.json (milliers de clés)
LanguageSwitcher.tsx dans Layout et PublicSiteShell
Marketing siteContent.ts séparé (FR/EN uniquement) pour pages longues
`));

section('37', 'Assets et PWA');
emit(padLines(`
Assets bundlés src/assets/ : avatars/*.webp, background/*.webp, games/*.webp,
  nappe/, cards/back.webp, music/, sounds/, logos
Public : manifest.webmanifest, cards SVG complets 52+2 jokers, favicon
Migration WebP : scripts/convert-images-webp.mjs (~85 Mo économisés)
PWA vite-plugin-pwa : autoUpdate, precache 3MB max/file, runtime cache avatars
`));

section('38', 'Electron et Capacitor');
emit(padLines(`
Electron : electron.cjs, preload.js, HashRouter file://, auto-update /updates/
Capacitor : com.quantumbluff.app, android/, ios/, build:cap:sync
.env.capacitor : VITE_API_URL=https://api.quantum-bluff.com
`));

section('39', 'Tests et CI/CD');
emit(padLines(`
SERVER Jest : 640+ tests, couverture 80%+ sur logic/, tournament/, validation/
  jest.config.cjs maxWorkers:1, forceExit
CLIENT Vitest : avatars, voice, solo recovery, blackjack runtime, smoke pages
Playwright : e2e/smoke.spec.ts (charge /)
GITLAB CI .gitlab-ci.yml :
  backend:verify, frontend:verify, backend:load-test, security:npm/trivy,
  docker:build (Kaniko), database:test
Pas de GitHub Actions dans ce dépôt.
`));

section('40', 'Observabilité');
emit(padLines(`
pino structured logging, requestIdMiddleware, httpAccessLogMiddleware
prom-client /metrics, rateLimitWithMetrics
OpenTelemetry optionnel (observability/otel.ts, otelEarly.js)
Health probes /api/health/live|ready pour Render/K8s
`));

section('41', 'Scénarios utilisateur détaillés');
const scenarios = [
  'Nouveau visiteur arrive sur / → lit landing → clique Jouer → /auth → register → /lobby',
  'Joueur crée salle poker privée → invite ami → ami accepte notification → join → ready → start → /game',
  'Joueur lance Crash depuis Quick Solo → mise 100 → start → cashout x2.4 → gain crédité → ledger CRASH_PAYOUT',
  'Joueur Belote : create room classique → 4 join → start → enchères → plis → fin → BELOTE_POT_WIN',
  'Tournoi : 8 joueurs join payent buy-in → start → 2 tables 4 → éliminations → final → prix top 3',
  'Ami prête 5000 jetons → emprunteur accepte → joue slot gagne → remboursement auto slice 20%',
  'Appel vocal : depuis Friends → VOICE_CALL_START → sonnerie 15s → RESPOND → WebRTC audio',
  'Admin : /auth/admin → console → consulte reports → force-close belote room stuck',
];
scenarios.forEach((s, i) => emit(`  Scénario ${i + 1} : ${s}`));

section('42', 'Glossaire');
const glossary = [
  ['Chips', 'Jetons virtuels monnaie du jeu'],
  ['Buy-in', 'Mise d\'entrée table poker/belote'],
  ['Ledger', 'Journal walletLedgerEntry immuable'],
  ['Cash game', 'Poker argent réel style mais jetons, rebuy possible'],
  ['Showdown', 'Abattage cartes fin de main poker'],
  ['Side pot', 'Pot latéral all-in short stack'],
  ['NTLH', 'No-Limit Texas Hold\'em'],
  ['Belote contrée', 'Variante enchères agressives'],
  ['Crash point', 'Multiplicateur max avant crash (serveur secret)'],
  ['Idempotency key', 'Header anti double transaction'],
  ['RTK Query', 'Cache requêtes Redux Toolkit'],
  ['Capacitor', 'Bridge WebView native mobile'],
  ['TOTP', '2FA Google Authenticator style'],
  ['ICE/TURN', 'WebRTC traversal NAT'],
  ['PWA', 'Progressive Web App installable'],
];
glossary.forEach(([t, d]) => emit(`  ${t.padEnd(20)} : ${d}`));

// Pad to reach ~5000 lines with detailed expansions
section('43', 'Index fichiers et annexes');
emit('Liste complète des fichiers source client (.ts/.tsx) :');
walk(path.join(ROOT, 'client/src'), ['.ts', '.tsx']).forEach((f) => emit(`  ${rel(f)}`));
emit('');
emit('Liste complète des fichiers source server (.ts) :');
walk(path.join(ROOT, 'server/src'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

// Expand with repeated detailed annex if needed
subsection('Annexe A — Détail middleware serveur (ordre d\'exécution)');
const middlewares = [
  'observability/otelEarly.js',
  'helmet()',
  'cors({ origin: whitelist, credentials: true })',
  'requestIdMiddleware',
  'httpAccessLogMiddleware',
  'rateLimitWithMetrics (global)',
  'express.json({ limit: "2.5mb" })',
  'antiCheatMiddleware',
  'timeoutMiddleware',
  'idempotencyMiddleware',
  '... routes avec limiters spécifiques ...',
  'error handler 500 JSON',
];
middlewares.forEach((m, i) => emit(`  ${i + 1}. ${m}`));

subsection('Annexe B — Raisons ledger wallet (WalletLedgerEntry.reason)');
const ledgerReasons = [
  'CRASH_STAKE', 'CRASH_PAYOUT', 'MINES_STAKE', 'MINES_PAYOUT', 'WHEEL_STAKE', 'WHEEL_PAYOUT',
  'LUCKY_NUMBER_STAKE', 'LUCKY_NUMBER_PAYOUT', 'SLOT_STAKE', 'SLOT_PAYOUT',
  'ROULETTE_STAKE', 'ROULETTE_PAYOUT', 'BLACKJACK_STAKE', 'BLACKJACK_PAYOUT',
  'CASH_POKER_BUY_IN', 'CASH_POKER_CASHOUT', 'CASH_POKER_HAND_RESULT', 'CASH_POKER_REBUY',
  'BELOTE_BUY_IN', 'BELOTE_PLAY', 'BELOTE_POT_WIN', 'TOURNAMENT_ENTRY', 'TOURNAMENT_PRIZE',
  'LOAN_FUNDED_OUT', 'LOAN_FUNDED_IN', 'LOAN_REPAYMENT_OUT', 'LOAN_REPAYMENT_IN',
  'GIFT_CODE', 'FREE_RECHARGE', 'DAILY_LOGIN', 'DAILY_CHALLENGE', 'DEV_TOPUP', 'WITHDRAW',
];
ledgerReasons.forEach((r) => emit(`  • ${r}`));

subsection('Annexe C — Catégories leaderboard');
['xp', 'chips', 'poker_wins', 'belote_wins', 'slot_biggest', 'roulette_biggest', 'blackjack_biggest'].forEach((c) => emit(`  • ${c}`));

subsection('Annexe D — Défis quotidiens');
emit('  WIN_WITH_PAIR — Gagner main poker avec paire ou mieux');
emit('  WIN_200_ROULETTE — Gagner 200+ net roulette');
emit('  PLAY_5_TIMES — Jouer 5 parties multijoueur');
emit('  WIN_200_SLOT — Gagner 200+ net slot');

subsection('Annexe E — Composants UI shadcn (Radix)');
walk(path.join(ROOT, 'client/src/components/ui'), ['.tsx']).forEach((f) => emit(`  ${path.basename(f)}`));

subsection('Annexe F — Schéma Prisma champ par champ');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const blocks = schema.split(/\n(?=model |enum )/);
  for (const block of blocks) {
    const head = block.match(/^(model|enum) (\w+)/);
    if (!head) continue;
    emit(`  ${head[1].toUpperCase()} ${head[2]}`);
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      if (trimmed.startsWith('model ') || trimmed.startsWith('enum ')) continue;
      emit(`    ${trimmed}`);
    }
    emit('');
  }
}

subsection('Annexe G — Variables d\'environnement serveur');
const envExample = path.join(ROOT, 'server/.env.example');
if (fs.existsSync(envExample)) {
  fs.readFileSync(envExample, 'utf8').split('\n').forEach((line) => {
    if (line.trim() && !line.startsWith('#')) emit(`  ${line}`);
    else if (line.startsWith('#')) emit(`  ${line}`);
  });
}

subsection('Annexe H — Jobs GitLab CI (.gitlab-ci.yml)');
const ciPath = path.join(ROOT, '.gitlab-ci.yml');
if (fs.existsSync(ciPath)) {
  const ci = fs.readFileSync(ciPath, 'utf8');
  [...ci.matchAll(/^(\w[\w:-]*):$/gm)].forEach((m) => emit(`  Job : ${m[1]}`));
}

subsection('Annexe I — Documentation Docs/');
walk(path.join(ROOT, 'Docs'), ['.md', '.adoc', '.txt']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe J — Tests serveur (__tests__)');
walk(path.join(ROOT, 'server/src/__tests__'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe K — Tests client');
walk(path.join(ROOT, 'client/src'), ['.test.ts', '.test.tsx']).forEach((f) => emit(`  ${rel(f)}`));
walk(path.join(ROOT, 'client/e2e'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe L — Modules logic/ serveur (détail)');
walk(path.join(ROOT, 'server/src/logic'), ['.ts']).forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const exports = [...content.matchAll(/export (?:async )?(?:function|const|class|type|enum) (\w+)/g)].map((m) => m[1]);
  emit(`  ${rel(f)}`);
  if (exports.length) emit(`    Exports : ${exports.join(', ')}`);
  emit('');
});

subsection('Annexe M — Règles détaillées poker (GameTable)');
emit(padLines(`
  - 2 à 9 joueurs par table (cash game configurable via salle d'attente)
  - Small blind / big blind forcés, bouton dealer tourne
  - Actions : FOLD, CHECK, CALL, RAISE, ALL_IN
  - Minimum raise = dernier raise ou big blind
  - Side pots calculés pour all-in multiples (potSettlement.ts)
  - Mains classées : High Card → Royal Flush (Evaluator.ts)
  - Kicker rules standard Texas Hold'em
  - Timeout tour : fold automatique ou check si possible
  - Entre mains : délai configurable, tous doivent ready en tournoi
`));

subsection('Annexe N — Règles détaillées belote');
emit(padLines(`
  - 32 cartes (7 à As), 4 joueurs en sens horaire
  - Phase enchères : classique (prendre/passer) ou contrée (chiffres) selon variante
  - Atout désigné, obligé de fournir couleur, monter atout si impossible
  - Belote/Rebelote déclarable (Roi+Dame atout)
  - Comptage points : 10 dernier pli, capot, coinche multiplicateur
  - Variante CONTEE : enchères chiffrées spécifiques (conteeLegalBids.ts)
  - Score cible partie configurable à la création salle
`));

subsection('Annexe O — Limites mises casino');
emit(padLines(`
  Crash     : min 10, max 500, step 10
  Mines     : min 10, max 500, step 10, mines 1-20
  Wheel     : min 10, max 500, step 10
  Lucky Num : min 10, max 500, step 10, numéro 1-10, mult 8×
  Roulette  : min 10, max 750/ligne, max 5000 total, 40 mises max
  Slot      : min 10, max 1000 (effectif selon niveau joueur)
  Blackjack : max 1000 cap, solo + multi
  Belote    : buy-in défini par host à création
  Poker     : buy-in min/max par salle d'attente
`));

subsection('Annexe P — Badges et niveaux gamification');
emit(padLines(`
  Niveaux 1-99 via courbe XP (gamification.ts)
  Badges : novice, regular, veteran, expert, legend (seuils XP)
  XP sources : poker showdown win/loss, belote play/win, blackjack hand,
               slot/roulette play, défis quotidiens, connexion streak
  getEffectiveSlotMaxBet(level) : plafond mise slot augmente avec niveau
`));

subsection('Annexe Q — Tous les services serveur (server/src/services/)');
walk(path.join(ROOT, 'server/src/services'), ['.ts']).forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const exports = [...content.matchAll(/export (?:async )?(?:function|const|class) (\w+)/g)].map((m) => m[1]);
  emit(`  ${rel(f)}`);
  emit(`    Exports : ${exports.join(', ') || '(voir fichier)'}`);
});

subsection('Annexe R — Middleware serveur');
walk(path.join(ROOT, 'server/src/middleware'), ['.ts']).forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const exports = [...content.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
  emit(`  ${rel(f)} : ${exports.join(', ')}`);
});

subsection('Annexe S — Modules poker/ serveur');
walk(path.join(ROOT, 'server/src/poker'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe T — Modules tournament/ serveur');
walk(path.join(ROOT, 'server/src/tournament'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe U — Modules belote/ et blackjack/ serveur');
walk(path.join(ROOT, 'server/src/belote'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));
walk(path.join(ROOT, 'server/src/blackjack'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe V — Modules voice/ serveur');
walk(path.join(ROOT, 'server/src/voice'), ['.ts']).forEach((f) => emit(`  ${rel(f)}`));

subsection('Annexe W — Clés i18n principales (namespaces translation.json)');
const i18nFr = path.join(ROOT, 'client/src/i18n/locales/fr/translation.json');
if (fs.existsSync(i18nFr)) {
  try {
    const json = JSON.parse(fs.readFileSync(i18nFr, 'utf8'));
    function flattenKeys(obj, prefix = '') {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) flattenKeys(v, key);
        else emit(`  ${key}`);
      }
    }
    flattenKeys(json);
  } catch { emit('  (parse error)'); }
}

subsection('Annexe X — Scénarios utilisateur étendus (20)');
const scenariosExt = [
  'Visiteur lit article news /news/changelog-mai-2026-minijeux-solo puis s\'inscrit',
  'Joueur change langue AR → interface RTL, retour FR',
  'Joueur active 2FA, déconnexion, reconnexion avec code Authenticator',
  'Host salle privée poker rejette demande join d\'inconnu',
  'Spectateur poker rejoint JOIN_SPECTATE, chat table en lecture',
  'Joueur quitte table mid-hand → confirmation QuitGameConfirmDialog → fold forcé ou abandon selon règles',
  'Revanche poker POST /waiting-room/rematch après partie amis',
  'Joueur mines révèle 12 cases safe → auto cashout max grille',
  'Joueur crash oublie cashout → reconcile serveur 90s → peut relancer',
  'Roulette tutorial mode sans débit réel sur /tutorial/roulette',
  'Slot spin idempotent : double clic réseau → une seule transaction',
  'Blackjack multi : 3 joueurs, un double down, dealer bust → payouts',
  'Belote coinche : enchère 80 contrée, multiplicateur score',
  'Tournoi 16 joueurs : 4 tables round 1 → fusion → table finale',
  'Paris vainqueur tournoi avant start → pool parimutuel',
  'Emprunteur rembourse prêt via gains roulette automatiques',
  'Signalement joueur POST /reports/player raison CHEATING',
  'Admin console supprime salle waiting room orpheline',
  'Electron app détecte update → télécharge depuis api.quantum-bluff.com/updates',
  'Capacitor Android : build APK, API absolue Render, socket WSS',
];
scenariosExt.forEach((s, i) => emit(`  ${i + 1}. ${s}`));

subsection('Annexe Y — Erreurs API courantes (codes)');
const errorCodes = [
  ['401', 'Non authentifié — token manquant/expiré'],
  ['403', 'Accès refusé — salle privée, ban, blocage'],
  ['409', 'Conflit — INSUFFICIENT_CHIPS, ACTIVE_CRASH_ROUND, SESSION_ACTIVE, TABLE_LOCKED'],
  ['410', 'Session expirée — TABLE_SESSION_RESET belote/blackjack recovery'],
  ['400', 'Validation Zod — INVALID_BET, BET_TOO_HIGH, code métier'],
  ['429', 'Rate limit dépassé'],
  ['500', 'Erreur serveur interne'],
];
errorCodes.forEach(([c, d]) => emit(`  HTTP ${c} : ${d}`));

subsection('Annexe Z — Parcours navigation Layout.tsx (menu principal)');
emit(padLines(`
  Lobby (/lobby) — hub central onglets : poker, belote, blackjack, tournois, minijeux, amis
  Profil (/profile) — stats, solde, streak, lien edit-profile
  Amis (/friends) — liste, chat, demandes, prêts
  Classement (/leaderboard) — multi catégories
  Minijeux (/minigames) — roulette, slots, hubs quick-solo et retro
  Paramètres (SettingsMenu) — audio, accessibilité, langue, thème table
  Notifications (NotificationCenter) — invitations, amis, système
  Voice (VoiceContext) — panneau micro sur tables et appels
`));

emit('');
emit('================================================================================');
emit('                              FIN DU RAPPORT');
emit(`                    Total lignes : ${lines.length}`);
emit('================================================================================');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Rapport écrit : ${OUT}`);
console.log(`Lignes : ${lines.length}`);
