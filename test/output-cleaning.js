// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;

// Settings
var fixtureName = "output-cleaning";

// Tests
describe("Output Cleaning", function() {

	var rndr;

	beforeEach( function( cb ) {

		// Initialize a renderer
		rndr = ocInitRenderer( false );

		// Start Fresh
		rndr.cleanupManager.doCleanBefore().then(

			function() {

				// Create the junk files
				ocCreateJunkFiles();

				// Finished
				cb();

			}

		);

	});

	describe("Pre-Render Cleanup", function() {

		it("should clean (empty) all output paths when enabled", function( cb ) {

			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Configure cleanup operation
			rndr.cleanupManager.setEnabled( true );
			rndr.cleanupManager.setCleanMode( "before" );

			// Excute the renderer
			rndr.render().then(

				function afterRender() {

					_.each( [ "output-a", "output-b" ], function( outputDirName ) {

						// Assert: These should exist
						util.fileShouldExist( fixtureName, "test.html"				, outputDirName );
						util.fileShouldExist( fixtureName, "inline-static.txt"		, outputDirName );
						util.fileShouldExist( fixtureName, "css/test.css"			, outputDirName );

						// Assert: These should NOT exist
						util.fileShouldNotExist( fixtureName, "junk-a.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-b.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-c.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-d.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-e.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-f.html"			, outputDirName );

					});

					cb();

				}

			);

		});

		it("should allow manual execution", function( cb ) {

			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Clean junk files
			rndr.cleanupManager.doCleanBefore().then(

				function afterPreClean() {

					// Post-check
					expect( countFilesIn("a") ).to.equal( 0 );
					expect( countFilesIn("b") ).to.equal( 0 );

					// Finished
					cb();

				}

			);

		});

	});

	describe("Post-Render Cleanup", function() {

		it("should clean all files that it did not create", function( cb ) {

			// Add a dedicated static content path
			var paths = util.getPaths( fixtureName );

			// Configure cleanup operation
			rndr.cleanupManager.setEnabled( true );
			rndr.cleanupManager.setCleanMode( "after" );

			// Add our static file content
			rndr.addStaticContentPath( util.path.join( paths.sourceRoot, "static " ) );

			// Execute the render operation
			rndr.render().then(

				function afterRender() {

					_.each( [ "output-a", "output-b" ], function( outputDirName ) {

						// Assert: These should exist
						util.fileShouldExist( fixtureName, "test.html"				, outputDirName );
						util.fileShouldExist( fixtureName, "inline-static.txt"		, outputDirName );
						util.fileShouldExist( fixtureName, "dedicated-static.txt"	, outputDirName );
						util.fileShouldExist( fixtureName, "css/test.css"			, outputDirName );

						// Assert: These should NOT exist
						util.fileShouldNotExist( fixtureName, "junk-a.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-b.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-c.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-d.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-e.html"			, outputDirName );
						util.fileShouldNotExist( fixtureName, "junk-f.html"			, outputDirName );

					});

					cb();

				}

			);

		});

	});

	describe("AutoClean Settings", function() {

		it("should default to disabled (but with mode set to 'after')", function() {

			var cfg = rndr.getConfig();

			expect( cfg.autoClean ).to.equal( false );
			expect( cfg.cleanMode ).to.equal( "after" );

		});

		it("should be configurable", function() {

			// Auto-Clean

			// Turn auto-clean on ..
			rndr.cleanupManager.setEnabled( true );
			expect( rndr.getConfig().autoClean ).to.equal( true );

			// Turn auto-clean off ..
			rndr.cleanupManager.setEnabled( false );
			expect( rndr.getConfig().autoClean ).to.equal( false );

			// Try without a param
			rndr.cleanupManager.setEnabled();
			expect( rndr.getConfig().autoClean ).to.equal( true );

			// Try an invalid setting
			rndr.cleanupManager.setEnabled( 123456 );
			expect( rndr.getConfig().autoClean ).to.equal( true );

			// Use the setAutoClean alias
			rndr.cleanupManager.setEnabled( false );
			rndr.setAutoClean( true );
			expect( rndr.getConfig().autoClean ).to.equal( true );


			// Clean Mode

			// Set mode to 'before'
			rndr.cleanupManager.setCleanMode( "before" );
			expect( rndr.getConfig().cleanMode ).to.equal( "before" );

			// Set mode to 'after'
			rndr.cleanupManager.setCleanMode( "after" );
			expect( rndr.getConfig().cleanMode ).to.equal( "after" );

			// Try without a param
			rndr.cleanupManager.setCleanMode( );
			expect( rndr.getConfig().cleanMode ).to.equal( "after" );

			// Try an invalid setting
			rndr.cleanupManager.setCleanMode( 123456 );
			expect( rndr.getConfig().cleanMode ).to.equal( "after" );

			// Use the renderer.setCleanMode alias
			rndr.cleanupManager.setCleanMode( "before" );
			rndr.setCleanMode( "after" );
			expect( rndr.getConfig().cleanMode ).to.equal( "after" );

		});

		it("should NOT clean output paths when disabled", function( cb ) {

			// Pre-check
			expect( countFilesIn("a") ).to.equal( 3 );
			expect( countFilesIn("b") ).to.equal( 3 );

			// Excute the renderer
			rndr.render().then(

				function afterRender() {

					// Assert: These should exist in output-a
					util.fileShouldExist( fixtureName, "test.html"				, "output-a" );
					util.fileShouldExist( fixtureName, "inline-static.txt"		, "output-a" );
					util.fileShouldExist( fixtureName, "css/test.css"			, "output-a" );
					util.fileShouldExist( fixtureName, "junk-a.html"			, "output-a" );
					util.fileShouldExist( fixtureName, "junk-b.html"			, "output-a" );
					util.fileShouldExist( fixtureName, "junk-c.html"			, "output-a" );

					// Assert: These should exist in output-b
					util.fileShouldExist( fixtureName, "test.html"				, "output-b" );
					util.fileShouldExist( fixtureName, "inline-static.txt"		, "output-b" );
					util.fileShouldExist( fixtureName, "css/test.css"			, "output-b" );
					util.fileShouldExist( fixtureName, "junk-d.html"			, "output-b" );
					util.fileShouldExist( fixtureName, "junk-e.html"			, "output-b" );
					util.fileShouldExist( fixtureName, "junk-f.html"			, "output-b" );

					cb();

				}

			);

		});


	});



});

/**
 * Creates a new renderer, configured for the tests above..
 *
 * @param {boolean} verbose Render verbosity setting
 * @returns {Dasix.grits.Renderer}
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
