// ==UserScript==
// @name         Memrise - Replace commas with semicolons
// @namespace    https://github.com/neoncube2/memrise
// @version      1.1
// @description  Replaces commas with semicolons for the textual values that are in a course.
// @author       Eli Black
// @match        http://www.memrise.com/course/*/*/edit/
// @grant        MIT
// @updateURL    https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// @downloadURL  https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// ==/UserScript==

var beginIfLevelsHaveLoadedInterval;

function processRow(rows, rowIndex) {
    if(rowIndex >= rows.length) {
        alert('The script has mostly finished processing. Please wait a few seconds before leaving this page so that any updates that are currently in progress have a chance to finish.');
        
        return;
    }
    
    var row = $(rows[rowIndex]);
        
    row.css('background-color', 'lightgrey');

    var thingId = row.data('thing-id');

    console.log('Attempting to retrieve information about thing #' + thingId);

    // Is an _ parameter needed?
    $.get('//www.memrise.com/api/thing/get/?thing_id=' + encodeURIComponent(thingId), function(thingData) {
        var thing = thingData.thing;
        
        var encounteredError = false;
        
        var columnsAndNewValues = [];

        for(var columnId in thing.columns) {
            var column = thing.columns[columnId];

            if(column.kind != 'text') {
                continue;
            }

            var entryValue = column.val;

            if(entryValue.indexOf(',') == -1) {
                continue;
            }
            
            columnsAndNewValues[columnId] = entryValue.replace(',', ';');
        }
        
        for(var columnId in columnsAndNewValues) {
            $.post('http://www.memrise.com/ajax/thing/cell/update/', {
                'thing_id': thingId,
                'cell_id': columnId,
                'cell_type': 'column',
                'new_val': columnsAndNewValues[columnId]
            })
            .fail(function() {
                alert('Encountered an error posting a correction.');
                
                encounteredError = true;
                
                row.css('background-color', 'red');
            })
            .success(function() {
                console.log(columnsAndNewValues);
                
                var columnIdIndex = columnsAndNewValues.indexOf(columnId);
                columnsAndNewValues.splice(columnIdIndex, 1);
                
                if(!encounteredError) {
                    row.css('background-color', 'lightgreen');
                }
            });
        }
    })
    .fail(function() {
        alert('Encountered an error retrieving an item.');
        
        row.css('background-color', 'red');
    })
    .always(function() {
        processRow(rows, rowIndex + 1);
    });
    
   
}

function cleanLevels() {
    var rows = $('.level-things .thing');
    
    if(!rows.length) {
        console.log('Didn\'t find any items.');
    }
    
    processRow(rows, 0);
}

function isLevelLoading(level) {
    level = $(level);
    
    return !level.hasClass('collapsed') && level.find('.level-loading').length;
}

function beginIfLevelsHaveLoaded() {
    var levels = $('.level');
    
    var isLoading = false;
    
    levels.each(function() {
        if(isLevelLoading(this)) {
            isLoading = true;
           
           return false;
        }
    });
    
    if(!isLoading) {
        console.log('Beginning');
        
        clearInterval(beginIfLevelsHaveLoadedInterval);

        cleanLevels();
        
    }
}

(function() {
    var beginButton = $('<button class="show-hide btn">Replace commas with semicolons</button>').click(function() {
        $(this).attr('disabled', 'disabled');
        
        var levels = $('.level');
        
        // Make it so that the levels are opened from bottom to top,
        // so that the page doesn't scroll down and then scroll back up.
        $(levels.get().reverse()).each(function() {
            var level = $(this);

            if(!isLevelLoading(level)) {
                level.find('.show-hide').click();
            }
        });
        
        // Thanks to http://stackoverflow.com/questions/1144805/scroll-to-the-top-of-the-page-using-javascript-jquery
        $("html, body").animate({ scrollTop: 0 }, "slow");

        beginIfLevelsHaveLoadedInterval = setInterval(beginIfLevelsHaveLoaded, 1000);
    });
    
    beginButton.appendTo($('.add-level'));
})();