const fs     = require('fs');
const path   = require('path');
const stylus = require('stylus');

module.exports.load = function(webView, theme) {
    if (!theme) return;
    let folder = path.join(__dirname, '..', 'themes', theme);
    let p = path.join(folder, 'skype.styl');
    fs.readFile(p, 'utf8', (err, styl) => {
        stylus(styl)
            .include(folder)
            .render((err, css) => webView.insertCSS(css));
    });
}

module.exports.getThemeList = function() {
    let folder = path.join(__dirname, '..', 'themes');
    var themeList = [{value: "", label: "Web Skype"}]
    fs.readdirSync(folder).forEach(function (themeName) {
        let themeDescriptorFile = path.join(folder, themeName, "theme.json");
        let themeData = JSON.parse(fs.readFileSync(themeDescriptorFile, 'utf8'));
        themeList.push({value: themeName, label: themeData.name});
    });
    return themeList;
}