const electron = require('electron');
const fs       = require('fs');
const path     = require('path');
const $        = require('jquery');
const ipc      = electron.ipcRenderer;

const isEnabled = require("./common").isEnabled;
const join      = require('addons/core/join-group-addon').join;
const utils     = require('octane/utils');
const Settings  = require("octane/settings-client").Settings;

const rightPane = utils.rightPane;
const whenAllAvailable = utils.whenAllAvailable;
const whenAvailable = utils.whenAvailable;

module.exports.addonName = function () {
    return "group-directory-addon";
};

module.exports.getPreferences = function() {
    return [
        {
            configKey: "DirectoryEnabled",
            metadata: {
                title: "Enable directory server features",
                description: "Whether the group directory should be enabled",
                type: "boolean"
            }
        },
        {
            configKey: "ServerAddress",
            metadata: {
                title: "Directory server address",
                description: "Example http://directory-server:4567",
                type: "text"
            }
        }
    ];
};

var directoryHeader;
module.exports.initUi = function () {
    directoryHeader = $(fs.readFileSync(path.join(__dirname, "header.html"), 'utf8'));
    var addonSettings = Settings("group-directory-addon");

    var fn = function(){
        var $menuItem = $("#menuItem-openDirectory");
        if (isEnabled()) {
            $menuItem.show();
            refreshWebSocketConnection();
        }
        else {
            $menuItem.hide();
            closeWebSocketConnection();
        }
    };
    addonSettings.observe("DirectoryEnabled", fn);
    addonSettings.observe("ServerAddress", fn);

    createShowGroupDirectoryButton();
    handleGroupPopulateResults();
    handlePushUpdates();
    whenGroupConfigurationOpensAddDirectoryButton();
    whenGroupNameChangesSendUpdate();
};

function createShowGroupDirectoryButton() {
    var directoryButtonHtml = fs.readFileSync(path.join(__dirname, "add-to-directory-button.html"), 'utf8');
    whenAllAvailable(["#menuItem-newChat", "#menuItem-userSettings", "#menuItem-contacts"]).done(function () {
        var $userSettingsButton = $("#menuItem-userSettings");

        var directoryButton = $(directoryButtonHtml);
        $userSettingsButton.parent().after(directoryButton);

        if (!isEnabled())
            directoryButton.hide();

        directoryButton.click(function () {
            if (rightPane().isVisible())
                rightPane().hide();
            else
                fetchDirectoryContents();
        });
    });
}

function fetchDirectoryContents() {
    var panel = rightPane();
    var $directoryHeader = $(directoryHeader);
    panel.setContents($directoryHeader);
    $directoryHeader.find(".reload-button").click(function() {
        fetchGroupList();
    });
    $directoryHeader.find("#directory-search-input").keyup(function() {
        var match = $(this).val();
        $(".directory-entry").each(function(){
            if ($(this).find(".message").text().indexOf(match)>-1)
                $(this).show();
            else
                $(this).hide();
        });
    });
    panel.show();
    fetchGroupList();
}

function fetchGroupList() {
    rightPane().append($(utils.spinner("Loading")));

    ipc.send('fetch-group-list');
}

function handleGroupPopulateResults() {
    var directoryContents = {};
    if (localStorage.directoryContents)
        directoryContents = JSON.parse(localStorage.directoryContents);

    ipc.on('fetch-group-list-response', function (evt, data) {
        refreshWebSocketConnection();
        setOnlineState();

        localStorage.directoryContents = data;
        directoryContents = JSON.parse(data);
        renderDirectoryContents(directoryContents);
    });

    ipc.on('fetch-group-list-error-response', function (evt, error) {
        var reason = "";
        if (error.code == "ECONNREFUSED") reason = " (connection refused)";
        setOfflineState(reason);

        renderDirectoryContents(directoryContents);
    });
}

function handlePushUpdates()
{
    ipc.on('group-list-update', function (evt, data) {
        var update = JSON.parse(data);
        var $entry;
        var $directoryPublicGroups = $(".directory-public-groups");
        switch(update.operation) {
            case 'ADDED':
                $entry = createDirectoryEntry(update, true);
                $directoryPublicGroups.find("div").append($entry);
                $entry.addClass("directory-entry-added");
                setTimeout(()=>$entry.removeClass("directory-entry-added"), 500);
                break;
            case 'DELETED':
                $entry = $directoryPublicGroups.find("h4[data-gid='"+update.gid+"'");
                $entry.addClass("directory-entry-deleted");
                setTimeout(function() {
                    $entry.removeClass("directory-entry-deleted");
                    $entry.addClass("directory-entry-deleted-fadeout");
                    setTimeout(function() { $entry.remove(); }, 500)
                }, 500);
                break;
            case 'UPDATED:':
                $entry = $directoryPublicGroups.find("h4[data-gid='"+update.gid+"'");
                $entry.text(update.name);
                $entry.addClass("directory-entry-updated");
                setTimeout(() => $entry.removeClass("directory-entry-updated"), 500);
                break;
        }
    });

    ipc.on('directory-connection-closed', function () {
        setOfflineState("Connection lost");
    });
}

