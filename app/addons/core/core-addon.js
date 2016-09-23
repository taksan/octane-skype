const electron = require('electron');
const ipc      = electron.ipcRenderer;
const url      = require('url');
const whenAvailable = require('../../octane/utils').whenAvailable;
const path = require('path');
const fs   = require('fs');

$ = require('jquery');

const refreshInterval = 300000;

module.exports.addonName = function () {
    return "core-addon";
};

var handlersInitialized = false;
module.exports.initBackend = function (webview, settingsForCore, mainSettings) {
    var defaultCssFile = path.join(__dirname, "image-viewer.css");
    webview.insertCSS(fs.readFileSync(defaultCssFile, 'utf8'));

    if (!mainSettings.ZoomFactor)
        mainSettings.ZoomFactor = 1;

    if (handlersInitialized)
        return;
    handlersInitialized = true;
    webview.addEventListener('did-stop-loading', function () {
        webview.getWebContents().setZoomFactor(mainSettings.ZoomFactor);
    });

    webview.addEventListener("ipc-message", function(event) {
        switch(event.channel) {
            case 'changeZoomLevel':
                mainSettings.ZoomFactor = mainSettings.ZoomFactor + event.args/100;
                webview.getWebContents().setZoomFactor(mainSettings.ZoomFactor);
                break;
        }
    });
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

            var $elem = $(event.target).closest('a.thumbnailHolder');
            if ($elem.length == 0)
                return;
            if (!config.NativeImageViewer)
                openImageInside($elem.prop('href'));
            else
                ipc.send('open-with-native-viewer', $elem.prop('href'));
        });

        document.addEventListener('keyup', function(e) {
            if (e.code == "Escape") {
                if (imgfull.is(":visible")) {
                    imgfull.hide();
                }
            }
        });
    });
}

var imgfull, justClicked = false;
function openImageInside(imgLink) {
    //electron.shell.openExternal(imgLink);
    justClicked = true;
    if (!imgfull) {
        imgfull = $(`<img class="modal-content" id="img01" src="${imgLink}">`);
        $(".mainStage").append(imgfull);
        document.addEventListener("click", function(e) {
            if (!justClicked && imgfull.is(":visible"))
                imgfull.hide();
            justClicked = false;
        });
    }
    else {
        imgfull.hide();
        imgfull.prop("src", imgLink);
    }

    imgfull.show();
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