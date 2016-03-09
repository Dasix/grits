
//<editor-fold desc="++++++++ Dependencies and Initialization ++++++++">

// Load the DustJS Renderer
require( "../../index" );

// Dependencies
var path 	= require( "path" );
var fs		= require( "fs" );
var chai 	= require( "chai" );
var expect 	= chai.expect;
var _		= require( "lodash" );
var tipe	= require( "tipe" );
var cproc	= require( "child_process" );

// Chai Plugins
chai.use( require("chai-html") 	);

// Initialize static utils class
var u = module.exports = {
	lodash : _,
	chai   : chai,
	expect : expect,
	path   : path,
	fs     : fs
};

//</editor-fold>


//<editor-fold desc="++++++++ Creating Renderers and Rendering ++++++++">

/**
 * Creates a renderer that is preloaded with fixture paths.
 *
 * @param {string} name
 * @param {?boolean|object} [cfg=false] A configuration object.  If an object is passed
 * then it will be used to configure the renderer.  If a boolean is passed, then it will
 * be used as the verbose setting (i.e. `{ verbose: cfg }`).  If this param is omitted
 * or if anything else is passed (such as NULL), then a default cfg object will be
 * constructed and used.
 * @returns {object}
 */
u.getRenderer = function( name, cfg ) {

	// Locals
	var me = this;

	// Parse the cfg param
	if( cfg === undefined || cfg === null ) {
		cfg = { verbose: false };
	} else if( tipe( cfg ) === "boolean" ) {
		cfg = { verbose: cfg };
	} else if( tipe( cfg ) === "object" ) {
		// accept as cfg object
	} else {
		cfg = { verbose: false };
	}

	// Get the paths
	var paths = me.getPaths( name );

	// Init Renderer
	var rndr = me.getFreshRenderer( cfg );

	// Set paths
	rndr.setRootPath( paths.sourceRoot );
	rndr.setOutputPath( paths.outputRoot );

	// Enable auto-clean
	rndr.setAutoClean( true );

	// Done
	return rndr;

};

/**
 * Creates a renderer
 *
 * @param {?object} [cfg=NULL] A configuration object to pass to the renderer
 * @returns {object}
 */
u.getFreshRenderer = function( cfg ) {

	// cfg param handling
	if( cfg === undefined || cfg === null ) {
		cfg = null;
	}

	// Init Renderer
	return new Dasix.grits.Renderer( cfg );

};

/**
 * Convenience function for rendering a fixture.  This is used when the tests only
 * need to verify the content of the renderer output.
 *
 * @param {string} fixtureName The name of the fixture, which should match a directory
 * in `tests/fixtures/*`.
 * @param {function} callback A callback that will be called once the render has completed.
 * @param {?boolean|object} [cfg=false] A configuration object.  If an object is passed
 * then it will be used to configure the renderer.  If a boolean is passed, then it will
 * be used as the verbose setting (i.e. `{ verbose: cfg }`).  If this param is omitted
 * or if anything else is passed (such as NULL), then a default cfg object will be
 * constructed and used.
 * @returns {void}
 */
u.renderFixture = function( fixtureName, callback, cfg ) {

	// Create a renderer
	var rndr = this.getRenderer( fixtureName, cfg );

	// Render the fixture
	rndr.render().then(
		function() {
			callback( rndr );
		}
	);

};

//</editor-fold>


//<editor-fold desc="++++++++ Paths and Getting/Debugging Output ++++++++">

/**
 * Builds the source and output paths for a particular test file.
 *
 * @param {string} name
 * @returns {object}
 */
u.getPaths = function( name ) {

	var ret = {};

	// Find the fixture root directory
	ret.fixtureRoot = path.join( __dirname, "..", "fixtures", name );

	// Find the source directory
	ret.sourceRoot = path.join( ret.fixtureRoot, "src" );

	// Find the output directory
	ret.outputRoot = path.join( ret.fixtureRoot, "output" );

	// Find the expected output directory (for comparison)
	ret.expectedRoot = path.join( ret.fixtureRoot, "expected" );

	// All done
	return ret;

};

/**
 * This function will return the contents of a file
 * that was output by the renderer after a fixture rendering op.
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @returns {string}
 */
