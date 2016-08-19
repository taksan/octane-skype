const electron = require('electron');
const app      = electron.app;
const octane   = require('./Octane');

app.on('ready', function() {
	octane.initialize();
});
