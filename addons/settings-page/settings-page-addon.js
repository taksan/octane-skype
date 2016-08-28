$ = require('../../node_modules/jquery/dist/jquery.min.js');
const ipc = require('electron').ipcRenderer;

var isInitialized = false;
module.exports.addonName = function () {
    return "settings-page-addon";
};

module.exports.initUi = function (settings) {
    if (isInitialized) return;
    isInitialized = true;

    window.toggleOctaneOption = function (btn, target) {
        if ($(btn).hasClass("ToggleButton--checked")) {
            $(btn).removeClass("ToggleButton--checked");
            $("#"+target).val(false);
        }
        else {
            $(btn).addClass("ToggleButton--checked")
            $("#"+target).val(true);
        }
        $("#"+target).change();
    };

    var navigation = document.querySelector("swx-navigation");
    var observer = new MutationObserver(() => {
        console.log("obs 1");
        if ($(".UserSettingsPage").size() == 0)
            return;

        console.log("obs 2")

        if ($("#octane-settings").size() > 0)
            return;
        console.log("obs 3")

        $(".UserSettingsPage-list").after(
            $(  "<ul>" +
                "<li role='option' id='octane-settings'>" +
                "<a href='#' class='UserSettingsPage-category'><h2 class='UserSettingsPage-label about'>Octane</h2></a>" +
                "</li>" +
                "</ul>")
        );
        $("#octane-settings").find("a").click(function() {
            openOctaneSettings(settings)
        });
        $(".UserSettingsPage-list:first").click(function() {
            $("#octane-settings").find("a").removeClass("active");
        })
    });
    observer.observe(navigation, {subtree: true, childList: true});
};

function openOctaneSettings(settings) {
    $(".UserSettingsPage-list:first a").removeClass("active");
    $("#octane-settings").find("a").addClass("active");
    $(".UserSettingsPage-detail .UserSettingsPage-heading").html("Octane Settings");

    //var codeHighlightEnabled = templates["boolean"]("Highlight code", "Highlight code marked with ```");

    $(".UserSettingsPage-scroll-area .scrollViewport").html(
        '<ul class="UserSettingsPage-list"></ul>');

    var defName;
    for (defName in settings.metadata.main)  {
        var definition = settings.metadata.main[defName];
        var component = templates[definition.type]("main_"+defName, defName, definition.title, definition.description, settings.config, definition.data);
        $(".UserSettingsPage-scroll-area .scrollViewport ul").append($(component));

        $("#main_"+defName).change(function(){
            var value = $("#main_"+defName).val();
            if (definition.type == "boolean")
                value = value == "true";
            ipc.sendToHost("settings-update", "main_"+defName, value);
        });
    }

    return false;
}

const templates = {
    boolean: function (id, defName, title, description, config) {
        var checked = "";
        if (config[defName])
            checked = "--checked";

        return `<li class="UserSettingsPage-option pref-template-boolean">
                <div class="pref-template-boolean-inner">
                    <div class="pref-template-boolean-buttonWrap">
                        <swx-toggle-button class="pref-toggle-btn">
                        <button class="ToggleButton ToggleButton${checked}" type="button" role="checkbox" onclick="toggleOctaneOption(this, '${id}')"/>
                        <input id="${id}" type="hidden" value="${config[defName]}"/>
                        </swx-toggle-button>
                    </div>
                    <div class="pref-toggle-col">
                        <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${title}</h2>
                    </div>
                </div>
                <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${description}</p>                
        </li>`
    },
    select : function (id, defName, title, description, config, data) {
        var selectOptions = "";
        var currentValue = config[defName];
        data.values.forEach(function(anOption) {
            var selected = "";
            if (anOption.value == currentValue)
                selected = "selected='selected'";
            selectOptions += `<option value="${anOption.value}" ${selected}>${anOption.label}</option>\n`
        });
        return `<li class="UserSettingsPage-option pref-template-select">
                <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${title}</h2>
                <div>
                    <div class="pref-select-element">
                        <select id="${id}">
                            ${selectOptions}
                         </select>
                    </div>
                </div>
                <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${description}</p>
            </li>`
    }
};