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
        // else {
        //     ipc.sendToHost('open-link', $(event.target).prop('href'));
        // }
    });
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