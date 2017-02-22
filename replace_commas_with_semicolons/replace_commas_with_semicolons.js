// ==UserScript==
// @name         Memrise - Replace commas with semicolons
// @namespace    https://github.com/neoncube2/memrise
// @version      1.5
// @description  Replaces the commas that are in a course with semicolons. Memrise used to use commas as a separator but has now switched to using semicolons and slashes.
// @author       Eli Black
// @match        http://www.memrise.com/course/*/*/edit/
// @match        https://www.memrise.com/course/*/*/edit/
// @grant        MIT
// @updateURL    https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// @downloadURL  https://raw.githubusercontent.com/neoncube2/memrise/master/replace_commas_with_semicolons/replace_commas_with_semicolons.js
// ==/UserScript==


// Note that attributes aren't modified by this script.

var CHARACTER_TO_REPLACE = ',';
var CHARACTER_TO_REPLACE_WITH = ';';

var examinedItems = {};

var numUnfinishedRequests = 0;

var beginIfLevelsHaveLoadedInterval;

function replaceAllMatchingCharacters(string, characterToReplace, characterToReplaceWith) {
	// Thanks to http://stackoverflow.com/a/17606289
	return string.replace(new RegExp(characterToReplace, 'g'), characterToReplaceWith);
}

// TODO: Only activate if strict typing is turned off?
function replaceCommas(isStrictTypingEnabled, string) {
	if(isStrictTypingEnabled) {
		return replaceAllMatchingCharacters(string, CHARACTER_TO_REPLACE, CHARACTER_TO_REPLACE_WITH);
	}
	
	var parenPositions = [];
	
	// Thanks to http://stackoverflow.com/a/10710400
	for(let i = 0; i  <string.length; i++) {
		if(string[i] === '(' || string[i] === ')') {
			parenPositions.push(i);
		}
	}
	
	if(parenPositions.length == 0) {
		return replaceAllMatchingCharacters(string, CHARACTER_TO_REPLACE, CHARACTER_TO_REPLACE_WITH);
	}
	
	var stringSections = [];
	
	var openParenSequences = 0;
	var startOfSequenceIndex = 0;
	
	for(let i=0; i<parenPositions.length; i++) {
		let currentParenPosition = parenPositions[i];
		
		if(string[currentParenPosition] == ')') {
			if(!openParenSequences) {
				console.log('Encountered a closing parenthese that didn\'t match an opening parenthese. Word: ' + string);
				
				return false;
			}
			
			openParenSequences--;
			
			if(!openParenSequences) {
				stringSections.push(string.substr(startOfSequenceIndex, currentParenPosition - startOfSequenceIndex + 1));
				
				startOfSequenceIndex = currentParenPosition+1;
			}
		}
		else if(string[currentParenPosition] == '(') {
			// The startOfSequenceIndex != currentParenPosition is here in case there's a string that starts with a parenthese,
			// such as in "(comparison marker); to compare"
			if(!openParenSequences && startOfSequenceIndex != currentParenPosition) {
				stringSections.push(string.substr(startOfSequenceIndex, currentParenPosition - startOfSequenceIndex));
				
				startOfSequenceIndex = currentParenPosition;
			}
			
			openParenSequences++;
		}
		else {
			console.log('Expected a parenthese but encountered a different character. Word: ' + string);
			
			return false;
		}
	}
	
	if(openParenSequences) {
		console.log('Parenthetical expression wasn\'t closed. Word: ' + string);
		
		return false;
	}
	
	stringSections.push(string.substr(startOfSequenceIndex, string.length));
	
	stringSections = stringSections.map(function(section) {
		if(!section.length || section[0] == '(') {
			return section;
		
		}
		return replaceAllMatchingCharacters(section, CHARACTER_TO_REPLACE, CHARACTER_TO_REPLACE_WITH);
	});
	
	return stringSections.join('');
}

function postColumn(thingId, rows, row, rowIndex, columnsAndNewValues, columnsAndNewValuesIndex) {
	let columnsAndNewValuesKeys = Object.keys(columnsAndNewValues);
	
	console.log(columnsAndNewValuesKeys);
	console.log(columnsAndNewValuesIndex);
	
	let columnId = columnsAndNewValuesKeys[columnsAndNewValuesIndex];
	
	console.log(columnId);
		
	numUnfinishedRequests++;
	
	$.post('//www.memrise.com/ajax/thing/cell/update/', {
		'thing_id': thingId,
		'cell_id': columnId,
		'cell_type': 'column',
		'new_val': columnsAndNewValues[columnId]
	})
	.fail(function() {
		alert('Encountered an error posting a column\'s new value.');
		
		row.css('background-color', 'red');
	})
	.success(function() {
		if(row.css('background-color') != 'red') {
			row.css('background-color', 'lightgreen');
		}
	})
	.always(function() {
		numUnfinishedRequests--;
		
		if(columnsAndNewValuesIndex + 1 < columnsAndNewValuesKeys.length) {
			postColumn(thingId, rows, row, rowIndex, columnsAndNewValues, columnsAndNewValuesIndex+1)
		}
		
		checkIsFinished(rows, rowIndex);
	});
}

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
			
			var columnsAndNewValues = {};

			for(let columnId in thing.columns) {
				var column = thing.columns[columnId];

				if(column.kind != 'text') {
					continue;
				}

				var entryValue = column.val;

				if(entryValue.indexOf(CHARACTER_TO_REPLACE) == -1) {
					continue;
				}
				
				var newColumnValue = replaceCommas(false, entryValue);
				
				if(newColumnValue === false) {
					alert('Encountered an error relating to parentheses. Skipping and continuing.');
					
					encounteredError = true;
					
					row.css('background-color', 'red');
				}
				else if(entryValue != newColumnValue) {
					columnsAndNewValues[columnId] = newColumnValue;
				}
			}
			
			console.log(columnsAndNewValues);
			
			if(!$.isEmptyObject(columnsAndNewValues)) {
				postColumn(thingId, rows, row, rowIndex, columnsAndNewValues, 0)
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