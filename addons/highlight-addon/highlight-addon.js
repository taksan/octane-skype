var isInitialized = false;

module.exports.addonName = function() {
    return "highlight-addon";
};

function styleFolder(style) {
    const path   = require('path');
    if (!style)
        style = "";
    return path.join(__dirname, '..', '..', "node_modules","highlight.js","styles",style);
}

module.exports.getPreferences = function() {
    const fs     = require('fs');

    var styles = [];

    let stylesFolder = styleFolder();
    fs.readdirSync(stylesFolder).forEach(function (style) {
        styles.push({value: style, label: style});
    });

    return [
        {
            configKey: "HighlightEnabled",
            metadata: {
                title: "Enabled Code Highlight",
                description: "Whether code highlight should be active if ``` is used",
                type: "boolean"
            }
        },
        {
            configKey: "HighlightStyle",
            metadata: {
                title: "Highlight Style",
                description: "Requires restart",
                type: "select",
                data: {values: styles}
            }
        }
    ];
};

module.exports.initBackend = function (webview, addonConfig, currentTheme) {
    const fs     = require('fs');
    const path   = require('path');

    var defaultCssFile = path.join(__dirname, "highlight-default.css");
    webview.insertCSS(fs.readFileSync(defaultCssFile, 'utf8'));

    var highlightCss = "idea.css";
    if (currentTheme && currentTheme.indexOf("dark")>-1)
        highlightCss = "agate.css";

    //noinspection JSUnresolvedVariable
    highlightCss = addonConfig.HighlightStyle? addonConfig.HighlightStyle : highlightCss;
    var stylePath = styleFolder(highlightCss);
    webview.insertCSS(preprocessCss(fs.readFileSync(stylePath, 'utf8')));
};

module.exports.initUi = function (addonConfig) {
    //noinspection JSUnresolvedVariable
    var isHighlightingEnabled = addonConfig.HighlightEnabled;
    if (!isHighlightingEnabled)
        return;

    if (isInitialized)
        return;

    isInitialized = true;

    EventTarget.prototype.addEventListenerBase = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener)
    {
        if(!this.EventList) { this.EventList = []; }
        // this hack prevents skype from messing up with your pasted text; leave other kinds of data alone
        if (type == "paste" && this.name == "messageInput") {
            var dontScrewPlainText = function(evt) {
                if (evt.clipboardData.types.indexOf("text/plain")>-1)
                    return;
                listener.apply(this, arguments);
            }
            this.addEventListenerBase.apply(this, ["paste", dontScrewPlainText, false]);
            return;
        }
        this.addEventListenerBase.apply(this, arguments);
    };

    var highlightJs = require('./highlight.min.js');
    var lastUpdatedCodeBlockAddedClass = null;
    function doHighlightBlock(aBlock, anObserver) {
        // temporarily disconnects the observer to prevent the highlighting from triggering mutation events
        anObserver.disconnect();
        // remove the code marker
        aBlock.innerHTML = aBlock.innerHTML.replace(/^\s*```\n?/,"");
        var b4 = aBlock.className;
        highlightJs.highlightBlock(aBlock);
        lastUpdatedCodeBlockAddedClass = aBlock.className.replace(b4,'');
        anObserver.observe(document.querySelector(".chatContainer"), {subtree: true, childList: true});
    }

    // observe chat changes to highlight texts that start with @@
    var lastUpdatedCodeBlock = null;
    var observer = new MutationObserver(function (mutations) {
        var parentCodeBlock = null;
        mutations.forEach(function (mutation) {
            if (mutation.target)
                if (mutation.target.className.indexOf("hljs")>-1)
                    parentCodeBlock = mutation.target;

            if (mutation.addedNodes.length == 0) return;
            if (mutation.addedNodes[0].nodeName != "SWX-MESSAGE") return;

            var swxMessageNode = mutation.addedNodes[0];
            setTimeout(function () {
                var messageP = document.querySelector("#msg_" + swxMessageNode.getAttribute("data-id") + " p");
                if (!messageP)
                    return;
                var textMessage = messageP.innerHTML;
                if (textMessage.match(/^\s*```/)) {
                    lastUpdatedCodeBlock = messageP;
                    doHighlightBlock(messageP, observer);
                }
            }, 1);
        });
        // handles the issue the child content may trigger a new update and screw the highlighting
        if (parentCodeBlock && parentCodeBlock == lastUpdatedCodeBlock) {
            setTimeout(function() {
                // removes the highlight and code class to make sure highlight.js will detect the correct language
                parentCodeBlock.className = parentCodeBlock.className.replace(lastUpdatedCodeBlockAddedClass,'');
                doHighlightBlock(parentCodeBlock, observer);
            }, 1);
            observer.disconnect();
        }
    });
    if (document.querySelector(".chatContainer"))
        observer.observe(document.querySelector(".chatContainer"), {subtree: true, childList: true});
}


function preprocessCss(cssText) {
    // makes sure all colors in highlight.js css override skype colors
    return cssText.replace(/(background:.*);/g,"$1 !important;")
        .replace(/(color:.*);/g,"$1 !important;");
};