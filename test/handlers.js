// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "handlers";

// Tests
describe("Handlers", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			//verbose: true,
			verbose: false,
			logFilter: "handler"
		});
	});

	describe("Basic Handler Functionality", function() {

		it("should work as expected", function() {

			var fn = "simple-handler-test.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>hello world</p>"
			);

		});


	});

});
