const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

// Configuration des logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Prod : surcharger avec QB_UPDATES_BASE_URL (ex. https://hôte/vm.../ sans /updates/)
const defaultProdOrigin =
  process.env.QB_PUBLIC_URL ||
  'https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0';
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
 * 1) Interface (React) : la fenêtre charge l’URL distante (QB_PUBLIC_URL) → un déploiement VM
 *    du build Vite est visible au prochain lancement / rechargement (cache navigateur habituel).
 * 2) Installateur Electron (.exe / .dmg) : electron-updater lit …/updates/latest.yml (et équivalent Mac).
 *    Il faut publier de nouveaux artefacts + bumper client/package.json version (voir Docs/DEPLOY.md).
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

  const appUrl =
    process.env.NODE_ENV === 'development'
      ? (process.env.ELECTRON_DEV_URL || 'http://localhost:5175/vmProjetIntegrateurgrp10-0/')
      : `${defaultProdOrigin.replace(/\/$/, '')}/`;
  win.loadURL(appUrl);

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
      'L’application doit se mettre à jour pour profiter des dernières corrections et améliorations. ' +
      'Souhaitez-vous télécharger et installer cette mise à jour maintenant ? ' +
      'Vous pourrez choisir le moment du redémarrage une fois le téléchargement terminé.',
    buttons: ['Mettre à jour', 'Plus tard'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);

  if (response !== 0) {
    log.info('Utilisateur a reporté la mise à jour');
    return;
  }
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    log.error('downloadUpdate', err);
    const errOpts = {
      type: 'error',
      title: 'Mise à jour',
      message: 'Le téléchargement de la mise à jour a échoué.',
      detail: 'Vérifiez votre connexion et réessayez plus tard (menu ou prochain lancement).',
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

autoUpdater.on('update-downloaded', async (info) => {
  log.info('Mise à jour téléchargée:', info.version);
  const parent =
    mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const opts = {
    type: 'info',
    title: 'Mise à jour prête',
    message: `La version ${info.version} est prête à être installée.`,
    detail:
      'Pour terminer l’installation, l’application doit redémarrer. ' +
      'Vous pouvez le faire maintenant ou plus tard au prochain lancement.',
    buttons: ['Redémarrer maintenant', 'Plus tard'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);
  if (response === 0) {
    autoUpdater.quitAndInstall();
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
