/**
 * This class handles complex filesystem operations for the DustJS renderer.
 *
 * @class Dasix.grits.FileSystemLoader
 * @extends qx.core.Object
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

require("./file");

var qx = require( "qooxdoo" );
var vError = require( "verror" );
var Promise = require( "bluebird" );
var _ = require( "lodash" );
var scan = require( "sugar-glob" );
var fs = require( "fs" );
var mkdirp = require( "mkdirp" );
var pth = require( "path" );
var tipe = require( "tipe" );

// Create the base renderer class
qx.Class.define(
	"Dasix.grits.FileSystemLoader", {

		include : [Dasix.grits.Loggable],
		extend : qx.core.Object,

		/**
		 * @constructs Dasix.grits.FileSystemLoader
		 */
		construct : function() {

			var me = this;


		},

		properties : {},

		members : /** @lends Dasix.grits.FileSystemLoader **/ {

			/**
			 * Scans all resource paths and returns a list
			 * of the files that were found.
			 *
			 * @access private
			 * @returns {Promise}
			 */
			_old_scan : function() {

				var me = this;
				var paths = me.cfg.paths;
				var ret = {};

				return me.scanForFiles( paths.applicationTemplates, "dust" ).then(
					function( res ) {
						ret.applicationTemplates = res;
					}
				).then(
					function() {
						return me.scanForFiles( paths.applicationPartials, "dust" ).bind( me );
					}
				).then(
					function( res ) {
						ret.applicationPartials = res;
					}
				).then(
					function() {
						return me.scanForFiles( paths.applicationHelpers, "js" ).bind( me );
					}
				).then(
					function( res ) {
						ret.applicationHelpers = res;
					}
				).then(
					function() {
						return me.scanForFiles( paths.sharedTemplates, "dust" ).bind( me );
					}
				).then(
					function( res ) {
						ret.sharedTemplates = res;
					}
				).then(
					function() {
						return me.scanForFiles( paths.sharedPartials, "dust" ).bind( me );
					}
				).then(
					function( res ) {
						ret.sharedPartials = res;
					}
				).then(
					function() {
						return me.scanForFiles( paths.sharedHelpers, "js" ).bind( me );
					}
				).then(
					function( res ) {
						ret.sharedHelpers = res;
						return ret;
					}
				);

			},

			/**
			 * Scans a single directory for a particular file extension
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} path An absolute path, or an array of absolute
			 * paths, to scan for file.
			 * @param {string?} fileExtension A file extension, or an array of file extensions,
			 * to scan for in the path.
			 * @returns {Promise}
			 */
			scanForFiles: function( path, fileExtension ) {

				// Locals
				var me = this;
				var promises = [];

				// Initialize Result
				var ret = {
					scan: {
						paths: [],
						extensions: [],
						count: 0
					},
					result: {
						files: [],
						count: 0
					},
					error: {
						count: 0,
						messages: []
					},
					warning: {
						count: 0,
						messages: []
					}
				};

				// Error on missing or invalid path
				if( path === undefined ) {
					ret.error.count++;
					ret.error.messages.push(
						"#scanForFiles requires a scan path as its first parameter, but none was provided; the scan operation was cancelled"
					);
					return Promise.resolve( ret );
				} else if( path === null ) {
					ret.error.count++;
					ret.error.messages.push(
						"#scanForFiles was provided a NULL scan path; the scan operation was cancelled"
					);
					return Promise.resolve( ret );
				} else {

					switch( tipe(path) ) {

						case "array":
							if( path.length === 0 ) {
								ret.error.count++;
								ret.error.messages.push(
									"#scanForFiles an empty array for the scan path; the scan operation was cancelled"
								);
								return Promise.resolve( ret );
							}
							break;

						case "string":
							path = [ path ];
							break;

						default:
							ret.error.count++;
							ret.error.messages.push(
								"#scanForFiles was provided a path parameter of an unknown type (" + tipe( path ) + "); the scan operation was cancelled"
							);
							return Promise.resolve( ret );
							break;


					}

				}

				// Handle missing extension
				if( fileExtension === undefined || fileExtension === null || fileExtension === "" ) {
					fileExtension = "*";
				}

				// Cast extension into an array
				if( tipe( fileExtension ) !== "array" ) {
					fileExtension = [ fileExtension ];
				}

				// Add path(s) and extension(s) to the result
				ret.scan.paths = path;
				ret.scan.extensions = fileExtension;

				// Warn if all files will be returned
				if( fileExtension.length === 1 && fileExtension[0] === "*" ) {
					ret.warning.count++;
					ret.warning.messages.push(
						"No file extension(s) was specified; all files will be returned"
					);
				}

				// Iterate over each path
				_.each( path, function( p ) {

					if( fs.existsSync( p ) ) {

						// Iterate over each file extension
						_.each( fileExtension, function( fe ) {

							// Increment the scan count
							ret.scan.count++;

							// Add the scan to the queue
							try {
								promises.push(
									me._doOneScan( p, fe )
								)
							} catch( e ) {
								ret.error.count++;
								ret.error.messages.push(
									"Scan Operation Error: " + e.message
								);
							}

						});

					} else {

						ret.warning.count++;
						ret.warning.messages.push(
							"The search path '" + path + "' was not found and will not be scanned."
						);

					}


				});

				// Handle the return
				return Promise.all( promises ).then(

					function( allRes ) {
						me.log("fsl.scan", "All complete");

						_.each( _.flatten( allRes ), function( r ) {

							if( !_.endsWith( r.name, "/" ) ) {

								var fObj = new Dasix.grits.File( r.scanPath, r.dir, r.basename );
								ret.result.files.push( fObj );
								ret.result.count++;

							}

						});

						if( ret.result.count === 0 ) {
							ret.warning.count++;
							ret.warning.messages.push("No matching files were found");
						}

						return ret;
					}

				);

			},

			/**
			 * Scans a single directory for a single file extension
			 *
			 * @instance
			 * @access private
			 * @param {string} path
			 * @param {string?} fileExtension
			 * @returns {Promise}
			 */
			_doOneScan : function( path, fileExtension ) {

				var me = this;
				var ret = [];
				var scanName;
				var glob;

				if( path.replace(/\s/ig, '') === "" ) {
					throw new vError("The provided scan path was empty");
				}

				// Normalize the file extension
				fileExtension = me._normalizeExtForGlob( fileExtension );

				// Scan the path
				glob = "**/" + fileExtension;

				// Name this scan
				scanName = path + "/" + glob;

				// Log the operation
				me.log("fsl.scan.start", "- " + scanName + " [START]" );

				// Start the scan
				return new Promise(
					function( resolve, reject ) {

						scan(
							{
								root : path
							}
						).file(
							glob,

							function( file ) {

								// Append return
								me.log("fsl.scan.yield", "- " + scanName + " => " + file.name );
								file.scanPath = path;
								ret.push( file );

							}
						).done(
							function() {
								me.log("fsl.scan.complete", "- " + scanName + " [COMPLETE]" );
								resolve( ret );
							}
						);

					}
				);

			},

			/**
			 * Normalizes a file extension for use in a glob.
			 *
			 * @instance
			 * @access private
			 * @param {string} fileExtension The source file extension
			 * @returns {string} The resulting, normalized, file extension.
			 */
			_normalizeExtForGlob: function( fileExtension ) {

				// Locals
				var me = this;

				// Check for missing/blank file extensions
				if( fileExtension === undefined || fileExtension === null || fileExtension === "" || fileExtension == "*" ) {

					fileExtension = "*";

				} else {

					// Cast to string
					fileExtension = "" + fileExtension;

					// Allow for different formats of the file extension
					// 'js', '.js', and '*.js' will all be allowed
					if( fileExtension.substr( 0, 1 ) === "*" ) {

						// *.js
						// This is ok as-is, do nothing -> *.js

					} else if( fileExtension.substr( 0, 1 ) === "*" ) {

						// .js
						// Add the star -> *.js
						fileExtension = "*" + fileExtension;

					} else {

						// js
						// Add the star and period -> *.js
						fileExtension = "*." + fileExtension;

					}

				}

				return fileExtension;

			}

		}

	}
);
