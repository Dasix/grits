// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "syntax-highlighting";

// Tests
describe.skip("Syntax Highlighting:", function() {



	// For now these tests are only useful for manual investigation and testing



	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			//verbose: true
			verbose: false
			,logFilter: "markdown"
		});
	});

	describe("In Markdown w/ Highlight.js", function() {

		it("should work as expected", function() {

			var fn = "javascript-test.html";
			//util.debugOutput( fixtureName, fn );

			/*
			var fn = "simple-helper-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello world</p>"
			);
			*/

		});

	});

});
