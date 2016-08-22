var electron  = require('electron');
var themes    = require('./themeManager');
var addons    = require('./addonManager');
var octaneApp = electron.remote.require('../octane/Octane');
var skypeView = document.getElementById('skype-view');

addons.initialize(skypeView);

skypeView.addEventListener('did-navigate', () => {
    var theme = octaneApp.settings().Theme;
    themes.load(skypeView, theme);
    addons.loadAddonsCss(skypeView, theme);
});

skypeView.addEventListener('did-stop-loading', (e) => {
    if (!e.target.getURL().match(/https:\/\/web.skype.com\/.+\/.*/))
        return;

    skypeView.send("main-window-loaded", addons.getNames());
});

skypeView.addEventListener('ipc-message', (event) => {
    switch(event.channel){
        case 'unseen-chat-changed':
            octaneApp.setNotificationCount(event.args);
            break;
        case 'focus':
            octaneApp.show();
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
