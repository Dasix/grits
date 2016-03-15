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
			//verbose: true,
			verbose: false,
			//logFilter: "markdown",
			defaultLayout: "another-test"
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
				"\t<div class=\"basic-layout\">" +
				"<p><strong>hello</strong> <em>world</em></p>\n" +
				"</div>\n" +
				"</body>\n\n"
			);

		});

		it("should work as expected for layouts without default content", function() {

			var fn = "markdown-no-def.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>\n" +
				"\t<div class=\"basic-layout\">" +
				"<p><strong>hello</strong> <em>world</em></p>\n" +
				"</div>\n" +
				"</body>\n\n"
			);

			var fn = "another-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>\n" +
				"    <div class=\"basic-layout\">\n" +
				"<h1 id=\"a-heading\">A Heading</h1>\n" +
				"<p>Hello world..</p>\n" +
				"</div>\n" +
				"</body>"
			);

		});

	});


	describe("Config.defaultLayout", function() {

		it("should apply a layout when none is specified", function() {

			var fn = "default-layout-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<body>\n" +
				"    <div class=\"basic-layout\">\n" +
				"<h1 id=\"a-heading\">A Heading</h1>\n" +
				"<p>Hello world..</p>\n" +
				"</div>\n" +
				"</body>"
			);

		});

		it("should allow explicit NULL overrides to the default layout", function() {

			var fn = "explicit-no-layout-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<h1 id=\"a-heading\">A Heading</h1>\n" +
				"<p>Hello world..</p>\n"
			);


			/*
			 var fn = "markdown-with-def.html";
			 util.checkHtmlOutput(
			 fixtureName, fn, "<body>\n" + "\t<div class=\"basic-layout\">" + "<p><strong>hello</strong> <em>world</em></p>\n" + "</div>\n" + "</body>\n\n"
			 );
			 */

		});

	});


});
