// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "markdown-rendering-basic";

// Tests
describe("Basic Markdown Rendering", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			verbose: false, //true,
			logFilter: "mark"
		});
	});

	describe("Headings", function() {

		it("should render H1 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h1.html",
				"<h1 id='a-heading'>A Heading</h1>"
			);

		});
		it("should render H2 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h2.html",
				"<h2 id='a-heading'>A Heading</h2>"
			);

		});
		it("should render H3 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h3.html",
				"<h3 id='a-heading'>A Heading</h3>"
			);

		});
		it("should render H4 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h4.html",
				"<h4 id='a-heading'>A Heading</h4>"
			);

		});
		it("should render H5 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h5.html",
				"<h5 id='a-heading'>A Heading</h5>"
			);

		});
		it("should render H6 headings properly", function() {

			util.checkHtmlOutput(
				fixtureName,
				"h6.html",
				"<h6 id='a-heading'>A Heading</h6>"
			);

		});

	});

	describe.only("Special Notes", function() {

		it("should work for single words", function() {

			var fn = "notes/warning.html";
			util.checkHtmlOutput( fixtureName, fn , "<p class='grits-note note-warning'><span>Warning: </span>Mumble Mumble</p>");
			//util.debugOutput( fixtureName, fn );

		});

		it("should work for multiple words", function() {

			var fn = "notes/important-note.html";
			util.checkHtmlOutput( fixtureName, fn , "<p class='grits-note note-important note-note'><span>Important Note: </span>Mumble mumble..</p>");
			//util.debugOutput( fixtureName, fn );

		});

		it("should have an upper limit of 9 words", function() {

			var fn = "notes/too-long.html";
			util.checkHtmlOutput( fixtureName, fn , "<p>Something unnecessarily long with several words that do not matter: Lorem Ipsum</p>");
			//util.debugOutput( fixtureName, fn );

		});

	});

});
