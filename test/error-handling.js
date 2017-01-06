// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "error-handling";

// Tests
describe.only("Error Handling", function() {

	var rndr;

	/*before( function( cb ) {


		// Find the root paths for our fixture
		var paths = util.getPaths( fixtureName );

		// Initialize a renderer
		rndr = util.getRenderer( fixtureName, false );

		// Use two content paths for these tests
		rndr.setContentPath( util.path.join( paths.sourceRoot, "content-a" ) );
		rndr.addContentPath( util.path.join( paths.sourceRoot, "content-b" ) );

		// Use two data paths for these tests
		rndr.setDataPath( util.path.join( paths.sourceRoot, "data-a" ) );
		rndr.addDataPath( util.path.join( paths.sourceRoot, "data-b" ) );

		// Perform the render op
		rndr.render().then(
			function() {
				cb();
			}
		);


	});*/

	before( function( cb ) {
		util.renderFixture( fixtureName, function() {
			cb();
		}, {
			verbose: true,
			//verbose: false,
			//logFilter: "markdown",
			//defaultLayout: "another-test"
		});
	});

	describe("Dust.js Rendering", function() {

		it("should something", function() {

			/*
			var cd = rndr.dataManager.getContextData();
			var page = cd.page;

			expect( page["1x"]["number-first-test-1"]["nft"] ).to.equal( 1 );
			expect( page["2x"]["number-first-test-2"]["nft"] ).to.equal( 2 );
			expect( page["2x"]["3x"]["number-first-test-3"]["nft"] ).to.equal( 3 );
			expect( page["2x"]["four"]["number-first-test-4"]["nft"] ).to.equal( 4 );
			*/

		});

	});

});
