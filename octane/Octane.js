const electron      = require('electron');
const trayIcon      = require('./trayIcon');
const settings      = require('./settings');
const path          = require('path');
const fs            = require('fs');
const BrowserWindow = electron.BrowserWindow;
const app           = electron.app;
const ipcMain       = electron.ipcMain;
const os            = require("os");

var initialized   = false;
var octaneWindow  = null;

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

        ipcMain.on("settings-update", (evt, addon, configKey, value)=> {
            if (configKey != "AutoStart") return;
            OctaneSkype.enableAutostart(evt, value);
        });

        initialized = true;
    },

    enableAutostart: function(evt, autostartEnabled) {
        var autostartFile = settings.autoStartFile();
        if (autostartEnabled) {
            let target = '/usr/share/applications/octane.desktop';
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
            console.log("enableAutostart: success");
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