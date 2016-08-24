$ = require('../../node_modules/jquery/dist/jquery.min.js');

var isInitialized = false;
const refreshInterval = 300000;

module.exports.addonName = function () {
    return "keepalive-addon";
};

module.exports.initUi = function () {
    if (isInitialized) return;
    isInitialized = true;

    var isIdle = true;

    function refreshIfIdle() {
        if (isIdle)
            window.location = window.location;
        isIdle = false;
    }

    var idleRefresh = setInterval(refreshIfIdle, refreshInterval);

    $(window).on('mousemove input', function () {
        isIdle = false;
        clearInterval(idleRefresh);
        idleRefresh = setInterval(refreshIfIdle, refreshInterval);
    });
};