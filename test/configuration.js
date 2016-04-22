// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "configuration";

// Tests
describe("Configuration", function() {

	var rndr;
	var paths;

	beforeEach( function() {

		// Init Renderer
		rndr = util.getFreshRenderer();

	});

	describe("Paths", function() {

		describe("Manual Configuration", function() {

			it("should be possible with two method calls", function() {

				rndr.setRootPath( "/the/root/" );
				rndr.setOutputPath( "/the/output/" );

				var paths = rndr.getAllPaths();

				expect( paths.root[0] 		).to.equal( "/the/root" );
				expect( paths.helper[0] 	).to.equal( "/the/root/helpers" );
				expect( paths.handler[0] 	).to.equal( "/the/root/handlers" );
				expect( paths.filter[0] 	).to.equal( "/the/root/filters" );
				expect( paths.partial[0] 	).to.equal( "/the/root/partials" );
				expect( paths.layout[0] 	).to.equal( "/the/root/layouts" );
				expect( paths.content[0] 	).to.equal( "/the/root/content" );
				expect( paths.data[0] 		).to.equal( "/the/root/data" );
				expect( paths.output[0] 	).to.equal( "/the/output" );

			});

			it("should allow precise path setups", function() {

				rndr.setRootPath( 		"/a/root/" );
				rndr.addRootPath( 		"/b/root/" );

				rndr.setHelperPath( 	"/z/helpers" );
				rndr.setHandlerPath( 	"/z/handlers" );
				rndr.setFilterPath( 	"/z/filters" );
				rndr.setPartialPath( 	"/z/partials" );
				rndr.setLayoutPath( 	"/z/layouts" );
				rndr.setContentPath( 	"/z/content" );
				rndr.setDataPath( 		"/z/data" );

				rndr.addHelperPath( 	"/x/helpers" );
				rndr.addHandlerPath( 	"/x/handlers" );
				rndr.addFilterPath( 	"/x/filters" );
				rndr.addPartialPath( 	"/x/partials" );
				rndr.addLayoutPath( 	"/x/layouts" );
				rndr.addContentPath( 	"/x/content" );
				rndr.addDataPath( 		"/x/data" );
				rndr.addDataPath( 		["/y/data", "/s/data"] );

				rndr.setOutputPath( 	"/a/output/" );
				rndr.addOutputPath( 	"/b/output/" );

				var paths = rndr.getAllPaths();

				expect( paths.root[0] 		).to.equal( "/a/root" );
				expect( paths.helper[0] 	).to.equal( "/x/helpers" );
				expect( paths.handler[0] 	).to.equal( "/x/handlers" );
				expect( paths.filter[0] 	).to.equal( "/x/filters" );
				expect( paths.partial[0] 	).to.equal( "/x/partials" );
				expect( paths.layout[0] 	).to.equal( "/x/layouts" );
				expect( paths.content[0] 	).to.equal( "/x/content" );
				expect( paths.data[0] 		).to.equal( "/s/data" );
				expect( paths.output[0] 	).to.equal( "/a/output" );

				expect( paths.root[1] 		).to.equal( "/b/root" );
				expect( paths.helper[1] 	).to.equal( "/z/helpers" );
				expect( paths.handler[1] 	).to.equal( "/z/handlers" );
				expect( paths.filter[1] 	).to.equal( "/z/filters" );
				expect( paths.partial[1] 	).to.equal( "/z/partials" );
				expect( paths.layout[1] 	).to.equal( "/z/layouts" );
				expect( paths.content[1] 	).to.equal( "/z/content" );
				expect( paths.data[1] 		).to.equal( "/x/data" );
				expect( paths.output[1] 	).to.equal( "/b/output" );

				expect( paths.data[2] 		).to.equal( "/y/data" );
				expect( paths.data[3] 		).to.equal( "/z/data" );

			});

		});

		describe("Configuration via render()", function() {

			it("should be possible", function() {

				var paths = rndr.getAllPaths();

				rndr.render({
					paths: {
						partial: [
							"/some/partials"
						]
					}
				}).then(

					function afterRender() {

						var paths = rndr.getAllPaths();
						expect( paths.partial[0] 	).to.equal( "/some/partials" );

					}

				);

			});

		});

		describe("Object Configuration", function() {

			it("should be possible with two path properties", function() {

				// We do this just to make sure the 'setConfig'
				// call removes these settings..
				rndr.setRootPath( "/bad/root/" );
				rndr.setOutputPath( "/bad/output/" );

				// Set the paths
				rndr.setConfig({
					paths: {
						root	: "/d/root",
						output	: "/e/output"
					}
				});

				// Load all paths..
				var paths = rndr.getAllPaths();

				// The configuration we passed above should result in
				// one path of each type..
				expect( paths.root.length 		).to.equal( 1 );
				expect( paths.helper.length 	).to.equal( 1 );
				expect( paths.handler.length 	).to.equal( 1 );
				expect( paths.filter.length 	).to.equal( 1 );
				expect( paths.partial.length 	).to.equal( 1 );
				expect( paths.layout.length 	).to.equal( 1 );
				expect( paths.content.length 	).to.equal( 1 );
				expect( paths.data.length 		).to.equal( 1 );
				expect( paths.output.length 	).to.equal( 1 );

				expect( paths.root[0] 		).to.equal( "/d/root" );
				expect( paths.helper[0] 	).to.equal( "/d/root/helpers" );
				expect( paths.handler[0] 	).to.equal( "/d/root/handlers" );
				expect( paths.filter[0] 	).to.equal( "/d/root/filters" );
				expect( paths.partial[0] 	).to.equal( "/d/root/partials" );
				expect( paths.layout[0] 	).to.equal( "/d/root/layouts" );
				expect( paths.content[0] 	).to.equal( "/d/root/content" );
				expect( paths.data[0] 		).to.equal( "/d/root/data" );
				expect( paths.output[0] 	).to.equal( "/e/output" );

			});

			it("should allow precise path setups", function() {

				// We do this just to make sure the 'setConfig'
				// call removes these settings..
				rndr.setRootPath( "/bad/root/" );
				rndr.setOutputPath( "/bad/output/" );

				// Set the paths
				rndr.setConfig({
					paths: {
						root	: [ "/a/root", "/b/root" ],
						output	: [ "/a/output", "/b/output" ],
						helper	: [ "/z/helpers", "/x/helpers" ],
						handler	: [ "/z/handlers", "/x/handlers" ],
						filter	: [ "/z/filters", "/x/filters" ],
						partial	: [ "/z/partials", "/x/partials" ],
						layout	: [ "/z/layouts", "/x/layouts" ],
						content	: [ "/z/content", "/x/content" ],
						data	: [ "/z/data", "/x/data", "/s/data", "/y/data" ]
					}
				});

				var paths = rndr.getAllPaths();

				expect( paths.root[0] 		).to.equal( "/a/root" );
				expect( paths.helper[0] 	).to.equal( "/x/helpers" );
				expect( paths.handler[0] 	).to.equal( "/x/handlers" );
				expect( paths.filter[0] 	).to.equal( "/x/filters" );
				expect( paths.partial[0] 	).to.equal( "/x/partials" );
				expect( paths.layout[0] 	).to.equal( "/x/layouts" );
				expect( paths.content[0] 	).to.equal( "/x/content" );
				expect( paths.data[0] 		).to.equal( "/s/data" );
				expect( paths.output[0] 	).to.equal( "/a/output" );

				expect( paths.root[1] 		).to.equal( "/b/root" );
				expect( paths.helper[1] 	).to.equal( "/z/helpers" );
				expect( paths.handler[1] 	).to.equal( "/z/handlers" );
				expect( paths.filter[1] 	).to.equal( "/z/filters" );
				expect( paths.partial[1] 	).to.equal( "/z/partials" );
				expect( paths.layout[1] 	).to.equal( "/z/layouts" );
				expect( paths.content[1] 	).to.equal( "/z/content" );
				expect( paths.data[1] 		).to.equal( "/x/data" );
				expect( paths.output[1] 	).to.equal( "/b/output" );

				expect( paths.data[2] 		).to.equal( "/y/data" );
				expect( paths.data[3] 		).to.equal( "/z/data" );

			});

			it("should allow config files", function() {

				var configPath = util.path.join( util.getPaths( fixtureName ).fixtureRoot, "conf", "simple.json" );

				//rndr.setVerbose( true );

				// We do this just to make sure the 'setConfig'
				// call removes these settings..
				rndr.setRootPath( "/bad/root/" );
				rndr.setOutputPath( "/bad/output/" );

				// Set the paths
				rndr.setConfig({
					configFile: configPath,
					paths: {
						output	: [ "/a/output", "/b/output" ],
						helper	: [ "/z/helpers", "/x/helpers" ]
					}
				});

				var paths = rndr.getAllPaths();

				expect( paths.output[0] 	).to.equal( "/a/output" );
				expect( paths.output[1] 	).to.equal( "/b/output" );
				expect( paths.output[2] 	).to.equal( "/e/output" );

				expect( paths.helper[0] 	).to.equal( "/x/helpers" );
				expect( paths.helper[1] 	).to.equal( "/z/helpers" );


			});

		});

		describe("File Configuration", function() {

			it("should be possible with two path properties", function() {

				var configPath = util.path.join( util.getPaths( fixtureName ).fixtureRoot, "conf", "simple.json" );

				// We do this just to make sure the 'setConfig'
				// call removes these settings..
				rndr.setRootPath( "/bad/root/" );
				rndr.setOutputPath( "/bad/output/" );

				// Set the paths
				rndr.setConfig(configPath);

				// Load all paths..
				var paths = rndr.getAllPaths();

				// The configuration we passed above should result in
				// one path of each type..
				expect( paths.root.length 		).to.equal( 1 );
				expect( paths.helper.length 	).to.equal( 1 );
				expect( paths.handler.length 	).to.equal( 1 );
				expect( paths.filter.length 	).to.equal( 1 );
				expect( paths.partial.length 	).to.equal( 1 );
				expect( paths.layout.length 	).to.equal( 1 );
				expect( paths.content.length 	).to.equal( 1 );
				expect( paths.data.length 		).to.equal( 1 );
				expect( paths.output.length 	).to.equal( 1 );

				expect( paths.root[0] 		).to.equal( "/d/root" );
				expect( paths.helper[0] 	).to.equal( "/d/root/helpers" );
				expect( paths.handler[0] 	).to.equal( "/d/root/handlers" );
				expect( paths.filter[0] 	).to.equal( "/d/root/filters" );
				expect( paths.partial[0] 	).to.equal( "/d/root/partials" );
				expect( paths.layout[0] 	).to.equal( "/d/root/layouts" );
				expect( paths.content[0] 	).to.equal( "/d/root/content" );
				expect( paths.data[0] 		).to.equal( "/d/root/data" );
				expect( paths.output[0] 	).to.equal( "/e/output" );

			});

			it("should allow precise path setups", function() {

				var configPath = util.path.join( util.getPaths( fixtureName ).fixtureRoot, "conf", "precise.json" );

				// We do this just to make sure the 'setConfig'
				// call removes these settings..
				rndr.setRootPath( "/bad/root/" );
				rndr.setOutputPath( "/bad/output/" );

				// Set the paths
				rndr.setConfig(configPath);

				var paths = rndr.getAllPaths();

				expect( paths.root[0] 		).to.equal( "/a/root" );
				expect( paths.helper[0] 	).to.equal( "/x/helpers" );
				expect( paths.handler[0] 	).to.equal( "/x/handlers" );
				expect( paths.filter[0] 	).to.equal( "/x/filters" );
				expect( paths.partial[0] 	).to.equal( "/x/partials" );
				expect( paths.layout[0] 	).to.equal( "/x/layouts" );
				expect( paths.content[0] 	).to.equal( "/x/content" );
				expect( paths.data[0] 		).to.equal( "/s/data" );
				expect( paths.output[0] 	).to.equal( "/a/output" );

				expect( paths.root[1] 		).to.equal( "/b/root" );
				expect( paths.helper[1] 	).to.equal( "/z/helpers" );
				expect( paths.handler[1] 	).to.equal( "/z/handlers" );
				expect( paths.filter[1] 	).to.equal( "/z/filters" );
				expect( paths.partial[1] 	).to.equal( "/z/partials" );
				expect( paths.layout[1] 	).to.equal( "/z/layouts" );
				expect( paths.content[1] 	).to.equal( "/z/content" );
				expect( paths.data[1] 		).to.equal( "/x/data" );
				expect( paths.output[1] 	).to.equal( "/b/output" );

				expect( paths.data[2] 		).to.equal( "/y/data" );
				expect( paths.data[3] 		).to.equal( "/z/data" );

			});

		});

	});

	describe("Sub-Component Config:", function() {

		describe("Via Configuration File:", function() {

			describe("Dust.js:", function() {

				it.only("should allow 'whitespace' configuration by file or front-matter", function( cb ) {

					// Some settings for resolving the config location
					var subComponentDir = "dust";
					var configFilename = "dust-test.json";

					// Resolve config location
					var configPath = util.path.join(
						util.getPaths( fixtureName ).fixtureRoot,
						"sub-component-tests",
						subComponentDir,
						configFilename
					);

					// Configure Grits
					rndr.setConfig(configPath);

					// Render
					rndr.render().then(

						function() {

							var testFileA = "../sub-component-tests/" + subComponentDir + "/output/config-file-test.html";
							var testFileB = "../sub-component-tests/" + subComponentDir + "/output/matter-data-test.html";
							var contentA = util.getOutput( fixtureName, testFileA );
							var contentB = util.getOutput( fixtureName, testFileB );

							expect( contentA.indexOf("\n") ).to.not.equal( -1 );
							expect( contentB.indexOf("\n") ).to.equal( -1 );

							cb();

						}

					);

				});

			});

			describe("Node-Sass:", function() {

				it("should something", function() {

				});

			});

			describe("Marked:", function() {

				it("should something", function() {

				});

			});

			describe("Highlight.js:", function() {

				it("should something", function() {

				});

			});

			describe("Gray-Matter:", function() {

				it("should something", function() {

				});

			});

			describe("Chokidar:", function() {

				it("should something", function() {

				});

			});

			describe("LiveReloadX:", function() {

				it("should something", function() {

				});

			});

		});

	});

});
