'use strict';

const ipc = require('electron').ipcRenderer;

// this is a hack that makes the window raise, because skype's notification onclick invoke window.focus
var previousFocus = window.focus
window.focus = function() {
    ipc.sendToHost('focus');
    previousFocus.apply(this, arguments)
}

window.Notification = ExtendedNotification;

function updateNotificationCount() {
    var unreadCount = document.querySelectorAll(".unseenNotifications").length;
    ipc.sendToHost('unseen-chat-changed', unreadCount);
}

ipc.on('main-window-focused', function () {
    // focus message textarea whenever the window comes up
    if (window.document.querySelector("textarea"))
        window.document.querySelector("textarea").focus();
});

ipc.on('main-window-loaded', function () {
    var sidebar = document.querySelector("swx-sidebar");
    if (!sidebar) return;

    console.log('main-window-loaded');

    var observer = new MutationObserver(() => updateNotificationCount());
    observer.observe(sidebar, {subtree: true, childList: true});
});
