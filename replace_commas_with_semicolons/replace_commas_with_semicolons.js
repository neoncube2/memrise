// ==UserScript==
// @name         Memrise - Replace commas with semicolons
// @namespace    https://github.com/neoncube2/memrise
// @version      1.2
// @description  Replaces commas with semicolons for the textual values that are in a course.
// @author       Eli Black
// @match        http://www.memrise.com/course/*/*/edit/
// @grant        MIT
// @updateURL    https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// @downloadURL  https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// ==/UserScript==


// Note that attributes aren't modified by this script.

var CHARACTER_TO_REPLACE = ',';
var CHARACTER_TO_REPLACE_WITH = ';';

var examinedItems = [];

var numUnfinishedRequests = 0;

var beginIfLevelsHaveLoadedInterval;

function checkIsFinished(rows, rowIndex) {
	if(rowIndex + 1 == rows.length && !numUnfinishedRequests) {
		alert('Finished.');
	}
}

function processRow(rows, rowIndex) {
	if(rowIndex == rows.length) {
		return;
	}
	
	var row = $(rows[rowIndex]);
	
    var thingId = row.data('thing-id');
	
	if(!examinedItems[thingId]) {
		console.log('Attempting to retrieve information about thing #' + thingId);
		
		examinedItems[thingId] = true;
		
		numUnfinishedRequests++;

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

				if(entryValue.indexOf(CHARACTER_TO_REPLACE) == -1) {
					continue;
				}
				
				// Thanks to http://stackoverflow.com/a/17606289
				columnsAndNewValues[columnId] = entryValue.replace(new RegExp(CHARACTER_TO_REPLACE, 'g'), CHARACTER_TO_REPLACE_WITH);
			}
			
			if(columnsAndNewValues.length) {
				for(var columnId in columnsAndNewValues) {
					numUnfinishedRequests++;
					
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
					})
					.always(function() {
						numUnfinishedRequests--;
						
						checkIsFinished(rows, rowIndex);
					});
				}
			}
			else {
				row.css('background-color', 'lightgrey');
			}
		})
		.fail(function() {
			alert('Encountered an error retrieving an item.');
			
			row.css('background-color', 'red');
		})
		.always(function() {
			numUnfinishedRequests--;
						
			checkIsFinished(rows, rowIndex);
			
			processRow(rows, rowIndex + 1);
		});
	}
	else {
		row.css('background-color', 'lightgrey');
		
		processRow(rows, rowIndex + 1);
	}
}

function cleanLevels() {
    var rows = $('.level-things .thing');
    
    if(!rows.length) {
        console.log('Didn\'t find any items.');
    }
    
    processRow(rows, 0);
	
	checkIsFinished(rows, rows.length-1);
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