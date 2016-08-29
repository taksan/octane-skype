const ipc = require('electron').ipcRenderer;
$ = require('../../node_modules/jquery/dist/jquery.min.js');

var isInitialized = false;
module.exports.addonName = function () {
    return "settings-page-addon";
};

module.exports.initUi = function (addonConfig, settings) {
    if (isInitialized) return;
    var navigation = document.querySelector("swx-navigation");
    if (!navigation)
        return;
    isInitialized = true;

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

    $(".UserSettingsPage-scroll-area .scrollViewport").html(
        '<ul class="UserSettingsPage-list"></ul>');

    settings.forEachAddon(function(addon) {
        $(".UserSettingsPage-scroll-area .scrollViewport ul").append(
            `<li><h1 class="UserSettingsPage-heading">${addon.name} preferences</h1></li>`
        );
        setupComponents(addon);
    });
    return false;
}

function setupComponents(addon) {
    addon.forEachDefinition(function(definition) {
        var component = typeInfo[definition.type].makeHtml(addon.name, definition);
        $(".UserSettingsPage-scroll-area .scrollViewport ul").append($(component));
        typeInfo[definition.type].addChangeHandler(addon, definition.name);
    });
}

const typeInfo = {
    boolean: {
        makeHtml: function (addOnName, definition) {
            var checked = "";
            if (definition.currentValue)
                checked = "--checked";
            var id = addOnName+"_" + definition.name;
            return `<li class="UserSettingsPage-option pref-template-boolean">
                <div class="pref-template-boolean-inner">
                    <div class="pref-template-boolean-buttonWrap">
                        <swx-toggle-button class="pref-toggle-btn">
                        <button id="${id}" class="ToggleButton ToggleButton${checked}" type="button" role="checkbox"/>
                        </swx-toggle-button>
                    </div>
                    <div class="pref-toggle-col">
                        <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${definition.title}</h2>
                    </div>
                </div>
                <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${definition.description}</p>                
            </li>`
        },
        addChangeHandler: function(addon, defName) {
            $("#" + addon.name+"_" + defName).click(function(){
                var newState;
                if ($(this).hasClass("ToggleButton--checked")) {
                    $(this).removeClass("ToggleButton--checked");
                    newState = false;
                }
                else {
                    $(this).addClass("ToggleButton--checked")
                    newState = true;
                }
                addon.update(defName, newState);
            });
        }
    },
    select : {
        makeHtml: function (addOnName, definition) {
            var id = addOnName+"_" + definition.name;
            var selectOptions = "";
            definition.data.values.forEach(function(anOption) {
                var selected = "";
                if (anOption.value == definition.currentValue)
                    selected = "selected='selected'";
                selectOptions += `<option value="${anOption.value}" ${selected}>${anOption.label}</option>\n`
            });
            return `<li class="UserSettingsPage-option pref-template-select">
                    <h2 class="pref-toggle-heading UserSettingsPage-featureLabel">${definition.title}</h2>
                    <div>
                        <div class="pref-select-element">
                            <select id="${id}">
                                ${selectOptions}
                             </select>
                        </div>
                    </div>
                    <p class="pref-toggle-sec-text UserSettingsPage-secondaryText">${definition.description}</p>
                </li>`
        },
        addChangeHandler: function(addon, defName) {
            $("#" + addon.name+"_" + defName).change(function () {
                var value = $("#" + addon.name+"_" + defName).val();
                addon.update(defName, value);
            });
        }
    }
};