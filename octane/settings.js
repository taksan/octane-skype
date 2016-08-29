const electron      = require('electron');
const path          = require('path');
const fs            = require('fs');
const themeManager  = require('./themeManager');
const addonManager  = require('./addOnManager');
const ipcMain       = electron.ipcMain;

var settingsFile = path.join(electron.app.getPath('userData'), 'settings.json');

module.exports = {
    config: {
        window: {
            width: 1024,
            height: 768
        },
        Theme: "dark-compact",
        addons:{},
        StartMinimized: false,
        NativeImageViewer: true,
        AutoStart: true
    },

    metadata: {
        main: {
            AutoStart: {
                title: "Auto Start",
                description: "Automatically starts when user logins",
                type: "boolean"
            },
            Theme: {
                title: "Theme",
                description: "Requires restart",
                type: "select",
                data: {
                    values : themeManager.getThemeList()
                }
            },
            StartMinimized: {
                title: "Start minimized",
                description: "Start with main window hidden",
                type: "boolean"
            },
            NativeImageViewer: {
                title: "Open images with native viewer",
                description: "Use the native viewer to open images instead of browser",
                type: "boolean"
            }
        },
        addons: {}
    },

    loadConfiguration: function() {
        if (!fs.existsSync(settingsFile))
            this.saveConfiguration();

        Object.assign(this.config, JSON.parse(fs.readFileSync(settingsFile)));

        addonManager.forEachConfig(function(addonName, configKey, metadata) {
            if (!module.exports.metadata.addons[addonName])
                module.exports.metadata.addons[addonName]={};
            module.exports.metadata.addons[addonName][configKey] = metadata;
            if (!module.exports.config.addons[addonName])
                module.exports.config.addons[addonName]={};
        });
    },

    saveConfiguration: function() {
        let data = JSON.stringify(this.config, null, "  ");
        let tmpFile = settingsFile + '.tmp';

        fs.writeFileSync(tmpFile, data);
        fs.renameSync(tmpFile, settingsFile);
    },

    settingsUpdate: function (addon, configKey, value) {
        var config = module.exports.config;

        if (addon == "main")
            config[configKey] = value;
        else
            config.addons[addon][configKey] = value;

        module.exports.saveConfiguration();
    }
};
ipcMain.on("settings-update", (e, addon, configKey, value)=>module.exports.settingsUpdate(addon, configKey, value));