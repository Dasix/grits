#!/usr/bin/env node

// Deps
var path = require("path");
var _ = require("lodash");

// Load grits package.json
var pkg = require( path.join(__dirname, "../package.json") );

// Parse command line options
var program = require('commander');
program
	.version(pkg.version)
	.usage("[options] [root]")
	.option("-c, --config <path>", 			"The configuration file to use for grits execution")
	.option("    --helpers <path>", 		"Path to Dust.js helpers. (Allows Multiple)", collect)
	.option("    --handlers <path>", 		"Path to Dust.js handlers. (Allows Multiple)", collect)
	.option("    --filters <path>", 		"Path to Dust.js filters. (Allows Multiple)", collect)
	.option("    --partials <path>", 		"Path to Dust.js partials. (Allows Multiple)", collect)
	.option("    --layouts <path>", 		"Path to Dust.js layouts. (Allows Multiple)", collect)
	.option("    --content <path>", 		"Path to site content. (Allows Multiple)", collect)
	.option("    --static <path>", 			"Path to static content. (Allows Multiple)", collect)
	.option("    --data <path>", 			"Path to data files. (Allows Multiple)", collect)
	.option("    --sass <path>", 			"Path to SASS/SCSS source files. (Allows Multiple)", collect)
	.option("    --sassi <path>", 			"Path to SASS/SCSS include files. (Allows Multiple)", collect)
	.option("-o, --output <path>", 			"Render output path. (Allows Multiple)", collect)
	.option("-p, --plugin <name>", 			"Load a grits plugin. (Allows Multiple)", collect)
	.option("-x, --clean", 					"Instructs the renderer to clean the output path before rendering")
	.option("-n, --noroot", 				"Disable the 'root path' logic and automatic directories")
	.option("-w, --preview", 				"Outputs the grits configuration settings and skips rendering")
	.option("-v, --verbose", 				"Enables verbose output")
	.option("-l, --log-filter <str>",		"Limits the output log to only *topics* containing 'str'. (Allows Multiple)", collect)
	.parse(process.argv);



// ---- Configuration Building -------------------------------------------------




// Initialize a grits config object
var gritsConfig = { paths: {} };



// Process 'root path' config, which is provided at the end of the command string..
// e.g. grits ./		<-- 1 root, "./"
// e.g. grits /a /b		<-- 2 roots, "/a" and "/b"
// e.g. grits			<-- 0 roots, will default to process.cwd()
var rootDirs = program.args;
var cwd = process.cwd();
if( rootDirs.length === 0 ) {
	rootDirs = [ cwd ];
} else {
	_.each( rootDirs, function( rootDir, rdIndex ) {
		rootDirs[ rdIndex ] = path.resolve( cwd, rootDir );
	});
}
gritsConfig.paths.root = rootDirs;


// Process the 'noroot' setting
if( program.noroot !== undefined ) {
	delete gritsConfig.paths.root;
}


// Process the 'verbose' setting
if( program.verbose !== undefined ) {
	gritsConfig.verbose = true;
}


// Process the 'log-filter' setting
//console.log(program);
if( program.logFilter !== undefined ) {
	gritsConfig.logFilter = program.logFilter;
}


// Process the 'config' setting
if( program.config !== undefined ) {
	gritsConfig.configFile = path.resolve( cwd, program.config );
}

// Process the 'clean' setting
if( program.clean !== undefined ) {
	gritsConfig.autoClean = true;
}

// Process any output paths
if( program.output !== undefined ) {
	gritsConfig.paths.output = [];
	_.each( program.output, function( outputPath ) {
		var resolved = path.resolve( cwd, outputPath );
		//grits.addOutputPath( resolved );
		gritsConfig.paths.output.push( resolved );
	})
}


// ---- Grits Initialization ---------------------------------------------------



// Initialize a renderer
require( path.join( __dirname, "..", pkg.main ) );
var grits = new Dasix.grits.Renderer( gritsConfig );



// ---- Additional Paths -------------------------------------------------------

var extraPaths = [
	[ "helpers", 	"Helper" 		],
	[ "handlers", 	"Handler" 		],
	[ "filters", 	"Filter" 		],
	[ "partials", 	"Partial" 		],
	[ "layouts", 	"Layout" 		],
	[ "content", 	"Content" 		],
	[ "data", 		"Data"			],
	[ "sass", 		"Sass"			],
	[ "sassi", 		"SassInclude"	],
	[ "static", 	"StaticContent"	]
];

// Process any helper paths
_.each( extraPaths, function( epInfo ) {

	// Resolve a few important variables
	var clSwitch 		= epInfo[0];
	var gritsPathType 	= epInfo[1];
	var gritsAddFn		= "add" + gritsPathType + "Path";

	// Check for command line switches for this path type
	if( program[ clSwitch ] !== undefined ) {

		// Iterate over each path
		_.each( program[ clSwitch ], function( targetPath ) {

			// Resolve the path to the current working directory
			var resolved = path.resolve( cwd, targetPath );

			// Add the path
			grits[ gritsAddFn ]( resolved );

		})

	}

});


// ---- Rendering --------------------------------------------------------------


if( program.preview !== undefined ) {

	console.log("");
	console.log("");
	console.log("Dumping Grits Config:");
	console.log("");
	console.log( grits.getConfig() );
	console.log("");
	console.log("");

} else {

	grits.render().then(

		function() {

			console.log("");
			console.log("Grits Render Complete!")
			console.log("");
			process.exit(0);

		}

	)

}




// ---- Commander Helpers ------------------------------------------------------

/**
 * Facilitates value collections (allows the same command line argument to
 * be passed in multiple times), i.e. params with array values
 *
 * @param {string} newVal The new value
 * @param {?string[]} values The existing values
 * @returns {string[]} The value collection
 */
function collect(newVal, values) {

	// Init values, if necessary
	if( values === undefined ) {
		values = [];
	}

	// Add the value
	values.push(newVal);

	// Done
	return values;

}
