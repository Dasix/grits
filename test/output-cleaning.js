// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "output-cleaning";

// Tests
describe("Output Cleaning", function() {

	var rndr;

	beforeEach( function() {

		// Initialize a renderer
		rndr = ocInitRenderer( false );

		// Start Fresh
		rndr.cleanOutputTargets();

		// Create the junk files
		ocCreateJunkFiles();

	});

	describe("renderer.cleanOutputTargets()", function() {

		it("should clean (empty) all output paths", function() {

			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Clean junk files
			rndr.cleanOutputTargets();

			// Post-check
			expect( countFilesIn("a") ).to.equal( 0 );
			expect( countFilesIn("b") ).to.equal( 0 );

		});

	});

	describe("renderer.setAutoClean()", function() {

		it("should clean (empty) all output paths when set to TRUE", function( cb ) {

			// FIRST ..
			// A few preliminary tests on the functionality of the
			// accessors and mutators for the auto-clean property.
			// I did not want to spend a "clean->junk->clean" unit
			// testing cycle on this, and these methods are unlikely
			// to ever break, so I just slid them in here...

			// Auto-clean should default to FALSE
			expect( rndr.getAutoClean() ).to.equal( false );

			// We should be able to enable auto-clean..
			rndr.setAutoClean( true );
			expect( rndr.getAutoClean() ).to.equal( true );

			// We should also be able to disable auto-clean..
			rndr.setAutoClean( false );
			expect( rndr.getAutoClean() ).to.equal( false );

			// Toggle should also work ..
			rndr.toggleAutoClean();
			expect( rndr.getAutoClean() ).to.equal( true );


			// ... Moving on ...


			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Excute the renderer
			rndr.render().then( function() {

				// Post Check
				expect( countFilesIn("a") ).to.equal( 1 );
				expect( countFilesIn("b") ).to.equal( 1 );

				// Done
				cb();

			});

		});

		it("should NOT clean output paths when set to FALSE", function( cb ) {

			// Auto-clean should default to FALSE
			expect( rndr.getAutoClean() ).to.equal( false );

			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Excute the renderer
			rndr.render().then( function() {

				// Post Check
				expect( countFilesIn("a") ).to.equal( 4 );
				expect( countFilesIn("b") ).to.equal( 4 );

				// Done
				cb();

			});

		});

	});

});

/**
 * Creates a new renderer, configured for the tests above..
 *
 * @param {boolean} verbose Render verbosity setting
 * @returns {C2C.dustjs.Renderer}
 */
function ocInitRenderer( verbose ) {

	// Get the paths
	var paths = util.getPaths( fixtureName );

	// Init Renderer
	var rndr = util.getFreshRenderer();

	// Set verbosity
	rndr.setVerbose( verbose );

	// Set paths
	rndr.setRootPath( paths.sourceRoot );
	rndr.setOutputPath( paths.outputRoot + "-a" );
	rndr.addOutputPath( paths.outputRoot + "-b" );

	// Done
	return rndr;

}

/**
 * Junks up our output directories..
 */
function ocCreateJunkFiles() {

	ocCreateOneJunkFile( "a", "junk-a.html" );
	ocCreateOneJunkFile( "a", "junk-b.html" );
	ocCreateOneJunkFile( "a", "junk-c.html" );
	ocCreateOneJunkFile( "b", "junk-d.html" );
	ocCreateOneJunkFile( "b", "junk-e.html" );
	ocCreateOneJunkFile( "b", "junk-f.html" );

}

/**
 * Resolves an output directory path
 *
 * @param {string} outputPathLetter The output path being referred to, this test
 * uses two output directories, "output-a" and "output-b".  The param expects the last
 * letter: "a" or "b" respectively.
 * @returns {string} The full and absolute output path
 */
function ocGetOutputPath( outputPathLetter ) {
	var paths = util.getPaths( fixtureName );
	return paths.outputRoot + "-" + outputPathLetter;
}

/**
 * Creates a single junk file in one of the output directories.
 *
 * @param {string} outputPathLetter The output path being referred to, this test
 * uses two output directories, "output-a" and "output-b".  The param expects the last
 * letter: "a" or "b" respectively.
 * @param {string} filename The filename of the junk file to create
 * @returns {void}
 */
function ocCreateOneJunkFile( outputPathLetter, filename ) {

	var targetDir = ocGetOutputPath( outputPathLetter );
	var targetFile = util.path.join( targetDir, filename );
	util.fs.writeFileSync( targetFile, "This is a junk file", { encoding: "utf8" } );

}

/**
 * Counts the total number of files in one of the output directories.
 *
 * @param {string} outputPathLetter The output path being referred to, this test
 * uses two output directories, "output-a" and "output-b".  The param expects the last
 * letter: "a" or "b" respectively.
 * @returns {number} The number of files in the specified output directory.
 */
function countFilesIn( outputPathLetter ) {

	var targetDir = ocGetOutputPath( outputPathLetter );
	var listing = util.fs.readdirSync( targetDir );
	return listing.length;

}
