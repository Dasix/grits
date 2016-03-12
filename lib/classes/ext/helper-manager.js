/**
 * This class is a "renderer extension" that assists in the
 * management of helpers.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.HelperManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.5.6
 * @version 1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 	);
var marked 	= require( "marked" 	);
var _ 		= require( "lodash" 	);
var Promise = require( "bluebird" 	);
var vError 	= require( "verror" 	);

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.HelperManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.HelperManager **/ {

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
				me.setLogTopic("helper.manager");

			},

			/**
			 * Provides the collection settings for helpers, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				return {
					short          : "helper",
					name           : "DustJS Helper Function Path",
					defaultSubdir  : "helpers",
					scanExtensions : ["js"],
					methodName     : "Helper"
				};

			},

			/**
			 * Loads all helpers. This is the main entry point for the
			 * helper manager's part in render operations.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			loadAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("helper");

				// Initial log message
				me.logOpStart("Loading all Dust.js Helpers");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("Notice: No custom Dust.js helpers were found or loaded!");
					}
				};

				// Emit Pre-operation Event
				me.emit( "beforeLoadHelpers" );

				// Iterate over each resource
				return col.eachResource( me._loadOne.bind(me), scanOpts ).then(
					function( resourceFiles ) {

						// Add watch config
						me._addCollectionWatcher( col, me._handleWatchUpdate.bind(me) );

						// Emit Post-operation Event
						me.emit( "afterLoadHelpers", { dust: grits.dust } );

					}
				);

			},

			/**
			 * Loads a single helper.  This is the main work
			 * horse for this renderer extension.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The source file
			 * @returns {void}
			 */
			_loadOne: function( file ) {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();
				var helperName 	= file.getBaseName();
				var filePath	= file.getAbsoluteFilePath();

				// Log the info we have so far
				me.log("Helper function loaded: {@" + helperName + "}");
				me.logKeyVal( "Source", filePath );

				// Load the helper
				var helper = me.requireLatest( filePath );

				// Create a wrapper
				grits.dustManager.dust.helpers[ helperName ] = function( chunk, context, bodies, params ) {

					// Add a reference to the active render file
					grits.dustManager.addTemplateDependencyRef( "helper", helperName );

					// Pass through to the underlying function
					return helper( chunk, context, bodies, params, me );

				};

			},

			/**
			 * When watching is enabled, this method will be called
			 * whenever a watch event is triggered.
			 *
			 * @instance
			 * @access private
			 * @param eventName
			 * @param file
			 * @param extra
			 * @private
			 */
			_handleWatchUpdate: function( eventName, file, extra ) {

				var me 				= this;
				var grits 			= me.getGrits();
				var helperName 		= file.getBaseName();

				if( eventName === "add" || eventName === "change" ) {

					// Reload helper
					me._loadOne( file );

					// Trigger render update op for content files that implement the helper
					grits.dustManager.triggerRefUpdate( "helper", helperName );

				}

			}


		}
	}
);
