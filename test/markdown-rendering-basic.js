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

});
