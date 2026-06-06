const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

// Configuration des logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Prod : surcharger avec QB_UPDATES_BASE_URL (ex. https://hôte/vm.../ sans /updates/)
const defaultProdOrigin =
  process.env.QB_PUBLIC_URL || 'https://api.quantum-bluff.com';
const updatesBase =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.QB_UPDATES_BASE_URL || defaultProdOrigin;

autoUpdater.setFeedURL({
  provider: 'generic',
  url: `${updatesBase.replace(/\/$/, '')}/updates/`,
});

/**
 * Mises à jour — deux niveaux :
 * 1) Interface (React) : en build packagé, la fenêtre charge le bundle Vite embarqué (dist/index.html)
 *    pour refléter le contenu du DMG / de l’installeur. L’API reste celle définie au build (--mode electron).
 *    En dev, la fenêtre charge le serveur Vite (localhost).
 * 2) Installateur Electron (.exe / .dmg) : electron-updater lit …/updates/latest.yml (et équivalent Mac).
 *    Dialogue demandant l’accord → téléchargement → installation et redémarrage automatiques.
 *    Publier les artefacts sur l’hôte de mises à jour + bumper client/package.json version.
 */
if (app.isPackaged) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
}

// Ignorer les erreurs de certificat SSL (car le certificat du serveur de l'école est expiré)
app.commandLine.appendSwitch('ignore-certificate-errors');

/** Fenêtre principale (pour attacher les boîtes de dialogue de mise à jour). */
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    const devUrl =
      process.env.ELECTRON_DEV_URL || 'http://localhost:5175/';
    win.loadURL(devUrl);
  } else {
    // Toujours charger le bundle embarqué (file://) hors dev pour éviter
    // la boucle de redirects vue avec BrowserRouter sur l'URL distante
    // (npm run electron sans packager + AdminProtectedRoute/ProtectedRoute).
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }

  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.once('show', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch((e) => log.error('checkForUpdates', e));
    }
  });

  win.show();
}

// Événements auto-updater
autoUpdater.on('checking-for-update', () => {
  log.info('Vérification des mises à jour...');
});

autoUpdater.on('update-available', async (info) => {
  log.info('Mise à jour disponible:', info.version);
  const parent =
    mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const opts = {
    type: 'info',
    title: 'Mise à jour de Quantum Bluff',
    message: `Une nouvelle version (${info.version}) est disponible.`,
    detail:
      'Souhaitez-vous la télécharger et installer maintenant ? L’application redémarrera automatiquement.',
    buttons: ['Installer', 'Plus tard'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);

  if (response !== 0) {
    log.info('Mise à jour refusée par l’utilisateur');
    return;
  }
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    log.error('downloadUpdate', err);
    const errOpts = {
      type: 'error',
      title: 'Mise à jour',
      message: 'Le téléchargement a échoué.',
      detail:
        'Vérifie ta connexion et réessaie au prochain lancement ou depuis le menu.',
      buttons: ['OK'],
    };
    if (parent) await dialog.showMessageBox(parent, errOpts);
    else await dialog.showMessageBox(errOpts);
  }
});

autoUpdater.on('update-not-available', () => {
  log.info('Aucune mise à jour disponible');
});

autoUpdater.on('error', (err) => {
  log.error('Erreur de mise à jour:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Téléchargement: ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Mise à jour téléchargée, installation:', info.version);
  // L’utilisateur a déjà accepté dans update-available — redémarrage pour appliquer.
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (e) {
    log.error('quitAndInstall', e);
  }
});

app.whenReady().then(() => {
  createWindow();
  if (!app.isPackaged) return;
  const CHECK_MS = 4 * 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Auto-update périodique échouée', err);
    });
  }, CHECK_MS);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
