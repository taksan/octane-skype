const fs     = require('fs');
const path   = require('path');

var addOns = [];
module.exports.initialize = function () {
    let addonsFolder = path.join(__dirname, '..', 'addons');
    fs.readdirSync(addonsFolder).forEach(function (addonOnPackage) {
        let packageFolder = path.join(addonsFolder, addonOnPackage);
        fs.readdirSync(packageFolder).forEach(function (addOn) {
            if (!addOn.endsWith("-addon.js"))
                return;
            var addonPath = path.join(__dirname, '..', 'addons/' + addonOnPackage, addOn);
            addOns[addonPath] = require(addonPath);
        });
    });
}

module.exports.loadAddonsCss = function(webview, theme) {
    for (var addonFile in addOns) {
        var addon = addOns[addonFile];
        if (!addon.cssToLoad)
            continue;

        addon.cssToLoad(theme).forEach(function (cssToLoad) {
            var cssFullPath = addonFile.replace(/\/[^/]*.js$/, "/" + cssToLoad);
            loadCss(webview, addon, cssFullPath);
        });
    }
}

module.exports.getNames = function() {
    var addonFiles = [];
    for(var addonFile in addOns)
        addonFiles.push(addonFile)
    return addonFiles;
}

function loadCss(webview, addOn, cssFileName) {
    fs.readFile(cssFileName, 'utf8', function (err, cssFile) {
        if (addOn.preprocessCss)
            cssFile = addOn.preprocessCss(cssFile);
        webview.insertCSS(cssFile);
    });
}