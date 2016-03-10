// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;
var p = util.Promise;
var fs = util.fs;

// Settings
var fixtureName = "watcher";

// Tests
describe.skip("Watcher", function() {

	var rndr;

	before( function( cb ) {

		wSetState("_initial" ).then(

			function() {

				// Configuration for the renderer
				var cfg = {
					verbose: false,
					watch: {
						enabled: true,
						interval: 100,
						binaryInterval: 300
					}
				};

				// Create a new renderer
				rndr = util.getRenderer( fixtureName, cfg );

				// Render....
				rndr.render().delay(100).then(
					function() {
						cb();
					}
				);

			}

		);

	});

	describe("Pre-Test Conditions:", function() {

		it("should be in the initial state", function() {

			util.fileShouldExist( fixtureName, "existing.md", "src/content" );
			//util.fileShouldNotExist( fixtureName, "test-one.md", "src/content" );

		});

		it("should have rendered successfully", function() {

			// Make sure our render process did output successfully
			util.fileShouldExist( fixtureName, "existing.html" );

		});

	});

	describe("Content Watching:", function() {

		it("should work as expected", function( cb ) {

			wAddState("content-one" ).delay(200).then(

				function() {

					// Assert that our new files were created
					util.fileShouldExist( fixtureName, "somecontent.html" );
					util.fileShouldExist( fixtureName, "subdir/morecontent.html" );

				}

			).delay(200).then(

				function() {
					rndr.watchManager.unwatch();
					cb();
				}

			);


		});

	});

});

function wSetState( stateName ) {

	return wResetState().then(
		function afterStateReset() {
			return wAddState( stateName );
		}
	);

}

function wResetState() {

	var paths = util.getPaths( fixtureName );

	return p.all([
		fs.removeAsync( paths.outputRoot ),
		fs.removeAsync( paths.sourceRoot )
	]);

}

function wAddState( stateName ) {

	var paths 		= util.getPaths( fixtureName );
	var statePath 	= util.path.join( paths.fixtureRoot, "states", stateName );

	return wWalk( statePath, function( item ) {

		var targetDir = util.path.join( paths.sourceRoot, item.relPath );
		var targetFile = util.path.join( targetDir, item.filename );

		var prm = fs.mkdirsAsync( targetDir ).then(
			function() {
				return fs.copyAsync( item.path, targetFile );
			}

		);

		item.promises.push( prm );

	});

}

function wWalk( path, iterator, includeDirectories ) {

	// default 'includeDirectories' param
	if( includeDirectories === undefined || includeDirectories === null || includeDirectories !== true ) {
		includeDirectories = false;
	}

	// Create the outer promise
	return new util.Promise(

		function( resolve, reject ) {

			var promises = [];

			// Create the walker
			fs.walk( path )

				// Called for each file found..
				.on("data", function( item ) {

					var isDir;
					if( item.stats.size === 0 ) {
						isDir = true;
					} else {
						isDir = false;
					}

					if( !isDir || includeDirectories ) {
						var absDir = util.path.dirname( item.path );
						iterator(
							{
								promises: promises,
								original: item,
								path: item.path,
								filename: util.path.basename( item.path ),
								dir: absDir,
								relPath: absDir.substr( ( path.length + 1 ) )
							}
						);
					}


				})

				// Called when walking has completed..
				.on("end", function() {

					//console.log( promises.length );

					// Resolve with a collection of promises
					resolve( util.Promise.all( promises ));

				});

		}

	);


}
