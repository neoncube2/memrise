// ==UserScript==
// @name         Memrise - Replace commas with semicolons
// @namespace    https://github.com/neoncube2/memrise
// @version      0.9.1
// @description  Replaces commas with semicolons for the textual values that are in a course.
// @author       Eli Black
// @match        http://www.memrise.com/course/*/*/edit/
// @grant        MIT
// @downloadURL  https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// @updateURL    https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// ==/UserScript==

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

        for(var columnId in thing.columns) {
            var column = thing.columns[columnId];

            if(column.kind != 'text') {
                continue;
            }

            var entryValue = column.val;

            if(entryValue.indexOf(',') == -1) {
                continue;
            }

            entryValue = entryValue.replace(',', ';');

            $.post('http://www.memrise.com/ajax/thing/cell/update/', {
                'thing_id': thingId,
                'cell_id': columnId,
                'cell_type': 'column',
                'new_val': entryValue
            })
            .fail(function() {
                alert('Encountered an error posting a correction.');
                
                encounteredError = true;
                
                row.css('background-color', 'red');
            })
            .success(function() {
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
        console.log('Didn\'t find any items in the level.');
    }
    
    processRow(rows, 0);
}

(function() {
    var beginButton = $('<button class="show-hide btn">Replace commas with semicolons</button>').click(function() {
        $(this).attr('disabled', 'disabled');
        
        var levels = $('.level');
        
        levels.each(function() {
            var level = $(this);

            if(!level.find('.things').length) {
                level.find('.show-hide').click();
            }
        });
        
        // Thanks to http://stackoverflow.com/questions/1144805/scroll-to-the-top-of-the-page-using-javascript-jquery
        $("html, body").animate({ scrollTop: 0 }, "slow");

        setTimeout(cleanLevels, 10000);
    });
    
    beginButton.appendTo($('.add-level'));
})();