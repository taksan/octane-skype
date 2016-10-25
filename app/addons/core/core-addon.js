const electron = require('electron');
const url      = require('url');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const $        = require('jquery');

const ipc      = electron.ipcRenderer;
const whenAvailable = require('octane/utils').whenAvailable;
const join = require('./join-group-addon').join;

const refreshInterval = 300000;

module.exports.addonName = function () {
    return "core-addon";
};

var reloadedDueToCorruption = false;
module.exports.initMainProcess = function(octaneWindow) {
    const ipcMain = electron.ipcMain;
    ipcMain.on('reload-skype-due-to-corruption', function(){
        reloadedDueToCorruption = true;
        octaneWindow.reload();
    });

    ipcMain.on('was-reload-skype-due-to-corruption', function(e) {
        e.sender.send('was-reload-skype-due-to-corruption-response', reloadedDueToCorruption);
        reloadedDueToCorruption = false;
    });
};

var handlersInitialized = false;
module.exports.initHostRenderer = function (webview, settingsForCore, mainSettings) {
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

    webview.addEventListener('console-message', (e) => {
        console.log('Guest page logged a message:', e.message);
        checkCommunicationCorruption(e);
        var homeConfigDir = path.join(os.homedir(),'.octane-skype');
        if (!fs.existsSync(homeConfigDir))
            fs.mkdirSync(homeConfigDir);

        fs.appendFile(path.join(homeConfigDir,'octane.log'), new Date() + " - " + JSON.stringify(e)+"\n");
    });
};

module.exports.initUi = function (addonConfig, settingsClient) {
    themeLoader(settingsClient.forAddon("main"));
    keepAlive();
    handleLinks(settingsClient.forAddon("main"))
    userStatusWatcher();
    handleShowSettingsIpc();
    configureNotificationUpdates();
    checkReloadDueToCorruption();
};

function checkReloadDueToCorruption() {
    ipc.send('was-reload-skype-due-to-corruption');
    ipc.on('was-reload-skype-due-to-corruption-response', function(e, wasReloadedDueToCorruption) {
        if (wasReloadedDueToCorruption) {
            $("body").append(`
            <div id="corruption-warning" class="warning">
                <h1>Don't panic! </h1>
                <h2>Skype was reloaded because communications stopped functioning. 
                    Should be good now. Click on this warning to dismiss it</h2>
            </div>`);
            $("#corruption-warning").click(function() {
                $(this).remove();
            })
        }
    })
}

function checkCommunicationCorruption(e) {
    if (e.level != 2) return;
    if (e.message == "Failed to load resource: the server responded with a status of 500 (Internal Server Error)") {
        // somehow, skype state is corrupted and no further communications will take place; alert main process to reload it
        ipc.send('reload-skype-due-to-corruption');
    }
}

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

function keepAlive() {
    var isIdle = true;

    function refreshIfIdle() {
        if (isIdle) {
            console.log("refreshIfIdle...");
            window.location = window.location;
        }
        isIdle = false;
    }

    var idleRefresh = setInterval(refreshIfIdle, refreshInterval);

    $(window).on('mousemove input', function () {
        isIdle = false;
        clearInterval(idleRefresh);
        idleRefresh = setInterval(refreshIfIdle, refreshInterval);
    });
}

var imgFull, justClicked = false;
function handleLinks(config) {
    whenAvailable(".chatContainer").done(function() {
        document.querySelector(".chatContainer").addEventListener('click', function(event) {
            var $possibleLink = $(event.target).closest('a[rel*="noopener"]');
            if ($possibleLink.length) {
                if ($possibleLink.prop("href").indexOf("/join.skype.com/")>-1) {
                    join($possibleLink.prop("href"));
                    return;
                }
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
                if (imgFull && imgFull.is(":visible")) {
                    imgFull.hide();
                }
            }
        });
    });
}

function openImageInside(imgLink) {
    justClicked = true;
    if (!imgFull) {
        imgFull = $(`<img class="modal-content" id="img01" src="${imgLink}">`);
        $(".mainStage").append(imgFull);
        document.addEventListener("click", function(e) {
            if (!justClicked && imgFull.is(":visible"))
                imgFull.hide();
            justClicked = false;
        });
    }
    else {
        imgFull.hide();
        imgFull.prop("src", imgLink);
    }

    imgFull.show();
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