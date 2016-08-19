const ipc = require('electron').ipcRenderer;

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

    var observer = new MutationObserver(() => updateNotificationCount());
    observer.observe(sidebar, {subtree: true, childList: true});
});
