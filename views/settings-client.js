const ipc = require('electron').ipcRenderer;

var settings = null;

module.exports.initialize = function(settingsJson) {
    settings = JSON.parse(settingsJson);
};

module.exports.forAddon = function(addon) {
    var handler = {
        get: function(target, name){
            if (addon == "main")
                return settings.config[name];
            else
                return settings.config.addons[addon][name];
        }
    };

    return new Proxy({}, handler);
};

module.exports.forEachAddon = function(fn) {
    fn(new AddOn("main", settings.metadata.main, settings.config));

    for(var addOnName in settings.config.addons)
        fn(new AddOn(addOnName, settings.metadata.addons[addOnName], settings.config.addons[addOnName]));
};

function AddOn(name, metadata, config) {
    this.name = name;

    this.forEachDefinition = function (fn) {
        for (var defName in metadata) {
            var definition = Object.assign({}, metadata[defName]);
            definition.name = defName;
            definition.currentValue = config[defName];
            fn(definition);
        }
    };

    this.update = function(key, value) {
        ipc.send("settings-update", name, key, value);
        if (name == "main")
            settings.config[key] = value;
        else
            settings.config.addons[name][key] = value;
    }
}