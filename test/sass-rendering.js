// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;

// Settings
var fixtureName = "sass-rendering";

// Tests
describe("Sass Rendering", function() {

	var rndr;
	var paths;

	before( function( cb ) {

		// Resolve paths
		var paths = util.getPaths( fixtureName );

		// Create a renderer
		rndr = util.getRenderer( fixtureName, false );

		// Set Debug Logging
		//rndr.setVerbose( true );
		//rndr.setLogFilter( "sass" );

		// Add an inclusion path
		rndr.setSassIncludePath( util.path.join( paths.sourceRoot, "scss-includes" ) );

		// Render the output
		rndr.render().then( function() {
			cb();
		});

	});

	describe("Basic Rendering", function() {

		it("should render SCSS to CSS", function() {

			var expected = 	".basic {" +
								"font-family: \"Good Stuff\";" +
							"}" +
							".basic .rendering {" +
								"color: green;" +
							"}";

			util.checkOutputNoWS( fixtureName, "css/basic-rendering.css", expected );

		});

		it("should create nested file structures properly", function() {

			var expected = 	"" +
				".basic-subdir-test {" +
					"color: green;" +
				"}";


			util.checkOutputNoWS( fixtureName, "css/subdir/basic-subdir-test.css", expected );

		});

		it.skip("should not render support files with a _prefix", function() {



		});

	});

	describe("Inclusion", function() {

		it("should properly include in-line support files", function() {

			var expected = 	".inc-one {	color: green; }";

			util.checkOutputNoWS( fixtureName, "css/basic-inclusion.css", expected );

		});

		it("should properly include nested support files", function() {

			var expected = 	".inc-two {	color: green; }";

			util.checkOutputNoWS( fixtureName, "css/subdir-inclusion.css", expected );

		});

		it("should find files in the include path(s)", function() {

			var expected = 	".inc-three { color: green; }";

			util.checkOutputNoWS( fixtureName, "css/include-path-basic.css", expected );

		});

		it("should find files deep in the include path(s)", function() {

			var expected = 	".inc-five { color: green; }";

			util.checkOutputNoWS( fixtureName, "css/include-path-deep.css", expected );

		});

		it("should allow external file inclusion", function() {

			var expected = 	".inc-six { color: green; }";

			util.checkOutputNoWS( fixtureName, "css/external-inclusion-basic.css", expected );

		});

		it("should allow external file inclusion from path'd files", function() {

			var expected = 	".inc-six { color: green; }";

			util.checkOutputNoWS( fixtureName, "css/include-path-to-external.css", expected );

		});

		it("should allow path'd file inclusion from external files", function() {

			var expected = 	".inc-five { color: green; }";

			util.checkOutputNoWS( fixtureName, "css/include-path-deep.css", expected );

		});

	});

});
