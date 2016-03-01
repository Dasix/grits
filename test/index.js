require("../index");

var expect 	= require('chai').expect;
var path 	= require("path");

var rootMain 	= path.join( __dirname, "harness/content/root-main" );
var rootExtra 	= path.join( __dirname, "harness/content/root-extra" );

describe('DustJS Renderer', function() {

	describe("Validation", function() {

		it("should throw an error for invalid path types", function() {

			expect(
				function() {
					var rnd = new C2C.dustjs.Renderer();
					rnd.countPathsOfType("somethingInvalid");
				}
			).to.throw(Error);

		});

	});

	describe("Path Management", function() {

		var rnd;

		beforeEach( function() {
			rnd = new C2C.dustjs.Renderer();
		});

		describe("#setRootPath", function() {

			it("should accept a single path", function() {

				rnd.setRootPath( "/an/example/path" );
				expect( rnd.countRootPaths() ).to.equal( 1 );

			});

			it("should clear existing paths", function() {

				rnd.setRootPath( "/an/example/path" );
				rnd.setRootPath( "/an/example/path" );
				expect( rnd.countRootPaths() ).to.equal( 1 );

			});

			it("should accept multiple paths", function() {

				rnd.setRootPath( [ "/an/example/path", "/another/example/path" ] );
				expect( rnd.countRootPaths() ).to.equal( 2 );

			});

			it("should clear all existing paths", function() {

				rnd.setRootPath( [ "/an/example/path" ] );
				rnd.setRootPath( [ "/an/example/path" ] );
				expect( rnd.countFilterPaths() ).to.equal( 1 );

			});

			it("should add subpaths automatically", function() {

				rnd.setRootPath( [ "/an/example/path" ] );
				expect( rnd.countFilterPaths() ).to.equal( 1 );
				expect( rnd.countContentPaths() ).to.equal( 1 );
				expect( rnd.countOutputPaths() ).to.equal( 1 );

			});

		});

		describe("#addRootPath", function() {

			it("should accept a single path", function() {

				rnd.setRootPath( "/an/example/path" );
				rnd.addRootPath( "/another/example/path" );
				expect( rnd.countRootPaths() ).to.equal( 2 );

			});

			it("should accept multiple paths", function() {

				rnd.setRootPath( "/an/example/path" );
				rnd.addRootPath( [ "/another/example/path", "/yet/another/example/path" ] );
				expect( rnd.countRootPaths() ).to.equal( 3 );

			});

			it("should ignore duplicates", function() {

				rnd.setRootPath( "/an/example/path" );

				rnd.addRootPath( [ "/another/example/path" ] );
				expect( rnd.countRootPaths() ).to.equal( 2 );

				rnd.addRootPath( [ "/another/example/path" ] );
				expect( rnd.countRootPaths() ).to.equal( 2 );


			});

			it("should auto-sort new entries", function() {

				var a = "/a/b/c";
				var e = "/e/f/g";
				var h = "/h/i/j";

				rnd.setRootPath( e );
				rnd.addRootPath( [ h, a ] );

				expect( rnd._paths.root[0] ).to.equal( a );
				expect( rnd._paths.root[1] ).to.equal( e );
				expect( rnd._paths.root[2] ).to.equal( h );

			});

		});

		describe("#getRootPaths", function() {

			it("should return sorted arrays by default", function() {

				var a = "/a/b/c";
				var e = "/e/f/g";
				var h = "/h/i/j";

				rnd.setRootPath( e );
				rnd.addRootPath( [ h, a ] );

				var ret = rnd.getRootPaths();

				expect( ret[0] ).to.equal( a );
				expect( ret[1] ).to.equal( e );
				expect( ret[2] ).to.equal( h );

			});

			it("should return objects when requested", function() {

				var a = "/a/b/c";
				var e = "/e/f/g";
				var h = "/h/i/j";

				rnd.setRootPath( e );
				rnd.addRootPath( [ h, a ] );

				var ret = rnd.getRootPaths( true );

				expect( ret[a] ).to.equal( a );
				expect( ret[e] ).to.equal( e );
				expect( ret[h] ).to.equal( h );

			});

		});

		describe("#clearRootPaths", function() {

			it("should clear all root paths", function() {



			});

			it("should not clear any non-root paths", function() {



			});

		});

	});

	describe("Renderering", function() {

		var rndr;

		before(
			function() {
			}
		);

		describe("Basic HTML Renderering", function() {

			it("should something", function( cb ) {

				this.timeout( 2000 );

				var rndr = new C2C.dustjs.Renderer();
				//rndr.setVerbose(true);
				rndr.setVerbose(false);
				rndr.setRootPath( path.join( __dirname, "fixtures/content/root-main") );
				rndr.render().then(

					function( theResult ) {

						/*
						console.log("\n\n\n\n");
						console.log("-=-=-=-=-=-=-=-=-=-");
						console.log( theResult );
						console.log("\n\n\n\n");
						console.log("\n\n\n\n");
						*/

						cb();
					}

				);

			});

		});

	});

});