u.getOutput = function( fixtureName, filename ) {

	// Get the paths
	var paths = this.getPaths( fixtureName );
	var contents;

	// Resolve target path
	var target = path.join( paths.outputRoot, filename );

	// Load the target file
	try {
		contents = fs.readFileSync( target, { encoding: "utf8" } );
	} catch( err ) {
		console.log(" ");
		console.log(" ");
		console.log("-~-~-~-~-~- util.getOutput -~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
		console.log(" ");
		console.log("Could not read output from file because it does not exist!")
		console.log(" -> " + target);
		console.log(" ");
		console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~");
		console.log(" ");
		console.log(" ");
		throw(err);
	}


	// Done
	return contents;

};

/**
 * Loads an output file and dumps its contents to STDOUT
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @returns {void}
 */
u.debugOutput = function( fixtureName, filename ) {

	var me = this;
	var content = me.getOutput( fixtureName, filename );
	me.dbg( fixtureName + " : " + filename, content );

};



//</editor-fold>


//<editor-fold desc="++++++++ Output Validations and Assertions ++++++++">


/**
 * Compares the output from an output file to an expected result
 * after, first, removing all white space from the file and from
 * the expected result string.  This is a very rough check...
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} expected The expected result to use for comparison
 * @returns {void}
 */
u.checkOutputNoWS = function( fixtureName, filename, expected ) {

	var me = this;
	var actual = me.getOutput( fixtureName, filename, expected );

	// Trim all whitespace
	actual = actual.replace(/\s/g, '');
	expected = expected.replace(/\s/g, '');

	// Assert
	expect( actual ).to.equal( expected );

};

/**
 * Uses `chai-html` to compare an HTML output file to an expected result.
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} comparisonHtml The expected HTML result to use for comparison
 * @returns {void}
 */
u.checkHtmlOutput = function( fixtureName, filename, comparisonHtml ) {

	// Set expectations
	var expected = "<h1 id='a-heading'>A Heading</h1>";

	// Load render result content
	var contents = this.getOutput( fixtureName, filename );

	//this.dbg("contents", contents);
	//this.dbg("comparisonHtml", comparisonHtml);

	// Assert equality
	expect( contents ).html.to.equal( comparisonHtml );

};

/**
 * Asserts that a file should exist
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} [outputDirName=""] If provided this string will be used as
 * the name of the output directory instead of the default, which is "output".
 * @returns {void}
 */
u.fileShouldExist = function( fixtureName, filename, outputDirName ) {

	// Locals
	var me = this;
	var exists = me.exists( fixtureName, filename, outputDirName );
	var dispOutput;

	// Default param: outputDirName
	if( outputDirName === undefined || outputDirName === null ) {
		outputDirName = null;
		dispOutput = "output";
	} else {
		dispOutput = outputDirName;
	}

	// Assert
	if( !exists ) {
		throw new Error("Expected '" + filename + "' to EXIST in '" + dispOutput + "' directory for fixture: '" + fixtureName + "'; but the file was not found.");
	}

};

/**
 * Asserts that a file should NOT exist
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} [outputDirName=""] If provided this string will be used as
 * the name of the output directory instead of the default, which is "output".
 * @returns {void}
 */
u.fileShouldNotExist = function( fixtureName, filename, outputDirName ) {

	// Locals
	var me = this;
	var exists = me.exists( fixtureName, filename, outputDirName );
	var dispOutput;

	// Default param: outputDirName
	if( outputDirName === undefined || outputDirName === null ) {
		outputDirName = null;
		dispOutput = "output";
	} else {
		dispOutput = outputDirName;
	}

	// Assert
	if( exists ) {
		throw new Error("Expected '" + filename + "' to NOT EXIST in '" + dispOutput + "' directory for fixture: '" + fixtureName + "'; but the file was found.");
	}

};

/**
 * Checks to see if a file exists
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} [outputDirName=""] If provided this string will be used as
 * the name of the output directory instead of the default, which is "output".
 * @returns {boolean} TRUE if the file exists; FALSE otherwise.
 */
u.exists = function( fixtureName, filename, outputDirName ) {

	// Locals
	var me 		= this;
	var stat	= me.stat( fixtureName, filename, outputDirName );

	// Return
	if( stat === null ) {
		return false;
	} else {
		return true;
	}

};

/**
 * Gets statistics for a file
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} [outputDirName=""] If provided this string will be used as
 * the name of the output directory instead of the default, which is "output".
 * @returns {object|null} An object with stats or NULL if stats could not be gathered
 * (usually because the target file does not exist).
 */
u.stat = function( fixtureName, filename, outputDirName ) {

	// Locals
	var me 		= this;
	var exists 	= true;
	var paths 	= this.getPaths( fixtureName );
	var outputPath;
	var targetPath;

	// Default param: outputDirName
	if( outputDirName === undefined || outputDirName === null ) {
		outputPath = paths.outputRoot;
	} else {
		outputPath = path.join( paths.fixtureRoot, outputDirName );
	}

	// Resolve the final file path
	targetPath = path.join( outputPath, filename );

	// Stat
	try {
		return fs.statSync( targetPath );
	} catch( err ) {
		return null;
	}

};

/**
 * Gets mtime (last modified time) for a file
 *
 * @param {string} fixtureName The name of the fixture that was rendered.
 * @param {string} filename A filename, relative to the `output` directory of the target fixture.
 * @param {string} [outputDirName=""] If provided this string will be used as
 * the name of the output directory instead of the default, which is "output".
 * @returns {object|null} An integer representing the target's last modified time (in ms)
 * or NULL if it could not be determined (usually because the file could not be found)
 */
u.mtime = function( fixtureName, filename, outputDirName ) {

	// Locals
	var me = this;

	// Stat the file
	var stat = me.stat( fixtureName, filename, outputDirName );

	// Return null, if applicable
	if( stat === null ) {
		return null;
	}

	// Get the mtime
	var mdt = stat.mtime;
	return mdt.getTime();

};

//</editor-fold>


//<editor-fold desc="++++++++ Methods for STDOUT/Console.log ++++++++">

/**
 * A debugging function for outputting a string (usually a multi-line string)
 * to STDOUT with line numbers.
 *
 * @param {string} name A name for the content, for reference..
 * @param {string} content The content to dump
 * @returns {void}
 */
u.dbg = function( name, content ) {

	var me = this;
	var title = _.padEnd( "---- " + name + " ", 80, "-" );

	me.bl(2);
	me.lg( title );
	me.bl(2);

	var spl = content.split("\n");
	_.each( spl, function( line, index ) {

		var lineNo = (index+1);
		var strLineNo = _.padStart( lineNo + "", 5, "0" );
		me.lg("    " + strLineNo + ": " + line);

	});

	me.bl(2);

};

/**
 * A utility function that outputs one or more blank lines to STDOUT.
 *
 * @param {number} [count=1] The number of blank lines to output
 * @returns {void}
 */
u.bl = function( count ) {

	var me = this;

	if( count === undefined || count === null ) {
		count = 1;
	} else {
		count = parseInt( count, 10 );
	}

	if( count < 1 ) {
		return;
	}
	if( count > 100 ) {
		count = 100;
	}

	_.times( count, function() {
		me.lg(" ");
	});

};

/**
 * An alias for console.log; this exists in case we wanted
 * to insert something special at the lowest possible level.
 *
 * @param {string} str The string to output to STDOUT
 * @returns {void}
 */
u.lg = function( str ) {
	console.log(str);
};

/**
 * Outputs a dividing line to STDOUT.
 *
 * @returns {void}
 */
u.div = function() {

	var me = this;
	me.bl(2);
	me.lg("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~");
	me.bl(2);

};


//</editor-fold>


//<editor-fold desc="++++++++ Working with Grits CLI ++++++++">

/**
 * Executes the Grits CLI app with the specified arguments within the
 * specified fixture's root directory.  The method extends this.cli() by
 * adding a post-processing step on the log output.
 *
 * @param {string} fixtureName The name of the fixture to run the CLI app on/within.
 * @param {string[]} args An array of arguments, these will be joined into a string.
 * @param {function} cb A callback function, will be called with ( error, arrLogs, stdout, stderr )
 * @returns {void}
 */
u.cliLogs = function( fixtureName, args, cb ) {

	// Locals
	var me = this;

	// Since we want the logs.. we want to execute in verbose mode..
	args.unshift("-v");

	// Defer to cli()
	me.cli( fixtureName, args, function( err, stdout, stderr ) {
		cb( err, me._cliParseLogOutput(stdout), stdout, stderr );
	});

};

u._cliParseLogOutput = function( stdout ) {

	var me = this;
	var ret = [];
	var spl = stdout.split(/\r?\n/g);

	_.each( spl, function( line ) {

		var logRegx = /(?:\(\s+)([^\s]+)(?:\s+\)\s+)(.*)/g;
		var match = logRegx.exec(line);

		if( match !== null ) {
			ret.push({
				topic: match[1],
				message: match[2]
			});
		}

	});

	return ret;

};

/**
 * Executes the Grits CLI app with the specified arguments within the
 * specified fixture's root directory.
 *
 * @param {string} fixtureName The name of the fixture to run the CLI app on/within.
 * @param {string[]} args An array of arguments, these will be joined into a string.
 * @param {function} cb A callback function, will be called with ( error, stdout, stderr )
 * @returns {void}
 */
u.cli = function( fixtureName, args, cb ) {

	// Locals
	var me = this;

	// Resolve the fixture's root path
	var paths = me.getPaths( fixtureName );

	// Defer to _execGritsCLI()
	me._executeGritsCLI( args, paths.fixtureRoot, function( err, stdout, stderr ) {
		cb( err, stdout, stderr );
	});

};

/**
 * Executes the Grits CLI app with the specified arguments
 * within the specified cwd (working directory).
 *
 * @access private
 * @param {string[]} args An array of arguments, these will be joined into a string.
 * @param {string} cwd A path to the working directory that Grits should be executed within
 * @param {function} cb A callback function, will be called with ( error, stdout, stderr )
 * @returns {void}
 */
u._executeGritsCLI = function( args, cwd, cb ) {

	// Locals
	var me = this;

	// Gather a few important paths
	var pathToNode 	= process.execPath;
	var pathToGrits = path.join( __dirname, "../..", "bin/grits.js" );
	var scriptExecStr = pathToNode + " " + pathToGrits;

	// Convert 'args' into a string
	var argString = "";
	if( args.length > 0 ) {
		argString = " " + args.join(" ");
	}

	// Create the final child_process.exec arguments
	var execCmd = scriptExecStr + argString;
	var execOpts = {
		cwd: cwd
	};

	// Execute
	cproc.exec( execCmd, execOpts, cb);

};

//</editor-fold>
