var fs     = require('fs');
var path   = require('path');
var stylus = require('stylus');

module.exports.load = function(webView, theme) {
    let folder = path.join(__dirname, '..', 'themes', theme);
    let p = path.join(folder, 'skype.styl');
    fs.readFile(p, 'utf8', (err, styl) => {
        stylus(styl)
            .include(folder)
            .render((err, css) => webView.insertCSS(css));
    });
}

