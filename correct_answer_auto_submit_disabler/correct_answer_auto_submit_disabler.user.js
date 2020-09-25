// ==UserScript==
// @name         Memrise - Disable correct answer auto-submit
// @namespace    https://github.com/neoncube2/memrise
// @version      1.1.0
// @description  Attempts to disable the behavior where correct answers are automatically submited when studying or reviewing.
// @author       Eli Black
// @match        https://app.memrise.com/course/*/*/garden/*
// @updateURL    https://raw.githubusercontent.com/neoncube2/memrise/master/correct_answer_auto_submit_disabler/correct_answer_auto_submit_disabler.user.js
// @downloadURL  https://raw.githubusercontent.com/neoncube2/memrise/master/correct_answer_auto_submit_disabler/correct_answer_auto_submit_disabler.user.js
// @grant        none
// ==/UserScript==


// Some of the below code for mutation observers was taken from https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

function addSpaceIfInputEmpty(inputBox) {
	if (inputBox.value === '') {
		inputBox.value = ' ';
	}
}

function observeForInputs(mutationsList, observer) {
	const inputBox = document.querySelector('.typing-type-here');

	addSpaceIfInputEmpty(inputBox);

	inputBox.oninput = () => addSpaceIfInputEmpty(inputBox);

	inputBox.style.paddingLeft = 'calc(23px - 1ex)';
}

(function () {
	const boxes = document.getElementById('boxes');

	const config = { childList: true };
	const observer = new MutationObserver(observeForInputs);
	observer.observe(boxes, config);
})();