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

// Ignorer les erreurs de certificat SSL (car le certificat du serveur de l'école est expiré)
app.commandLine.appendSwitch('ignore-certificate-errors');

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

  win.once('show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  win.show();
}

// Événements auto-updater
autoUpdater.on('checking-for-update', () => {
  log.info('Vérification des mises à jour...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Mise à jour disponible:', info.version);
  dialog.showMessageBox({
    type: 'info',
    title: 'Mise à jour disponible',
    message: `Une nouvelle version (v${info.version}) est disponible. Téléchargement en cours...`,
    buttons: ['OK']
  });
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
  log.info('Mise à jour téléchargée:', info.version);
  dialog.showMessageBox({
    type: 'info',
    title: 'Mise à jour prête',
    message: 'La mise à jour a été téléchargée. Redémarrer pour appliquer les changements ?',
    buttons: ['Redémarrer', 'Plus tard']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

app.whenReady().then(createWindow);

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
