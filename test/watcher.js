// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;
var p = util.Promise;
var fs = util.fs;

// Settings
var fixtureName = "watcher";

// Tests
describe("Watcher", function() {

	var rndr;

	before( function( cb ) {

		wSetState("_initial" ).then(

			function() {

				var paths = util.getPaths( fixtureName );

				// Configuration for the renderer
				var cfg = {
					//verbose: true,
					verbose: false,
					watch: true,
					serve: {
						enabled: true,
						port: 3552,
						verbose: true
					},
					paths: {
						static: util.path.join( paths.sourceRoot, "static" ),
						sassi: util.path.join( paths.sourceRoot, "scss-inc" )
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

	after( function( cb ) {
		rndr.shutdown();
		setTimeout( function() {
			cb();
		}, 200);
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

		it("should enable error recovery mode", function() {
			var ar = rndr.getConfig().attemptRecovery;
			expect( ar ).to.equal( true );
		});

		it("should function properly when new content is added", function( cb ) {

			wAddState("content-one").delay(250).then(

				function() {

					// Assert that our new files were created
					util.fileShouldExist( fixtureName, "somecontent.html" );
					util.fileShouldExist( fixtureName, "subdir/morecontent.html" );

					// Check somecontent's HTML
					var fn = "somecontent.html";
					util.checkHtmlOutput( fixtureName, fn,
						"<p>hello mars</p>"
					);


				}

			).delay(50).then(

				function() {
					cb();
				}

			);

		});

		it("should function properly when content is updated", function( cb ) {

			wAddState("content-two").delay(250).then(

				function() {

					// Check somecontent's HTML
					var fn = "somecontent.html";
					util.checkHtmlOutput( fixtureName, fn,
						"<p>hello earth</p>"
					);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);

		});

	});

	describe("Partial Watching:", function() {

		it("should function properly when a partial is changed", function( cb ) {

			var initialHtml = "<em>hi</em>";
			var updatedHtml = "<em>hello</em>";

			// Initial Tests
			util.checkHtmlOutput( fixtureName, "simple-partial-test-a.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "simple-partial-test-b.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "nested-partial-test.html",   initialHtml);

			wAddState("partial-one").delay(250).then(

				function() {

					util.checkHtmlOutput( fixtureName, "simple-partial-test-a.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "simple-partial-test-b.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "nested-partial-test.html", 	 updatedHtml);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Layout Watching:", function() {

		it("should function properly when a layout is changed", function( cb ) {

			var initialHtml = "<div id=\"mars\">hello\n</div>";
			var updatedHtml = "<div id=\"world\">hello\n</div>";

			util.checkHtmlOutput( fixtureName, "layout-test-a.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "layout-test-b.html", initialHtml);

			wAddState("layouts-one").delay(250).then(

				function() {

					util.checkHtmlOutput( fixtureName, "layout-test-a.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "layout-test-b.html", updatedHtml);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Handler Watching:", function() {

		it("should function properly when a handler is changed", function( cb ) {

			var initialHtml = "<p>hello world</p>";
			var updatedHtml = "<p>hello mars</p>";

			//util.debugOutput( fixtureName, "simple-handler-test-a.html" );
			//util.debugOutput( fixtureName, "simple-handler-test-b.html" );

			util.checkHtmlOutput( fixtureName, "simple-handler-test-a.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "simple-handler-test-b.html", initialHtml);

			wAddState("handlers-one").delay(250).then(

				function() {

					util.checkHtmlOutput( fixtureName, "simple-handler-test-a.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "simple-handler-test-b.html", updatedHtml);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Helper Watching:", function() {

		it("should function properly when a helper is changed", function( cb ) {

			var initialHtml = "<p>hello world</p>";
			var updatedHtml = "<p>hello mars</p>";

			util.checkHtmlOutput( fixtureName, "simple-helper-test-a.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "simple-helper-test-b.html", initialHtml);

			wAddState("helpers-one").delay(250).then(

				function() {

					//util.debugOutput( fixtureName, "simple-helper-test-a.html" );
					//util.debugOutput( fixtureName, "simple-helper-test-b.html" );

					util.checkHtmlOutput( fixtureName, "simple-helper-test-a.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "simple-helper-test-b.html", updatedHtml);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Filter Watching:", function() {

		it("should function properly when a filter is changed", function( cb ) {

			var initialHtml = "<p>hello world</p>";
			var updatedHtml = "<p>hello mars</p>";

			util.checkHtmlOutput( fixtureName, "simple-filter-test-a.html", initialHtml);
			util.checkHtmlOutput( fixtureName, "simple-filter-test-b.html", initialHtml);

			wAddState("filters-one").delay(250).then(

				function() {

					//util.debugOutput( fixtureName, "simple-filter-test-a.html" );
					//util.debugOutput( fixtureName, "simple-filter-test-b.html" );

					util.checkHtmlOutput( fixtureName, "simple-filter-test-a.html", updatedHtml);
					util.checkHtmlOutput( fixtureName, "simple-filter-test-b.html", updatedHtml);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Static Content Watching:", function() {

		it("should function properly when a file is added", function( cb ) {

			util.fileShouldNotExist( fixtureName, "hello-world-inline.png" );
			util.fileShouldNotExist( fixtureName, "images/hello-world-b.png" );

			wAddState("static-content-one").delay(250).then(

				function() {

					util.fileShouldExist( fixtureName, "hello-world-inline.png" );
					util.fileShouldExist( fixtureName, "images/hello-world-b.png" );

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("Data File Watching:", function() {

		it("should function properly when a data file is changed", function( cb ) {

			var context = rndr.dataManager.getContextData();
			var data = context.data;

			// Initial condition tests
			expect( data.test.hello ).to.equal( "world" );
			expect( data.test.list.length ).to.equal( 2 );
			expect( data.test.list[0].letter ).to.equal( "a" );
			expect( data.test.list[1].letter ).to.equal( "b" );

			wAddState("data-one").delay(250).then(

				function() {

					var context = rndr.dataManager.getContextData();
					var data = context.data;

					// Final condition tests
					expect( data.test.hello ).to.equal( "mars" );
					expect( data.test.list.length ).to.equal( 2 );
					expect( data.test.list[0].letter ).to.equal( "a" );
					expect( data.test.list[1].letter ).to.equal( "c" );

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe("SASS/SCSS Watching:", function() {

		// These do need to be executed in order..

		it("should function properly when a scss source file is changed", function( cb ) {

			// Gather current value
			var out = util.getOutput( fixtureName, "css/one.css" );

			// Initial Conditions Test
			expect( out ).to.equal( wScssString( "red", "red", "red", "red" ) );

			wAddState("sass-one").delay(250).then(

				function() {

					// Gather new value
					var out = util.getOutput( fixtureName, "css/one.css" );

					// New Conditions Test
					expect( out ).to.equal( wScssString( "red", "red", "red", "green" ) );
					//console.log(out);

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

		it("should function properly when a scss include is changed (inline)", function( cb ) {

			// Gather current value
			var out = util.getOutput( fixtureName, "css/one.css" );

			// Initial Conditions Test
			expect( out ).to.equal( wScssString( "red", "red", "red", "green" ) );

			wAddState("sass-two").delay(250).then(

				function() {

					// Gather new value
					var out = util.getOutput( fixtureName, "css/one.css" );

					// New Conditions Test
					expect( out ).to.equal( wScssString( "green", "red", "red", "green" ) );

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

		it("should function properly when a scss include is changed (in an include path)", function( cb ) {

			// Gather current value
			var out = util.getOutput( fixtureName, "css/one.css" );

			// Initial Conditions Test
			expect( out ).to.equal( wScssString( "green", "red", "red", "green" ) );

			wAddState("sass-three").delay(250).then(

				function() {

					// Gather new value
					var out = util.getOutput( fixtureName, "css/one.css" );

					// New Conditions Test
					expect( out ).to.equal( wScssString( "green", "green", "red", "green" ) );

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

		it("should function properly when a scss source file is changed", function( cb ) {

			// Gather current value
			var out = util.getOutput( fixtureName, "css/one.css" );

			// Initial Conditions Test
			expect( out ).to.equal( wScssString( "green", "green", "red", "green" ) );

			wAddState("sass-four").delay(250).then(

				function() {

					// Gather new value
					var out = util.getOutput( fixtureName, "css/one.css" );

					// New Conditions Test
					expect( out ).to.equal( wScssString( "green", "green", "green", "green" ) );

				}

			).delay(50).then(

				function() {
					cb();
				}

			);


		});

	});

	describe.skip("LiveReloadX Server:", function() {



		// The functionality of the LiveReloadX server is hard (but not impossible)
		// to test, so I will implement this later.  For now, though, the test(s) below
		// are useful for manual testing.

		// Another note:  I could probably add live reload tests to
		// every one of the tests above instead of (or in addition to) having
		// it as its own section here..




		it("should reload after operations", function( cb ) {

			var keepAliveMs = 15000;
			var firstDelay = keepAliveMs / 2;
			var secondDelay = keepAliveMs / 2;

			this.timeout( keepAliveMs + 5000 );

			// Locals
			var fn = "reload-test.html";

			console.log(" ");
			console.log(" ");
			console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
			console.log(" ");
			console.log("             Try the web server now ...");
			console.log(" ");
			console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
			console.log(" ");

			// Check initial value
			util.checkHtmlOutput( fixtureName, fn, "<p><b>Test One</b></p>" );

			// Initial Delay
			p.resolve( true ).delay( firstDelay ).then(

				function() {


					return wAddState("live-reload-one").delay( 250 ).then(

						function() {

							// Check new value
							util.checkHtmlOutput( fixtureName, fn, "<p><b>Test Two</b></p>" );

							console.log(" ");
							console.log(" ");
							console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
							console.log(" ");
							console.log("                 File Updated ...");
							console.log(" ");
							console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
							console.log(" ");


						}

					);


				}

			).delay( secondDelay ).then(

				function() {

					console.log("                  Shutting down ...");
					console.log(" ");
					console.log("-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-");
					console.log(" ");
					console.log(" ");

					cb();
				}

			);

		});

	});

});

function wScssString( inlineColor, includeColor, externColor, meeeColor ) {

	var expected = [
		".inline {",
		"\tcolor: " + inlineColor + "; }", "",
		".inc {",
		"\tcolor: " + includeColor + "; }", "",
		".extern {",
		"\tcolor: " + externColor + "; }", "",
		".meee {",
		"\tcolor: " + meeeColor + "; }", ""
	];
	return expected.join("\n");

	//'.inline {\n\tcolor: red; }\n\n.inc {\n\tcolor: red; }\n\n.extern {\n\tcolor: red; }\n\n.meee {\n\tcolor: red; }\n' to equal
	//'.one {\n\tinline: red; }\n\n.two {\n\tinc: red; }\n\n.three {\n\textern: red; }\n\n.meee {\n\tcolor: red; }\n'

}

function wSetState( stateName ) {

	//console.log("-- set --");

	return wResetState().then(
		function afterStateReset() {
			return wAddState( stateName );
		}
	);

}

function wResetState() {

	//console.log("-- reset --");

	var paths = util.getPaths( fixtureName );

	return p.all([
		fs.removeAsync( paths.outputRoot ),
		fs.removeAsync( paths.sourceRoot )
	] ).catch(

		function( err ) {

			console.log(err);

		}

	);

}

function wAddState( stateName ) {

	//console.log("-- add: " + stateName + " --");

	var paths 		= util.getPaths( fixtureName );
	var statePath 	= util.path.join( paths.fixtureRoot, "states", stateName );

	return wWalk( statePath, function( item ) {

		var targetDir = util.path.join( paths.sourceRoot, item.relPath );
		var targetFile = util.path.join( targetDir, item.filename );

		var prm = fs.mkdirsAsync( targetDir ).then(
			function() {
				return fs.copyAsync( item.path, targetFile ).catch(

					function( err ) {

						console.log(" ");
						console.log(" ");
						console.log(" ");
						console.log("Error in wAddState( '" + stateName + "' )");
						console.log("  -> fs.copyAsync");
						console.log("    -> from : " + item.path);
						console.log("    -> to   : " + targetFile);
						console.log(" ");
						console.log(err);
						console.log(" ");
						console.log(" ");
						console.log(" ");

					}

				);
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
