const electron = require('electron');
const ipc      = electron.ipcRenderer;
const ipcMain       = electron.ipcMain;
const path = require('path');
const fs   = require('fs');

module.exports.addonName = function () {
    return "join-group-addon";
};

module.exports.initUi = function () {
    ipc.on("join-group-callback", function (event, client_id, thread_id) {
        window.location=`https://login.skype.com/login?client_id=${client_id}&redirect_uri=https://web.skype.com/?${thread_id}`;
    })
};

module.exports.initMainProcess = function () {
    ipcMain.on('join-group', join);
};

module.exports.join = function(link) {
    var spinnerPath = path.join(__dirname, "spinner.html");
    var spinnerHtml = fs.readFileSync(spinnerPath, 'utf8')
    var spinner = $(spinnerHtml);
    $(".mainStage").append(spinner);
    ipc.send("join-group", link);
};

function join(event, url) {
    const BrowserWindow = electron.BrowserWindow;
    let tmpWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            partition: 'persist:octane'
        }
    });

    tmpWindow.loadURL(url);
    tmpWindow.webContents.on('did-stop-loading', function () {
        tmpWindow.webContents.session.cookies.get({url:"https://login.skype.com", name:"login-bt"}, function (error, cookies) {
            if (error) throw error;
            var clientId = (cookies[0].value.split("%")[0]);
            tmpWindow.webContents.executeJavaScript(
                'document.getElementById("nativeSkypeLauncherFrame").src',
                function (r) {
                    var threadId = r.replace(/^.*threadId/,"threadId").replace(/&session_.*/,"");
                    if (threadId.length == 0) return;
                    event.sender.send("join-group-callback", clientId, threadId);
                    tmpWindow.destroy();
                })
        });
    });
}