// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "manual-rendering";

// Tests
describe("Manual Rendering", function() {

	var rndr;

	beforeEach( function() {

		var cfg = {
			verbose: false,
			logFilter: "dust"
		};
		rndr = util.getRenderer( fixtureName, cfg );

	});

	describe("Basic Manual Rendering", function() {

		it("should work as expected", function( cb ) {

			// Define manual content
			var arrManualContent = [

				"---",
				"layout: test-layout",
				"---",
				"# A Heading",
				"",
				"Hello world..",
				""

			];
			var strManualContent = arrManualContent.join("\n");

			// Start rendering ..
			rndr.dustManager.renderString("virtual.md", strManualContent ).then(

				function() {
					return rndr.dustManager.renderString("subdir/virtual.md", strManualContent );
				}

			).then(

				function() {
					return rndr.dustManager.renderString("do/not/output/me.md", strManualContent, false );
				}

			).then(

				function() {

					// Assert files that should exist
					util.fileShouldExist( fixtureName, "compare.html" );
					util.fileShouldExist( fixtureName, "virtual.html" );
					util.fileShouldExist( fixtureName, "subdir/virtual.html" );

					// Assert files that should NOT exist
					util.fileShouldNotExist( fixtureName, "do/not/output/me.html" );

					// Grab the contents of the file that was rendered
					var compare = util.getOutput( fixtureName, "compare.html" );

					// The virtual files should have identical content as the compare file
					var virtContentA = util.getOutput( fixtureName, "virtual.html" );
					expect( virtContentA ).to.equal( compare );
					var virtContentB = util.getOutput( fixtureName, "subdir/virtual.html" );
					expect( virtContentB ).to.equal( compare );

					// Finished
					cb();
				}

			);


		});

	});

});
