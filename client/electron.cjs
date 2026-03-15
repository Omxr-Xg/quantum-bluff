const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

// Configuration des logs
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configuration du serveur de mises à jour
const serverUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0';

autoUpdater.setFeedURL({
  provider: 'generic',
  url: `${serverUrl}/updates/`
});

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

  // On charge le jeu hébergé sur la VM
  win.loadURL('https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/');

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
