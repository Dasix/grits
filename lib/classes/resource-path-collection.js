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

			clearPaths: function() {

				// Locals
				var me = this;

				// Init/clear the path array
				me.setPaths( [] );

			},

			/**
			 * Adds a path to this collection
			 *
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'root' path configuration.
			 * @returns {void}
			 */
			addPath: function( newPath ) {

				// Locals
				var me = this;

				// Handle arrays
				if( tipe( newPath ) === "array" ) {
					_.each( newPath, function( p ) {
						me.addPath( p );
					});
					return;
				}

				// Create a new path
				var rp = me._createPathObject( newPath );

				// Add the path to the internal collection object
				me._addPathObject( rp );

			},

			_addPathObject: function( resourcePath ) {

				var me = this;

				if( !me.hasPath( resourcePath.getAbsolutePath() ) ) {
					me.$$user_paths.push( resourcePath );
					me._sortPaths();
				}

			},

			_sortPaths: function() {

				var me = this;
				me.$$user_paths = _.sortBy( me.$$user_paths, function( item ) {
					return item.getAbsolutePath();
				});

			},

			_createPathObject: function( newPath ) {

				// Locals
				var me = this;

				// Create a new path
				var rp = new Dasix.grits.ResourcePath( me.getGrits() );

				// Pass some references and config data
				rp.configure( me.getPathManager(), me, newPath );

				// Finished
				return rp;

			},

			normalizePath: function( path ) {

				// Locals
				var me = this;

				// We use a ResourcePath object for normalization
				// (sloppy, I know, but I will fix it later)
				var rp = me._createPathObject( path );

				// Done
				return rp.getAbsolutePath();

			},

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
