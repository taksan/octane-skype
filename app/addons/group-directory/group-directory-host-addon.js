const Settings = require("octane/settings-client").Settings;
const isEnabled = require("./common").isEnabled;
const url = require("url");

module.exports.addonName = function () {
    return "group-directory-host-addon";
};

var webSocket;
var skypeWebView;

module.exports.initHostRenderer = function (webview) {
    injectCss(webview);

    if (skypeWebView) return;

    skypeWebView = webview;
    establishWebSocketConnection();
    handleIpcMessages();
};

function establishWebSocketConnection()
{
    var serverAddress = Settings("group-directory-addon").ServerAddress;
    if (isEnabled() && !webSocket) {
        var location = url.parse(serverAddress);
        try {
            webSocket = new WebSocket("ws://" + location.hostname + ":" + location.port + "/wsocket/");
        }
        catch(e) {
            webSocket = null;
            console.warn("Could not create socket connection. Might retry later");
            return;
        }

        webSocket.onmessage = function (evt) {
            if (!isEnabled()) return;
            skypeWebView.send('group-list-update', evt.data)
        };
        webSocket.onclose = function () {
            console.warn("Connection with group server closed");
            webSocket = null;
            skypeWebView.send('directory-connection-closed')
        };
    }
}

function disconnectWebSocket()
{
    if (webSocket) {
        webSocket.disconnect();
        webSocket = null;
    }
}

function handleIpcMessages() {
    skypeWebView.addEventListener("ipc-message", function (event) {
        if (event.channel == "refresh-web-socket-connection") {
            establishWebSocketConnection();
        }
        if (event.channel == 'close-web-socket-connection') {
            disconnectWebSocket();
        }
    });
}

function injectCss(webview) {
    const fs = require('fs');
    const path = require('path');

    var defaultCssFile = path.join(__dirname, "directory-addon.css");
    webview.insertCSS(fs.readFileSync(defaultCssFile, 'utf8'));
}