const electron      = require('electron');
const path          = require('path');
const fs            = require('fs');
const themeManager  = require('./themeManager')

var settingsFile = path.join(electron.app.getPath('userData'), 'settings.json');

module.exports = {
    config: {
        window: {
            width: 1024,
            height: 768
        },
        Theme: "dark-compact",
        addons:{},
        StartMinimized: false
    },

    metadata: {
        main: {
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
            }
        },
        addons: {}
    },

    loadConfiguration: function() {
        if (!fs.existsSync(settingsFile))
            this.saveConfiguration();

        Object.assign(this.config, JSON.parse(fs.readFileSync(settingsFile)));
    },

    saveConfiguration: function() {
        let data = JSON.stringify(this.config, null, "  ");
        let tmpFile = settingsFile + '.tmp';

        fs.writeFileSync(tmpFile, data);
        fs.renameSync(tmpFile, settingsFile);
    },

    settingsUpdate: function (attribute, value) {
        var attributePath =attribute.split("_");
        if (attributePath[0] == "main")
            module.exports.config[attributePath[1]] = value;
        else
            module.exports.config.addons[attributePath[0]][attributePath[1]] = value;

        module.exports.saveConfiguration();
    }
}