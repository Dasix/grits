// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "helpers";

// Tests
describe("Helpers", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			//verbose: true
			verbose: false,
			logFilter: "helper"
		});
	});

	describe("Basic Helper Functionality", function() {

		it("should work as expected", function() {

			var fn = "simple-helper-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello world</p>"
			);

		});

		it("should support body text", function() {

			var fn = "yell-helper-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello WORLD</p>"
			);

		});

		it("should support parameters", function() {

			var fn = "paramable-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello mars</p>"
			);

		});

		it("should support body and params", function() {

			var fn = "params-and-body.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello earth and mars</p>"
			);

		});

	});

	describe("Built-In {@markdown} Helper", function() {

		it("should allow in-line markdown content in HTML sources", function() {

			var fn = "markdown/markdown-in-html.html";
			var expected = "<body><p><em>Hello World</em></p></body>";
			util.checkOutputNoWS( fixtureName, fn, expected );

		});

		it("should allow in-line markdown content in HTML partials", function() {

			var fn = "markdown/markdown-in-partial.html";
			var expected = "<h3 id=\"a-heading\">A Heading</h3><p><em>Hello World</em></p>";
			util.checkOutputNoWS( fixtureName, fn, expected );

		});

	});

	describe("{@youtube} example", function() {

		it("should render as expected", function() {

			var fn = "youtube-helper-test.html";
			var expected = "<h1 id=\"heading\">Heading</h1>" + "\n" +
				"<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/ZMrWF9d5Vbw\" frameborder=\"0\" allowfullscreen></iframe>";

			util.checkOutputNoWS( fixtureName, fn, expected );
			//util.debugOutput( fixtureName, fn );

		});

	});

});
