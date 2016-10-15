const Settings = require("octane/settings-client").Settings;

module.exports.isEnabled = function() {
    var addonSettings = Settings("group-directory-addon");
    return addonSettings.ServerAddress && addonSettings.DirectoryEnabled;
}