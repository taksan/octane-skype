const electron  = require('electron');
const themes    = require('../octane/themeManager');
const addOns    = require('../octane/addOnManager');
const octaneApp = electron.remote.require('../octane/Octane');
const skypeView = document.getElementById('skype-view');

addOns.initialize(skypeView, octaneApp);

skypeView.addEventListener('did-navigate', () => {
    var theme = octaneApp.settings().config.Theme;
    themes.load(skypeView, theme);
    addOns.initBackend(skypeView, octaneApp.settings().config);
});

skypeView.addEventListener('did-stop-loading', (e) => {
    if (!e.target.getURL().match(/https:\/\/web.skype.com\/.+\/.*/))
        return;

    skypeView.send("main-window-loaded", addOns.getNames(), JSON.stringify(octaneApp.settings()));
});

skypeView.addEventListener('ipc-message', (event) => {
    switch(event.channel){
        case 'unseen-chat-changed':
            octaneApp.setNotificationCount(event.args);
            break;
        case 'focus':
            octaneApp.show();
            break;
        case 'settings-update':
            octaneApp.settings().settingsUpdate(event.args[0], event.args[1]);
            break;
    }
});

electron.ipcRenderer.on('main-window-focused', () => {
    skypeView.focus();
    skypeView.send('main-window-focused', null);
});

skypeView.addEventListener('console-message', (e) =>
    console.log('Guest page logged a message:', e.message)
);

electron.ipcRenderer.on("status-change", function(event, status) {
    // default to idle if status not found
    if (status != "online" && status != "idle" && status != "dnd" && status != "hidden")
        status = "idle";

    skypeView.send('status-change', status);
});