/**
 * This class is a "renderer extension" that assists in the
 * management of file and directory watching.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.WatchManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.5.6
 * @version 1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 			= require( "qooxdoo" 	);
var marked 		= require( "marked" 	);
var _ 			= require( "lodash" 	);
var Promise 	= require( "bluebird" 	);
var vError 		= require( "verror" 	);
var tipe 		= require( "tipe" 		);
var chokidar 	= require( "chokidar"	);

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.WatchManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.WatchManager **/ {

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
				me.setLogTopic("watch.manager");

				// Init config
				me.$$enabled = false;
				me.$$watching = false;
				me.$$watcher = null;
				me.$$config = {};
				me.$$collections = {};
				me.$$ready = false;
				me.$$indFiles = {};

			},

			/**
			 * Updates the watch configuration.
			 *
			 * @instance
			 * @access public
			 * @param {boolean|object} newConfig Either a boolean to enable or disable
			 * watching or a configuration object for the watcher.
			 * @returns {Object} The watch configuration, after it has been updated.
			 */
			setConfig: function( newConfig ) {

				// Locals
				var me = this;

				// Validate
				if( newConfig === undefined || newConfig === null ) {
					newConfig = {};
				} else if( tipe(newConfig) === "boolean" ) {
					newConfig = { enabled: newConfig };
				} else if( tipe(newConfig) !== "object" ) {
					me.logError( new Error("Invalid configuration passed to the watch manager" ) );
				}

				// Check for enabled param
				if( newConfig.enabled !== undefined ) {
					if( newConfig.enabled === false ) {
						me.setEnabled(false);
					} else {
						me.setEnabled(true);
					}
					delete newConfig.enabled;
				}

				// Store the rest of the config
				_.each( newConfig, function( v, k ) {

					if( v === null ) {
						if( me.$$config[k] !== undefined ) {
							delete me.$$config[k];
						}
					} else {
						me.$$config[k] = v;
					}

				});

				// Return the config
				return me.getConfig();

			},

			/**
			 * Gets the current configuration for the watcher.
			 *
			 * @instance
			 * @access public
			 * @returns {object} The current watch configuration
			 */
			getConfig: function() {
				return this.$$config;
			},

			/**
			 * Enables or disables the watcher.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} enabled TRUE to enable watching; FALSE to disable watching.
			 * @returns {void}
			 */
			setEnabled: function( enabled ) {
				var me = this;
				if( enabled === undefined || enabled === null || enabled !== true ) {
					enabled = false;
				}
				me.$$enabled = enabled;
			},

			/**
			 * Returns whether or not watching is enabled.
			 *
			 * @instance
			 * @access public
			 * @returns {boolean} TRUE if watching is enabled; FALSE otherwise.
			 */
			isEnabled: function() {
				return this.$$enabled;
			},

			// --

			/**
			 * Adds a collection to the watcher and binds a handler to one or
			 * more file extensions.
			 *
			 * @instance
			 * @access public
			 * @param {Dasix.grits.ResourcePathCollection} collection The collection to watch
			 * @param {function} handler The watch notification handler
			 * @param {string|string[]} extensions The file extensions that should trigger the handler
			 * @returns {void}
			 */
			addCollectionWatcher: function( collection, handler, extensions ) {

				var me = this;
				var name = collection.getName();

				// Add the collection
				me._addCollection( name, collection );

				// Default 'extensions'
				if( extensions === undefined || extensions === null ) {
					extensions = collection.getConfig().scanExtensions;
				}

				// Handle null
				if( extensions === null ) {
					extensions = [ "*" ];
				}

				// Ensure all extensions are unique
				extensions = _.uniq( extensions );

				// Set the collection scan extensions
				me._addExtensionsToCollection( name, extensions );

				// Attach an identifier to the handler
				if( handler.handlerId === undefined ) {
					handler.handlerId = name + "." + extensions.join(".");
				}

				// Add the handler
				_.each( extensions, function( ext ) {

					if( me.$$collections[ name ].handlers[ ext ] === undefined ) {
						me.$$collections[ name ].handlers[ ext ] = [];
					}

					me.$$collections[ name ].handlers[ ext ].push( handler );

				});

			},

			/**
			 * Adds a collection to the watcher's internal "collection to watch" list.
			 *
			 * @instance
			 * @access private
			 * @param {string} name The name of the collection
			 * @param {Dasix.grits.ResourcePathCollection} collection The collection itself
			 * @returns {void}
			 */
			_addCollection: function( name, collection ) {

				var me = this;

				if( me.$$collections[ name ] === undefined ) {
					me.$$collections[ name ] = {
						collection: collection,
						handlers: {},
						extensions: []
					};
				}

			},

			/**
			 * Adds one or more extensions to a collection.  These
			 * will be used later on to create the globs.
			 *
			 * @instance
			 * @access public
			 * @param {string} name The collection name
			 * @param {string[]} extensions
			 * @returns {void}
			 */
			_addExtensionsToCollection: function( name, extensions ) {

				// Locals
				var me 			= this;
				var existing 	= me.$$collections[ name].extensions;
				var nue 		= _.flatten( [ existing, extensions ] );
				var all 		= false;

				// Make all extensions unique
				nue = _.uniq( nue );

				// If any extension is *, then we do not need
				// to keep an array of extensions, only the *
				_.each( nue, function( ext ) {
					if( ext === "*" ) {
						all = true;
					}
				});
				if( all ) {
					me.$$collections[ name].extensions = [ "*" ];
				} else {
					me.$$collections[ name].extensions = nue;
				}

			},

			// --

			/**
			 * Starts the watcher, if watching is enabled.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			startWatching: function() {

				// Locals
				var me = this;
				var cfg = me._setConfigDefaults( me.$$config );

				// Exit if disabled or already watching
				if( me.$$enabled !== true || me.$$watching === true) {
					return;
				}

				// Initial log message
				me.logOpStart("Watching for File Updates");

				// Get all globs
				var globs = me._getAllGlobs();

				// Create the watcher
				me.$$watcher = chokidar.watch( globs, cfg );
				me.$$watching = true;

				// Create the event handlers
				me._createWatcherEventHandlers( me.$$watcher );

				// Stay alive
				me.keepAlive();

			},

			/**
			 * Halts the watcher
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			unwatch: function() {

				// Locals
				var me = this;

				// Nothing to stop..
				if( me.$$watching !== true) {
					return;
				}

				// Log it
				me.log("Stopping the file system watcher");

				// Halt the watcher
				me.$$watcher.close();

				// Update state variables
				me.$$ready 		= false;
				me.$$watching 	= false;

				// End keep-alive
				me.endKeepAlive();

			},

			/**
			 * Gets all globs for all collections.
			 *
			 * @instance
			 * @access private
			 * @returns {Array}
			 */
			_getAllGlobs: function() {

				// Locals
				var me = this;
				var globs = [];

				// Iterate over each collection
				_.each( me.$$collections, function( colData, name ) {

					// This allows us to override the file extensions
					// of the globs returned by the collection
					var scanOpts = {
						extensions: colData.extensions
					};

					// Defer to the resource path collection for glob generation
					var cGlobs = colData.collection.resolveScanGlobs( scanOpts );

					// Store them with the others
					globs.push( cGlobs );

				});

				// Add individual files
				var allIndFiles = [];
				_.each( me.$$indFiles, function( indFiles, indType ) {
					_.each( indFiles, function( handler, absPath ) {
						allIndFiles.push( absPath );
					});
				});
				globs.push( allIndFiles );

				// Make the returned globs flat and unique
				globs = _.flatten( globs );
				globs = _.uniq( globs );

				// Finished
				return globs;

			},

			/**
			 * Creates/binds the watcher event handlers.
			 *
			 * @instance
			 * @access private
			 * @param {FSWatcher} watcher
			 * @returns {void}
			 */
			_createWatcherEventHandlers: function( watcher ) {

				// Locals
				var me = this;
				var eventNames = [ "add", "change", "unlink" ]; // others: [ "addDir", "unlinkDir", "error", "ready" ]

				// Add the ready event
				watcher.on("ready", function() {
					me._onWatcherReady();
				});

				_.each( eventNames, function( eventName ) {

					watcher.on( eventName, function( target ) {

						me._onWatchTrigger( eventName, target );

					});

				});

			},

			/**
			 * Fired when the watcher emits a "ready" event.  This event
			 * signals that the files are actively being watched.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_onWatcherReady: function() {

				var me = this;

				// Log it
				me.log( "File system watcher is loaded and ready ..." );

				// Update ready state
				me.$$ready = true;

			},

			/**
			 * This method is called on every watch trigger event.
			 *
			 * @instance
			 * @access public
			 * @param {string} eventName Can be 'add', 'change', or 'unlink'
			 * @param {string} absolutePath The absolute path to the file that triggered the event.
			 */
			_onWatchTrigger: function( eventName, absolutePath ) {

				// Locals
				var me = this;

				// Check for an "individual file trigger"
				if( me._checkForIndHandler( eventName, absolutePath ) === true ) {
					return;
				}

				// We iterate over each collection in our internal
				// list to find which of them have this file within its paths.
				_.each( me.$$collections, function( colData, name ) {

					var collection 	= colData.collection;
					var fileObject 	= collection.resolveFileObject( absolutePath );

					// Collection watch events will only trigger
					// on files that match one or more collections.
					if( fileObject !== null ) {

						// Get the file extensions of the matched file
						var extensions 		= fileObject.getFileExtensions();

						// We're going to look for handlers to call and
						// store them in this object.  We use an object to
						// prevent duplicate calls to the same handler.
						var handlersToCall 	= {};

						// Log the event
						me.log("Collection Watch Event Triggered..");
						me.logObject({
							"Content Type"	: collection.getName(),
							"Event Detail"	: eventName.toUpperCase() + " " + absolutePath
						});

						// Iterate over each of the matched file's extensions
						// (file.md.html is considered two have two extensions: "md" and "html")
						_.each( extensions, function( boolTrue, ext ) {

							// Check to see if we have handlers assigned to this extension
							if( colData.handlers[ext] !== undefined ) {

								// We'll call each handler for this extension
								_.each( colData.handlers[ext], function( hnd ) {
									handlersToCall[ hnd.handlerId ] = hnd;
								});

							}

							// Check to see if we have handlers assigned to "*"
							if( colData.handlers["*"] !== undefined ) {

								// We'll call each handler for "*"
								_.each( colData.handlers["*"], function( hnd ) {
									handlersToCall[ hnd.handlerId ] = hnd;
								});

							}

						});

						// Call each handler found above
						_.each( handlersToCall, function( hnd ) {
							hnd( eventName, fileObject, {
								collection: collection,
								absolutePath: absolutePath
							});
						});

					}

				});

			},

			// -- config defaults

			_setConfigDefaults: function( cfg ) {

				var me = this;
				me._setConfigDefaultVal( cfg, "persistent", true );
				me._setConfigDefaultVal( cfg, "ignoreInitial", true );
				me._setConfigDefaultVal( cfg, "usePolling", true );
				return cfg;

			},

			_setConfigDefaultVal: function( cfg, key, val ) {

				if( cfg[key] === undefined || cfg[key] === null ) {
					cfg[key] = val;
				}

			},


			// --- individual files ---------

			resetIndFiles: function( indType ) {
				var me = this;
				me.$$indFiles[ indType ] = {};
			},

			addIndHandler: function( indType, absolutePath, handler ) {

				var me = this;

				if( me.$$indFiles[ indType ] === undefined ) {
					me.$$indFiles[ indType ] = {};
				}

				me.$$indFiles[ indType ][ absolutePath ] = handler;

				if( me.$$watching ) {
					me.$$watcher.add( absolutePath );
				}

				/*
				console.log("-------------------------------------------xx");
				console.log( me.$$watcher.getWatched() );

				me.$$watcher.add( "/project/test/fixtures/watcher/src/scss/** /*.test1" );
				me.$$watcher.add( "/project/test/fixtures/watcher/src/scss/** /*.test2" );
				me.$$watcher.add( "/project/test/fixtures/watcher/src/scss/** /*.test3" );

				console.log( me.$$watcher.getWatched() );
				console.log("-------------------------------------------xx");
				*/


			},

			_checkForIndHandler: function( eventName, absolutePath ) {

				var me = this;
				var ret = false;

				// Iterate over each individual file TYPE
				_.each( me.$$indFiles, function( indFiles, indType ) {

					// Iterate over each absolute path in the file type
					_.each( indFiles, function( handler, fileAbsPath ) {

						// Compare the paths
						if( fileAbsPath === absolutePath ) {

							// Log it
							me.log("File Watch Event Triggered..");
							me.logObject({
								"Content Type"	: indType,
								"Event Detail"	: eventName.toUpperCase() + " " + absolutePath
							});

							// Call the handler
							handler( eventName, absolutePath );

							// Update the return
							ret = true;

						}

					});

				});

				return ret;

			}


		}

	}

);
