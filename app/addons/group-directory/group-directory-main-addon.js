const electron = require('electron');
const utils = require('octane/utils');
const Settings = require("octane/settings-client").Settings;
const isEnabled = require("./common").isEnabled;

const ipcMain       = electron.ipcMain;
const Deferred = utils.Deferred;

module.exports.addonName = function () {
    return "group-directory-main";
};

module.exports.initMainProcess = function () {
    ipcMain.on('fetch-group-list', function(event) {
        dirServerReq()
            .done(function(respBody) {
                event.sender.send('fetch-group-list.response', respBody);
            })
            .fail(function(error, response) {
                event.sender.send('fetch-group-list.error', error, response);
            });
    });

    ipcMain.on('add-group', function(event, groupData) {
        fetchThreadId(groupData.gid).done(function(threadId) {
            groupData.threadId = threadId;
            dirServerReq({method: 'POST'}, groupData)
                .done(function (respBody) {
                    event.sender.send('add-group.response', {success: true, data: respBody});
                })
                .fail(function(error, response) {
                    var errorMsg = "";
                    if (error.code == 'ECONNREFUSED')
                        errorMsg = "Connection refused";
                    event.sender.send('add-group.response', {success: false, error: errorMsg});
                });
        })
    });

    ipcMain.on('remove-group', function(event, groupData) {
        fetchThreadId(groupData.gid).done(function(threadId) {
            dirServerReq({method:'DELETE', path:'/groups/'+threadId})
                .done(function(respBody) {
                    event.sender.send('remove-group.response', {success: true, data: respBody});
                })
                .fail(function(error, response) {
                    var errorMsg = "";
                    if (error.code == 'ECONNREFUSED')
                        errorMsg = "Connection refused";
                    event.sender.send('remove-group.response', {success: false, error: errorMsg});
                });

        });
    });

    ipcMain.on('update-group', function(event, groupData) {
        fetchThreadId(groupData.gid).done(function(threadId) {
            groupData.threadId = threadId;
            dirServerReq({method: 'PUT', path: '/groups/' + threadId}, groupData).done(function (respBody) {
                event.sender.send('update-group.response', respBody);
            });
        });
    });

    ipcMain.on('exists-in-directory', function(event, groupData) {
        fetchThreadId(groupData.gid).done(function(threadId) {
            groupData.threadId = threadId;
            dirServerReq({path: '/groups/' + threadId}).done(function (respBody) {
                event.sender.send("exists-in-directory.response", {success: true, gid: groupData.gid, exists: respBody != "{}"});
                dirServerReq({method: 'PUT', path: '/groups/' + threadId}, groupData).done(function (respBody) {
                    event.sender.send('update-group.response', respBody);
                });
            }).fail(function(error) {
                event.sender.send("exists-in-directory.response", {success: false, error: error});
            });
        });
    });
};

function fetchThreadId(gid) {
    var $deferred = Deferred();

    var url = "https://join.skype.com/"+gid;
    const BrowserWindow = electron.BrowserWindow;
    let tmpWindow = new BrowserWindow({ show: false});

    tmpWindow.loadURL(url);
    tmpWindow.webContents.on('did-stop-loading', function () {
        tmpWindow.webContents.executeJavaScript(
            'document.getElementById("nativeSkypeLauncherFrame").src',
            function (r) {
                var threadId = r.replace(/^.*threadId=/,"").replace(/@thread.skype&session_.*/,"");
                if (threadId.length == 0) return;
                $deferred.resolve(threadId);
                tmpWindow.destroy();
            })
    });
    return $deferred.promise()
}

function dirServerReq(extra, json) {
    var $deferred = Deferred();
    if (!isEnabled()) {
        $deferred.reject("feature disabled");
        return $deferred.promise();
    }
    const serverAddress = Settings("group-directory-addon").ServerAddress;
    const request = require('request');

    if (!extra) extra = {};

    var path = "/groups/";
    if (extra.path)
        path = extra.path;
    delete extra.path;
    var options = {uri: serverAddress+path, headers:{'Content-Type': 'application/json'}};
    options = Object.assign(options, extra);
    if (json)
        options.body = JSON.stringify(json);

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200)
            $deferred.resolve(body);
        else {
            $deferred.reject(error, response);
        }
    });
    return $deferred.promise();
}