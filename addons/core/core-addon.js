const electron = require('electron');
const ipc      = electron.ipcRenderer;
const url      = require('url');
const whenAvailable = require('../../octane/utils').whenAvailable;

$ = require('../../node_modules/jquery/dist/jquery.min.js');

const refreshInterval = 300000;

module.exports.addonName = function () {
    return "core-addon";
};

module.exports.initUi = function () {
    keepAlive();
    userStatusWatcher();
    handleShowSettingsIpc();
    configureNotificationUpdates();
};

module.exports.initBackend = function(webview, addonSettings, config) {
    webview.addEventListener('ipc-message', (event) => {
        if (event.channel != "open-link")
            return;

        var href = event.args[0];
        let protocol = url.parse(href).protocol;

        if (config.NativeImageViewer && href.indexOf('imgpsh_fullsize') >= 0)
            ipc.send('image:download', href);
        else if (protocol === 'http:' || protocol === 'https:')
            electron.shell.openExternal(href);
    });
};

function keepAlive() {
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

    document.addEventListener('click', function(event) {
        var $elem = $(event.target).closest('a.thumbnail');
        if ($elem.length) {
            ipc.sendToHost('open-link', $elem.prop('href'));
        }
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