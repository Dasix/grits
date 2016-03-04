require("../index");
require("../lib/classes/file");

var expect 	= require('chai').expect;
var path 	= require("path");

//var fslFixturePath 	= path.join( __dirname, "fixtures/file-system-loader" );

describe("File Class", function() {

	describe("#basePath", function() {

		it("should have its values transformed when #setBasePath is called", function() {

			var f = new Dasix.grits.File( "/a/b/c/", "d/e/f", "g.txt" );
			expect( f.getBasePath() ).to.equal( "/a/b/c" );

			f.setBasePath("/a/b/c/../d");
			expect( f.getBasePath() ).to.equal( "/a/b/d" );

			f.setBasePath("/a/b/c/../d/");
			expect( f.getBasePath() ).to.equal( "/a/b/d" );

		});

	});

	describe("#relativePath", function() {

		it("should have its values transformed when #setRelativePath is called", function() {

			var f = new Dasix.grits.File( "/a/b/c", "d/e/f", "g.txt" );
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

			f.setRelativePath("d/e/f");
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

			f.setRelativePath("/d/e/f");
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

			f.setRelativePath("d/e/f/");
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

			f.setRelativePath("/d/e/f/");
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

			f.setRelativePath("//d/g/h//../../e//f/");
			expect( f.getRelativePath() ).to.equal( "d/e/f" );

		});

	});

	describe("#filename", function() {

		it("should have its values transformed when #setFilename is called", function() {

			var f = new Dasix.grits.File( "/a/b/c", "d/e/f", "g.txt" );
			expect( f.getFilename() ).to.equal( "g.txt" );

			f.setFilename("g.txt");
			expect( f.getFilename() ).to.equal( "g.txt" );

			f.setFilename("some/g.txt");
			expect( f.getFilename() ).to.equal( "g.txt" );

			f.setFilename("some/long/path/g.txt");
			expect( f.getFilename() ).to.equal( "g.txt" );

			f.setFilename("\\a\\windows\\path\\g.txt");
			expect( f.getFilename() ).to.equal( "g.txt" );

			f.setFilename("/another/long/path/g.txt");
			expect( f.getFilename() ).to.equal( "g.txt" );

		});

	});

	describe("#getRelativeFilePath", function() {

		it("should return a correct value", function() {

			var f = new Dasix.grits.File( "/some/a/b/c/../../../", "/path/d/e/f/../../../", "/to/../some/a.file" );
			expect( f.getRelativeFilePath() ).to.equal("path/a.file");

		});

	});

	describe("#getAbsoluteFilePath", function() {

		it("should return a correct value", function() {

			var f = new Dasix.grits.File( "/some/a/b/c/../../../", "/path/d/e/f/../../../", "/to/../some/a.file" );
			expect( f.getAbsoluteFilePath() ).to.equal("/some/path/a.file");

		});

	});

	describe("#getBaseName", function() {

		it("should return a correct value", function() {

			var f = new Dasix.grits.File( "/root", "", "basename.x" );
			expect( f.getBaseName() ).to.equal("basename");

			var f = new Dasix.grits.File( "/root", "", "basename.x.y.z" );
			expect( f.getBaseName() ).to.equal("basename");

			var f = new Dasix.grits.File( "/root", "", "basename" );
			expect( f.getBaseName() ).to.equal("basename");

			var f = new Dasix.grits.File( "/root", "", ".basename" );
			expect( f.getBaseName() ).to.equal("basename");

		});

	});

	describe("#getRelativeBaseName", function() {

		it("should return a correct value", function() {

			var f = new Dasix.grits.File( "/root", "subdir", "basename.x" );
			expect( f.getRelativeBaseName() ).to.equal("subdir/basename");

			var f = new Dasix.grits.File( "/root", "subdir", "basename.x.y.z" );
			expect( f.getRelativeBaseName() ).to.equal("subdir/basename");

			var f = new Dasix.grits.File( "/root", "", "basename" );
			expect( f.getRelativeBaseName() ).to.equal("basename");

			var f = new Dasix.grits.File( "/root", "", ".basename" );
			expect( f.getRelativeBaseName() ).to.equal("basename");

		});

	});

	describe("#getFileExtensions", function() {

		describe("( true )", function() {

			it("should return a correct array value", function() {

				var f = new Dasix.grits.File( "/root", "subdir", "basename.x" );
				var ext;


				// First Test
				f.setFilename("basename.Z.x.z.y");
				ext = f.getFileExtensions( true );

				expect( ext ).to.be.an("array");
				expect( ext.length ).to.equal( 3 );
				expect( ext[0] ).to.equal("x");
				expect( ext[1] ).to.equal("y");
				expect( ext[2] ).to.equal("z");


				// Second Test
				f.setFilename(".basename.Z.x.z.y");
				ext = f.getFileExtensions( true );

				expect( ext ).to.be.an("array");
				expect( ext.length ).to.equal( 3 );
				expect( ext[0] ).to.equal("x");
				expect( ext[1] ).to.equal("y");
				expect( ext[2] ).to.equal("z");


				// Third Test
				f.setFilename("basename.Z..x..z..y..");
				ext = f.getFileExtensions( true );

				expect( ext ).to.be.an("array");
				expect( ext.length ).to.equal( 3 );
				expect( ext[0] ).to.equal("x");
				expect( ext[1] ).to.equal("y");
				expect( ext[2] ).to.equal("z");


			});

		});

		describe("( false )", function() {

			it("should return a correct object value", function() {

				var f = new Dasix.grits.File( "/root", "subdir", "basename.x" );
				var ext;


				// First Test
				f.setFilename("basename.Z.x.z.y");
				ext = f.getFileExtensions( false );

				expect( ext ).to.be.an("object");
				expect( ext.x ).to.equal( true );
				expect( ext.y ).to.equal( true );
				expect( ext.z ).to.equal( true );


				// Second Test
				f.setFilename(".basename.Z.x.z.y");
				ext = f.getFileExtensions(); // testing default value for param1

				expect( ext ).to.be.an("object");
				expect( ext.x ).to.equal( true );
				expect( ext.y ).to.equal( true );
				expect( ext.z ).to.equal( true );


				// Third Test
				f.setFilename("basename.Z..x..z..y..");
				ext = f.getFileExtensions( false );

				expect( ext ).to.be.an("object");
				expect( ext.x ).to.equal( true );
				expect( ext.y ).to.equal( true );
				expect( ext.z ).to.equal( true );


			});

		});

	});

	describe("#hasFileExtension (aka #is)", function() {

		it("should return a correct value", function() {

			var f = new Dasix.grits.File( "/root", "subdir", "basename.x" );


			// First Test
			f.setFilename("basename.Z.x.z.y");
			expect( f.hasFileExtension( "a" ) ).to.equal( false );
			expect( f.hasFileExtension( "basename" ) ).to.equal( false );
			expect( f.hasFileExtension( "x" ) ).to.equal( true );
			expect( f.hasFileExtension( "Y" ) ).to.equal( true );
			expect( f.hasFileExtension( "z" ) ).to.equal( true );


			// Second Test
			f.setFilename(".basename.Z.x.z.y");
			expect( f.hasFileExtension( "a" ) ).to.equal( false );
			expect( f.hasFileExtension( "basename" ) ).to.equal( false );
			expect( f.hasFileExtension( "x" ) ).to.equal( true );
			expect( f.hasFileExtension( "Y" ) ).to.equal( true );
			expect( f.hasFileExtension( "z" ) ).to.equal( true );


			// Third Test (uses the #is alias)
			f.setFilename("basename.Z...x...z...y..");
			expect( f.is( "a" ) ).to.equal( false );
			expect( f.is( "basename" ) ).to.equal( false );
			expect( f.is( "x" ) ).to.equal( true );
			expect( f.is( "Y" ) ).to.equal( true );
			expect( f.is( "z" ) ).to.equal( true );


		});

	});

});
