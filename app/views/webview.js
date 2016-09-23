const electron  = require('electron');
const addOns    = require('../octane/addOnManager');
const octaneApp = electron.remote.require('../octane/Octane');
const skypeView = document.getElementById('skype-view');
const settingsClient = require("./settings-client");
const ipcRenderer = electron.ipcRenderer;

settingsClient.initialize(JSON.stringify(octaneApp.settings()));

addOns.initialize(skypeView, octaneApp);
var backendInitialized = false;
skypeView.addEventListener('did-navigate', () => {
    // if (backendInitialized)
    //     return;
    addOns.initBackend(skypeView, settingsClient);
    backendInitialized = true;
});

skypeView.addEventListener('did-stop-loading', (e) => {
    if (!e.target.getURL().match(/https:\/\/web.skype.com\/.+\/.*/))
        return;

    skypeView.send("main-window-loaded", addOns.getNames(), JSON.stringify(octaneApp.settings()));
});

skypeView.addEventListener('did-fail-load', function(event) {
    if (event.errorCode === -106) {
        ipcRenderer.send('log', 'Connection Unavailable');
        setTimeout(function () {
            skypeView.reload();
        }, 2500);
        return;
    }

    ipcRenderer.send('log', 'Failed to load: ' + JSON.stringify(event));
});

skypeView.addEventListener('console-message', (e) =>
    console.log('Guest page logged a message:', e.message)
);

ipcRenderer.on('main-window-focused', () => {
    skypeView.focus();
    skypeView.send('main-window-focused', null);
});

ipcRenderer.on('show-settings', () => {
    skypeView.send('show-settings', null);
});

ipcRenderer.on("status-change", function(event, status) {
    // default to idle if status not found
    if (status != "online" && status != "idle" && status != "dnd" && status != "hidden")
        status = "idle";

    skypeView.send('status-change', status);
});
