/**
 * This class is a "renderer extension" that assists in the
 * management of partials.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.PartialManager
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

	"Dasix.grits.ext.PartialManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.PartialManager **/ {

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
				me.setLogTopic("partial.manager");

			},

			/**
			 * Provides the collection settings for partials, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				var contentExtensions = ["dust","md","html"];

				return {
					short          : "partial",
					name           : "DustJS Partial Path",
					defaultSubdir  : "partials",
					scanExtensions : contentExtensions,
					methodName     : "Partial"
				};

			},

			/**
			 * Loads and compiles all partials (in-line partials).
			 * This is the main entry point for the partial manager's
			 * render operations.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			compileAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("partial");

				// Initial log message
				me.logOpStart("Loading all Dust.js Partials");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("Notice: No Dust.js partial files were found or loaded!");
					}
				};

				// Emit Pre-operation Event
				me.emit( "beforeCompilePartials" );

				// Iterate over each resource
				return col.eachResource( me._compileOne.bind( me ), scanOpts ).then(
					function( resourceFiles ) {

						// Emit Post-operation Event
						me.emit( "afterCompilePartials", { dust: grits.dust, resourceFiles: resourceFiles, resourcePathCollection: col } );

					}
				);

			},

			/**
			 * Compiles a single partial.  This is the main work horse
			 * for this renderer extension.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The source file
			 * @returns {void}
			 */
			_compileOne: function( file ) {

				// Locals
				var me 				= this;
				var grits 			= me.getGrits();
				var partialName 	= "partial/" + file.getRelativeBaseName();

				// Log the info we have so far
				me.log("Compiling partial..");
				me.log(" -> Source    : " + file.getAbsoluteFilePath() );
				me.log(" -> Long Name : " + partialName );

				// Compile the template
				grits.dustManager.compileOne(
					partialName,
					file,
					false
				);

			}

			//</editor-fold>


		}
	}
);
