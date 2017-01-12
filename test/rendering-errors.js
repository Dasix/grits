// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;

// Settings
var fixtureName = "rendering-errors";

// Tests
describe("Errors:", function() {

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		},{
			attemptRecovery: true,
			//logLevel: "warning",
			logFilter: null
		});
	});

	describe("During Dust.js Rendering:", function() {

		it("should not halt the rendering operation", function() {

			// This isn't a great test because it depends on rendering
			// order (which is not necessarily predictable), but it will
			// suffice for now, I think.

			util.fileShouldExist( fixtureName, "z-should-render.html" );

		});

	});

	describe("During SASS Rendering:", function() {

		it("should not halt the rendering operation", function() {

			// This isn't a great test because it depends on rendering
			// order (which is not necessarily predictable), but it will
			// suffice for now, I think.

			util.fileShouldExist( fixtureName, "css/z-should-render.css" );

		});

	});

});
