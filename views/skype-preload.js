'use strict';

const ipc = require('electron').ipcRenderer;

// this is a hack that makes the window raise, because skype's notification onclick invoke window.focus
var previousFocus = window.focus;
window.focus = function() {
    ipc.sendToHost('focus');
    previousFocus.apply(this, arguments)
};

function updateNotificationCount() {
    var unreadCount = document.querySelectorAll(".unseenNotifications").length;
    ipc.sendToHost('unseen-chat-changed', unreadCount);
}

ipc.on('main-window-focused', function () {
    // focus message textarea whenever the window comes up
    if (window.document.querySelector("textarea"))
        window.document.querySelector("textarea").focus();
});

ipc.on('main-window-loaded', function (event, addOnList, settingsJson) {
    var sidebar = document.querySelector("swx-sidebar");
    if (!sidebar) return;

    var settings = JSON.parse(settingsJson);
    var observer = new MutationObserver(() => updateNotificationCount());
    observer.observe(sidebar, {subtree: true, childList: true});

    addOnList.forEach(function (addOn) {
        try {
            require(addOn).initUi(settings);
        } catch (err) {
            console.error("Failed to load addon : " + addOn);
            console.error(err);
        }
    })
});

ipc.on('status-change', function(event, status) {
    document.querySelector(".PresencePopup-status--" + status).click();
});