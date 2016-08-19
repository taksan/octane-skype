const electron = require('electron')
const BrowserWindow = electron.BrowserWindow

let octaneWindow =  null;
module.exports = {
	createWindow: function() {
		octaneWindow = new BrowserWindow({width: 800, height: 600});
		console.log(`file://${__dirname}/../views/index.html`)
		octaneWindow.loadURL(`file://${__dirname}/../views/index.html`)
		octaneWindow.on('closed', function() {
			octaneWindow = null;
		});
	}
}
