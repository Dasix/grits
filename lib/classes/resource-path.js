/**
 * This class represents a resource path.
 *
 * @class Dasix.grits.ResourcePath
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require( "qooxdoo" );
var vError = require( "verror" );
var Promise = require( "bluebird" );
var _ = require( "lodash" );
var pth = require( "path" );
var tipe = require( "tipe" );
var mkdirp = require( "mkdirp" );
var fs = require( "fs" );

require("./file-system-loader");

// Create the base renderer class
qx.Class.define(
	"Dasix.grits.ResourcePath", {

		extend : Dasix.grits.AbsRenderExtension,

		properties : {

			/**
			 * @var {string} Dasix.grits.ResourcePath.abs The absolute resource path
			 * @instance
			 * @getter getAbsolutePath
			 * @mutator setAbsolutePath
			 */
			absolutePath : {
				init  : null,
				transform: "_transformAbsPath"
			},

			/**
			 * @var {string} Dasix.grits.ResourcePath.config The resource path configuration
			 * @instance
			 * @getter getConfig
			 * @mutator setConfig
			 */
			config : {
				init  : null
			},

			/**
			 * @var {Dasix.grits.ResourcePathCollection} Dasix.grits.ResourcePath.pathCollection The collection to which this
			 * resource path object belongs.
			 * @instance
			 * @getter getPathCollection
			 * @mutator setPathCollection
			 */
			pathCollection : {
				init  : null
			},

			/**
			 * @var {Dasix.grits.ResourcePathManager} Dasix.grits.ResourcePath.pathManager The manager for this resource path.
			 * @instance
			 * @getter getPathManager
			 * @mutator setPathManager
			 */
			pathManager : {
				init  : null
			}

		},

		members : /** @lends Dasix.grits.ResourcePath **/ {

			/**
			 * This method is automatically called on all children
			 * of {@link Dasix.grits.AbsRenderExtension}, if it exists.
			 *
			 * @instance
			 * @access public
			 */
			init: function() {

				// Locals
				var me = this;

				// Set the log topic for this extension
				me.setLogTopic("path.object");

				// Clear the path config
				me.clearConfig();

			},

			configure: function( manager, collection, newPath ) {

				var me = this;
				me.setPathManager( manager );
				me.setPathCollection( collection );
				me.setPath( newPath );

			},

			clearPath: function() {
				this.setAbsolutePath( null );
			},

			setPath: function( newPath, config ) {

				var me = this;

				if( config !== undefined && config !== null && tipe(config) === "object" ) {
					me._setConfig( config );
				}

				switch( tipe( newPath ) ) {

					case "object":
						me._setConfig( newPath );
						break;

					case "string":
						me.setAbsolutePath( newPath );
						break;

				}

			},

			_transformAbsPath: function( strPath ) {

				// Locals
				var me = this;

				// NULL should be taken literally
				if( strPath === undefined || strPath === null ) {
					return null;
				}

				// Check for the 'target' designator (->)
				if( strPath.indexOf("->") !== -1 ) {
					var spl = strPath.split("->");
					me._setConfigVar( "target", spl[1] );
					strPath = spl[0];
				}

				// Finished
				return me._cleanPath( strPath );


			},

			_cleanPath: function( strPath, resolve ) {

				// Locals
				var me = this;

				// Default resolve param
				if( resolve === undefined || resolve === null || resolve !== false ) {
					resolve = true;
				}

				// Remove redundant separators and convert
				strPath = strPath.replace(/(\\|\/)+/g, pth.sep);

				// Resolve to CWD
				if( resolve === true ) {
					strPath = pth.resolve( process.cwd(), strPath );
				}

				// Normalize
				strPath = pth.normalize( strPath );

				// Trim trailing /'s
				if( _.endsWith( strPath, pth.sep ) ) {
					strPath = strPath.substr(0, (strPath.length - 1));
				}

				// Finished
				return strPath;

			},

			clearConfig: function() {

				var me = this;
				me.setConfig({});

			},

			_setConfig: function( objConfig ) {

				var me = this;

				_.each( objConfig, function( v, k ) {
					me._setConfigVar( k, v );
				});

			},

			_setConfigVar: function( key, val ) {

				var me = this;
				var conf = me.getConfig();

				key = key.toLowerCase();

				if( conf === null ) {
					conf = {};
				}

				switch( key ) {

					case "path":
						me.setAbsolutePath( val );
						return;

					case "target":
						val = me._cleanPath( val, false );
						break;

				}

				conf[key] = val;

			},

			getPath: function() {
				return this.getAbsolutePath();
			},

			getScanExtensions: function() {

				// Locals
				var me = this;
				var col = me.getPathCollection();
				return col.getScanExtensions();

			},

			scan: function( opts ) {

				// Locals
				var me 				= this;
				var absolutePath 	= me.getAbsolutePath();
				var fsl				= new Dasix.grits.FileSystemLoader();
				var promises		= [];
				var scanExtensions;

				// Default opts
				if( opts === undefined || opts === null ) {
					opts = {};
				}

				// Allows extensions to be overridden
				if( opts.extensions === undefined ) {
					scanExtensions 	= me.getScanExtensions();
				} else {
					scanExtensions 	= opts.extensions;
				}

				// Within the scanning context, a NULL
				// scan extension list means "ALL FILES",
				// which needs to be represented using a wildcard.
				if( scanExtensions === null ) {
					scanExtensions = [ "*" ];
				}

				// Initialize Result
				var finalScanReturn = {
					scan: {
						path: absolutePath,
						resourcePath: me,
						extensions: scanExtensions,
						count: scanExtensions.length
					},
					result: {
						files: {},
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

				// Warn if all files will be returned
				if( scanExtensions.length === 1 && scanExtensions[0] === "*" ) {
					finalScanReturn.warning.count++;
					finalScanReturn.warning.messages.push(
						"No file extension(s) was specified; all files will be returned"
					);
				}

				// Check to see if the search path exists
				if( fs.existsSync( absolutePath ) ) {

					// Iterate over each file extension
					_.each( scanExtensions, function( extension ) {

						// Add the scan to the queue
						try {

							var extScanPromise = fsl._doOneScan( absolutePath, extension ).then(

								function onOneExtScanComplete( result ) {

									var extReturn = {
										extension: extension,
										count: 0,
										files: []
									};

									// Remove directories and convert the results
									// into Dasix.grits.File objects
									_.each( result, function( oneRes ) {

										if( !_.endsWith( oneRes.name, "/" ) ) {

											var fObj = new Dasix.grits.File(
												oneRes.scanPath,
												oneRes.dir,
												oneRes.basename
											);

											extReturn.files.push( fObj );
											extReturn.count++;

										}

									});

									// Finished
									return extReturn;

								}

							);
							promises.push( extScanPromise );

						} catch( e ) {

							finalScanReturn.error.count++;
							finalScanReturn.error.messages.push(
								"Scan Operation Error (ext: " + extension + "): " + e.message
							);

						}

					});

				} else {

					finalScanReturn.warning.count++;
					finalScanReturn.warning.messages.push(
						"The search path '" + absolutePath + "' was not found and will not be scanned."
					);

				}

				// Handle the return
				return Promise.all( promises ).then(

					function onAllScansComplete( allRes ) {

						_.each( allRes, function( oneExtResult ) {

							_.each( oneExtResult.files, function( oneFile ) {

								var abs = oneFile.getAbsoluteFilePath();
								if( finalScanReturn.result.files[ abs ] === undefined ) {
									finalScanReturn.result.files[ abs ] = {
										extensionMatches: [ oneExtResult.extension ],
										fileObject: oneFile
									};
									finalScanReturn.result.count++;
								} else {
									finalScanReturn.result.files[ abs].extensionMatches.push( oneExtResult.extension );
								}

							});

						});

						if( finalScanReturn.result.count === 0 ) {

							finalScanReturn.warning.count++;
							finalScanReturn.warning.messages.push(
								"No files were matched by the resource path scan"
							);

						}

						return finalScanReturn;

					}

				);

			},

			/**
			 * Scans
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} path An absolute path, or an array of absolute
			 * paths, to scan for file.
			 * @param {string?} fileExtension A file extension, or an array of file extensions,
			 * to scan for in the path.
			 * @returns {Promise}
			 */
			scanResourceCollection: function( path, fileExtension ) {

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

			}



		}

	}
);
