const $ = require('jquery');
const rightPane = require('octane/utils').rightPane;

var searchDown = true;
var caseMatches = false;
var previousSearchTerm = null;
var previousSearchIndex=0;
var allMatches=[];

module.exports.addonName = function() {
    return "search-addon";
};

module.exports.initBackend = function (webview) {
    const fs     = require('fs');
    const path   = require('path');

    var defaultCssFile = path.join(__dirname, "search-addon.css");
    webview.insertCSS(fs.readFileSync(defaultCssFile, 'utf8'));
};

module.exports.dependsOnElement = function() {
    return ".chatContainer";
};

module.exports.initUi = function() {
    document.addEventListener('keyup', function(e) {
        if (e.ctrlKey && e.keyCode == 70) { //CTRL+F
            openFindBox();
        }
        if (e.keyCode == 27) { // ESC, stop searching
            clearMatches();
            $(searchBox).hide();
        }
    });

    var tmp = document.createElement("p");
    tmp.innerHTML =
        '<div id="search-box" class="text-search-box">' +
        '	<input type="text" class="search-input" placeholder="what are you looking for today?">'+
        '	<span class="iconfont search search-button"></span>'+
        '	<span class="iconfont arrowDown search-direction" title="click to toggle search direction"></span>'+
        '	<span class="iconfont case-matching" title="click to toggle case matching">A<span class="case-matching-sign">=</span>a</span>'+
        '</div>';

    var searchBox = tmp.getElementsByTagName("div")[0];
    $(searchBox).hide();

    document.querySelector(".chatContainer").appendChild(searchBox);

    var searchInput = $(searchBox).find("input");
    searchInput.keyup(function(e) {
        if (e.keyCode == 13 || e.keyCode == 10)
            performFind();
    });

    var searchButton = $(searchBox).find('span.search');

    searchButton.click(function() {
        performFind();
    });

    $(searchBox).find('.search-direction').click(function() {
        if (this.className.indexOf("Down")>-1) {
            this.className = this.className.replace("Down", "Up");
        }
        else {
            this.className = this.className.replace("Up", "Down");
        }
        searchDown = !searchDown;
        searchInput.focus();
    });

    $(searchBox).find('.case-matching').click(function() {
        caseMatches = !caseMatches;
        if (caseMatches)
            this.innerHTML="A<span class='case-matching-sign'>≠</span>a";
        else
            this.innerHTML="A<span class='case-matching-sign'>=</span>a";
        previousSearchTerm = null;
        searchInput.focus();
    });

    function openFindBox() {
        $(searchBox).show();
        $(searchBox).find("input").focus();
    }
};

function clearMatches() {
    document.querySelectorAll(".messageHistory .content p").forEach(function(element) {
        element.innerHTML = element.innerHTML.replace(/<span class="search-highlight[^"]*".*>(.*?)<\/span>/g,"$1");
    });
    previousSearchTerm  = null;
    previousSearchIndex = 0;
    hideMatchList();
}

var previousOpenConversation = null;
var previousConversationHistoryCount = 0;
function performFind() {
    var $conversationHistory = $(".conversationHistory:visible")[0];
    if (previousOpenConversation != $conversationHistory) {
        previousSearchTerm = null;
    }
    previousOpenConversation = $conversationHistory;
    var newCount = $(".conversationHistory:visible swx-message").size();
    if (newCount != previousConversationHistoryCount)
        previousSearchTerm = null;

    previousConversationHistoryCount = newCount;

    var searchBox = document.getElementById("search-box");
    var searchInput = $(searchBox).find("input");
    var searchTerm = searchInput.val();
    if (searchTerm.trim() == "")
        return;

    if (previousSearchTerm == searchTerm) {
        $(allMatches[previousSearchIndex]).removeClass("current-match");
        if (searchDown) {
            previousSearchIndex++;
            if (previousSearchIndex >= allMatches.length)
                previousSearchIndex=0;
        }
        else {
            previousSearchIndex--;
            if (previousSearchIndex < 0)
                previousSearchIndex = allMatches.length-1;
        }

        allMatches[previousSearchIndex].scrollIntoView();
        $(allMatches[previousSearchIndex]).addClass("current-match");

        return;
    }

    searchInput.select();
    clearMatches();
    previousSearchTerm = searchTerm;
    var msgHistory = document.querySelectorAll(".messageHistory .content p");
    msgHistory.forEach(function(element) {
        highlightText(element, searchTerm);
    });
    allMatches = document.querySelectorAll(".messageHistory .search-highlight");
    if (allMatches.length > 0) {
        allMatches[0].scrollIntoView();
        $(allMatches[0]).addClass("current-match");
        updateMatchList(searchTerm);
    }
    else {
        initMatchList("No matches found for '"+searchTerm+"'")
    }
}

function highlightText(element, searchTerm){
    var caseFlag = caseMatches?"":"i";
    element.innerHTML
        = element.innerHTML.replace(new RegExp("("+searchTerm+")","g"+caseFlag),'<span class="search-highlight">$1</span>');
}

function initMatchList(title) {
    var pane = rightPane();
    if (title)
        pane.setContents("<div class='search-result-title'>"+title+"</div>\n");
    pane.show();
    return pane;
}

function updateMatchList(searchTerm)
{
    var searchResults = initMatchList("Matching Results");

    var currentMessage = null;
    allMatches.forEach(function(aMatch) {
        var swxMsg = $(aMatch).closest("swx-message[role='listitem']");
        if (swxMsg.attr("data-id") == currentMessage)
            return;
        currentMessage = swxMsg.attr("data-id");

        var author = swxMsg.find("swx-name").text().trim();
        if (author == "")
            author = "YOU";
        var msgContent = swxMsg.find(".content").text().trim();

        var result = $("<span class='result-snippet' id='r_"+swxMsg.attr("data-id")+"'><i>[" + author + "]</i>: "+msgContent+"</span>");
        searchResults.append(result);

        $(result).click(function() {
            aMatch.scrollIntoView();
            var parentParagraph = $(aMatch).closest("p");
            parentParagraph.css("transition","background .5s ease-in-out");
            parentParagraph.addClass("flash-message");

            parentParagraph.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function(){
                parentParagraph.removeClass("flash-message");
            });

        });
    });
    searchResults.find(".result-snippet").each(function() {
        highlightText(this, searchTerm);
    })
}

function hideMatchList() {
    // $(".conversationHistory").css("width","100%");
    // $("#search-results").width("0px");
    rightPane().hide();
}