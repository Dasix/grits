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
			verbose: true,
			//verbose: false,
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

});
