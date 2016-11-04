const electron      = require('electron');
const Canvas        = require('canvas');
const path          = require('path');
const fs            = require('fs');
const ipcMain       = electron.ipcMain;

const nativeImage   = electron.nativeImage;
let trayIcon        = null;
let octaneInstance  = null;
let basePath        = path.normalize(__dirname+'/../assets/tray/');
let lastCount       = 0;
let logo            = null;

exports.initialize = function(instance) {
    octaneInstance = instance;

    var logoData = fs.readFileSync(`${basePath}skype-online.png`);
    logo = new Canvas.Image;
    logo.src = logoData;

    trayIcon   = new electron.Tray(`${basePath}skype-online.png`);
    trayIcon.setToolTip("Octane Skype");

    trayIcon.on('click', octaneInstance.toggleOpen);
    trayIcon.setContextMenu(contextMenu);
    ipcMain.on("unseen-chat-changed", (e,count) => exports.setNotificationCount(count));
    ipcMain.on("state-changed", (e,state) =>exports.updateState(state));
    ipcMain.on("communication-broken", (e) => drawBrokenComm());
    ipcMain.on("communication-restored", (e) => clearBrokenComm());
};

exports.setNotificationCount = function(count) {
    if (count === lastCount)
        return;

    drawTrayIcon(count);
    lastCount = count;
};

exports.updateState = function (state) {
    logo = new Canvas.Image;
    logo.src = fs.readFileSync(`${basePath}skype-${state}.png`);
    drawTrayIcon(lastCount);
};

function drawTrayWithGivenTextAndStyle(txt, fgColor, bubbleBgColor, fontWeight, fontSizeOverride, bubbleTextYPosOverride) {
    var canvas = new Canvas(24, 24);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(logo, 0, 0, logo.width, logo.height);

    if (txt != null) {
        var fontSize = fontSizeOverride ? fontSizeOverride : 9;
        var yPos = bubbleTextYPosOverride ? bubbleTextYPosOverride : 9;
        ctx.beginPath();
        ctx.arc(18, 6, 6, 0, 2 * Math.PI, false);
        ctx.fillStyle = bubbleBgColor;
        ctx.fill();
        ctx.strokeStyle = '#ffb31a';
        ctx.stroke();
        ctx.font = fontWeight + fontSize + 'px Verdana';
        ctx.fillStyle = fgColor;
        var tsize = ctx.measureText(txt).width;
        ctx.fillText(txt, 18 - tsize / 2, yPos);
    }

    var data = canvas.toDataURL('image/png');
    trayIcon.setImage(nativeImage.createFromDataURL(data));
}
function drawBrokenComm()
{
    drawTrayWithGivenTextAndStyle("\u2757", 'white', 'red', "bold ");
}

function clearBrokenComm() {
    drawTrayIcon(lastCount);
}

function drawTrayIcon(count)
{
    var txt = null;
    var fontSize = 9;
    var bubbleTextYPos = 9;

    if (count > 0)
        txt = count;

    if (count >= 10) fontSize = 8;

    if (count > 99) {
        fontSize = 12;
        bubbleTextYPos = 10;
        txt = "∞";
    }

    drawTrayWithGivenTextAndStyle(txt, "black", "yellow", "", fontSize, bubbleTextYPos);
}

let contextMenu = new electron.Menu.buildFromTemplate([
    {
        label: "Activate",
        click: () => octaneInstance.show()
    },
    {
        label: "Settings",
        click: () => octaneInstance.showSettings()
    },
    {
        label: "Online",
        icon:`${basePath}skype-online.png`,
        click: () => octaneInstance.statusChange("online")
    },
    {
        label: "Away",
        icon:`${basePath}skype-idle.png`,
        click: () => octaneInstance.statusChange("idle")
    },
    {
        label: "Busy",
        icon:`${basePath}skype-dnd.png`,
        click: () => octaneInstance.statusChange("dnd")
    },
    {
        label: "Invisible",
        icon:`${basePath}skype-hidden.png`,
        click: () => octaneInstance.statusChange("hidden")
    },
    {
        role: "quit",
        label: "Exit",
        accelerator: "Ctrl+Q",
        click: () => electron.app.quit()
    }
]);
