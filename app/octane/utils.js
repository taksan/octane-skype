$ = require('../node_modules/jquery/dist/jquery.min.js');

function Promise()
{
    var doneFunctions = [];
    var rejectFunctions = [];
    var resolveArguments = null;
    var rejectArguments = null;
    var self = this;
    self.whenRejected = function() {};

    this.resolve = function() {
        resolveArguments = arguments;
        doneFunctions.forEach(function(fn) {
            fn.apply(null, resolveArguments);
        });
        doneFunctions = [];
    };

    this.reject = function() {
        rejectArguments = arguments;
        rejectFunctions.forEach(function(fn) {
            fn.apply(null, resolveArguments);
        });
        rejectFunctions = [];
    };

    this.done = function(fn) {
        if (resolveArguments)
            fn.apply(null, resolveArguments);
        else
            doneFunctions.push(fn);

        return self;
    };

    this.fail = function(fn) {
        if (rejectArguments)
            fn.apply(null, rejectArguments);
        else
            rejectFunctions.push(fn);

        return self;
    };
    this.error = this.fail;
}

exports.Deferred = function() {
    var promise = new Promise();
    return {
        promise: () => promise,
        resolve: function() {promise.resolve.apply(null, arguments)},
        reject:  function() {promise.reject.apply(null, arguments)}
    }
};

exports.whenAvailable = function (selector){
    var defer = $.Deferred();
    if (document.querySelector(selector)) {
        defer.resolve(document.querySelector(selector));
        return defer.promise();
    }
    new MutationObserver(function (mutationRecord, observer) {
        if (!document.querySelector(selector))
            return;

        observer.disconnect();

        defer.resolve(document.querySelector(selector));
    }).observe(document, {subtree: true, childList: true});

    return defer.promise();
};

exports.whenAllAvailable = function (selectorList) {
    var defer = $.Deferred();
    if (selectorList.length == 0) {
        defer.resolve();
        return defer.promise();
    }
    var e = selectorList.splice(0,1);
    exports.whenAvailable(e).done(function() {
        exports.whenAllAvailable(selectorList).done(function(){
            defer.resolve();
        });
    });
    return defer.promise();
};

var previousResizeHandlerById = {}
exports.rightPane = function(){
    const paneId = "octane-right-pane"
    var currentConversationHistory = $(".conversationHistory:visible");
    const panelWidth="20em";

    var $directoryDiv = $("#"+paneId);
    if (!$directoryDiv.is(":visible"))
        $directoryDiv.remove();

    var directoryDiv = document.getElementById(paneId);
    if (!directoryDiv) {
        // create and add the div if it's not there
        currentConversationHistory.after(`<div id=${paneId} class="search-results"></div>`);
        directoryDiv = document.getElementById(paneId);

        // make sure the group directory is always the same height of conversation history
        $(directoryDiv).height(currentConversationHistory.height()+1);

        // panel stats hidden
        $(directoryDiv).width("0em");
        if (previousResizeHandlerById[paneId])
            $(window).unbind("resize", previousResizeHandlerById[paneId]);

        previousResizeHandlerById[paneId] =function () {
            $(directoryDiv).height(currentConversationHistory.height()+1);
        };
        $(window).resize(previousResizeHandlerById[paneId])
    }

    return {
        element: document.getElementById(paneId),
        show: function() {
            // open space for the div
            currentConversationHistory.css("transition", "width .5s ease-in-out");
            currentConversationHistory.css("width",`calc(100% - ${panelWidth})`);
            $(directoryDiv).width(panelWidth);
        },
        hide: function() {
            $(directoryDiv).width("0em");
            currentConversationHistory.css("width","calc(100%)");
        },
        isVisible: function() {
            return $(directoryDiv).width() > 0;
        },
        setContents: function(contents) {
            $(directoryDiv).html($(contents))
        },
        append: function(contents) {
            $(directoryDiv).append(contents);
        },
        find: function(selector) {
            return $(directoryDiv).find(selector);
        }
    };
};