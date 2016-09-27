const electron      = require('electron');
const path          = require('path');
const fs            = require('fs');
const themeManager  = require('./themeManager');
const addonManager  = require('./addOnManager');
const os            = require('os');
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
                description: "",
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
                description: "Use the native viewer to open images instead of internal panel",
                type: "boolean"
            }
        },
        addons: {}
    },

    autoStartFile: function() {
        return os.homedir() + "/.config/autostart/octane.desktop";
    },

    autoStartFileExists: function() {
        var autostartFile = this.autoStartFile();
        try {
            fs.readlinkSync(autostartFile);
            return true;
        } catch(ex) {
            return false;
        }
    },

    loadConfiguration: function() {
        if (!fs.existsSync(settingsFile))
            this.saveConfiguration();

        Object.assign(this.config, JSON.parse(fs.readFileSync(settingsFile)));
        module.exports.config.AutoStart = this.autoStartFileExists();

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
        else {
            if (typeof config.addons[addon] == "undefined")
                config.addons[addon] = {};
            config.addons[addon][configKey] = value;
        }

        module.exports.saveConfiguration();
    }
};
ipcMain.on("settings-update", (e, addon, configKey, value)=>{
    module.exports.settingsUpdate(addon, configKey, value);
    if (configKey != "AutoStart") e.returnValue = { success: true };
});