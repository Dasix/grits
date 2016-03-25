// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "data-loading";

// Tests
describe("Data Loading", function() {

	var rndr;

	before( function( cb ) {

		// Find the root paths for our fixture
		var paths = util.getPaths( fixtureName );

		// Initialize a renderer
		rndr = util.getRenderer( fixtureName, false );

		// Use two content paths for these tests
		rndr.setContentPath( util.path.join( paths.sourceRoot, "content-a" ) );
		rndr.addContentPath( util.path.join( paths.sourceRoot, "content-b" ) );

		// Use two data paths for these tests
		rndr.setDataPath( util.path.join( paths.sourceRoot, "data-a" ) );
		rndr.addDataPath( util.path.join( paths.sourceRoot, "data-b" ) );

		// Perform the render op
		rndr.render().then(
			function() {
				cb();
			}
		);

	});

	describe("Front-Matter", function() {

		it("should exist for content pages that do not have any front-matter", function() {

			var cd = rndr.dataManager.getContextData();

			// Ensure the data exists for our "front-matter-empty" page
			expect( cd ).to.be.an( "object" );
			expect( cd.page ).to.be.an( "object" );
			expect( cd.page["front-matter-empty"] ).to.be.an( "object" );

		});

		it("should exist for content pages that do have front-matter", function() {

			var cd = rndr.dataManager.getContextData();

			// Ensure the data exists for our "front-matter-basic" page
			expect( cd ).to.be.an( "object" );
			expect( cd.page ).to.be.an( "object" );
			expect( cd.page["front-matter-basic"] ).to.be.an( "object" );

			// For convenience
			var fmb = cd.page["front-matter-basic"];


			// - Next, validate that the data loaded properly -


			// .aVar
			expect( fmb.aVar ).to.be.a( "string" );
			expect( fmb.aVar ).to.equal( "hello" );

			// .bVar
			expect( fmb.bVar ).to.be.a( "string" );
			expect( fmb.bVar ).to.equal( "world" );

			// .anArray
			expect( fmb.anArray ).to.be.an( "array" );
			expect( fmb.anArray.length ).to.equal( 3 );

			// .anArray[0]
			expect( fmb.anArray[0] ).to.be.a( "string" );
			expect( fmb.anArray[0] ).to.equal( "apple" );

			// .anArray[1]
			expect( fmb.anArray[1] ).to.be.a( "string" );
			expect( fmb.anArray[1] ).to.equal( "banana" );

			// .anArray[2]
			expect( fmb.anArray[2] ).to.be.a( "string" );
			expect( fmb.anArray[2] ).to.equal( "cherry" );

		});

		it("should use last-in conflict resolution for duplicate content", function() {

			var cd = rndr.dataManager.getContextData();

			expect( cd.page ).to.be.an( "object" );
			expect( cd.page.conflict ).to.be.an( "object" );
			expect( cd.page.conflict["conflict-one"] ).to.be.an( "object" );
			expect( cd.page.conflict["conflict-one"].from ).to.be.a( "string" );
			expect( cd.page.conflict["conflict-one"].from ).to.equal( "b-conflict" );

		});

	});

	describe("Data Files", function() {

		describe("Basic Data Loading", function() {

			it("should load simple data", function() {

				var cd = rndr.dataManager.getContextData();

				// Ensure the data exists for our "simple.json" data file
				expect( cd ).to.be.an( "object" );
				expect( cd.data ).to.be.an( "object" );
				expect( cd.data.simple ).to.be.an( "object" );

				// For convenience
				var sd = cd.data.simple;


				// - Next, validate that the data loaded properly -


				// .cVar
				expect( sd.cVar ).to.be.a( "string" );
				expect( sd.cVar ).to.equal( "hi" );

				// .dVar
				expect( sd.dVar ).to.be.a( "string" );
				expect( sd.dVar ).to.equal( "mars" );

				// .dataArray
				expect( sd.dataArray ).to.be.an( "array" );
				expect( sd.dataArray.length ).to.equal( 3 );

				// .dataArray[0]
				expect( sd.dataArray[0] ).to.be.a( "string" );
				expect( sd.dataArray[0] ).to.equal( "car" );

				// .dataArray[1]
				expect( sd.dataArray[1] ).to.be.a( "string" );
				expect( sd.dataArray[1] ).to.equal( "suv" );

				// .dataArray[2]
				expect( sd.dataArray[2] ).to.be.a( "string" );
				expect( sd.dataArray[2] ).to.equal( "truck" );

			});

			it("should load deep data", function() {

				var cd = rndr.dataManager.getContextData();

				// Ensure the data exists for our "deep.json" data file
				expect( cd ).to.be.an( "object" );
				expect( cd.data ).to.be.an( "object" );
				expect( cd.data.deep ).to.be.an( "object" );

				// For convenience
				var sd = cd.data.deep;


				// - Next, validate that the data loaded properly -


				// .cVar
				expect( sd.cVar ).to.be.a( "string" );
				expect( sd.cVar ).to.equal( "hi" );

				// .dVar
				expect( sd.dVar ).to.be.a( "string" );
				expect( sd.dVar ).to.equal( "mars" );

				// .dataArray
				expect( sd.dataArray ).to.be.an( "array" );
				expect( sd.dataArray.length ).to.equal( 3 );

				// .dataArray[0]
				expect( sd.dataArray[0] ).to.be.a( "string" );
				expect( sd.dataArray[0] ).to.equal( "car" );

				// .dataArray[1]
				expect( sd.dataArray[1] ).to.be.a( "string" );
				expect( sd.dataArray[1] ).to.equal( "suv" );

				// .dataArray[2]
				expect( sd.dataArray[2] ).to.be.a( "string" );
				expect( sd.dataArray[2] ).to.equal( "truck" );

			});

		});

		describe("Data Conflicts", function() {

			it("should use last-in scalar values", function() {

				var cd = rndr.dataManager.getContextData();

				// There is no reasonable way to resolve scalar
				// conflicts so each read should overwrite the
				// previous read and we should expect the last
				// file that was loaded to win the conflict.
				expect( cd.data.conflict.id ).to.equal( "b-subdir" );

			});

			it("should use last-in object values", function() {

				var cd = rndr.dataManager.getContextData();

				// For objects, we handle them much like scalars.
				// If we try to deep merge ALL objects in the data tree
				// we could get really weird results.  So, objects
				// will take the same "last-in" approach as scalars.
				expect( cd.data.conflict.simpleObj.from ).to.equal( "b-subdir" );

				// Our 'simpleObj' test contained an array.  Since we
				// should not have deep merged it, it should only have
				// a single entry.
				expect( cd.data.conflict.simpleObj.anArray ).to.be.an( "array" );
				expect( cd.data.conflict.simpleObj.anArray.length ).to.equal( 1 );


			});

			it("should concatenate arrays", function() {

				var cd = rndr.dataManager.getContextData();

				// For arrays in the root level of the data file, we want to
				// concenate them together.
				expect( cd.data.conflict.objArray ).to.be.an( "array" );

				// Arrays of objects cannot be made "unique", since it would
				// require a rather complicated "deepEqual" operation that
				// could get expensive.  So, we should expect all data to
				// exist and, in our test, there are '7' total items.
				// --
				// Especially notice that the last objArray item in the "b-root"
				// file is intentionally identical to the first object in "a-subdir",
				// yet both objects will remain in the array.
				expect( cd.data.conflict.objArray.length ).to.equal( 7 );

			});

			it("should make arrays of scalars unique", function() {

				var cd = rndr.dataManager.getContextData();

				// For arrays in the root level of the data file, we want to
				// concenate them together.
				expect( cd.data.conflict.scalarArray ).to.be.an( "array" );

				// Arrays of scalars should have _.uniq ran on them, which
				// should trim our example data, which has 9 total entries,
				// down to six unique items.
				expect( cd.data.conflict.scalarArray.length ).to.equal( 6 );

			});

			it("should sort arrays of scalars", function() {

				var cd = rndr.dataManager.getContextData();

				// Arrays of scalars should be automatically sorted
				// after the "unique" operation.
				expect( cd.data.conflict.scalarArray[0] ).to.equal( "adam" );

			});

		});

	});

	describe("File Types", function() {

		describe("JSON", function() {

			it("should load correctly", function() {

				var cd = rndr.dataManager.getContextData();
				expect( cd.data.simple.json ).to.equal( true );

			});

		});
		describe("TOML", function() {

			it("should load correctly", function() {

				var cd = rndr.dataManager.getContextData();
				expect( cd.data.simple.toml ).to.equal( true );
				expect( cd.data.simple.ini ).to.equal( true );

			});

		});
		describe("YAML", function() {

			it("should load correctly", function() {

				var cd = rndr.dataManager.getContextData();
				expect( cd.data.simple.yaml ).to.equal( true );
				expect( cd.data.simple.yml ).to.equal( true );

			});

		});

	});

});
