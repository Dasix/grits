require("../index");

var expect 	= require('chai').expect;
var _ = require("lodash");
var path 	= require("path");
var fslFixturePath 	= path.join( __dirname, "fixtures/file-system-loader" );

describe('File System Loader', function() {

	var fsl;

	beforeEach( function() {
		fsl = new Dasix.grits.FileSystemLoader();
	});

	describe("#_doOneScan", function() {

		it("should return accurate results", function( cb ) {

			fsl._doOneScan( fslFixturePath, "txt" ).then(
				function( res ) {
					expect( res.length ).to.equal( 3 );
					cb();
				}
			);

		});

	});

	describe("#scanForFiles", function() {

		describe("()", function() {

			var execScan = function() {
				return fsl.scanForFiles();
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should contain a single error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should have an accurate error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 1 );
							cb();
						}
					);

				});

			});

		});

		describe("( [] )", function() {

			var execScan = function() {
				return fsl.scanForFiles( [] );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should contain a single error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should have an accurate error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 1 );
							cb();
						}
					);

				});

			});

		});

		describe("( [''] )", function() {

			var execScan = function() {
				return fsl.scanForFiles( [''] );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should contain three warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 3 );
							cb();
						}
					);

				});
				it("should have an accurate warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 3 );
							cb();
						}
					);

				});

			});

		});

		describe("( '/a/missing/dir' )", function() {

			var execScan = function() {
				return fsl.scanForFiles( "/a/missing/dir" );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should contain three warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 3 );
							cb();
						}
					);

				});
				it("should have an accurate warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 3 );
							cb();
						}
					);

				});

			});

		});

		describe("( str )", function() {

			var execScan = function() {
				return fsl.scanForFiles( fslFixturePath );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return accurate extension info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.extensions ).to.be.an("array");
							expect( res.scan.extensions[0] ).to.equal("*");
							expect( res.scan.extensions.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 1 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							//console.log( res.result.files );
							expect( res.result.files.length ).to.equal( 9 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 9 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should contain a single warning message", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should have an accurate warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 1 );
							cb();
						}
					);

				});

			});

		});

		describe("( str, str )", function() {

			var execScan = function() {
				return fsl.scanForFiles( fslFixturePath, "txt" );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return accurate extension info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.extensions ).to.be.an("array");
							expect( res.scan.extensions.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 1 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 3 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 3 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should not contain any warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

		});

		describe("( [ str, str ], str )", function() {

			var execScan = function() {
				var fixPaths = [
					path.join( fslFixturePath, "subdir-1" ),
					path.join( fslFixturePath, "subdir-2" )
				]
				return fsl.scanForFiles( fixPaths, "txt" );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 2 );
							cb();
						}
					);

				});
				it("should return accurate extension info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.extensions ).to.be.an("array");
							expect( res.scan.extensions.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 2 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 2 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 2 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should not contain any warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

		});

		describe("( str, [ str, str ] )", function() {

			var execScan = function() {
				return fsl.scanForFiles( fslFixturePath, [ "txt", "md" ] );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 1 );
							cb();
						}
					);

				});
				it("should return accurate extension info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.extensions ).to.be.an("array");
							expect( res.scan.extensions.length ).to.equal( 2 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 2 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 6 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 6 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should not contain any warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

		});

		describe("( [ str, str ], [ str, str ] )", function() {

			var execScan = function() {
				var fixPaths = [
					path.join( fslFixturePath, "subdir-1" ),
					path.join( fslFixturePath, "subdir-2" )
				]
				return fsl.scanForFiles( fixPaths, [ "txt", "md" ] );
			};

			describe("=> result.scan", function() {

				it("should return accurate path info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.paths ).to.be.an("array");
							expect( res.scan.paths.length ).to.equal( 2 );
							cb();
						}
					);

				});
				it("should return accurate extension info", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.extensions ).to.be.an("array");
							expect( res.scan.extensions.length ).to.equal( 2 );
							cb();
						}
					);

				});
				it("should return an accurate scan count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.scan.count ).to.equal( 4 );
							cb();
						}
					);

				});

			});

			describe("=> result.result", function() {

				it("should return accurate results", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.files.length ).to.equal( 4 );
							cb();
						}
					);

				});
				it("should return an accurate result count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.result.count ).to.equal( 4 );
							cb();
						}
					);

				});

			});

			describe("=> result.error", function() {

				it("should not contain any error messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.messages ).to.be.an("array");
							expect( res.error.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero error count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.error.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

			describe("=> result.warning", function() {

				it("should not contain any warning messages", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.messages ).to.be.an("array");
							expect( res.warning.messages.length ).to.equal( 0 );
							cb();
						}
					);

				});
				it("should have a zero warning count", function( cb ) {

					execScan().then(
						function( res ) {
							expect( res.warning.count ).to.equal( 0 );
							cb();
						}
					);

				});

			});

		});

		describe("Return Testing", function() {

			var execScan = function() {
				return fsl.scanForFiles( fslFixturePath, ["txt", "md"] );
			};

			describe("=> result.files", function() {

				it(	"should be an array of `Dasix.grits.File` objects", function( cb ) {

					execScan().then(
						function( res ) {

							var a = res.result.files[0];
							expect( a.getAbsoluteFilePath ).to.be.a("function");
							cb();

						}
					);

				});

			});

		});

	});

});
