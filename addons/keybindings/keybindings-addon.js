$ = require('../../node_modules/jquery/dist/jquery.min.js');

var isInitialized = false;
module.exports.addonName = function () {
    return "keybindings-addon";
}

module.exports.initUi = function () {
    if (isInitialized) return;
    isInitialized = true;

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
}
