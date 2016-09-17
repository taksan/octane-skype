const electron      = require('electron');
const trayIcon      = require('./trayIcon');
const settings      = require('./settings');
const path          = require('path');
const fs            = require('fs');
const BrowserWindow = electron.BrowserWindow;
const app           = electron.app;
const ipcMain       = electron.ipcMain;
const os            = require("os");
const mime          = require("mime");
const tmp           = require("tmp");

var initialized   = false;
var octaneWindow  = null;
var imageCache    = {};
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

        ipcMain.on("focus", (e,count) => OctaneSkype.show());

        ipcMain.on("settings-update", (evt, addon, configKey, value)=> {
            if (configKey != "AutoStart") return;
            OctaneSkype.enableAutostart(evt, value);
        });

        ipcMain.on('open-with-native-viewer', OctaneSkype.downloadImage);

        initialized = true;
    },

    enableAutostart: function(evt, autostartEnabled) {
        var autostartFile = settings.autoStartFile();
        if (autostartEnabled) {
            let target = '/usr/share/applications/Octane-Skype.desktop';
            fs.symlink(target, autostartFile, (err) => {
                if (!err) {
                    evt.returnValue = { success: true };
                    return;
                }

                if (settings.autoStartFileExists())
                    evt.returnValue = { success: false , message: "Octane does not have permission to write to " + autostartFile};
                else
                    evt.returnValue = { success: false , message: "Failure trying to enable autostart" };
            });
        } else {
            fs.unlink(autostartFile);
            evt.returnValue = { success: true };
        }
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

    showSettings: function () {
        this.show();
        OctaneSkype.sendIpc("show-settings");

    },

    statusChange : function(status) {
        octaneWindow.webContents.send("status-change", status)
    },

    settings: function() {
        return settings;
    },

    updateSettingsSize: function() {
        Object.assign(settings.config.window, octaneWindow.getBounds())
    },

    downloadImage: function(event, url) {
        let file = imageCache[url];
        if (file) {
            if (file.complete) {
                electron.shell.openItem(file.path);
            }

            // Pending downloads intentionally do not proceed
            return;
        }

        let tmpWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                partition: 'persist:octane'
            }
        });

        tmpWindow.webContents.session.once('will-download', (event, downloadItem) => {
            imageCache[url] = file = {
                path: tmp.tmpNameSync() + '.' + mime.extension(downloadItem.getMimeType()),
                complete: false
            };

            downloadItem.setSavePath(file.path);
            downloadItem.once('done', () => {
                tmpWindow.destroy();
                tmpWindow = null;

                electron.shell.openItem(file.path);

                file.complete = true;
            });
        });

        tmpWindow.webContents.downloadURL(url);
    }
};

module.exports = OctaneSkype;