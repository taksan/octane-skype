const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const app = electron.app;
const trayIcon = require('./trayIcon');

var initialized   = false;
var octaneWindow = null;
OctaneSkype = {
	initialize : function() {
		if (initialized) return;
		initialized = true;

		octaneWindow = new BrowserWindow({width: 1024,
			height: 768,
			autoHideMenuBar: true,
			icon: app.getAppPath() + '/assets/skype-icon.png'
		});

		trayIcon.initialize(OctaneSkype)
		OctaneSkype.changeQuitToHide();

		octaneWindow.on('closed', () => octaneWindow = null);
		octaneWindow.on('show',   () => octaneWindow.focus());
		octaneWindow.on('focus',  () => OctaneSkype.sendIpc("main-window-focused"));
		octaneWindow.webContents.on('will-navigate', (ev) => ev.preventDefault());

		octaneWindow.loadURL(`file://${__dirname}/../views/index.html`);
	},

	changeQuitToHide: function() {
		var isQuiting = false;

		app.on('before-quit', function() {
			isQuiting = true;
		});

		octaneWindow.on('close', function(event) {
			if (isQuiting)
				return;
			event.preventDefault();
			OctaneSkype.hide();
		});
	},

	sendIpc : function() {
		var webContents = octaneWindow.webContents;
		webContents.send.apply(webContents, arguments);
	},

	toggleOpen : function() {
		if (OctaneSkype.isVisible())
			OctaneSkype.hide();
		else
			OctaneSkype.show();

	},

	isVisible : function() {
		return octaneWindow.isVisible();
	},

	hide : function() {
		octaneWindow.hide();
	},

	show : function() {
		octaneWindow.show();
		octaneWindow.focus();
	},

	statusChange : function(status) {
		octaneWindow.webContents.send("status-change", status)
	},

	setNotificationCount : function(count) {
		trayIcon.setNotificationCount(count);
	},

	settings: function() {
		return {
			Theme: "dark-compact"
		}
	}
}

module.exports = OctaneSkype

