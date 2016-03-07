/**
 * This class represents a resource path collection.
 *
 * @class Dasix.grits.ResourcePathCollection
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

require("./resource-path");

// Create the base renderer class
qx.Class.define(
	"Dasix.grits.ResourcePathCollection", {

		extend : Dasix.grits.AbsRenderExtension,

		properties : {

			/**
			 * @var {string} Dasix.grits.ResourcePathCollection.name The collection name
			 * @instance
			 * @getter getName
			 * @mutator setName
			 */
			name : {
				init  : null,
				check: "String"
			},

			/**
			 * @var {object} Dasix.grits.ResourcePathCollection.config Configuration and meta for this collection
			 * @instance
			 * @getter getConfig
			 * @mutator setConfig
			 */
			config : {
				init  : {}
			},

			/**
			 * @var {Dasix.grits.ResourcePathManager} Dasix.grits.HasPathConfig.pathManager The path manager parent of this collection
			 * @instance
			 * @getter getPathManager
			 * @mutator setPathManager
			 */
			pathManager : {
				init  : null
			},

			/**
			 * @var {Dasix.grits.ResourcePath[]} Dasix.grits.HasPathConfig.paths Paths within the collection (the path store)
			 * @instance
			 * @getter getPathManager
			 * @mutator setPathManager
			 */
			paths : {
				init  : null
			}

		},

		members : /** @lends Dasix.grits.ResourcePathCollection **/ {

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
				me.setLogTopic("path.collection");

				// Clear the paths
				me.clearPaths();

			},

			/**
			 * Sets the basic config settings for this collection.
			 *
			 * @param {string} name
			 * @param {object} cfg
			 */
			configure: function( pm, name, cfg ) {

				// Locals
				var me = this;

				// Update the log topic
				me.$$logTopic += "." + name;

				// Sync cfg with name
				cfg.short = name;

				// Apply property values
				me.setPathManager( pm );
				me.setName( name );
				me.setConfig( cfg );

				// Clear the paths
				me.clearPaths();

			},

			/**
			 * Returns the scan extensions for this path collection.
			 * (This will be an array of file extensions or NULL for all files)
			 *
			 * @instance
			 * @access public
			 * @returns {null|string[]}
			 */
			getScanExtensions: function() {

				// Locals
				var me = this;
				var cfg = me.getConfig();

				// Check other types
				switch( tipe( cfg.scanExtensions ) ) {

					case "array":
						if( cfg.scanExtensions.length === 0 ) {
							return null;
						} else {
							return cfg.scanExtensions;
						}

					case "string":
						return [ cfg.scanExtensions ];

					default:
						return null;

				}

			},

			/**
			 * Clears all paths from this collection. By default, this method
			 * will not remove any paths that belong to 'plugins' unless `force`
			 * is passed as `TRUE`.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} force When TRUE, forces ALL paths to be removed, even plugin paths.
			 * @returns {void}
			 */
			clearPaths: function( force ) {

				// Locals
				var me = this;
				var newPaths = [];

				// Default force param
				if( force === undefined || force === null || force !== true ) {
					force = false;
				}

				// Init/clear the path array
				if( !force ) {
					me.log("Clearing all '" + me.getName() + "' resource paths (excluding plugin paths)");
					_.each( me.getPaths(), function( path ) {

						var cfg = path.getConfig();
						if( cfg.plugin !== undefined && cfg.plugin !== null && tipe( cfg.plugin ) === "string" && cfg.plugin.replace(/\s/g, '') !== "" ) {
							newPaths.push( path );
						}

					});
				} else {
					me.log("Clearing ALL '" + me.getName() + "' resource paths (including plugin paths)");
				}

				// Save the new paths
				me.setPaths( newPaths );


			},

			/**
			 * Removes all paths from all collections that belong the specified plugin.
			 * This will be called automatically whenever a plugin is 'detached' (removed).
			 *
			 * @instance
			 * @access public
			 * @param {string} pluginName The plugin that paths should be removed for
			 * @returns {void}
			 */
			clearPluginPaths: function( pluginName ) {

				// Locals
				var me = this;
				var newPaths = [];
				pluginName = pluginName.toLowerCase();

				// Iterate over each collection
				_.each( me.getPaths(), function( path ) {

					var cfg = path.getConfig();
					if( cfg.plugin === undefined || cfg.plugin === null || tipe( cfg.plugin ) !== "string" || cfg.plugin.toLowerCase() !== pluginName ) {
						newPaths.push( path );
					}

				});

				// Save the new paths
				me.setPaths( newPaths );

			},

			/**
			 * Adds one or more paths to this collection.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]|object|object[]} newPath The new path,
			 * or an array of paths, to add to the collection.  Configuration objects
			 * are also accepted but each must, at least, contain a `.path` property.
			 * @param {object} [pathConfig] Optional path configuration (metadata) for each path.  If
			 * `newPath` is also an object, it will win any conflicts with this parameter.
			 * This parameter is especially useful for providing metadata that should be
			 * applied to all paths, when more than one is provided.
			 * @returns {void}
			 */
			addPath: function( newPath, pathConfig ) {

				// Locals
				var me = this;

				// Default 'pathConfig'
				if( pathConfig === null || pathConfig === null || tipe( pathConfig ) !== "object" ) {
					pathConfig = {};
				}

				// If an array is given then we will simply
				// call 'addPath' for each element.
				if( tipe( newPath ) === "array" ) {
					_.each( newPath, function( p ) {
						me.addPath( p, pathConfig );
					});
					return;
				}

				// Create a new path
				var rp = me._createPathObject( newPath, pathConfig );

				// Add the path to the internal collection object
				me._addPathObject( rp );

			},

			/**
			 * Adds a {@link Dasix.grits.ResourcePath} object to this collection,
			 * if it does not already exist.  This method should not be called
			 * directly; use `addPath()` instead.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.ResourcePath} resourcePath The path to add
			 * @returns {void}
			 */
			_addPathObject: function( resourcePath ) {

				var me = this;

				if( !me.hasPath( resourcePath.getAbsolutePath() ) ) {
					me.$$user_paths.push( resourcePath );
					me._sortPaths();
				}

			},

			/**
			 * Sorts the paths in the collection by their string path.  This
			 * method should not need to be called directly because it is called,
			 * automatically, by `_addPathObject` each time a new path is added.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_sortPaths: function() {

				var me = this;
				me.$$user_paths = _.sortBy( me.$$user_paths, function( item ) {
					return item.getAbsolutePath();
				});

			},

			/**
			 * Creates a new {@Dasix.grits.ResourcePath} object. This method should
			 * not be called directly; use `addPath` instead.
			 *
			 * @instance
			 * @access private
			 * @param {string|object} newPath The string path, or a configuration object containing, AT LEAST, a `.path` property.
			 * @param {object} [pathConfig] Optional path configuration (metadata) for the path.  If
			 * `newPath` is also an object, it will win any conflicts with this parameter.
			 * @returns {Dasix.grits.ResourcePath}
			 */
			_createPathObject: function( newPath, pathConfig ) {

				// Locals
				var me = this;

				// Default 'pathConfig'
				if( pathConfig === undefined || pathConfig === null || tipe( pathConfig ) !== "object" ) {
					pathConfig = {};
				}

				// Create a new path
				var rp = new Dasix.grits.ResourcePath( me.getGrits() );

				// Pass some references and config data
				rp.configure( me.getPathManager(), me, newPath, pathConfig );

				// Finished
				return rp;

			},

			/**
			 * Normalizes/cleans a provided path.  Although a ResourcePath
			 * object can be passed in, a string will always be returned.
			 *
			 * @instance
			 * @access public
			 * @param {string|Dasix.grits.ResourcePath} path
			 * @returns {string}
			 */
			normalizePath: function( path ) {

				// Locals
				var me = this;

				// We use a ResourcePath object for normalization
				// (sloppy, I know, but I will fix it later)
				var rp = me._createPathObject( path );

				// Done
				return rp.getAbsolutePath();

			},

			/**
			 * Checks to see if a path is in this collection.
			 *
			 * @instance
			 * @access public
			 * @param {string} checkPath The path to check for.
			 * @returns {boolean} TRUE if the path is in the collection; FALSE otherwise.
			 */
			hasPath: function( checkPath ) {

				var me = this;
				var path = me.normalizePath( checkPath );
				var ret = false;

				// Build the array
				_.each( me.getPaths(), function( rp ) {
					if( path === rp.getAbsolutePath() ) {
						ret = true;
					}
				});

				return ret;

			},

			/**
			 * Returns the actual, string, path from all resource paths in this collection.
			 * By default, these paths will be returned as an array (e.g. `[ '/a/path' ]`)
			 * unless `returnAsObject = true`, in which case an object will be returned
			 * instead (e.g. `{ '/a/path': '/a/path' }`).
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] See method description for details
			 * @returns {string[]|object}
			 */
			getAbsolutePaths: function( returnAsObject ) {

				// Locals
				var me = this;
				var arr = [];
				var ret;

				// Parse returnAsObject param
				if( returnAsObject === undefined || returnAsObject === null || returnAsObject !== true ) {
					returnAsObject = false;
				}

				// Build the array
				_.each( me.getPaths(), function( rp ) {
					arr.push( rp.getAbsolutePath() );
				});

				// Convert to object, if desired
				if( returnAsObject ) {
					ret = {};
					_.each( arr, function( path ) {
						ret[path] = path;
					});
				} else {
					ret = arr;
				}

				return ret;

			},

			/**
			 * Returns the first resource path stored in this collection or
			 * NULL if the collection is empty.
			 *
			 * @instance
			 * @access public
			 * @returns {Dasix.grits.ResourcePath|null} The first resource path stored in this collection or
			 * NULL if the collection is empty.
			 */
			getFirstPath: function() {

				// Locals
				var me = this;
				var paths = me.getPaths();

				if( paths[0] === undefined || tipe( paths[0] ) !== "object" ) {
					return null;
				} else {
					return paths[0];
				}

			},

			/**
			 * Returns the number of resource paths in this collection.
			 *
			 * @instance
			 * @access public
			 * @returns {Number}
			 */
			getPathCount: function() {

				// Locals
				var me = this;
				var paths = me.getPaths();

				if( tipe( paths ) === "array" ) {
					return paths.length;
				} else {
					return 0;
				}

			},

			/**
			 * Scans all resource paths in this collection for resources.
			 *
			 * @instance
			 * @access public
			 * @param {object} [opts] Additional options to pass to {@link Dasix.grits.ResourcePathCollection}
			 * @returns {Promise}
			 */
			scan: function( opts ) {

				// Locals
				var me = this;
				var paths = me.getPaths();
				var scanPromises = [];

				// Initialize Result
				var finalScanReturn = {
					scan: {
						paths: [],
						count: 0
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

				// Scan each path
				_.each( paths, function( path ) {

					var pathPromise = path.scan( opts );
					scanPromises.push( pathPromise );

				});

				// Return
				return Promise.all( scanPromises ).then(
					function( allResults ) {

						_.each( allResults, function( onePathResult ) {

							// Append .scan section
							var scanPath = onePathResult.scan.path;
							finalScanReturn.scan.paths[ scanPath ] = onePathResult; //.scan; <-- undecided
							finalScanReturn.scan.count += onePathResult.scan.count;

							// Aggregate Errors
							_.each( onePathResult.error.messages, function( errMessage ) {
								finalScanReturn.error.messages.push(
									scanPath + ": " + errMessage
								);
								finalScanReturn.error.count++;
							});

							// Aggregate Warnings
							_.each( onePathResult.warning.messages, function( wrnMessage ) {
								finalScanReturn.warning.messages.push(
									scanPath + ": " + wrnMessage
								);
								finalScanReturn.warning.count++;
							});

							// Aggregate File Results
							_.each( onePathResult.result.files, function( oneMatch, absPath ) {

								var matchDetails = {
									extensionMatches: oneMatch.extensionMatches,
									scan: onePathResult.scan
								};

								if( finalScanReturn.result.files[absPath] === undefined ) {
									finalScanReturn.result.files[absPath] = {
										absolutePath: absPath,
										fileObject: oneMatch.fileObject,
										matches: [ matchDetails ]
									};
									finalScanReturn.result.count++;
								} else {
									finalScanReturn.result.files[absPath].matches.push( matchDetails );
								}

							});

						});

						return finalScanReturn;

					}
				);

			},

			/**
			 * Scans all paths in the collection then iterates over each
			 * resulting resource file.
			 *
			 * @param {function} fn The iterator function
			 * @param {object} [opts={}] Scan options, will be passed to `#scan`
			 * @returns {Promise|object[]} The return of this method will depend
			 * on the return of the iterators.  If any iterator return is a promise,
			 * then this method will return a promise.  Otherwise, it will return
			 * an array of detailed match results.
			 */
			eachResource: function( fn, opts ) {

				// Locals
				var me = this;

				// Default opts
				if( opts === undefined || opts === null || tipe( opts ) !== "object" ) {
					opts = {};
				}

				// Scan for content
				return me.scan( opts ).then(

					function onResourcesScanned ( result ) {

						var allFiles = result.result.files;

						var returnedPromises = [];

						_.each( allFiles, function eachResourceWrapperFn( detailedFileResult ) {

							var res = fn( detailedFileResult.fileObject, detailedFileResult, allFiles, me );

							if( Promise.is( res ) ) {
								returnedPromises.push( res );
							}

						});

						if( returnedPromises.length === 0 ) {
							return allFiles;
						} else {
							return Promise.all( returnedPromises );
						}

					}

				);

			}

		}



	}
);
