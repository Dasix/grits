/**
 * This class is a "renderer extension" that assists in the
 * management of plugins.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.PluginManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.4.6
 * @version 1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 	);
var marked 	= require( "marked" 	);
var _ 		= require( "lodash" 	);
var Promise = require( "bluebird" 	);
var vError 	= require( "verror" 	);
var tipe	= require( "tipe"		);
var pth		= require( "path"		);

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.PluginManager", {

		extend : Dasix.grits.AbsRenderExtension,

		properties : {
		},

		members : /** @lends Dasix.grits.ext.PluginManager **/ {

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
				me.setLogTopic("plugin.manager");

				// Initialize the plugin store
				me.clearPlugins( true );

				// Init global configuration
				me.$$globalConfig = {};

			},

			/**
			 * Adds a plugin to the renderer.  This method will call the
			 * 'onAttach' event on the plugin after it has been initialized.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]|function|function[]|object|object[]} plugin The plugin (or plugins) to add.
			 * If a string (or an array of strings) is passed then it will be used in a require() statement to resolve the plugin function.
			 * Otherwise, this method expects this parameter to be a constructor function (or an array of constructor functions) and
			 * will use it to initialize a new plugin with the new keyword.
			 * @param {?object} [config={}] Optional configuration for the plugin(s) being loaded. If the `plugin` param
			 * also contains configuration data, this parameter will override those settings.
			 * @param {?object} [globalConfig={}] Optional configuration for ALL plugins.  If the `plugin`
			 * or `config` parameters contain configuration settings, they will override the settings from this param.
			 * @returns {object[]} The fully initialized plugin(s) that were added.
			 */
			addPlugin : function( plugin, config, globalConfig ) {

				// Locals
				var me = this;
				var ret = [];

				// 'plugin' is a required param
				if( plugin === undefined || plugin === null ) {
					errMessage = "PluginManager.addPlugin() was called without a plugin.";
					me.logError( new vError( errMessage ) );
				}

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Process the 'globalConfig' param (it will not be needed beyond this point)
				if( globalConfig !== undefined && globalConfig !== null && tipe( globalConfig ) === "object" ) {
					me.setGlobalConfig( globalConfig );
				}

				// Defer to the appropriate, type specific, method
				switch( tipe(plugin) ) {

					case "array":
						ret.push( me._addPluginArray( plugin, config ) );
						break;

					case "string":
						ret.push( me._addPluginString( plugin, config ) );
						break;

					case "object":
						ret.push( me._addPluginObject( plugin, config ) );
						break;

					case "function":
						ret.push( me._addPluginFunction( plugin, config ) );
						break;

					default:
						errMessage = "PluginManager.addPlugin() was called with an invalid plugin type.";
						me.logError( new vError( errMessage ) );
						break;

				}

				return _.flatten( ret );

			},

			/**
			 * Adds an array (or nested array) of plugins, e.g:
			 * ```
			 * arr = [ <function>, <string>, <object>, <array> ]
			 * ```
			 *
			 * @instance
			 * @access private
			 * @param {string[]|function[]|object[]} arrPlugins An array of plugins
			 * @param {?object} config An optional configuration object to apply to
			 * each of the plugins in `arrPlugins`.  Settings provided by `config`
			 * will override those provided in `arrPlugins`.
			 * @returns {object[]} The fully initialized plugin(s) that were added.
			 */
			_addPluginArray: function( arrPlugins, config ) {

				// Locals
				var me = this;
				var ret = [];

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Iterate over each array value
				_.each( arrPlugins, function( plugin ) {
					ret.push( me.addPlugin( plugin, config, null ) );
				});

				// Flatten and return
				return _.flatten( ret );

			},

			/**
			 * Adds an array (or nested array) of plugins, e.g:
			 * ```
			 * // One plugin cfg ..
			 * obj = { "plugin": "some-plugin-a", .. }
			 * // Multiple plugins cfgs ..
			 * obj = { "some-plugin-a": cfg, "some-plugin-b": cfg, .. }
			 * ```
			 *
			 * @instance
			 * @access private
			 * @param {string[]|function[]|object[]} objPlugin A single plugin
			 * configuration object containing a `.plugin` property or a key/value
			 * pair of plugin configuration objects.
			 * @param {?object} config An optional configuration object to apply to
			 * each of the plugins in `arrPlugins`.  Settings provided by `config`
			 * will override those provided in `arrPlugins`.
			 * @returns {object[]} The fully initialized plugin(s) that were added.
			 */
			_addPluginObject: function( objPlugin, config ) {

				// Locals
				var me = this;

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Determine if objPlugin contains a single plugin
				if( objPlugin.plugin !== undefined ) {

					// A single plugin ..
					// Extract the plugin property
					var pluginProp = objPlugin.plugin;

					// Resolve the configuration
					config = me._resolvePluginConfig( objPlugin, config );

					// Defer to addPlugin
					return me.addPlugin( pluginProp, config );

				} else {

					// Multiple plugins, each key will be a plugin string
					var ret = [];

					// Iterate over each
					_.each( objPlugin, function( pCfg, pStr ) {

						// Resolve final config
						config = me._resolvePluginConfig( pCfg, config );

						// Defer to _addPluginString
						ret.push( me._addPluginString( pStr, config ) );

					});

					// Flatten and return
					return _.flatten( ret );

				}


			},

			/**
			 * Handles "plugin strings", which indicate a require() path.
			 * This method is an intermediary between `_loadPluginFile()`
			 * and `_addPluginFunction` and simply joins the two together.
			 *
			 * @instance
			 * @access private
			 * @param {string} strPlugin The plugin to load
			 * @param {?object} config An optional configuration object
			 * @returns {object[]} The fully initialized plugin(s) that were added.
			 */
			_addPluginString: function( strPlugin, config ) {

				// Locals
				var me = this;

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Load the plugin's constructor
				var fn = me._loadPluginFile( strPlugin );

				// Defer to _addPluginFunction
				return me._addPluginFunction( fn, config );

			},

			/**
			 * Handles plugin constructors. This is the last stop on the way
			 * to loading a plugin into the internal stores and all of the
			 * other `addPlugin*` methods eventually call this one.
			 *
			 * @instance
			 * @access private
			 * @param {string} fnPlugin The plugin constructor to load
			 * @param {?object} config An optional configuration object
			 * @returns {object[]} The fully initialized plugin(s) that were added.
			 */
			_addPluginFunction: function( fnPlugin, config ) {

				// Locals
				var me = this;
				var grits = me.getGrits();

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Resolve final configuration
				config = me._resolvePluginConfig( config, {} );

				// Initialize the plugin object
				var initialized = new fnPlugin( grits, config );

				// Validate the plugin object
				me._validatePlugin( initialized );

				// Find the plugin name
				var pName = initialized.pluginName;

				// Log the plugin name
				me.log("Plugin Loaded: '" + pName + "'");

				// Call the 'onAttach' event for the new plugin
				me.fireOn( initialized, "onAttach" );

				// Add the plugin to the internal store
				me.$$plugins[pName] = {
					plugin: initialized,
					config: config
				};

				// Done
				return [ initialized ];

			},

			/**
			 * Validates a loaded plugin object.
			 *
			 * @instance
			 * @access private
			 * @param {object} plugin The fully initialized plugin to validate.
			 * @returns {void}
			 */
			_validatePlugin: function( plugin ) {

				// Locals
				var me = this;

				// Ensure we have an object
				if( plugin.pluginName === undefined || tipe(plugin.pluginName) !== "string" || plugin.pluginName.replace(/\s/g,"") === "" ) {
					var errMessage = "PluginManager.addPlugin() was passed an invalid plugin.\nThe object provided does not have a .pluginName property (or it was blank), which is required for plugin identification.";
					me.logError( new Error( errMessage ) );
				}

			},

			/**
			 * Merges various plugin configuration sources.
			 *
			 * @instance
			 * @access private
			 * @param {?object} [config={}] The primary plugin configuration object.
			 * This param will override any global config values but can be overridden
			 * by values in `overrideConfig`.
			 * @param {?object} [overrideConfig={}] A secondary plugin configuration
			 * object whose values will override those in `config` and any in the
			 * global plugin config object.
			 * @returns {object} The final configuration
			 */
			_resolvePluginConfig: function( config, overrideConfig ) {

				// Locals
				var me = this;
				var ret = {};

				// Default the 'config' param
				if( config === undefined || config === null || tipe( config ) !== "object" ) {
					config = {};
				}

				// Default the 'overrideConfig' param
				if( overrideConfig === undefined || overrideConfig === null || tipe( overrideConfig ) !== "object" ) {
					overrideConfig = {};
				}

				// Remove .plugin property from 'config' param (if it exists)
				if( config.plugin !== undefined ) {
					delete config.plugin;
				}

				// Remove .plugin property from 'overrideConfig' param (if it exists)
				if( overrideConfig.plugin !== undefined ) {
					delete overrideConfig.plugin;
				}

				// Merge all config sources
				_.assign( ret, me.getGlobalConfig(), config, overrideConfig );

				// Finished
				return ret;

			},

			/**
			 * Sets multiple global configuration settings.
			 *
			 * @instance
			 * @access public
			 * @param {object} config
			 * @returns {void}
			 */
			setGlobalConfig: function( config ) {

				// Locals
				var me = this;

				// Apply each value
				_.each( config, function( v, k ) {
					me._setGlobalConfigValue( k, v );
				});

			},

			/**
			 * Sets a single global config setting.
			 *
			 * @instance
			 * @access public
			 * @param {string} key The setting name
			 * @param {*} val The setting value
			 * @returns {void}
			 */
			_setGlobalConfigValue: function( key, val ) {
				this.$$globalConfig[ key ] = val;
			},

			/**
			 * Returns all global configuration settings.
			 *
			 * @instance
			 * @access public
			 * @returns {object}
			 */
			getGlobalConfig: function() {
				return this.$$globalConfig;
			},

			/**
			 * Returns the current configuration for one plugin (by name).
			 * NULL is returned if the plugin is not loaded.
			 *
			 * @instance
			 * @access public
			 * @param pluginName
			 * @returns {null|object} The plugin configuration, if the plugin
			 * is loaded or NULL if the plugin is not loaded.
			 */
			getPluginConfig: function( pluginName ) {

				var me = this;
				var store, plugin;

				if( me.$$plugins[ pluginName ] === undefined ) {
					return null;
				}

				store = me.$$plugins[ pluginName ];
				plugin = store.plugin;

				if( plugin.getConfig !== undefined && tipe( plugin.getConfig ) === "function" ) {
					return plugin.getConfig();
				} else {
					return store.config;
				}

			},

			/**
			 * Returns information about all loaded plugins and their configuration.
			 *
			 * @instance
			 * @access public
			 * @returns {object}
			 */
			getPluginInfo: function() {

				// Locals
				var me = this;
				var ret = {};

				// Fetch the config for each plugin
				_.each( me.$$plugins, function( store, pluginName ) {
					ret[ pluginName ] = me.getPluginConfig( pluginName );
				});

				// Finished
				return ret;

			},

			/**
			 * Loads a plugin from file.  This method uses require() in order
			 * to allow the node search path logic to help with the resolution
			 * of the plugin location.
			 *
			 * @instance
			 * @access private
			 * @param {string} str The plugin path or module name to load.
			 * @returns {function}
			 */
			_loadPluginFile: function( str ) {

				// Locals
				var me = this;
				var errMessage;

				// Log it..
				me.log("Loading plugin from file: '" + str + "'");

				// First, let's see if require will "just work"..
				try {
					return require( str );
				} catch( err ) {}

				// If we're here, then that failed.. so we will now
				// attempt to normalize the string and try again..
				str = me._normalizePluginString( str );
				me.log("    -> Resolved To: '" + str + "'");

				// Try again..
				try {
					return require( str );
				} catch( err ) {
					errMessage = "PluginManager._loadPluginFile() could not find or load its target:\n    -> '" + str + "'";
					me.logError( new vError( err, errMessage ) );
				}

			},

			/**
			 * Normalizes and cleans strings intended to be passed to require()
			 * during plugin loading.
			 *
			 * @instance
			 * @access private
			 * @param {string} str The raw string
			 * @returns {string} The normalized string
			 */
			_normalizePluginString: function( str ) {

				// Locals
				var me = this;

				// Remove redundant separators and convert
				str = str.replace(/(\\|\/)+/g, pth.sep);

				// Resolve to CWD
				str = pth.resolve( process.cwd(), str );

				// Normalize
				str = pth.normalize( str );

				// Finished
				return str;


			},

			/**
			 * Clears all plugins.  The `onDetach` event will be called on
			 * each plugin during this operation.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [quiet=false] When TRUE, the `onDetach` event will
			 * not be raised/emitted before clearing the plugins.
			 * @returns {object} A key/value object of the plugins that were removed.
			 */
			clearPlugins: function( quiet ) {

				// Locals
				var me = this;
				var ret;

				// Default quiet param
				if( quiet === undefined || quiet === null || quiet !== true ) {
					quiet = false;
				}

				// Call the 'onDetach' event before removing the plugins
				if( !quiet ) {
					me.fireEvent( "onDetach" );
				}

				// Store plugin array for return
				ret = me.$$plugins;

				// Clear plugins
				me.$$plugins = {};

				// Done
				return ret;

			},

			/**
			 * Returns an array of plugin names for all loaded plugins.
			 *
			 * @instance
			 * @access public
			 * @returns {string[]}
			 */
			getPluginNames: function() {
				return _.keys( this.$$plugins );
			},

			/**
			 * Calls an event on all loaded plugins.
			 *
			 * @instance
			 * @access private
			 * @param {string} eventName The event to call
			 * @param {?object} [eventData=null] Extra data that should be passed to the event
			 * @returns {void}
			 */
			fireEvent: function( eventName, eventData ) {

				// Locals
				var me = this;

				// Handle optional eventData param
				if( eventData === undefined || tipe(eventData) !== "object" ) {
					eventData = null;
				}

				// Iterate
				_.each( me.$$plugins, function( store ) {
					me.fireOn( store.plugin, eventName, eventData );
				});

			},

			/**
			 * Calls an event on a single, loaded, plugin.
			 *
			 * @instance
			 * @access private
			 * @param {object} plugin The plugin to call the event on
			 * @param {string} eventName The event to call
			 * @param {?object} [eventData=null] Extra data that should be passed to the event
			 * @returns {void}
			 */
			fireOn: function( plugin, eventName, eventData ) {

				// Locals
				var me = this;
				var grits = me.getGrits();

				// Handle optional eventData param
				if( eventData === undefined || tipe(eventData) !== "object" ) {
					eventData = {};
				}

				// Special handling for 'detach'
				if( eventName === "onDetach" ) {
					grits.getPathManager().clearPluginPaths( plugin.pluginName );
				}

				// Call the event
				if( plugin[ eventName ] !== undefined && tipe( plugin[ eventName ] ) === "function" ) {

					var fn = plugin[ eventName].bind( plugin );
					fn( grits, eventData );

					// Log
					me.log("Plugin Event ('" + eventName + "') was handled by plug-in: '" + plugin.pluginName + "'" );

				}

			}


		}

	}

);
