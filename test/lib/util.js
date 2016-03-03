// Load the DustJS Renderer
require( "../../index" );

// Dependencies
var path 	= require( "path" );
var fs		= require( "fs" );
var chai 	= require( "chai" );
var expect 	= chai.expect;
var _		= require( "lodash" );

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
 * Creates a renderer that is preloaded with fixture paths.
 *
 * @param {string} name
 * @param {boolean} verbose
 * @returns {object}
 */
u.getRenderer = function( name, verbose ) {

	// Default verbose param
	if( verbose === undefined || verbose === null || verbose !== true ) {
		verbose = false;
	}

	// Get the paths
	var paths = this.getPaths( name );

	// Init Renderer
	var rndr = this.getFreshRenderer();

	// Set verbosity
	rndr.setVerbose(verbose);

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
 * @param {string} name
 * @param {boolean} verbose
 * @returns {object}
 */
u.getFreshRenderer = function() {

	// Init Renderer
	return new C2C.dustjs.Renderer();

};

u.renderFixture = function( fixtureName, callback, verbose ) {

	var rndr = this.getRenderer( fixtureName, verbose );
	rndr.render().then( callback );

};

u.getOutput = function( fixtureName, filename ) {

	// Get the paths
	var paths = this.getPaths( fixtureName );

	// Resolve target path
	var target = path.join( paths.outputRoot, filename );

	// Load the target file
	var contents = fs.readFileSync( target, { encoding: "utf8" } );

	// Done
	return contents;

};

u.checkHtmlOutput = function( fixtureName, filename, comparisonHtml ) {

	// Set expectations
	var expected = "<h1 id='a-heading'>A Heading</h1>";

	// Load render result content
	var contents = this.getOutput( fixtureName, filename );

	// Assert equality
	expect( contents ).html.to.equal( comparisonHtml );

};

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

u.lg = function( str ) {
	console.log(str);
};
