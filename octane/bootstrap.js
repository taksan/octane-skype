const electron = require('electron');
const app      = electron.app;
const octane   = require('./Octane');

const shouldQuit = app.makeSingleInstance(() => {
	octane.show();
});

if (shouldQuit) {
	app.quit();
	return;
}

app.on('ready', function() {
	octane.initialize();
});
