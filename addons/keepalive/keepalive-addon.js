const electron = require('electron')
const ipc      = electron.ipcRenderer;
const url      = require('url');

$ = require('../../node_modules/jquery/dist/jquery.min.js');

var isInitialized = false;
const refreshInterval = 300000;

module.exports.addonName = function () {
    return "keepalive-addon";
};

module.exports.initUi = function () {
    if (isInitialized) return;
    isInitialized = true;

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

    new MutationObserver(function(mutationRecord, observer) {
        if (!document.querySelector(".Avatar--presence"))
            return;
        observer.disconnect();
        new MutationObserver(function() {
            var classes = document.querySelector(".Avatar--presence").className;
            var state = classes.replace(/.*(unknown|online|idle|donotdisturb|offline).*/,"$1")
                .replace("donotdisturb","dnd")
                .replace("offline","hidden")
                .replace("unknown","online");

            console.log("State changed to " + state);
            ipc.send('state-changed', state);
        }).observe(document.querySelector(".Avatar--presence"), {attributes: true})
    }).observe(document, {subtree: true, childList: true});
};

module.exports.initBackend = function(webview, addonSettings, config) {
    webview.addEventListener('ipc-message', (event) => {
        if (event.channel != "open-link")
            return;

        var href = event.args[0];
        console.log('Opening: ' + href);
        let protocol = url.parse(href).protocol;

        if (config.NativeImageViewer && href.indexOf('imgpsh_fullsize') >= 0)
            ipc.send('image:download', href);
        else if (protocol === 'http:' || protocol === 'https:')
            electron.shell.openExternal(href);
    });
}