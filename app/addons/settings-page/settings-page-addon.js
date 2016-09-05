const path = require('path');
const fs   = require('fs');
const $    = require('jquery');

module.exports.addonName = function () {
    return "settings-page-addon";
};

module.exports.dependsOnElement = function() {
    return "swx-navigation";
};

module.exports.initUi = function (addonConfig, settings) {
    var navigation = document.querySelector("swx-navigation");

    $("head").append("<style type='text/css' id='settings-page-addon-styles'></style>");

    var defaultCssFile = path.join(__dirname, "settings-page.css");
    document.querySelector("#settings-page-addon-styles").innerHTML=fs.readFileSync(defaultCssFile, 'utf8');

    new MutationObserver(() => {
        if ($(".UserSettingsPage").size() == 0)
            return;

        if ($("#octane-settings").size() > 0)
            return;

        $(".UserSettingsPage-list").after(
            $(`<ul>
                <li role='option' id='octane-settings'>
                    <a href='#' class='UserSettingsPage-category'><h2 class='UserSettingsPage-label about'>Octane</h2></a>
                </li>
               </ul>`));
        $("#octane-settings").find("a").click(() => openOctaneSettings(settings));
        $(".UserSettingsPage-list:first").click(() => $("#octane-settings").find("a").removeClass("active"));
    }).observe(navigation, {subtree: true, childList: true});
};

function openOctaneSettings(settings) {
    $(".UserSettingsPage-list:first a").removeClass("active");
    $("#octane-settings").find("a").addClass("active");
    $(".UserSettingsPage-detail .UserSettingsPage-heading").html("Octane Settings");

    $(".UserSettingsPage-scroll-area .scrollViewport").html(`<div class="UserSettingsPage-Tab-List"></div>`);
    var $userSettingsTablist = $(".UserSettingsPage-Tab-List");
    var selected = false;
    settings.forEachAddon(function(addon) {
        var title = addon.name.replace("-addon", "");
        var $tabElem = $(`<a class="UserSettingsPage-category PreferencesTab"> ${title} </a>`);
        $userSettingsTablist.append($tabElem);

        var $addonUl = $(`<ul class="UserSettingsPage-list AddonPreferences ${addon.name}-prefs"></ul>`);
        $addonUl.css("display", "none");
        $(".UserSettingsPage-scroll-area .scrollViewport").append($addonUl);

        addAddOnPreferences($addonUl, addon);

        var selectTab = function() {
            $(".AddonPreferences").css("display", "none");
            $addonUl.css("display", "block");
            $userSettingsTablist.find(".PreferencesTab").removeClass("active");
            $tabElem.addClass("active");
        };
        $tabElem.click(selectTab);
        if (!selected) {
            selectTab();
            selected = true;
        }
    });
    return false;
}

function addAddOnPreferences($addonUl, addon) {
    addon.forEachDefinition(function(definition) {
        var component = typeInfo[definition.type].makeHtml(addon.name, definition);
        $addonUl.append($(component));
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
                var newState = !$(this).hasClass("ToggleButton--checked");
                console.log(" will toggle to " + newState);
                if (!addon.update(defName, newState))
                    newState = !newState;

                console.log(" state now is " + newState);

                if (newState)
                    $(this).addClass("ToggleButton--checked");
                else
                    $(this).removeClass("ToggleButton--checked");
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