function renderDirectoryContents(directoryContents) {
    var html = $("<div></div>");
    for (var i in directoryContents) {
        var entry = directoryContents[i];
        html.append(createDirectoryEntry(entry));
    }

    if (directoryContents.length == 0)
        html.append("<h4 class='directory-entry tileName empty-directory'>Directory is Empty</h4>");

    $(".directory-public-groups").html(html);
    rightPane().find(".swx-join-spinner").remove();
}

function createDirectoryEntry(entry) {
    var $p = $(`<h4 class="directory-entry tileName" data-gid="${entry.gid}" title="Join ${entry.name}">
                    <span class="icon"><span class="iconfont signOut" title="Join"></span></span>
                    <span class="message">${entry.name}</span>
                </h4>`);

    $p.click(function() {
        var topic = $(".recents swx-recent-item .topic[title='"+entry.name+"']");
        if (topic.size() == 0) {
            join('https://join.skype.com/' + entry.gid);
            return;
        }
        topic.closest('a')[0].click()
    });
    return $p;
}

function gid() {
    var $joinLink = $(".settingItem span:contains('join.skype.com'):visible");
    if ($joinLink.size()==0)
        return null;

    return $joinLink.text().trim().split("/").splice(-1)[0];
}

function whenGroupConfigurationOpensAddDirectoryButton() {
    new MutationObserver(function () {
        if (!isEnabled()) return;
        var $joinLink = $(".settingItem span:contains('join.skype.com'):visible");
        if ($joinLink.size()==0)
            return;
        if ($joinLink.closest(".settingItem").prev().hasClass("directoryControl"))
            return;

        var groupName = $("swx-recent-item a.active .topic").text();
        var gid = $joinLink.text().trim().split("/").splice(-1)[0];

        var directoryGroupSettingItem = $(`
            <div class="settingItem directoryControl">
                <span class="fontSize-h4">Make group available in the directory</span>
                <button role="checkbox" class="toggler" id="control_for_${gid}"><span class="on"></span><span class="off"></span></button>
                <swx-loading-animation class="swx-group-spinner spinner small blue">
                    <span>Checking</span>
                    <div class="circle one"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                    <div class="circle two"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                    <div class="circle three"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                    <div class="circle four"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                </swx-loading-animation>
            </div>
            `);

        directoryGroupSettingItem.find("button").hide();

        $joinLink.closest(".settingItem").prev().after(directoryGroupSettingItem);
        ipc.send("exists-in-directory", gid);

        directoryGroupSettingItem.find("button").click(function () {
            var json = {
                gid: gid,
                name: groupName
            };
            if (!$(this).hasClass("checked")){
                ipc.send('add-group', json);
                $(this).addClass("checked");
            }
            else {
                ipc.send('remove-group', json);
                $(this).removeClass("checked");
            }
        });
    }).observe(document, {subtree: true, childList: true});
    ipc.on('group-exists', function (e, state) {
        if (state.exists)
            $("#control_for_"+state.gid).addClass("checked");
        $("#control_for_"+state.gid).show();
        $("#control_for_"+state.gid).next().remove();
    });
}

function whenGroupNameChangesSendUpdate() {
    whenAvailable("swx-navigation").done(function(swxNavigation) {
        var activeSpan = null;
        new MutationObserver(function () {
            if (!isEnabled()) return;
            var $topicSpan = $("span[data-swx-testid='conversationTopic']:visible");
            if ($topicSpan.size() ==0)
                return;
            if (activeSpan == $topicSpan[0]) {
                return;
            }
            activeSpan = $topicSpan[0];

            new MutationObserver(function (mutations) {
                console.log("change detected");
                console.log(mutations);
                if (!isEnabled()) return;
                if (mutations[0].type != "characterData") return;
                if (gid() == null) return;

                console.log(" update-group " + gid() + " - new name" + mutations[0].target.nodeValue);
                ipc.send("update-group", {gid: gid(), name: mutations[0].target.nodeValue});
            }).observe(activeSpan, {subtree: true, characterData: true});
        }).observe(swxNavigation, {subtree: true, childList: true});
    });
}


function refreshWebSocketConnection()
{
    ipc.sendToHost("refresh-web-socket-connection");
}

function closeWebSocketConnection()
{
    ipc.sendToHost("close-web-socket-connection");
}

function setOfflineState(reason) {
    var $directory = $(".directory-link-state .iconfont");
    $directory.removeClass("link").addClass("linkBroken");
    var errorMessage = "Offline";
    if (reason)
        errorMessage+="(" + reason + ")";

    $(".directory-link-state").prop("title", errorMessage);
}

function setOnlineState() {
    $(".directory-link-state .iconfont").removeClass("linkBroken").addClass("link");
    $(".directory-link-state").prop("title", "Directory online");
}