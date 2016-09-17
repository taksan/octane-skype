const electron = require('electron');
const ipc      = electron.ipcRenderer;
const url      = require('url');
const whenAvailable = require('../../octane/utils').whenAvailable;

$ = require('jquery');

const refreshInterval = 300000;

module.exports.addonName = function () {
    return "core-addon";
};

module.exports.initUi = function (addonConfig, settingsClient) {
    themeLoader(settingsClient.forAddon("main"));
    keepAlive(settingsClient.forAddon("main"));
    userStatusWatcher();
    handleShowSettingsIpc();
    configureNotificationUpdates();
};

function themeLoader(addonConfig) {
    $("head").append("<style type='text/css' id='skype-theme'></style>");
    loadTheme(addonConfig.Theme);
    addonConfig.observe("Theme", (value)=>loadTheme(value))

}

function loadTheme(theme)
{
    if (theme == "") {
        document.querySelector("#skype-theme").innerHTML="";
        return;
    }
    const fs     = require('fs');
    const path   = require('path');
    const stylus = require('stylus');

    let folder = path.join(__dirname, '../..', 'themes', theme);
    let p = path.join(folder, 'skype.styl');
    fs.readFile(p, 'utf8', (err, styl) => {
        if (err) {
            console.error("Error loading theme." + err);
            return;
        }
        stylus(styl)
            .include(folder)
            .render((err, css) => {
                if (err) {
                    console.error("Error loading theme." + err);
                    return;
                }
                document.querySelector("#skype-theme").innerHTML=css;
            });
    });
}

function keepAlive(config) {
    var isIdle = true;

    function refreshIfIdle() {
        if (isIdle)
            window.location = window.location;
        isIdle = false;
    }

    var idleRefresh = setInterval(refreshIfIdle, refreshInterval);

    $(window).on('mousemove input', function () {
        isIdle = false;
        clearInterval(idleRefresh);
        idleRefresh = setInterval(refreshIfIdle, refreshInterval);
    });

    whenAvailable(".chatContainer").done(function() {
        document.querySelector(".chatContainer").addEventListener('click', function(event) {
            var $possibleLink = $(event.target).closest('a[rel*="noopener"]');
            if ($possibleLink.length) {
                electron.shell.openExternal($possibleLink.prop("href"));
                return;
            }

            if (!config.NativeImageViewer)
                return;

            var $elem = $(event.target).closest('a.thumbnailHolder');
            if ($elem.length)
                ipc.send('open-with-native-viewer', $elem.prop('href'));
        });
    });
}

function userStatusWatcher() {
    whenAvailable(".Avatar--presence").done(function(){
        new MutationObserver(function () {
            var classes = document.querySelector(".Avatar--presence").className;
            var state = classes.replace(/.*(unknown|online|idle|donotdisturb|offline).*/, "$1")
                .replace("donotdisturb", "dnd")
                .replace("offline", "hidden")
                .replace("unknown", "online");

            ipc.send('state-changed', state);
        }).observe(document.querySelector(".Avatar--presence"), {attributes: true})
    });
}

function handleShowSettingsIpc() {
    ipc.on("show-settings", function () {
        document.querySelector(".settings").click();
        whenAvailable("#octane-settings a").done(function (octaneSettings) {
            setTimeout(() => octaneSettings.click(), 10);
        })
    })
}

function configureNotificationUpdates() {
    whenAvailable("swx-sidebar").done(function (sidebar) {
        new MutationObserver(() => updateNotificationCount())
            .observe(sidebar, {subtree: true, childList: true});
    });
}

function updateNotificationCount() {
    var unreadCount = document.querySelectorAll(".unseenNotifications").length;
    ipc.send('unseen-chat-changed', unreadCount);
}