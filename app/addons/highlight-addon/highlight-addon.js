const fs          = require('fs');
const path        = require('path');
const $           = require('jquery');
const highlightJs = require('highlight.js');

module.exports.dependsOnElement = function() {
    return ".chatContainer";
};

module.exports.addonName = function() {
    return "highlight-addon";
};

module.exports.getPreferences = function() {
    var styles = [];

    let stylesFolder = styleFolder();
    fs.readdirSync(stylesFolder).forEach(function (style) {
        styles.push({value: style, label: style});
    });
    var sampleFile = path.join(__dirname, "highlight-js-samples.html");

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
                description: fs.readFileSync(sampleFile, 'utf8'),
                type: "select",
                data: {values: styles}
            }
        }
    ];
};

module.exports.initBackend = function (webview) {
    var defaultCssFile = path.join(__dirname, "highlight-default.css");
    webview.insertCSS(fs.readFileSync(defaultCssFile, 'utf8'));
};

module.exports.initUi = function (addonConfig) {
    window.highlightSample = function() {
        //noinspection JSUnresolvedFunction
        document.querySelectorAll(".highlight-sample-code").forEach(function(el) {
            highlightJs.highlightBlock(el);
        });
    };

    $("head").append("<style type='text/css' id='highlight-code'></style>");

    //noinspection JSUnresolvedVariable
    document.querySelector("#highlight-code").innerHTML=loadStyle(addonConfig.HighlightStyle);

    addonConfig.observe("HighlightStyle", function (value) {
        document.querySelector("#highlight-code").innerHTML=loadStyle(value);
    });

    protectPastedCode(arguments);

    var lastUpdatedCodeBlockAddedClass = null;
    function doHighlightBlock(aBlock, anObserver) {
        // temporarily disconnects the observer to prevent the highlighting from triggering mutation events
        anObserver.disconnect();

        // remove the code marker
        aBlock.innerHTML = aBlock.innerHTML.replace(/^\s*```\n?/,"");
        var b4 = aBlock.className;
        highlightJs.highlightBlock(aBlock);
        lastUpdatedCodeBlockAddedClass = aBlock.className.replace(b4,'');

        // reactivate observer
        anObserver.observe(document.querySelector(".chatContainer"), {subtree: true, childList: true});
    }

    // observe chat changes to highlight texts that starts with ```
    var lastUpdatedCodeBlock = null;
    new MutationObserver(function (mutations, observer) {
        if (!addonConfig.HighlightEnabled)
            return;

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
        // handles the issue where the child content may trigger a new update and screw the highlighting
        if (parentCodeBlock && parentCodeBlock == lastUpdatedCodeBlock) {
            setTimeout(function() {
                // removes the highlight and code class to make sure highlight.js will detect the correct language
                parentCodeBlock.className = parentCodeBlock.className.replace(lastUpdatedCodeBlockAddedClass,'');
                doHighlightBlock(parentCodeBlock, observer);
            }, 1);
            observer.disconnect();
        }
    }).observe(document.querySelector(".chatContainer"), {subtree: true, childList: true});
};

function styleFolder(style) {
    if (!style) style = "";
    return path.join(__dirname, '..', '..', "node_modules","highlight.js","styles",style);
}

function loadStyle(highlightCss) {
    if (!highlightCss)
        highlightCss = "idea.css";

    var stylePath = styleFolder(highlightCss);
    return preprocessCss(fs.readFileSync(stylePath, 'utf8'));
}

// this hack prevents skype from messing up with your pasted text; leave other kinds of data alone
function protectPastedCode() {
    EventTarget.prototype.addEventListenerBase = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener) {
        if (!this.EventList) {
            this.EventList = [];
        }
        if (type == "paste" && this.name == "messageInput") {
            var dontScrewPlainText = function (evt) {
                if (evt.clipboardData.types.indexOf("text/plain") > -1)
                    return;
                listener.apply(this, arguments);
            };
            this.addEventListenerBase.apply(this, ["paste", dontScrewPlainText, false]);
            return;
        }
        this.addEventListenerBase.apply(this, arguments);
    };
}

function preprocessCss(cssText) {
    // makes sure all colors in highlight.js css override skype colors
    return cssText.replace(/(background:.*);/g,"$1 !important;")
        .replace(/(color:.*);/g,"$1 !important;");
}