const fs     = require('fs');
const path   = require('path');

var addOns = [];
module.exports.initialize = function () {
    let addOnsFolder = path.join(__dirname, '..', 'addons');
    fs.readdirSync(addOnsFolder).forEach(function (addonOnPackage) {
        let packageFolder = path.join(addOnsFolder, addonOnPackage);
        fs.readdirSync(packageFolder).forEach(function (addOn) {
            if (!addOn.endsWith("-addon.js"))
                return;
            var addOnPath = path.join(__dirname, '..', 'addons/' + addonOnPackage, addOn);
            try {
                addOns[addOnPath] = require(addOnPath);
            }catch (err) {
                console.error("Failed to load: " + addOnPath);
                console.error(err);
            }
        });
    });
};

module.exports.initBackend = function(webview, settingsClient) {
    for (var addonFile in addOns) {
        var addon = addOns[addonFile];
        if (addon.initBackend)
            addon.initBackend(webview, settingsClient.forAddon(addon.addonName()), settingsClient.forAddon("main"));
    }
};

module.exports.forEachConfig = function(fn) {
    var self = module.exports;
    self.initialize();
    for (var key in addOns) {
        var addOn = addOns[key];
        if (addOn.getPreferences) {
            addOn.getPreferences().forEach(function(preference) {
                fn(addOn.addonName(), preference.configKey, preference.metadata)
            })
        }
    }
};

module.exports.getNames = function() {
    var addOnFiles = [];
    for(var addOnFile in addOns)
        addOnFiles.push(addOnFile)
    return addOnFiles;
};

