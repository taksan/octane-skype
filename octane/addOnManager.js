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

module.exports.initBackend = function(webview, settingsFunction) {
    var settings = settingsFunction().config;
    for (var addonFile in addOns) {
        var addon = addOns[addonFile];
        if (addon.cssToLoad)
            addon.cssToLoad(settings.Theme).forEach(function (cssToLoad) {
                var cssFullPath = addonFile.replace(/\/[^/]*.js$/, "/" + cssToLoad);
                loadCss(webview, addon, cssFullPath);
            });
        if (addon.initBackend)
            addon.initBackend(webview, settingsFunction);
    }
};

module.exports.getNames = function() {
    var addOnFiles = [];
    for(var addOnFile in addOns)
        addOnFiles.push(addOnFile)
    return addOnFiles;
};

function loadCss(webview, addOn, cssFileName) {
    fs.readFile(cssFileName, 'utf8', function (err, cssFile) {
        if (addOn.preprocessCss)
            cssFile = addOn.preprocessCss(cssFile);
        webview.insertCSS(cssFile);
    });
}