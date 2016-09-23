const ipc = require("electron").ipcRenderer;
$ = require('jquery');


module.exports.addonName = function () {
    return "keybindings-addon";
};

function changeZoomLevel(factor)
{
    ipc.sendToHost("changeZoomLevel", factor);
}

module.exports.initUi = function () {
    document.addEventListener('keyup', function (e) {
        if (e.altKey) {
            switch (e.keyCode) {
                case 37://arrow left - previous contact/group
                    $("a.active").parent().prev().find("a")[0].click();
                    break;
                case 39://arrow right - next contact/group
                    $("a.active").parent().next().find("a")[0].click();
                    break;
            }
            return;
        }

        if (e.ctrlKey) {
            switch (e.keyCode) {
                case 187://CTRL+=
                    changeZoomLevel(10);
                    break;
                case 189://CTRL+-
                    changeZoomLevel(-10);
                    break;
                case 71://G - next unread; when searching, go to first result
                    var firstUnreadChat = document.querySelector("a.unread");
                    if (firstUnreadChat)
                        firstUnreadChat.click();
                    else {
                        if (document.querySelector("swx-group-search a.recent"))
                            document.querySelector("swx-group-search a.recent").click();
                    }
                    break;
                case 75://K - focus search box
                    $("input[role='search']").focus();
                    break;
            }
        }
    });
};
