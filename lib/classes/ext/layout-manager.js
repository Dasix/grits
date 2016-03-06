/**
 * This class is a "renderer extension" that assists in the
 * management of layouts.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.LayoutManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.3.10
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

	"Dasix.grits.ext.LayoutManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.LayoutManager **/ {

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
				me.setLogTopic("layout.manager");

			},

			/**
			 * Provides the collection settings for layouts, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				return {
					short          : "layout",
					name           : "DustJS Layout Path",
					defaultSubdir  : "layouts",
					scanExtensions : [ "dust", "md", "html" ],
					methodName     : "Layout"
				};

			},

			/**
			 * Loads and compiles all layouts (in-line partials).
			 * This is the main entry point for the layout manager's
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
				var col 	= grits.getPathCollection("layout");

				// Emit Pre-operation Event
				me.emit( "beforeCompileLayouts" );

				// Iterate over each resource
				return col.eachResource( me._compileOne.bind(me) ).then(
					function( resourceFiles ) {

						// Emit Post-operation Event
						me.emit( "afterCompileLayouts", { dust: grits.dust, resourceFiles: resourceFiles, resourcePathCollection: col } );

					}
				);

			},

			/**
			 * Compiles a single layout.  This is the main work horse
			 * for this renderer extension.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The source file
			 * @returns {void}
			 */
			_compileOne: function( file ) {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();
				var layoutName 	= "layout/" + file.getRelativeBaseName();

				// Log the info we have so far
				me.log("Compiling layout..");
				me.log(" -> Source    : " + file.getAbsoluteFilePath() );
				me.log(" -> Long Name : " + layoutName );

				// Compile the template
				grits._compileOneTemplate(
					layoutName,
					file,
					false
				);

			},

			/**
			 * Applies a "layout" to a template if the "front-matter" data
			 * of the content contains a ".layout" property.
			 *
			 * @instance
			 * @access public
			 * @param {string} srcContent The source content.  This content will
			 * be inserted into the layout as the "bodyContent"
			 * @param {object} matterData The front-matter data from the content file
			 * @param {boolean} [contentIsMarkdown=false] Whether or not the content
			 * held in `srcContent` is from a markdown file.
			 * @returns {string}
			 */
			applyLayout: function( srcContent, matterData, contentIsMarkdown ) {

				// Locals
				var me = this;

				// Parse contentIsMarkdown param
				if( contentIsMarkdown === undefined || contentIsMarkdown !== true ) {
					contentIsMarkdown = false;
				}

				// Check for the 'layout' property in the front-matter
				// data.  If no layout property is included then
				// this method doesn't need to do anything.
				if( matterData.layout !== undefined ) {

					// Resolve the proper layout name
					var layoutName = "layout/" + matterData.layout;

					// Wrap the content
					srcContent = me._wrapContent( srcContent, layoutName, contentIsMarkdown );

				}

				return srcContent;

			},

			/**
			 * Wraps content with the appropriate Dust.js markup in order
			 * to apply a layout to a template.  This method is a fork method
			 * that will defer to other, content-specific, methods and is called
			 * exclusively by `#applyLayout`.
			 *
			 * @instance
			 * @access private
			 * @param {string} content The content to wrap with a layout.
			 * @param {string} layoutName The name of the layout to apply to the content.
			 * @param {boolean} contentIsMarkdown Whether or not the `content` param is Markdown.
			 * @returns {string} The original content wrapped with some extra Dust.js markup.
			 */
			_wrapContent: function( content, layoutName, contentIsMarkdown ) {

				// Locals
				var me = this;

				// Depending on whether or not the content source is markdown
				// we will append and prepend different strings
				if( contentIsMarkdown ) {
					return me._wrapMarkdown( content, layoutName );
				} else {
					return me._wrapHtml( content, layoutName );
				}

			},

			/**
			 * Wraps HTML content with the appropriate Dust.js markup in order
			 * to apply a layout to a template.  This method is called
			 * exclusively by `#_wrapContent`.
			 *
			 * @instance
			 * @access private
			 * @param {string} content The content to wrap with a layout.
			 * @param {string} layoutName The name of the layout to apply to the content.
			 * @returns {string} The original content wrapped with some extra Dust.js markup.
			 */
			_wrapHtml: function( content, layoutName ) {

				// Locals
				var me = this;
				var ret;

				// Log the layout application
				me.log( "      -> Applying layout '" + layoutName + "' to a HTML content file" );

				// Prepend the layout partial inclusion tag
				// and surround the content with bodyContent tags
				ret = 	"{>\"" + layoutName + "\"/}" +
						"{<bodyContent}" +
							content +
						"{/bodyContent}";

				// Finished
				return ret;

			},

			/**
			 * Wraps markdown content with the appropriate Dust.js markup in order
			 * to apply a layout to a template.  This method is called
			 * exclusively by `#_wrapContent`.
			 *
			 * @instance
			 * @access private
			 * @param {string} content The content to wrap with a layout.
			 * @param {string} layoutName The name of the layout to apply to the content.
			 * @returns {string} The original content wrapped with some extra Dust.js markup.
			 */
			_wrapMarkdown: function( content, layoutName ) {

				// Locals
				var me = this;
				var ret;

				// Log the layout application
				me.log( "      -> Applying layout '" + layoutName + "' to a Markdown content file" );

				// Prepend the layout partial inclusion tag
				// and surround the content with bodyContent tags
				ret = 	"{@notmd}{>\"" + layoutName + "\"/}" +
						"{<bodyContent}{/notmd}" +
							content +
						"{@notmd}{/bodyContent}{/notmd}";

				// Finished
				return ret;

			}

		}
	}
);
