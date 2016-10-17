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

    ipc.on('fetch-group-list.response', function (evt, data) {
        refreshWebSocketConnection();
        setOnlineState();

        localStorage.directoryContents = data;
        directoryContents = JSON.parse(data);
        renderDirectoryContents(directoryContents);
    });

    ipc.on('fetch-group-list.error', function (evt, error) {
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

function joinId() {
    var $joinLink = $(".settingItem span:contains('join.skype.com'):visible");
    if ($joinLink.size()==0)
        return null;

    return $joinLink.text().trim().split("/").splice(-1)[0];
}

function getGroupName() {
    return $("swx-recent-item a.active .topic").text();
}

function getJoinLink() {
    return $(".settingItem span:contains('join.skype.com'):visible");
}

function whenGroupConfigurationOpensAddDirectoryButton() {
    new MutationObserver(function () {
        if (!isEnabled()) return;
        var $joinLink = getJoinLink();
        if ($joinLink.size()==0)
            return;

        var $joinViaLink = $("#joinViaLink");
        if ($joinViaLink.size() == 0)
            return;

        if ($joinLink.closest(".settingItem").prev().hasClass("directoryControl"))
            return;

        var widgetControl = new DirectoryWidget();

        $joinLink.closest(".settingItem").prev().after(widgetControl.widget);
        var joinLinkButton = $joinViaLink.next();

        var cachedGid = joinId();

        new MutationObserver(function(mutations) {
            mutations.forEach(function(record) {
                if (record.attributeName != "aria-checked") return;
                if (joinLinkButton.attr("aria-checked") === "false") {
                    widgetControl.deactivate();
                    groupOp("remove", { gid: cachedGid, name: getGroupName()})
                }
                else
                    widgetControl.reactivate();
            });
        }).observe(joinLinkButton[0], {attributes: true});

        var checkState = function() {
            widgetControl.init();
            ipc.send("exists-in-directory", { gid: joinId(), name: getGroupName()});
            ipc.once('exists-in-directory.response', (e, state) => {
                if (!state.success) {
                    widgetControl.error("Could not fetch group state", checkState);
                    return;
                }
                widgetControl.setChecked(state.exists);
            });
        };
        checkState();

        var publishFn = function () {
            var json = { gid: joinId(), name: getGroupName()};

            var operation = "add";
            var waitMsg = "Adding...";
            var finalState = true;
            if (widgetControl.isChecked()) {
                operation = "remove";
                waitMsg = "Removing...";
                finalState = false;
            }

            widgetControl.startSpinner(waitMsg);
            groupOp(operation, json).done(function () {
                widgetControl.setChecked(finalState);
            }).fail(function(error) {
                widgetControl.error("Failed to " + operation + ": " + error, publishFn);
            });
        };
        widgetControl.click(publishFn);
    }).observe(document, {subtree: true, childList: true});
}

function DirectoryWidget()
{
    var directoryGroupSettingItem = $(`
            <div class="settingItem directoryControl">
                <span class="fontSize-h4">Publish group in the directory</span>
                <button role="checkbox" class="toggler" id="control_for_${joinId()}"><span class="on"></span><span class="off"></span></button>
                <div class="publish-spinner">
                    <swx-loading-animation class="swx-group-spinner spinner small blue">
                        <span class="spinner-label">Checking</span>
                        <div class="circle one"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                        <div class="circle two"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                        <div class="circle three"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                        <div class="circle four"> <div class="rotate"> <div class="position"> <div class="scale"> <div class="shape"></div> </div> </div> </div> </div>
                    </swx-loading-animation>
                </div>
                <div class="publish-message fontSize-p" title="Retry">
                    <span class="iconfont reload"></span><span class="failure-message">Failed</span>
                </div>
            </div>
            `);

    var publishButton = directoryGroupSettingItem.find("button");
    var spinner = publishButton.next();
    var messageArea = spinner.next();

    this.widget = directoryGroupSettingItem;
    this.click = function(callback) {
        publishButton.click(callback);
    };

    var self = this;
    this.init = function() {
        spinner.css("right","1em");
        publishButton.hide();
        self.startSpinner("Checking");
    };

    this.startSpinner = function(message) {
        messageArea.hide();
        spinner.show();
        spinner.find(".spinner-label").html(message);
    };

    this.error = function(message, retry) {
        spinner.hide();
        publishButton.hide();
        spinner.css("right","1em");
        messageArea.find(".failure-message").html(message);
        messageArea.one("click", retry);
        messageArea.show();
    };

    this.setChecked = function (state) {
        spinner.css("right","-2em");
        spinner.hide();
        publishButton.show();
        if (state)
            publishButton.addClass("checked");
        else
            publishButton.removeClass("checked");
    };

    this.isChecked = function () {
        return publishButton.hasClass("checked")
    };

    this.deactivate = function () {
        publishButton.removeClass("checked");
        directoryGroupSettingItem.hide();
    };

    this.reactivate = function () {
        directoryGroupSettingItem.show();
    }
}

function groupOp(op, json)
{
    var deferred = $.Deferred();
    ipc.send(op+'-group', json);
    ipc.once(op+'-group.response',  (e, state) => {
        if (!deferred) return;
        if (state.success)
            deferred.resolve();
        else
            deferred.reject(state.error);
    });
    return deferred.promise();
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
                if (joinId() == null) return;

                console.log(" update-group " + joinId() + " - new name" + mutations[0].target.nodeValue);
                ipc.send("update-group", {gid: joinId(), name: mutations[0].target.nodeValue});
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

var backOff=1;
function setOfflineState(reason) {
    var $directory = $(".directory-link-state .iconfont:visible");
    if ($directory.size() == 0) {
        console.log("offline, but directory not visible");
        return;
    }
    $directory.removeClass("link").addClass("linkBroken");
    var errorMessage = "Offline";
    if (reason)
        errorMessage+="(" + reason + ")";

    $(".directory-link-state").prop("title", errorMessage);

    setTimeout(function() {
        fetchDirectoryContents();
    }, Math.min(1000 * backOff, 60000));

    backOff = backOff * 1.5;
}

function setOnlineState() {
    backOff = 1;
    $(".directory-link-state .iconfont").removeClass("linkBroken").addClass("link");
    $(".directory-link-state").prop("title", "Directory online");
}