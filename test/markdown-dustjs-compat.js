// Dependencies
var util = require("./lib/util");
var expect  = util.expect;

// Settings
var fixtureName = "markdown-dustjs-compat";

// Tests
describe("Markdown and Dust.js Compatibility", function() {

	before( function( cb ) {
		//var verboseRender = false;
		var verboseRender = {
			verbose: true,
			logFilter: "mark"
		};
		util.renderFixture( fixtureName, function() {
			cb();
		}, verboseRender);
	});

	describe("Using the special {@notmd} tag", function() {

		describe("Dust.js Comment Tags: {! abc !}", function() {

			it("should hide single-line comments", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/comments.html",
					"<p>Hello world</p>"
				);

			});

			it("should hide multi-line comments", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/comments-multi-line.html",
					"<p>Hello world</p>"
				);

			});

		});

		describe("Dust.js Exists Tags: {?abc}", function() {

			it("should render when the value exists", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/exists.html",
					"exists"
				);

			});

			it("should show the else value when the value does not exist", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/exists-else.html",
					"not"
				);

			});

		});

		describe("Dust.js Filter Expressions: {xxx|abc}", function() {

			it("should render filtered variables", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/var-simple-with-filter.html",
					"<p>Hello WORLD</p>"
				);

			});

		});

		describe("Dust.js Helper Tags: {@abc}", function() {

			it("should properly render the hhtml helper", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/helper-hhtml.html",
					"<p>Hello <span>WORLD</span></p>"
				);

			});
			it("should properly render the nphtml helper", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/helper-nphtml.html",
					"<p>Hello <span>world</span></p>"
				);

			});

		});

		describe("Dust.js In-Line Partial Tags: {+abc}", function() {

			it("should render as blank when not given a value or default", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/inline-partial-no-val.html",
					"<p>Hello </p>"
				);

			});

			it("should render the default when not given a value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/inline-partial-def-val.html",
					"<p>Hello default</p>"
				);

			});

			it("should accept override values if it has a default value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/inline-partial-with-val-and-def.html",
					"<p>Hello world</p>"
				);

			});

			it("should accept values if it does not have a default value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/inline-partial-with-val-no-def.html",
					"<p>Hello world</p>"
				);

			});

		});

		describe("Dust.js Not-Exists Tags: {^abc}", function() {

			it("should render when the value does not exist", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/not-exists.html",
					"not"
				);

			});

			it("should show the else value when the value exists", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/not-exists-else.html",
					"exists"
				);

			});

		});

		describe("Dust.js Partial Tags: {>'abc'/}", function() {

			it("should include HTML partials as expected", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/partial-html-simple.html",
					"<p>Hello <em>world</em></p>"
				);

			});

			it("should include markdown partials as expected", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/partial-md-simple.html",
					"<p>Hello <p><em>world</em></p></p>"
				);

			});

		});

		describe("Dust.js Section Tags: {#abc}", function() {

			it("should render when found/present", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/section-present.html",
					"<p>Hello world</p>"
				);

			});

			it("should not render when missing and no else is provided", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/section-missing-no-else.html",
					"<p>Hello </p>"
				);

			});

			it("should render the else block when value is missing", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/section-missing-with-else.html",
					"<p>Hello mars</p>"
				);

			});

			it("should iterate over arrays", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/section-array.html",
					"<p>Hello world and mars </p>"
				);

			});

			it("should work with objects", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/section-object.html",
					"<h1 id=\"-inc-nmd-0-and-inc-nmd-1-\">1 and 2</h1>\n1 and 2"
				);
			});

		});

		describe("Dust.js Special Tags: {~abc}", function() {

			it.skip("should render properly", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/dust-specials.html",
					"<p>{ spaces }<br>{ more-spaces }</p>"
				);

			});

		});

		describe("Dust.js Variable Tags: {abc}", function() {

			it("should render variable values", function() {

				util.checkHtmlOutput(
					fixtureName,
					"notmd-tests/var-simple.html",
					"<p>Hello world</p>"
				);

			});

		});

	});

	describe("Without using any special markup", function() {

		describe("Dust.js Comment Tags: {! abc !}", function() {

			it("should hide single-line comments", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/comments.html",
					"<p>Hello world</p>"
				);

			});

			it("should hide multi-line comments", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/comments-multi-line.html",
					"<p>Hello world</p>"
				);

			});

		});

		describe("Dust.js Exists Tags: {?abc}", function() {

			it("should render when the value exists", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/exists.html",
					"<p>it exists</p>"
				);

			});

			it("should show the else value when the value does not exist", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/exists-else.html",
					"not"
				);

			});

		});

		describe("Dust.js Filter Expressions: {xxx|abc}", function() {

			it("should render filtered variables", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/var-simple-with-filter.html",
					"<p>Hello WORLD</p>"
				);

			});

		});

		describe("Dust.js Helper Tags: {@abc}", function() {

			it("should properly render the hhtml helper", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/helper-hhtml.html",
					"<p>Hello <span>WORLD</span></p>"
				);

			});
			it("should properly render the nphtml helper", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/helper-nphtml.html",
					"<p>Hello <span>world</span></p>"
				);

			});

		});

		describe("Dust.js In-Line Partial Tags: {+abc}", function() {

			it("should render as blank when not given a value or default", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/inline-partial-no-val.html",
					"<p>Hello </p>"
				);

			});

			it("should render the default when not given a value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/inline-partial-def-val.html",
					"<p>Hello default</p>"
				);

			});

			it("should accept override values if it has a default value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/inline-partial-with-val-and-def.html",
					"<p>Hello world</p>"
				);

			});

			it("should accept values if it does not have a default value", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/inline-partial-with-val-no-def.html",
					"<p>Hello world</p>"
				);

			});

		});

		describe("Dust.js Not-Exists Tags: {^abc}", function() {

			it("should render when the value does not exist", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/not-exists.html",
					"not"
				);

			});

			it("should show the else value when the value exists", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/not-exists-else.html",
					"exists"
				);

			});

		});

		describe("Dust.js Partial Tags: {>'abc'/}", function() {

			it("should include HTML partials as expected", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/partial-html-simple.html",
					"<p>Hello <em>world</em></p>"
				);

			});

			it("should include markdown partials as expected", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/partial-md-simple.html",
					"<p>Hello <p><em>world</em></p></p>"
				);

			});

		});

		describe("Dust.js Section Tags: {#abc}", function() {

			it("should render when found/present", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/section-present.html",
					"<p>Hello world</p>"
				);

			});

			it("should not render when missing and no else is provided", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/section-missing-no-else.html",
					"<p>Hello </p>"
				);

			});

			it("should render the else block when value is missing", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/section-missing-with-else.html",
					"<p>Hello mars</p>"
				);

			});

			it("should iterate over arrays", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/section-array.html",
					"<p>Hello world and mars </p>"
				);

			});

			it("should work with objects", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/section-object.html",
					"1 and 2"
				);

			});

		});

		describe("Dust.js Special Tags: {~abc}", function() {

			it.skip("should render properly", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/dust-specials.html",
					"<p>{ spaces }<br>{ more-spaces }</p>"
				);

			});

		});

		describe("Dust.js Variable Tags: {abc}", function() {

			it("should render variable values", function() {

				util.checkHtmlOutput(
					fixtureName,
					"direct-tests/var-simple.html",
					"<p>Hello world</p>"
				);

			});

		});

	});

	describe("HTML Comments", function() {

		it("should be ignored in some operations", function() {

			var fn = "comment-test-one.html";
			//util.debugOutput( fixtureName, fn);
			util.checkHtmlOutput(
				fixtureName, fn, "<p>Lorem Ipsum A</p>\n<!-- Lorem Ipsum B -->\n<p>Lorem Ipsum C</p>"
			);

		});

	});

});
