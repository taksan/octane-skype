$ = require('../../node_modules/jquery/dist/jquery.min.js');

var isInitialized = false;
module.exports.addonName = function () {
    return "settings-page-addon";
};

module.exports.initUi = function () {
    if (isInitialized) return;
    isInitialized = true;

    window.toggleOctaneOption = function (btn) {
        if ($(btn).hasClass("ToggleButton--checked"))
            $(btn).removeClass("ToggleButton--checked");
        else
            $(btn).addClass("ToggleButton--checked")
    };

    var navigation = document.querySelector("swx-navigation");
    var observer = new MutationObserver(() => {
        if ($(".UserSettingsPage").size() == 0)
            return;

        if ($("#octane-settings").size() > 0)
            return;

        $(".UserSettingsPage-list").after(
            $(  "<ul>" +
                "<li role='option' id='octane-settings'>" +
                "<a href='#' class='UserSettingsPage-category'><h2 class='UserSettingsPage-label about'>Octane</h2></a>" +
                "</li>" +
                "</ul>")
        );
        $("#octane-settings").find("a").click(function() {
            openOctaneSettings()
        });
        $(".UserSettingsPage-list:first").click(function() {
            $("#octane-settings").find("a").removeClass("active");
        })
    });
    observer.observe(navigation, {subtree: true, childList: true});
};

var templates = {
    boolean: function(label, description) {
        return `<li class="UserSettingsPage-option pref-template-boolean">
                <div>
                <swx-toggle-button class="pref-toggle-btn">
                <button id="highlight" class="ToggleButton ToggleButton--checked" type="button" role="checkbox" onclick="toggleOctaneOption(this)"/>
                </swx-toggle-button></div><div class="pref-toggle-col">
                <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${label}</h2>
                <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${description}</p>
                </div>
        </li>`
    },
    select : function (label, description, options) {
        var selectOptions = ""
        options.forEach(function(anOption) {
            selectOptions += `<option value="${anOption.value}">${anOption.label}</option>\n`
        });
        return `<li class="UserSettingsPage-option pref-template-select">
                <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${label}</h2>
                <div>
                    <div class="pref-select-element">
                        <select>
                            ${selectOptions}
                         </select>
                    </div>
                </div>
                <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${description}</p>
            </li>`
    }
};

function openOctaneSettings() {
    $(".UserSettingsPage-list:first a").removeClass("active");
    $("#octane-settings").find("a").addClass("active");
    $(".UserSettingsPage-detail .UserSettingsPage-heading").html("Octane Settings");

    var codeHighlightEnabled = templates["boolean"]("Highlight code", "Highlight code marked with ```");
    var themeSelect = templates["select"]("Theme", "Requires restart",
        [
            {value:0,label:"Web Skype"},
            {value:1,label:"Web Skype Compact"},
            {value:2,label:"Dark"},
            {value:3,label:"Dark Compact"},
        ]);

    $(".UserSettingsPage-scroll-area .scrollViewport").html(
        '<ul class="UserSettingsPage-list">'+
        codeHighlightEnabled+themeSelect+
        '</ul>');

    return false;
}