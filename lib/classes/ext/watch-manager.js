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
var chokidar 	= require('chokidar');

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
				me.$$watchers = {};
				me.$$config = {};

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

			addWatchConfig: function( cfg ) {

				// Locals
				var me = this;

				// cfg is required ..
				if( cfg === undefined || cfg === null || tipe(cfg) !== "object" ) {
					me.logError( new Error("Missing or invalid configuration passed to WatchManager.addWatchConfig()") );
				}

				// cfg.handler is required
				if( cfg.handler === undefined || cfg.handler === null || tipe(cfg.handler) !== "function" ) {
					me.logError( new Error("Missing or invalid watch handler (cfg.handler) passed to Watchhandler.addWatchConfig()") );
				}

				// watch a resource collection
				if( cfg.resourceCollection !== undefined && tipe( cfg.resourceCollection ) === "object"
					&& cfg.resourceCollection.classname !== undefined && cfg.resourceCollection.classname === "Dasix.grits.ResourcePathCollection") {
					var rpc = cfg.resourceCollection;
					delete cfg.resourceCollection;
					me._addCollectionWatchConfig( rpc, cfg );
				}

			},

			_addCollectionWatchConfig: function( collection, cfg ) {

				// Locals
				var me = this;
				var scanOpts;

				// Default cfg param
				if( cfg === undefined || tipe(cfg) !== "object" ) {
					cfg = {};
				}

				// Force name
				cfg.name = collection.getName();

				// Store collection
				cfg.collection = collection;

				// Handle cfg extensions
				if( cfg.extensions !== undefined ) {
					scanOpts = {
						extensions: cfg.extensions
					};
					delete cfg.extensions;
				} else {
					scanOpts = {};
				}

				// Find the globs for this resource path collection
				var globs = collection.resolveScanGlobs( scanOpts );

				// Defer to _addGlobConfig
				me.addWatcher( globs, cfg );

			},

			addWatcher: function( globs, cfg ) {

				// Locals
				var me = this;

				// Default cfg param
				if( cfg === undefined || tipe(cfg) !== "object" ) {
					cfg = {};
				}

				// Init object, if needed
				if( me.$$watchers[cfg.name] === undefined ) {
					me.$$watchers[cfg.name] = {
						watching: false,
						ready: false,
						watcher: null,
						cfg: cfg,
						globs: globs
					};
				}

				// Apply config
				me.$$watchers[ cfg.name ].cfg = cfg;
				me.$$watchers[ cfg.name ].globs = globs;

			},

			startWatching: function() {

				// Locals
				var me = this;

				// Exit if disabled
				if( me.$$enabled !== true ) {
					return;
				}

				// Log it
				me.log( "Starting watchers" );

				// Init watchers
				me._initAllWatchers();

			},

			_initAllWatchers: function() {

				// Locals
				var me = this;

				// Init watchers
				_.each( me.$$watchers, function( v, k ) {
					me._initOneWatcher( k );
				});

			},

			_initOneWatcher: function( name ) {

				// Locals
				var me = this;
				var state = me.$$watchers[ name ];

				// Init config
				var cfg = _.merge( me.$$config, state.cfg );
				cfg = me._setConfigDefaults( cfg );

				// Create the watcher
				var watcher = chokidar.watch( state.globs, cfg );

				// Store the watcher
				state.watching 	= true;
				state.ready 	= false;
				state.watcher 	= watcher;

				// Setup watcher events
				me._createWatchEventHandlers( watcher, cfg.handler, name, cfg, state );

			},

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

			_createWatchEventHandlers: function( watcher, handler, name, cfg, state ) {

				var me = this;

				//var eventNames = [ "add", "change", "unlink", "addDir", "unlinkDir", "error", "ready" ];
				var eventNames = [ "add", "change", "unlink" ];

				watcher.on("ready", function() {

					// Log it
					me.log( "  -> Watcher ready for: " + name );
					state.ready = true;

				});

				_.each( eventNames, function( eventName ) {

					watcher.on(eventName, function( target ) {

						// Build the extra event data
						var extra = {
							absolutePath: target,
							fileObject: me._resolveEventFileObject( cfg, target ),
							event: arguments[1],
							watcherName: name,
							watcherConfig: cfg,
							watcherState: state
						};

						// Log the event
						me.log("<" + name + "> Watch event triggered: " + eventName.toUpperCase() + " " + target);

						// Call the handler
						handler( eventName, target, extra );


					});

				});

			},

			/**
			 * Attempts to resolve an absolute path provided by a triggered
			 * watch event into a {@link Dasix.grits.File} object.  This is only
			 * possible if the configuration for the event includes a valid
			 * `.collection` object.
			 *
			 * @instance
			 * @access private
			 * @param {object} watcherConfig
			 * @param {string} absolutePath
			 * @returns {Dasix.grits.File|null}
			 */
			_resolveEventFileObject: function( watcherConfig, absolutePath ) {

				var me = this;

				if( watcherConfig.collection !== undefined && watcherConfig.collection !== null
					&& tipe( watcherConfig.collection ) === "object" && watcherConfig.collection.classname !== undefined
					&& watcherConfig.collection.classname === "Dasix.grits.ResourcePathCollection"
					) {
					return watcherConfig.collection.resolveFileObject( absolutePath );
				} else {
					return null;
				}

			},

			/**
			 * Halts all watchers
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			unwatch: function() {

				var me = this;
				me.log("Stopping watchers");

				_.each( me.$$watchers, function( v, k ) {

					v.watching = false;
					v.ready = false;

					if( v.watcher !== undefined && v.watcher !== null && tipe( v.watcher ) === "object" ) {
						me.log( "  -> Watcher halted for: " + k );
						v.watcher.close();
					}

				});

			}


		}

	}

);
