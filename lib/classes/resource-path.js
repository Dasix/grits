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

			/**
			 * This method provide a convenient way to call many of this
			 * objects configuration methods will a single call.  This method
			 * should always be called when creating a resource path object.
			 *
			 * @instance
			 * @access public
			 * @param {Dasix.grits.ResourcePathManager} manager The parent resource path manager for this RP.
			 * @param {Dasix.grits.ResourcePathCollection} collection The parent resource path collection for this RP.
			 * @param {string|object} newPath The string path, or a configuration object containing, AT LEAST, a `.path` property.
			 * @param {object} [pathConfig] Optional path configuration (metadata) for the path.  If
			 * `newPath` is also an object, it will win any conflicts with this parameter.
			 * @returns {void}
			 */
			configure: function( manager, collection, newPath, pathConfig ) {

				var me = this;

				// Handle 'pathConfig' param
				if( pathConfig === undefined || pathConfig === null || tipe( pathConfig ) !== "object" ) {
					pathConfig = {};
				}

				// Update the log topic
				me.$$logTopic += "." + collection.getName();

				// Store references
				me.setPathManager( manager );
				me.setPathCollection( collection );

				// Update the path
				me.setPath( newPath, pathConfig );

			},

			/**
			 * Clears the absolute path for this resource path.
			 * Note: Path config/metadata will not be cleared by this method.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearPath: function() {
				this.setAbsolutePath( null );
			},

			/**
			 * Sets the path for this rp object.  This method is called automatically
			 * by `configure()` but it may be called independently and as many times
			 * as necessary.
			 *
			 * @instance
			 * @access public
			 * @param {string|object} newPath The path to set.  This can either be a
			 * string, which will be passed to `setAbsolutePath()`, or it can be an
			 * object that has AT LEAST a `.path` property, which will be passed to
			 * `_setConfig()`.
			 * @param {object} [config] Extra config/metadata for the path being added.
			 * @returns {void}
			 */
			setPath: function( newPath, config ) {

				// Locals
				var me = this;

				// If provided and valid, we will pass the 'config' information to
				// `_setConfig`.  If `newPath` is also an object then it will
				// win any conflicts it has with 'config'.
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

			/**
			 * This method is automatically attached to `setAbsolutePath()`
			 * by Qooxdoo.  It tries to ensure that paths passed in are valid
			 * and properly formatted.
			 *
			 * @instance
			 * @access private
			 * @param {string} strPath The new path
			 * @returns {string}
			 */
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

				// Clean the path
				var clean = me._cleanPath( strPath );

				// Finished
				return clean;


			},

			/**
			 * Cleans/normalizes the file path.  If a relative path is provided
			 * then it will be resolved to CWD, unless explicitly told not to via
			 * `resolve = false`.
			 *
			 * @instance
			 * @access pviate
			 * @param {string} strPath The raw path
			 * @param {boolean} [resolve=true] If TRUE (default) then relative paths
			 * will be resolved to CWD; if FALSE then relative paths will not be
			 * resolved and will be left untouched.
			 * @returns {string} The clean and resolved path
			 */
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

				// Trim whitespace
				strPath = strPath.trim();

				// Finished
				return strPath;

			},

			/**
			 * Clears the config (metadata) for this path.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearConfig: function() {

				var me = this;
				me.setConfig({});

			},

			/**
			 * Updates the config (metadata) for this resource path.  Unlike
			 * `setConfig()`, this method does NOT overwrite the current config.
			 * Instead, each property from the `objConfig` parameter is passed
			 * to `_setConfigVar()`.
			 *
			 * @instance
			 * @access private
			 * @param {object} objConfig New configuration info
			 * @returns {void}
			 */
			_setConfig: function( objConfig ) {

				var me = this;

				_.each( objConfig, function( v, k ) {
					me._setConfigVar( k, v );
				});

			},

			/**
			 * Sets a single property in the resource path's configuration (metadata)
			 *
			 * @instance
			 * @access private
			 * @param {string} key The config property to set
			 * @param {*} val The new value
			 */
			_setConfigVar: function( key, val ) {

				var me = this;
				var conf = me.getConfig();

				key = key.toLowerCase();

				if( conf === null ) {
					conf = {};
				}

				switch( key ) {

					// The .path property is stored in its own variable
					case "path":
						me.setAbsolutePath( val );
						return;

					// Any 'target' property will be cleaned
					// (but not resolved, relative paths are kept)
					case "target":
						val = me._cleanPath( val, false );
						break;

				}

				// Save the value
				conf[key] = val;

			},

			/**
			 * This is a convenience alias for `getAbsolutePath()`.
			 *
			 * @returns {string}
			 */
			getPath: function() {
				return this.getAbsolutePath();
			},

			/**
			 * Converts an absolute path into a {@link Dasix.grits.File} object,
			 * if the file exists within this resource path.  If the absolute
			 * path is not within this resource path, then NULL is returned.
			 *
			 * @instance
			 * @access public
			 * @param {string} absolutePath
			 * @returns {Dasix.grits.File|null}
			 */
			resolveFileObject: function( absolutePath ) {

				// Locals
				var me = this;
				var baseName 		= pth.basename( absolutePath );
				var dirName 		= pth.dirname( absolutePath );
				var resourcePath 	= me.getAbsolutePath();

				if( _.startsWith( dirName, resourcePath ) ) {

					var rplen = resourcePath.length;
					var relPath = dirName.substr( (rplen+1) );
					var fObj = new Dasix.grits.File(
						resourcePath,
						relPath,
						baseName
					);
					fObj.setResourcePath( me );
					return fObj;

				} else {
					return null;
				}


			},

			/**
			 * Returns the 'scan extensions' configuration from the
			 * parent {@link Dasix.grits.ResourcePathCollection}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ResourcePathCollection#getScanExtensions
			 * @param {object} [opts={}]
			 * @param {?string[]|string} [opts.extensions] Provides an opportunity to
			 * override the stored scan extensions.
			 * @returns {string[]}
			 */
			getScanExtensions: function( opts ) {

				// Locals
				var me = this;
				var scanExtensions;

				// Default opts
				if( opts === undefined || opts === null || tipe(opts) !== "object" ) {
					opts = {};
				}

				// Allows extensions to be overridden
				if( opts.extensions === undefined ) {
					scanExtensions 	= me.getPathCollection().getScanExtensions();
				} else {
					scanExtensions 	= opts.extensions;
				}

				// Within the scanning context, a NULL
				// scan extension list means "ALL FILES",
				// which needs to be represented using a wildcard.
				if( scanExtensions === null ) {
					scanExtensions = [ "*" ];
				}

				// Ensure the return is an array
				if( tipe( scanExtensions ) !== "array" ) {
					return [ scanExtensions ];
				} else {
					return scanExtensions;
				}


			},

			/**
			 * Gets information about scanning this resource path.
			 *
			 * @instance
			 * @access public
			 * @param opts
			 * @returns {object[]}
			 */
			resolveScanSettings: function( opts ) {

				// Locals
				var me 				= this;
				var absolutePath 	= me.getAbsolutePath();
				var fsl				= new Dasix.grits.FileSystemLoader();
				var ret 			= [];
				var scanExtensions;

				// Default opts
				if( opts === undefined || opts === null ) {
					opts = {};
				}

				// Get scan extensions
				scanExtensions = me.getScanExtensions( opts );

				// Build return
				_.each( scanExtensions, function( ext ) {

					ret.push({
						extension: ext,
						path: absolutePath,
						glob: fsl.getScanGlob( ext )
					})

				});

				// Finished
				return ret;


			},

			/**
			 * Scans the resource path for resources.
			 * - Pass a `string[]` as opts.extensions to override the scan extensions
			 * - Pass NULL as opts.extensions to scan for ALL extensions
			 *
			 * @instance
			 * @access public
			 * @param {object} [opts] Additional scan options.
			 * @returns {Promise}
			 */
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

				// Get scan extensions
				scanExtensions = this.getScanExtensions( opts );

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
											fObj.setResourcePath( me );

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

			}



		}

	}
);
