'use strict';
require('app-module-path').addPath(__dirname+"/../");
const electron = require('electron');
const ipc = require('electron').ipcRenderer;

// this is a hack that makes the window raise, because skype's notification onclick invoke window.focus
var previousFocus = window.focus;
window.focus = function() {
    ipc.send('focus');
    previousFocus.apply(this, arguments)
};

ipc.on('main-window-focused', function () {
    // focus message textarea whenever the window comes up
    if (window.document.querySelector("textarea")) {
        window.document.querySelector("textarea").focus();
    }
    else {
        console.log("NOTHING TO FOCUS");
    }
});

var mainWindowLoadedInitialized = false;
ipc.on('main-window-loaded', function (event, addOnList, settingsJson) {
    if (mainWindowLoadedInitialized) return;
    mainWindowLoadedInitialized = true;

    const settingsClient = require("octane/settings-client");
    settingsClient.initialize(settingsJson);

    const whenAvailable = require('octane/utils').whenAvailable;

    addOnList.forEach(function (addOn) {
        try {
            var addonModule = require(addOn);
            if (!addonModule.initUi)
                return;

            if (addonModule.dependsOnElement)
                whenAvailable(addonModule.dependsOnElement())
                    .done(()=>
                    addonModule.initUi(settingsClient.forAddon(addonModule.addonName()), settingsClient));
            else
                addonModule.initUi(settingsClient.forAddon(addonModule.addonName()), settingsClient);

        } catch (err) {
            console.error("Failed to load AddOn : " + addOn);
            console.error(err);
        }
    });
});

ipc.on('status-change', function(event, status) {
    document.querySelector(".PresencePopup-status--" + status).click();
});