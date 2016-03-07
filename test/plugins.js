// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;

// Settings
var fixtureName = "plugins";

// Tests
describe("Plugins:", function() {

	var rndr;
	var paths;

	describe("Manual Initialization:", function() {

		it("should accept plugin constructor functions", function() {

			// Resolve paths
			var paths = util.getPaths( fixtureName );
			var froot = paths.fixtureRoot;
			var ppath = util.path.join( froot, "plugins/test-one.js" );

			// Create a renderer
			rndr = util.getFreshRenderer();

			// Load the plugin manually so that we can
			// pass it in as a function..
			var plugin = require( ppath );

			// Pass the plugin to the renderer
			var iplug = rndr.addPlugin( plugin );

			// Check to see if the plugin loaded;
			// (the test plugins modify the renderer a bit to show evidence of their existence).
			expect( rndr.__evidence["test-one"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-one"]["onAttach"]    ).to.equal( true );

			// Expect `iplug` to be our plugin
			expect( iplug ).to.be.an( "object" );

		});

		it("should accept file paths", function() {

			// Resolve paths
			var paths = util.getPaths( fixtureName );
			var froot = paths.fixtureRoot;
			var ppath = util.path.join( froot, "plugins/test-one.js" );

			// Create a renderer
			rndr = util.getFreshRenderer();

			// Pass the plugin path to the renderer
			var iplug = rndr.use( ppath );

			// Check to see if the plugin loaded;
			// (the test plugins modify the renderer a bit to show evidence of their existence).
			expect( rndr.__evidence["test-one"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-one"]["onAttach"]    ).to.equal( true );

			// Expect `iplug` to be our plugin
			expect( iplug ).to.be.an( "object" );

		});

		it("should accept arrays", function() {

			// Resolve paths
			var paths = util.getPaths( fixtureName );
			var froot = paths.fixtureRoot;
			var ppatha = util.path.join( froot, "plugins/test-one.js" );
			var ppathb = util.path.join( froot, "plugins/test-two.js" );

			// Create a renderer
			rndr = util.getFreshRenderer();

			// Load the plugin manually so that we can
			// pass it in as a function..
			var plugina = require( ppatha );

			// Add the plugins
			var iplug = rndr.use( [
				ppathb, plugina
			] );

			// Check to see if the plugin loaded;
			// (the test plugins modify the renderer a bit to show evidence of their existence).
			expect( rndr.__evidence["test-one"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-one"]["onAttach"]    ).to.equal( true );
			expect( rndr.__evidence["test-two"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-two"]["onAttach"]    ).to.equal( true );

			// Expect `iplug` to be our plugin
			expect( iplug ).to.be.an( "array" );
			expect( iplug[0] ).to.be.an( "object" );
			expect( iplug[1] ).to.be.an( "object" );

		});

	});

	describe("Constructor Initialization:", function() {

		it("should accept plugins", function() {

			// Resolve paths
			var paths = util.getPaths( fixtureName );
			var froot = paths.fixtureRoot;
			var ppatha = util.path.join( froot, "plugins/test-one.js" );
			var ppathb = util.path.join( froot, "plugins/test-two.js" );

			// Create a renderer
			rndr = util.getFreshRenderer(
				{
					plugins: [
						ppatha,
						require( ppathb )
					]
				}
			);

			// Check to see if the plugin loaded;
			// (the test plugins modify the renderer a bit to show evidence of their existence).
			expect( rndr.__evidence["test-one"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-one"]["onAttach"]    ).to.equal( true );
			expect( rndr.__evidence["test-two"]["constructor"] ).to.equal( true );
			expect( rndr.__evidence["test-two"]["onAttach"]    ).to.equal( true );

		});

	});

	describe("Rendering Hooks:", function() {

		it("should work properly", function( cb ) {

			// Resolve paths
			var paths = util.getPaths( fixtureName );
			var froot = paths.fixtureRoot;
			var ppatha = util.path.join( froot, "plugins/test-one.js" );
			var ppathb = util.path.join( froot, "plugins/test-two.js" );

			// Create a renderer
			rndr = util.getFreshRenderer(
				{
					plugins: [
						ppatha,
						require( ppathb )
					],
					paths: {
						root: paths.sourceRoot,
						output: paths.outputRoot
					},
					autoClean: true,
					verbose: false,
					logFilter: "plugin"
				}
			);

			// Render
			rndr.render().then(

				function() {

					// Fires 'onDetach'
					rndr.clearPlugins();

					// Ensure all "evidence" is true
					_.each( ["test-one", "test-two"], function( pluginName ) {

						_.each( rndr.__evidence[ pluginName ], function( val, eventName ) {

							expect( val ).to.equal( true );

						});

					});

					// Finished
					cb();

				}

			);

		});

	});


	describe.skip("CLI Usage:", function() {

		it("should work properly", function( cb ) {

			var args = [
				"-w",
				"--plugin plugins/test-one.js",
				"--plugin ./plugins/test-two.js",
				//"-v",
				"--log-filter plugin"
			];
			//var args = ["--log-filter" ,"plugin", "-w" ];


			util.cli( fixtureName, args, function( err, stdout, stderr ) {

				/*
				console.log(" ");
				console.log("------- RAW OUTPUT -------------------------------------------");
				console.log(" ");
				console.log( stdout );
				console.log(" ");
				*/

				/*
				console.log("------- ARRAY OUTPUT -------------------------------------------");
				console.log(" ");
				console.log( arrLogs );
				console.log(" ");
				*/

				cb( err );

			});

		});

	});

});
