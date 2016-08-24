const electron      = require('electron');
const Canvas        = require('canvas');
const path          = require('path');
const fs            = require('fs');

const nativeImage   = electron.nativeImage;
let trayIcon        = null;
let octaneInstance  = null;
let basePath        = null;
let lastCount       = 0;
let logo            = null;

exports.initialize = function(instance) {
    octaneInstance = instance;
    basePath   = __dirname + '/../assets/tray/';

    var logoData = fs.readFileSync(`${basePath}skype-online.png`);
    logo = new Canvas.Image;
    logo.src = logoData;

    trayIcon   = new electron.Tray(`${basePath}skype-online.png`);
    trayIcon.setToolTip("Octane Skype");

    trayIcon.on('click', octaneInstance.toggleOpen);
    trayIcon.setContextMenu(contextMenu);
};

exports.setNotificationCount = function(count) {
    if (count === lastCount)
        return;

    drawTrayIcon(count);
    lastCount = count;
};

function drawTrayIcon(count)
{
    var canvas = new Canvas(24, 24);
    var ctx = canvas.getContext('2d');

    ctx.drawImage(logo, 0, 0, logo.width, logo.height);
    if (count != 0)
        drawTrayIconMessageCount(ctx, count);

    var data = canvas.toDataURL('image/png');
    trayIcon.setImage(nativeImage.createFromDataURL(data));
}

function drawTrayIconMessageCount(ctx, count)
{
    var fontSize = 8;
    var yPos = 9;
    if (count > 99) {
        count = "∞";
        fontSize = 16;
        yPos = 11;
    }

    ctx.beginPath();
    ctx.arc(18, 6, 6, 0, 2 * Math.PI, false);
    ctx.fillStyle= 'yellow';
    ctx.fill();
    ctx.strokeStyle='#ffb31a';
    ctx.stroke();
    ctx.font = fontSize+'px Colibri';
    ctx.fillStyle = 'black';
    var tsize = ctx.measureText(count).width;
    ctx.fillText(count, 18-tsize/2, yPos);
}

let contextMenu = new electron.Menu.buildFromTemplate([
    {
        label: "Open",
        click: () => {
            octaneInstance.show();
        }
    },
    {
        label: "Online Status",
        submenu: [
            {
                label: "Online",
                click: () => octaneInstance.statusChange("online")
            },
            {
                label: "Away",
                click: () => octaneInstance.statusChange("idle")
            },
            {
                label: "Busy",
                click: () => octaneInstance.statusChange("dnd")
            },
            {
                label: "Invisible",
                click: () => octaneInstance.statusChange("hidden")
            }
        ]
    },
    {
        role: "quit",
        label: "Exit",
        click: () => electron.app.quit()
    }
]);
