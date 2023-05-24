// content.js
// create a new button element

// Load Tesseract.js onto the webpage

let worker;
const script = document.createElement("script");
script.src = chrome.runtime.getURL("scripts/tesseract.min.js");
(document.head || document.documentElement).appendChild(script);

script.onload = async function () {
	console.log("Loaded script");
	console.log(script.src);
	addUploadButton();
	addPasteListener();
	// addCodeIframe();
	worker = await createWorker();
};

// Load the Tesseract worker creation script
const workerScript = document.createElement("script");
workerScript.src = chrome.runtime.getURL("scripts/tesseractLoader.js");
workerScript.onload = function () {
	this.remove();
};
(document.head || document.documentElement).appendChild(workerScript);

// Load the message listening script
const messageListenerScript = document.createElement("script");
messageListenerScript.src = chrome.runtime.getURL("scripts/messageListener.js");
messageListenerScript.onload = function () {
	this.remove();
};
(document.head || document.documentElement).appendChild(messageListenerScript);

function addCodeIframe() {
	// get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// check if the textarea exists
	if (textarea) {
		// get the parent of the textarea
		let parent = textarea.parentNode;

		// create the iframe element
		let iframe = document.createElement("iframe");
		iframe.width = "100%";
		iframe.height = "500px";
		iframe.src = "https://code-from-screenshot-lmuw6mcn3q-uc.a.run.app/";
		iframe.frameborder = "0";
		iframe.allow = "clipboard-read; clipboard-write";

		// insert the iframe before the textarea
		parent.insertBefore(iframe, textarea);
	} else {
		console.log("Textarea not found.");
	}
}

function addPasteListener() {
	// get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// add paste event listener to textarea
	textarea.addEventListener("paste", function (e) {
		let clipboardData = e.clipboardData || window.clipboardData;
		if (clipboardData) {
			let items = clipboardData.items;
			for (let i = 0; i < items.length; i++) {
				if (items[i].type.indexOf("image") !== -1) {
					// We need to call preventDefault to stop the image being pasted into the textarea
					e.preventDefault();
					let file = items[i].getAsFile();
					console.log(file);
					// file is selected, handle it
					handleFile(file, worker);
				}
			}
		}
	});
}

function addUploadButton() {
	// create a new button element
	let btn = document.createElement("button");
	btn.id = "upload-button-tesseract-extension";
	btn.textContent = "Upload file";

	// style the button
	btn.style.backgroundColor = "green";
	btn.style.color = "white";
	btn.style.borderRadius = "8px";
	btn.style.padding = "10px";
	btn.style.border = "none";
	btn.style.cursor = "pointer";
	btn.style.outline = "none";
	btn.style.fontSize = "16px";
	btn.style.zIndex = "1";
	btn.style.marginBottom = "12px";

	// create a hidden file input
	let fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.style.display = "none";
	fileInput.accept = "image/*"; // accept only image files
	fileInput.id = "hidden-file-input";

	// add an event listener to the button
	btn.addEventListener("click", function () {
		// trigger file input click when button is clicked
		fileInput.click();
	});

	// add event listener to file input
	fileInput.addEventListener("change", function () {
		if (this.files && this.files[0]) {
			// file is selected, handle it
			handleFile(this.files[0], worker);
		}
	});

	// get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// check if the textarea exists
	if (textarea) {
		// get the parent of the textarea
		let parent = textarea.parentNode;

		// add the button to the parent of the textarea, before the textarea
		parent.insertBefore(btn, textarea);
		parent.insertBefore(fileInput, textarea);
	} else {
		console.log("Textarea not found.");
	}
}

async function createWorker() {
	const worker = await Tesseract.createWorker({
		logger: (m) => {
			// console.log(m);
			if (m.status === "recognizing text") {
				// Update progress bar width and text to display loading status and progress
				progressBar = document.getElementById("tesseract-progress-bar");
				if (progressBar) {
					progressBar.style.width = `${m.progress * 100}%`;
					let percentage = Math.round(m.progress * 100);
					progressBar.textContent = `${percentage}% - ${m.status}`;

					// change the color of the progress bar based on the progress
					let red = 255 - Math.round((255 * percentage) / 100); // decrease red color
					let green = Math.round((255 * percentage) / 100); // increase green color
					progressBar.style.backgroundColor = `rgb(${red}, ${green}, 0)`; // change background color

					if (m.progress === 1) {
						progressBar.textContent = "Finished"; // Update the progress text to "Finished"
						setTimeout(function () {
							// remove the progress bar after 5 seconds
							progressBar.parentElement.remove();
						}, 3500);
					}
				}
			}
		},
	});
	await worker.loadLanguage("eng");
	await worker.initialize("eng");
	await worker.setParameters({
		preserve_interword_spaces: "1",
	});
	console.log(worker);
	return worker;
}

async function handleFile(file, worker) {
	console.log("handling the file");

	let btn = document.getElementById("upload-button-tesseract-extension");

	// Get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// check if the textarea exists
	if (!textarea) {
		console.log("Textarea not found.");
		return;
	}

	// get the parent of the textarea
	let parent = textarea.parentNode;

	// create progress bar and insert it before the button
	let progressBarContainer = document.createElement("div");
	progressBarContainer.style.backgroundColor = "#f3f3f3"; // light grey
	progressBarContainer.style.borderRadius = "5px"; // rounded corners
	progressBarContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)"; // some box shadow
	progressBarContainer.style.height = "25px"; // height of the progress bar
	progressBarContainer.style.marginBottom = "10px"; // space below the progress bar
	progressBarContainer.style.overflow = "hidden"; // ensures inner bar stays within bounds

	let progressBar = document.createElement("div");
	progressBar.id = "tesseract-progress-bar";
	progressBar.style.height = "100%"; // make sure it fills up the entire container
	progressBar.style.width = "0%"; // initial width of the progress bar (0% because no progress has been made yet)
	progressBar.style.textAlign = "center"; // center the progress text
	progressBar.style.transition = "width 0.5s ease-in-out"; // smooth width transition
	progressBar.textContent = ""; // initial progress text (empty because no progress has been made yet)

	progressBarContainer.appendChild(progressBar); // add the progress bar to the container
	parent.insertBefore(progressBarContainer, btn);

	(async () => {
		// console.log(worker);
		const { data } = await worker.recognize(file, { rectangle: true });
		const indentedText = calculateIndentation(data);
		// console.log(text);

		// Get the textarea element
		let textarea = document.getElementById("prompt-textarea");

		// If the textarea exists, set its value to the recognized text
		if (textarea) {
			textarea.value = textarea.value + indentedText;

			textarea.style.height = ""; // Reset the height
			textarea.style.height = textarea.scrollHeight + "px"; // Set it to match the total content height

			// Set cursor position at the end of the text
			textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
		} else {
			console.log("Textarea not found.");
		}
	})();
}

// Function to calculate the indentation based on bounding box data
function calculateIndentation(data) {
	let indentedText = "";

	for (const block of data.blocks) {
		for (const paragraph of block.paragraphs) {
			for (const line of paragraph.lines) {
				let numChars = line.text.replace(/\s/g, "").length; // count number of non-space characters in the line
				let bboxWidth = line.bbox.x1 - line.bbox.x0; // calculate the width of the bounding box
				let charWidth = numChars > 0 ? bboxWidth / numChars : 0; // calculate the average character width

				let indentation = line.bbox.x0; // x0 gives the x-coordinate of the left edge of the bounding box
				let spaces = Math.floor(indentation / charWidth); // calculate number of spaces for indentation
				indentedText += " ".repeat(spaces) + line.text;
			}
		}
	}

	return indentedText;
}
