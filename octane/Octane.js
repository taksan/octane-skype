const electron      = require('electron')
const trayIcon      = require('./trayIcon');
const path          = require('path');
const fs            = require('fs');
const BrowserWindow = electron.BrowserWindow
const app           = electron.app;

var initialized   = false;
var octaneWindow = null;
var settingsFile = path.join(electron.app.getPath('userData'), 'settings.json');

OctaneSkype = {
    initialize : function() {
        if (initialized) return;

        this.loadSettings();

        var options = {
            autoHideMenuBar: true,
            icon: app.getAppPath() + '/assets/skype-icon.png'
        };
        Object.assign(options, this._settings.window);

        octaneWindow = new BrowserWindow(options);

        trayIcon.initialize(OctaneSkype);
        OctaneSkype.changeQuitToHide();

        octaneWindow.on('closed', () => octaneWindow = null);
        octaneWindow.on('show',   () => octaneWindow.focus());
        octaneWindow.on('focus',  () => OctaneSkype.sendIpc("main-window-focused"));
        octaneWindow.on('resize', () => OctaneSkype.updateSettingsSize());

        octaneWindow.webContents.on('will-navigate', (ev) => ev.preventDefault());

        octaneWindow.loadURL(`file://${__dirname}/../views/index.html`);

        initialized = true;
    },

    changeQuitToHide: function() {
        var isQuiting = false;

        app.on('before-quit', function() {
            isQuiting = true;
        });

        octaneWindow.on('close', function(event) {
            OctaneSkype.saveSettings();
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

    setNotificationCount : function(count) {
        trayIcon.setNotificationCount(count);
    },

    settings: function() {
        return this._settings;
    },

    updateSettingsSize: function() {
        Object.assign(this._settings.window, octaneWindow.getBounds())
    },

    loadSettings: function() {
        this._settings = {
            window: {
                width: 1024,
                height: 768
            },
            Theme: "dark-compact"
        };
        Object.assign(this._settings , JSON.parse(fs.readFileSync(settingsFile)));
    },

    saveSettings: function() {
        let data = JSON.stringify(this._settings, null, "  ");
        let tmpFile = settingsFile + '.tmp';

        fs.writeFile(tmpFile, data, (err) => {
            if (err) throw err;

            fs.rename(tmpFile, settingsFile, (err) => {
                if (err) throw err;
            });
        });
    }
}

module.exports = OctaneSkype