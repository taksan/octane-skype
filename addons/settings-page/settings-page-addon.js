$ = require('../../node_modules/jquery/dist/jquery.min.js');
const ipc = require('electron').ipcRenderer;

var isInitialized = false;
module.exports.addonName = function () {
    return "settings-page-addon";
};

module.exports.initUi = function (addonConfig, settings) {
    console.log("trying to configure");
    if (isInitialized) return;
    var navigation = document.querySelector("swx-navigation");
    if (!navigation)
        return;
    isInitialized = true;
    console.log("swx-navigation found")

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

    var observer = new MutationObserver(() => {
        console.log("obs 1");
        if ($(".UserSettingsPage").size() == 0)
            return;

        console.log("obs 2");

        if ($("#octane-settings").size() > 0)
            return;
        console.log("obs 3");

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

    $(".UserSettingsPage-scroll-area .scrollViewport ul").append(
        `<li><h1 class="UserSettingsPage-heading">Main preferences</h1></li>`
    );
    setupComponents(settings.metadata.main, settings.config, "main");
    for (var addOnName in settings.metadata.addons) {
        $(".UserSettingsPage-scroll-area .scrollViewport ul").append(
            `<li><h1 class="UserSettingsPage-heading">${addOnName} preferences</h1></li>`
        );
        setupComponents(settings.metadata.addons[addOnName], settings.config.addons[addOnName], addOnName);
    }

    return false;
}

function setupComponents(metadataRoot, configRoot, addOnName) {
    for (var defName in metadataRoot) {
        var definition = metadataRoot[defName];
        var component = typeInfo[definition.type].makeHtml(addOnName, defName, definition.title, definition.description, configRoot, definition.data);
        $(".UserSettingsPage-scroll-area .scrollViewport ul").append($(component));
        typeInfo[definition.type].addChangeHandler(addOnName, defName);
    }
}

const typeInfo = {
    boolean: {
        makeHtml: function (addOnName, defName, title, description, config) {
            var checked = "";
            if (config[defName])
                checked = "--checked";
            var id = addOnName+"_" + defName;
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
        addChangeHandler: function(addOnName, defName) {
            $("#" + addOnName+"_" + defName).change(function () {
                var value = $("#" + addOnName+"_" + defName).val();
                value = value == "true";
                ipc.sendToHost("settings-update", addOnName+"_" + defName, value);
            });
        }
    },
    select : {
        makeHtml: function (addOnName, defName, title, description, config, data) {
            var id = addOnName+"_" + defName;
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
        },
        addChangeHandler: function(addOnName, defName) {
            $("#" + addOnName+"_" + defName).change(function () {
                var value = $("#" + addOnName+"_" + defName).val();
                ipc.sendToHost("settings-update", addOnName+"_" + defName, value);
            });
        }
    }
};