const electron      = require('electron');
const trayIcon      = require('./trayIcon');
const settings      = require('./settings');
const path          = require('path');
const fs            = require('fs');
const BrowserWindow = electron.BrowserWindow;
const app           = electron.app;
const ipcMain       = electron.ipcMain;

var initialized   = false;
var octaneWindow = null;

var OctaneSkype = {
    initialize : function() {
        if (initialized) return;

        settings.loadConfiguration();

        var options = {
            autoHideMenuBar: true,
            icon: app.getAppPath() + '/assets/skype-icon.png'
        };
        Object.assign(options, settings.config.window);
        options.show = !settings.config.StartMinimized;

        octaneWindow = new BrowserWindow(options);

        trayIcon.initialize(OctaneSkype);
        OctaneSkype.changeQuitToHide();

        octaneWindow.on('closed', () => octaneWindow = null);
        octaneWindow.on('show',   () => octaneWindow.focus());
        octaneWindow.on('focus',  () => OctaneSkype.sendIpc("main-window-focused"));
        octaneWindow.on('resize', () => OctaneSkype.updateSettingsSize());

        octaneWindow.webContents.on('will-navigate', (ev) => ev.preventDefault());

        octaneWindow.loadURL(`file://${__dirname}/../views/index.html`);

        ipcMain.on("unseen-chat-changed", (e,count) => trayIcon.setNotificationCount(count));
        ipcMain.on("focus", (e,count) => OctaneSkype.show());

        initialized = true;
    },

    changeQuitToHide: function() {
        var isQuiting = false;

        app.on('before-quit', function() {
            isQuiting = true;
        });

        octaneWindow.on('close', function(event) {
            settings.saveConfiguration();
            if (isQuiting) {
                return;
            }
            event.preventDefault();
            OctaneSkype.hide();
        });
    },

    sendIpc : function() {
        var webContents = octaneWindow.webContents;
        webContents.send.apply(webContents, arguments);
    },

    toggleOpen : function() {
        if (OctaneSkype.isVisible())
            OctaneSkype.hide();
        else
            OctaneSkype.show();

    },

    isVisible : function() {
        return octaneWindow.isVisible();
    },

    hide : function() {
        octaneWindow.hide();
    },

    show : function() {
        octaneWindow.show();
        octaneWindow.focus();
    },

    statusChange : function(status) {
        octaneWindow.webContents.send("status-change", status)
    },

    settings: function() {
        return settings;
    },

    updateSettingsSize: function() {
        Object.assign(settings.config.window, octaneWindow.getBounds())
    }
};

module.exports = OctaneSkype;