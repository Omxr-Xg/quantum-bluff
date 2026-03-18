# Quantum Bluff – Build applications desktop et mobile

Ce guide explique comment générer les différentes versions de l’application Quantum Bluff.

---

## Application desktop (Electron)

L’application desktop utilise Electron et produit des exécutables `.exe` (Windows), `.dmg`/`.app` (macOS) ou `.AppImage` (Linux).

### Prérequis

- **Node.js** (v18+ recommandé)
- **npm** ou **yarn**
- Pour Windows : pas de prérequis supplémentaire
- Pour macOS : **Xcode Command Line Tools** (`xcode-select --install`)
- Pour Linux : `libgtk-3-dev`, `libnotify-dev`, etc.

### Commandes

Depuis le dossier du projet :

```bash
cd client
```

| Commande | Description |
|----------|-------------|
| `npm run electron` | Lance l’app Electron (charge la VM en prod) |
| `npm run electron:dev` | Lance Vite + Electron (dev local) |
| `npm run electron:build` | Build pour la plateforme courante |
| `npm run electron:build:win` | Build Windows (.exe) |
| `npm run electron:build:mac` | Build macOS (.dmg) |
| `npm run electron:build:linux` | Build Linux (.AppImage) |

### Build Windows (.exe)

```bash
cd client
npm run build
npm run electron:build:win
```

Les fichiers sont générés dans `client/dist-electron/` :
- Installateur NSIS : `Quantum Bluff Setup X.X.X.exe`

### Comportement de l’app Electron

- Charge l’URL de production : `https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/`
- Vérifie les mises à jour via `electron-updater`
- En dev : `electron:dev` lance Vite sur le port 5175 puis ouvre Electron

### Configuration

- `client/electron.cjs` : script principal Electron
- `client/package.json` → section `"build"` : config electron-builder (icônes, NSIS, etc.)

---

## Application mobile (Capacitor)

L’application mobile utilise Capacitor pour générer des APK (Android) et des apps iOS.

### Prérequis

- **Node.js** (v18+)
- **Android Studio** (pour Android)
- **Xcode** (pour iOS, uniquement sur macOS)
- **Java JDK 17+** (pour Android)

### Configuration backend (mobile)

Sur mobile, `localhost` désigne l’appareil. L’API et les WebSockets doivent pointer vers le serveur (IP ou domaine public).

**Option 1 – Variables d’environnement**

Créer `client/.env` ou `client/.env.production` :

```env
VITE_API_URL=http://185.155.93.105:3000
VITE_SOCKET_URL=http://185.155.93.105:3000
```

**Option 2 – Script dédié**

Le script `build:cap` utilise déjà ces variables :

```bash
npm run build:cap
```

### Build Android (APK)

#### 1. Build web

```bash
cd client
npm run build:cap
```

Ou avec `.env` configuré :

```bash
npm run build
```

#### 2. Ajouter la plateforme Android (première fois)

```bash
npx cap add android
```

#### 3. Synchroniser le build vers le projet natif

```bash
npx cap copy
npx cap sync
```

#### 4. Ouvrir Android Studio

```bash
npx cap open android
```

Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)** pour générer l’APK.

Ou en une commande :

```bash
npm run cap:android
```

### Build iOS

> ⚠️ Nécessite macOS et Xcode.

#### 1. Build web

```bash
cd client
npm run build:cap
```

#### 2. Ajouter la plateforme iOS (première fois)

```bash
npx cap add ios
```

#### 3. Synchroniser

```bash
npx cap copy
npx cap open ios
```

Dans Xcode : choisir le simulateur ou un appareil, puis **Product → Archive** pour créer une app distribuable.

Ou en une commande :

```bash
npm run cap:ios
```

### Dev avec live reload (mobile)

Pour recharger l’app à chaque modification :

1. Lancer Vite sur la machine de dev :
   ```bash
   npm run dev
   ```

2. Renseigner l’URL dans `client/.env` :
   ```env
   CAPACITOR_SERVER_URL=http://<TON_IP>:5173
   ```

3. Lancer l’app sur appareil/simulateur :
   ```bash
   npm run cap:run:android
   ```

L’app se connecte au serveur de dev et recharge automatiquement.

### Scripts Capacitor

| Commande | Description |
|----------|-------------|
| `npm run cap:copy` | Copie le build vers le projet natif |
| `npm run cap:sync` | Copy + met à jour les dépendances natives |
| `npm run cap:android` | Build + copy + ouvre Android Studio |
| `npm run cap:ios` | Build + copy + ouvre Xcode |
| `npm run build:cap` | Build pour mobile (base `/`, URLs externes) |
| `npm run cap:run:android` | Lance Android avec live reload |

### CORS côté serveur

Le serveur doit autoriser les origines Capacitor. Dans `server/src/index.ts`, les origines suivantes sont déjà prévues :

- `capacitor://localhost`
- `http://185.155.93.105` (et variantes)
- `http://localhost`

---

## Récapitulatif

| Cible | Commande(s) | Sortie |
|-------|-------------|--------|
| Windows .exe | `cd client && npm run electron:build:win` | `dist-electron/` |
| macOS .dmg | `cd client && npm run electron:build:mac` | `dist-electron/` |
| Linux .AppImage | `cd client && npm run electron:build:linux` | `dist-electron/` |
| Android APK | `cd client && npm run build:cap && npx cap sync && npx cap open android` | Android Studio → Build APK |
| iOS | `cd client && npm run build:cap && npx cap sync && npx cap open ios` | Xcode → Archive |

---

## Dépannage

### Electron : l’app ne charge pas

Vérifier que la VM est accessible et que l’URL dans `electron.cjs` (`win.loadURL(...)`) est correcte.

### Capacitor : l’app ne se connecte pas au backend

1. Vérifier `VITE_API_URL` et `VITE_SOCKET_URL` dans `.env`
2. Vérifier les CORS sur le serveur
3. Sur Android, vérifier que `cleartext: true` est activé dans `capacitor.config.ts` pour HTTP

### Build Capacitor échoue

S’assurer d’avoir exécuté `npm run build` (ou `build:cap`) avant `npx cap copy`.
