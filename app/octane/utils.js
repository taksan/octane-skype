$ = require('../node_modules/jquery/dist/jquery.min.js');

exports.whenAvailable = function (selector){
    var defer = $.Deferred();
    new MutationObserver(function (mutationRecord, observer) {
        if (!document.querySelector(selector))
            return;
        observer.disconnect();

        defer.resolve(document.querySelector(selector));
    }).observe(document, {subtree: true, childList: true});

    return defer.promise();
}