// Dependencies
var util = require("./lib/util");
var expect  = util.expect;
var _ = util.lodash;

// Settings
var fixtureName = "path-management-methods"; // remove?

// Tests
describe("Path Management Methods:", function() {

	var pathTypes = util.getFreshRenderer().getPathTypeDetails();
	var rndr;
	var paths;

	beforeEach( function() {
		rndr = util.getFreshRenderer();
		rndr.clearAllPaths();
	});

	describe("Path Variants", function() {

		describe("Single Paths", function() {

			describe("Strings", function() {

				it("should accept simple strings", function() {

					// Set the path
					rndr.setHandlerPath( "/a/b/c" );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( abs ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( _.isEmpty( conf ) ).to.equal( true );

				});

				it("should normalize string paths", function() {

					// Set the path
					rndr.setHandlerPath( "\\/\\/a\\/b/c\\\\\\\\\\\//..\\m//.\\" );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/m" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( _.isEmpty( conf ) ).to.equal( true );

				});

				it("should accept strings with targets", function() {

					// Set the path
					rndr.setHandlerPath( "\\/\\/a\\/b/m\\\\\\\\\\\//..\\c//.\\->\\/\\/e\\/f/d\\\\\\\\\\\//..\\g//.\\" );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( conf.target ).to.be.a( "string" );
					expect( conf.target ).to.equal( "/e/f/g" );

				});

			});

			describe("Objects", function() {

				it("should accept obj.path", function() {

					// Set the path
					rndr.setHandlerPath( { path: "/a/b/c" } );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( abs ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( _.isEmpty( conf ) ).to.equal( true );

				});

				it("should normalize string paths in obj.path", function() {

					// Set the path
					rndr.setHandlerPath( { path: "\\/\\/a\\/b/c\\\\\\\\\\\//..\\m//.\\" } );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/m" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( _.isEmpty( conf ) ).to.equal( true );

				});

				it("should accept paths with targets in obj.path", function() {

					// Set the path
					rndr.setHandlerPath( { path: "\\/\\/a\\/b/m\\\\\\\\\\\//..\\c//.\\->\\/\\/e\\/f/d\\\\\\\\\\\//..\\g//.\\" } );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( conf.target ).to.be.a( "string" );
					expect( conf.target ).to.equal( "/e/f/g" );

				});

				it("should accept targets in obj.target", function() {

					// Set the path
					rndr.setHandlerPath( { path: "\\/\\/a\\/b/m\\\\\\\\\\\//..\\c//.\\" , target: "\\/\\/e\\/f/d\\\\\\\\\\\//..\\g//.\\" } );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( conf.target ).to.be.a( "string" );
					expect( conf.target ).to.equal( "/e/f/g" );

				});

				it("should accept arbitrary path configuration variables", function() {

					// Set the path
					rndr.setHandlerPath( { path: "\\/\\/a\\/b/m\\\\\\\\\\\//..\\c//.\\" , arbitrary: "moose" } );

					// Retrieve the resulting ResourcePath object
					var rp = rndr.getPathCollection("handler" ).getFirstPath();

					// Retrieve the resolved absolute path
					var abs = rp.getPath();

					// Retrieve the path config/meta
					var conf = rp.getConfig();

					// Test the path
					expect( rp.getPath() ).to.equal( "/a/b/c" );

					// Test the path config
					expect( conf ).to.be.an( "object" );
					expect( conf.arbitrary ).to.be.a( "string" );
					expect( conf.arbitrary ).to.equal( "moose" );

				});

			});

		});

		describe("Multiple Paths (arrays)", function() {

			it("should accept simple strings", function() {

				// Set the path
				rndr.setHandlerPath( [ "/a/b/c/", "/e/f/g/" ] );

				// Retrieve the resulting ResourcePath object
				var rp = rndr.getPathCollection("handler" );
				var paths = rp.getPaths();

				// We gave it two paths ..
				expect( paths.length ).to.equal( 2 );

				// Fetch the paths
				var first = paths[0];
				var second = paths[1];

				// Test the first path ..
				expect( first.getPath() ).to.equal( "/a/b/c" );
				expect( first.getConfig() ).to.be.an( "object" );
				expect( _.isEmpty( first.getConfig() ) ).to.equal( true );

				// Test the second path ..
				expect( second.getPath() ).to.equal( "/e/f/g" );
				expect( second.getConfig() ).to.be.an( "object" );
				expect( _.isEmpty( second.getConfig() ) ).to.equal( true );

			});

			it("should accept strings with targets", function() {

				// Set the path
				rndr.setHandlerPath( [ "/a/b/c/->/\\target///three/../one//\\", "/e/f/g/->/\\target///three/../two//\\" ] );

				// Retrieve the resulting ResourcePath object
				var rp = rndr.getPathCollection("handler" );
				var paths = rp.getPaths();

				// We gave it two paths ..
				expect( paths.length ).to.equal( 2 );

				// Fetch the paths
				var first = paths[0];
				var second = paths[1];

				// Test the first path ..
				expect( first.getPath() ).to.equal( "/a/b/c" );
				expect( first.getConfig() ).to.be.an( "object" );
				expect( first.getConfig().target ).to.equal( "/target/one" );

				// Test the second path ..
				expect( second.getPath() ).to.equal( "/e/f/g" );
				expect( second.getConfig() ).to.be.an( "object" );
				expect( second.getConfig().target ).to.equal( "/target/two" );

			});

			it("should accept a mixture of strings and objects", function() {

				// Set the path
				rndr.setHandlerPath( [ { path: "/a\\/b/c/", target: "/\\target///three/../one//\\" }, "/e/f/g/->/\\target///three/../two//\\" ] );

				// Retrieve the resulting ResourcePath object
				var rp = rndr.getPathCollection("handler" );
				var paths = rp.getPaths();

				// We gave it two paths ..
				expect( paths.length ).to.equal( 2 );

				// Fetch the paths
				var first = paths[0];
				var second = paths[1];

				// Test the first path ..
				expect( first.getPath() ).to.equal( "/a/b/c" );
				expect( first.getConfig() ).to.be.an( "object" );
				expect( first.getConfig().target ).to.equal( "/target/one" );

				// Test the second path ..
				expect( second.getPath() ).to.equal( "/e/f/g" );
				expect( second.getConfig() ).to.be.an( "object" );
				expect( second.getConfig().target ).to.equal( "/target/two" );

			});

			it("should ignore duplicate paths", function() {

				// Set the path
				rndr.setHandlerPath( [ "/e/f/g", "/a/b/c/", "/a/b/c/" ] );
				rndr.addHandlerPath( [ "/e/f/g/" ] );

				// Retrieve the resulting ResourcePath object
				var rp = rndr.getPathCollection("handler" );
				var paths = rp.getPaths();

				// We gave it two paths ..
				expect( paths.length ).to.equal( 2 );

				// Fetch the paths
				var first = paths[0];
				var second = paths[1];

				// Test the first path ..
				expect( first.getPath() ).to.equal( "/a/b/c" );
				expect( first.getConfig() ).to.be.an( "object" );
				expect( _.isEmpty( first.getConfig() ) ).to.equal( true );

				// Test the second path ..
				expect( second.getPath() ).to.equal( "/e/f/g" );
				expect( second.getConfig() ).to.be.an( "object" );
				expect( _.isEmpty( second.getConfig() ) ).to.equal( true );

			});

		});


	});

	_.each( pathTypes, function( pathType, ptIndex ) {

		describe("For '" + pathType.short + "' paths", function() {

			var setMethodName 	= "set" + pathType.methodName + "Path";
			var addMethodName 	= "add" + pathType.methodName + "Path";
			var clearMethodName = "clear" + pathType.methodName + "Paths";
			var countMethodName = "count" + pathType.methodName + "Paths";
			var getMethodName 	= "get" + pathType.methodName + "Paths";

			describe("#" + setMethodName + "()", function() {

				it("should exist", function() {
					expect( rndr[setMethodName] ).to.be.a( "function" );
				});
				it("should clear existing paths and add a new path", function() {

					// Define a test path
					var testPath = "/a/path";

					// Execute the method
					rndr[setMethodName]( testPath );

					// Get the resulting path array
					var resultingPaths = rndr.getPathsOfType( pathType.short );

					// Assert
					expect( resultingPaths.length ).to.equal( 1 );
					expect( resultingPaths[0] ).to.equal( testPath );

				});

			});
			describe("#" + addMethodName + "()", function() {

				it("should exist", function() {
					expect( rndr[addMethodName] ).to.be.a( "function" );
				});
				it("should add a new path without clearing the existing paths", function() {

					// Define some test paths
					var testPathA = "/a/path";
					var testPathB = "/b/path";

					// Execute the method
					rndr[setMethodName]( testPathA );
					rndr[addMethodName]( testPathB );

					// Get the resulting path array
					var resultingPaths = rndr.getPathsOfType( pathType.short );

					// Assert
					expect( resultingPaths.length ).to.equal( 2 );
					expect( resultingPaths[0] ).to.equal( testPathA );
					expect( resultingPaths[1] ).to.equal( testPathB );

				});

			});
			describe("#" + clearMethodName + "()", function() {

				it("should exist", function() {
					expect( rndr[clearMethodName] ).to.be.a( "function" );
				});
				it("should clear all paths of this type", function() {

					// Define some test paths
					var testPathA = "/a/path";
					var testPathB = "/b/path";

					// Prefill some data
					rndr[setMethodName]( testPathA );
					rndr[addMethodName]( testPathB );

					// Execute the clear method
					rndr[clearMethodName]();

					// Get the resulting path array
					var resultingPaths = rndr.getPathsOfType( pathType.short );

					// Assert
					expect( resultingPaths.length ).to.equal( 0 );

				});

			});
			describe("#" + countMethodName + "()", function() {

				it("should exist", function() {
					expect( rndr[countMethodName] ).to.be.a( "function" );
				});
				it("should return an accurate path count", function() {

					// Define some test paths
					var testPathA = "/a/path";
					var testPathB = "/b/path";

					// Prefill some data
					rndr[setMethodName]( testPathA );
					rndr[addMethodName]( testPathB );

					// Execute the count method
					var count = rndr[countMethodName]();

					// Assert
					expect( count ).to.equal( 2 );

				});

			});
			describe("#" + getMethodName + "()", function() {

				it("should exist", function() {
					expect( rndr[getMethodName] ).to.be.a( "function" );
				});
				it("should return all paths of this type", function() {

					// Define some test paths
					var testPathA = "/a/path";
					var testPathB = "/b/path";

					// Prefill some data
					rndr[setMethodName]( testPathA );
					rndr[addMethodName]( testPathB );

					// Execute the clear method
					var resultingPaths = rndr[getMethodName]();

					// Assert
					expect( resultingPaths.length ).to.equal( 2 );
					expect( resultingPaths[0] ).to.equal( testPathA );
					expect( resultingPaths[1] ).to.equal( testPathB );

				});

			});

		});

	});

});
