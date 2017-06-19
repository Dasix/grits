/**
 * This class is a "renderer extension" that assists in the
 * management of the web server.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.ReloadServer
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.6.0
 * @version 1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 	 );
var marked 	= require( "marked" 	 );
var _ 		= require( "lodash" 	 );
var Promise = require( "bluebird" 	 );
var vError 	= require( "verror" 	 );
var tipe	= require( "tipe"		 );
var lrx		= require( "livereloadx" );

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.ReloadServer", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.ReloadServer **/ {

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
				me.setLogTopic("reload.server");

				// Init Config
				me.$$config = {
					static: true,
					port: 35729,
					filter: [
						{type: 'exclude', pattern: '*'}
					]
				};

				// State
				me.$$enabled 		= false;
				me.$$online 		= false;
				me.$$server 		= null;
				me.$$notifyQueue	= [];
				me.$$notifyPending	= false;
				me.$$notifyDelay	= 500;

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
					me.logError( new Error("Invalid configuration passed to the reload web server" ) );
				}

				// Check for 'enabled' param
				if( newConfig.enabled !== undefined ) {
					if( newConfig.enabled === false ) {
						me.$$enabled = false;
					} else {
						me.$$enabled = true;
					}
					delete newConfig.enabled;
				}

				// Check for 'delay' param
				if( newConfig.delay !== undefined ) {
					me.$$notifyDelay = parseInt( newConfig.delay, 10 );
					delete newConfig.delay;
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
			 * Logs the LiveReloadX configuration.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_logConfig: function() {
				var me = this;
				var config = me.getConfig();
				me.log("debug", "config", "LiveReloadX Server Config:");

				_.each( config, function( v, k ) {

					if( k === "filter" ) {

						_.each( v, function( filter ) {
							me.logKeyVal( "filter", filter.type.toUpperCase() + " " + filter.pattern );
						});

					} else {
						me.logKeyVal( k, v );
					}

				});

			},

			/**
			 * Gets the current configuration for the web server.
			 *
			 * @instance
			 * @access public
			 * @returns {object} The current server configuration
			 */
			getConfig: function() {
				return this.$$config;
			},

			/**
			 * Returns whether or not content serving is enabled.
			 * This is set through the config and `setConfig()`
			 *
			 * @instance
			 * @access public
			 * @returns {boolean}
			 */
			isEnabled: function() {
				return this.$$enabled;
			},

			/**
			 * Returns whether or not the LiveReloadX server is
			 * currently online (running and listening).
			 *
			 * @instance
			 * @access public
			 * @returns {boolean}
			 */
			isOnline: function() {
				return this.$$online;
			},

			/**
			 * Starts the LiveReloadX server
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			start: function() {

				// Locals
				var me 		= this;
				var config 	= me.getConfig();
				var grits 	= me.getGrits();

				// Don't start if we're not enabled
				if( !me.isEnabled() ) {
					return;
				}

				// Nothing to do if we're already online
				if( me.isOnline() ) {
					return;
				}

				// Find the first output directory
				var outputs = grits.getOutputPaths();
				if( outputs.length === 0 ) {
					me.log("warning", "no-output", "The LiveReloadX server could not be started because no output directories were specified in the configuration.");
					return;
				}
				var output = outputs[0];
				config.dir = output;

				// Log it
				me.log("info", "start", "Starting the LiveReloadX Server on port " + config.port);
				me._logConfig();

				// Create the server
				me.$$server = lrx( config );
				me.$$server.listen();

				// Update State
				me.$$online = true;

				// Stay alive
				me.keepAlive();

			},

			/**
			 * Stops the LiveReloadX server
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			stop: function() {

				// Locals
				var me = this;

				// Nothing to do if we're already offline
				if( !me.isOnline() || me.$$server === null ) {
					return;
				}

				// Log it
				me.log("info", "stop", "Stopping the LiveReloadX server");

				// Update State
				me.$$online = false;

				// End keep-alive
				me.endKeepAlive();

			},

			/**
			 * Called by external systems whenever a file is updated.
			 *
			 * @instance
			 * @access public
			 * @param {Dasix.grits.File|Dasix.grits.File[]} file The file, or files, that were updated
			 * @returns {void}
			 */
			onFileUpdated: function( file ) {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var abs, rel;

				// Nothing to do if we're offline or disabled
				if( !me.isEnabled() || !me.isOnline() || me.$$server === null ) {
					return;
				}

				// Handle arrays
				if( tipe( file ) === "array" ) {
					_.each( file, function( f ) {
						me.onFileUpdated( f );
					});
					return;
				}

				// Find the first output directory
				var outputs = grits.getOutputPaths();
				if( outputs.length === 0 ) {
					return;
				}
				var output = outputs[0];

				// Resolve the absolute path of the file
				abs = file.getAbsoluteFilePath();

				// Ignore files that are not in our output directory
				// (this will avoid redundant update calls when more
				// then one output directory exists)
				if( !_.startsWith( abs, output ) ) {
					return;
				}

				// Find relative path
				rel = abs.substr( ( output.length + 1 ) );

				// Defer to _handleFileUpdate
				me._handleFileUpdate( abs, rel );

			},

			/**
			 * Called for each file update after they have been vetted
			 * by the public interface `onFileUpdate()`.
			 *
			 * @instance
			 * @access private
			 * @param {string} abs The absolute path of the updated file
			 * @param {string} rel The relative path of the updated file
			 * @returns {void}
			 */
			_handleFileUpdate: function( abs, rel ) {

				// Locals
				var me = this;

				// Log it
				me.log("debug", "update", "File Updated: '" + rel + "' ('" + abs + "')" );

				// Add the update to the notification queue
				me.$$notifyQueue.push({
					abs: abs,
					rel: rel
				});

				// If a notification update is not already
				// pending, queue an update.
				if( !me.$$notifyPending ) {

					// Avoid redundant notifications
					me.$$notifyPending = true;

					// Should we delay the notification?
					if( me.$$notifyDelay === 0 ) {

						// No, notify LiveReloadX immediately
						me._doLiveReloadNotify();

					} else {

						// Yes, delay then notify LiveReloadX
						var f = me._doLiveReloadNotify.bind( me );
						setTimeout( f, me.$$notifyDelay );

						// Log it
						me.log( "debug", "delay", "Delaying LiveReloadX notifications for " + me.$$notifyDelay + "ms" );

					}
				}


			},

			/**
			 * This method notifies the LiveReloadX server object of file updates.
			 * It is called by `_handleFileUpdate()` once for all updates within
			 * the 'notify delay' time period.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_doLiveReloadNotify: function() {

				// Locals
				var me 		= this;
				var queue 	= me.$$notifyQueue;
				var server 	= me.$$server;

				// Reset notification queue state
				me.$$notifyQueue 	= [];
				me.$$notifyPending 	= false;

				// Log it
				me.log( "debug", "reload", "Sending [" + queue.length + "] update notifications to LiveReloadX" );

				// Notify
				_.each( queue, function( item ) {
					server.notifyFileChange( item.rel );
				});

			}

		}
	}
);
