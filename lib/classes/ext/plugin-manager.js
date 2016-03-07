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

			},

			/**
			 * Adds a plugin to the renderer.  This method will call the
			 * 'onAttach' event on the plugin after it has been initialized.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]|function|function[]} plugin The plugin (or plugins) to add.
			 * If a string (or an array of strings) is passed then it will be used in a require() statement to resolve the plugin function.
			 * Otherwise, this method expects this parameter to be a constructor function (or an array of constructor functions) and
			 * will use it to initialize a new plugin with the new keyword.
			 * @returns {object|object[]} The initialized plugin that was added. If an array was
			 * passed to `plugin`, then an array will also be returned here.
			 */
			addPlugin : function( plugin ) {

				// Locals
				var me = this;
				var grits = me.getGrits();
				var name = null;
				var vaguePluginName = "plugin"; // We use this to try to identify the plugin until we know its name
				var errMessage;

				// plugin is a required param
				if( plugin === undefined || plugin === null ) {
					errMessage = "PluginManager.addPlugin() was called without a plugin! How could this happen?!?";
					me.logError( new vError( errMessage ) );
				}

				// Handle arrays
				if( tipe(plugin) === "array" ) {
					var ret = [];
					_.each( plugin, function( plug ) {
						var iplug = me.addPlugin( plug );
						ret.push(iplug);
					});
					return ret;
				}

				// Handle strings
				if( tipe(plugin) === "string" ) {

					// Load from file using require()
					vaguePluginName = "plugin ('" + plugin + "')";
					plugin = me._loadPluginFile( plugin );

				} else {

					// Treat the plugin as a function and try to inject it directly
					me.log("Loading plugin directly (<" + tipe( plugin ) + ">) ...");
					vaguePluginName = "plugin (<" + tipe( plugin ) + ">)";

				}

				// Ensure we have an object
				if( tipe(plugin) !== "function" ) {
					errMessage = "PluginManager.addPlugin() was passed an invalid " + vaguePluginName + ".\nA require path or constructor function was expected but a/an '" + tipe(plugin) + "' was provided.";
					me.logError( new Error( errMessage ) );
				}

				// Initialize the plugin object
				var initialized = new plugin( grits );

				// Ensure we have an object
				if( initialized.pluginName === undefined || tipe(initialized.pluginName) !== "string" || initialized.pluginName.replace(/\s/g,"") === "" ) {
					errMessage = "PluginManager.addPlugin() was passed an invalid " + vaguePluginName + ".\nThe object provided does not have a .pluginName property (or it was blank), which is required for plugin identification.";
					me.logError( new Error( errMessage ) );
				}

				// Log the plugin name
				me.log("Plugin Loaded: '" + initialized.pluginName + "'");

				// Call the 'onAttach' event for the new plugin
				me.fireOn( initialized, "onAttach" );

				// Add the plugin to the internal store
				me.$$plugins.push( initialized );

				// Done
				return initialized;

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
			 * @returns {object[]} An array of the plugins that were removed.
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
				me.$$plugins = [];

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

				var me = this;
				var ret = [];

				_.each( me.$$plugins, function( plugin ) {
					ret.push( plugin.pluginName );
				});

				return ret;

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

				// Save a little effort if no plugins exist
				if( me.$$plugins.length === 0 ) {
					return;
				}

				// Log (log overkill, I think, so disabled for now)
				//me.log("Calling plugin event on all plugins: '" + eventName + "'");

				// Iterate
				_.each( me.$$plugins, function( plugin ) {
					me.fireOn( plugin, eventName, eventData );
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
