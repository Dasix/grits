// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "partials";

// Tests
describe("partials", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			//verbose: true,
			verbose: false,
			logFilter: "partial"
		});
	});

	describe("Basic partial Functionality", function() {

		it("should work as expected", function() {

			var fn = "simple-partial-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello <em>world</em>\n</p>"
			);

		});

	});

	describe("Markdown to Markdown Inclusion", function() {

		it("should pre-render markdown partials", function() {

			var fn = "markdown-inc-markdown-a.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>Hello <p>World</p>\n</p>"
			);

		});

		it("should layout as expected", function() {

			var fn = "markdown-inc-markdown-b.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>Hello<br><p>World</p>\n</p>"
			);

			fn = "markdown-inc-markdown-c.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>Hello</p>\n<p>World</p>"
			);

		});

	});

});
