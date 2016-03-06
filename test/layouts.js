// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "layouts";

// Tests
describe("Layouts", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			verbose: false,
			logFilter: "layout"
		});
	});

	describe("For HTML Content Files", function() {

		it("should work as expected for layouts with default content", function() {

			var fn = "html-with-def.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>" +
				" <div class='basic-layout'>hello <span>world</span>" +
				"</div>" +
				"</body>"
			);

		});

		it("should work as expected for layouts without default content", function() {

			var fn = "html-no-def.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>" +
				" <div class='basic-layout'>hello <span>world</span>" +
				"</div>" +
				"</body>"
			);

		});

	});
	describe("For Markdown Content Files", function() {

		it("should work as expected for layouts with default content", function() {

			var fn = "markdown-with-def.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>\n" +
				"\t<div class=\"basic-layout\"><strong>hello</strong> <em>world</em><br></div>\n" +
				"</body>\n\n"
			);

		});

		it("should work as expected for layouts without default content", function() {

			var fn = "markdown-no-def.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>\n" +
				"\t<div class=\"basic-layout\"><strong>hello</strong> <em>world</em><br></div>\n" +
				"</body>\n\n"
			);

		});

	});


	it("should show a proper error when a layout is not found", function() {



	});

});
