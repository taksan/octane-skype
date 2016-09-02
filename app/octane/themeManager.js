const fs     = require('fs');
const path   = require('path');

module.exports.getThemeList = function() {
    let folder = path.join(__dirname, '..', 'themes');
    var themeList = [{value: "", label: "Web Skype"}]
    fs.readdirSync(folder).forEach(function (themeName) {
        let themeDescriptorFile = path.join(folder, themeName, "theme.json");
        let themeData = JSON.parse(fs.readFileSync(themeDescriptorFile, 'utf8'));
        themeList.push({value: themeName, label: themeData.name});
    });
    return themeList;
};