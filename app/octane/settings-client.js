const ipc = require('electron').ipcRenderer;

var settings = {};

module.exports.initialize = function(settingsJson) {
    if (typeof settingsJson == 'object')
        settingsJson = JSON.stringify(settingsJson); // 'clone'

    settings = JSON.parse(settingsJson);
};

module.exports.Settings = function (addon) {
    return module.exports.forAddon(addon);
};

var changeListener = [];
module.exports.forAddon = function(addon) {
    var handler = {
        get: function(target, name){
            if (name == "observe")
                return target.observe;

            if (addon == "main")
                return target[name];

            if (typeof target.addons[addon] == "undefined")
                target.addons[addon] = {};
            return target.addons[addon][name];
        },
        set: function(target, name, value){
            var res = ipc.sendSync("settings-update", addon, name, value);
            if (!res.success)
                throw new Error(res.message);

            if (addon == "main")
                target[name] = value;
            else {
                if (typeof target.addons[addon] == "undefined")
                    target.addons[addon] = {};
                target.addons[addon][name] = value;
            }

            changeListener.forEach(function(listener){
                if (listener.addon == addon && listener.attribute == name) {
                    listener.callback(value);
                }
            });
        }
    };
    settings.config.observe = function (attribute, fn) {
        changeListener.push({
            addon: addon,
            attribute: attribute,
            callback: fn
        });
    };

    return new Proxy(settings.config, handler);
};

module.exports.forEachAddon = function(fn) {
    fn(new AddOn("main", settings.metadata.main, settings.config));

    for(var addOnName in settings.config.addons)
        fn(new AddOn(addOnName, settings.metadata.addons[addOnName], settings.config.addons[addOnName]));
};

function AddOn(addonName, metadata, config) {
    this.name = addonName;

    this.forEachDefinition = function (fn) {
        for (var defName in metadata) {
            var definition = Object.assign({}, metadata[defName]);
            definition.name = defName;
            definition.currentValue = config[defName];
            fn(definition);
        }
    };

    this.update = function(key, value) {
        try {
            var config = module.exports.forAddon(addonName);
            config[key] = value;
        } catch (error) {
            alert(error.message);
            return false;
        }

        return true;
    }
}