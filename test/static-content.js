// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "static-content";

// Tests
describe("Static Content", function() {

	before( function( cb ) {

		var paths = util.getPaths( fixtureName );

		util.renderFixture( fixtureName, function() {
			cb();
		},{
			verbose: false,
			logFilter: "static",
			paths: {
				static: [
					util.path.join( paths.sourceRoot, "static-content-a" ),
					util.path.join( paths.sourceRoot, "static-content-b" ) + "->images"
				]
			}
		});

	});

	describe("In-line Content", function() {

		it("should not affect rendering", function() {

			var fn = "index.html";
			util.checkHtmlOutput( fixtureName, fn,
				"<p>Hello World</p>"
			);

		});

		it("should copy to root", function() {

			util.fileShouldExist( fixtureName, "hello-world-inline-root.png" );

		});

		it("should copy to subdirectories", function() {

			util.fileShouldExist( fixtureName, "images/hello-world-inline-images.png" );

		});

	});

	describe("Explicit Static Content Paths", function() {

		it("should copy without targets", function() {

			util.fileShouldExist( fixtureName, "images/hello-world-static-a.png" );

		});

		it("should allow and obey target rules", function() {

			util.fileShouldExist( fixtureName, "images/hello-world-static-b.png" );

		});

	});

});
