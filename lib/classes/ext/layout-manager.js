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
var tipe 	= require( "tipe"		);

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

				// Init "default layout" setting
				me.$$defaultLayout = null;

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

				// Initial log message
				me.logOpStart("Loading all Dust.js Layouts");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("info", "found.none", "No Dust.js layouts files were found or loaded!");
					}
				};

				// Emit Pre-operation Event
				me.emit( "beforeCompileLayouts" );

				// Iterate over each resource
				return col.eachResource( me._compileOne.bind(me), scanOpts ).then(
					function( resourceFiles ) {

						// Add watch config
						me._addCollectionWatcher( col, me._handleWatchUpdate.bind(me) );

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
				me.log("debug", "compile", "Compiling layout..");
				me.log("debug", "compile", " -> Source    : " + file.getAbsoluteFilePath() );
				me.log("debug", "compile", " -> Long Name : " + layoutName );

				// Compile the template
				grits.dustManager.compileOne(
					layoutName,
					file,
					false
				);

				// Fire an event
				me.emit( "onLayoutLoaded", { file: file, layoutName: layoutName, layoutManager: me } );

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
				var partialName 	= "layout/" + file.getRelativeBaseName();

				if( eventName === "add" || eventName === "change" ) {
					me._compileOne( file );
					grits.dustManager.triggerRefUpdate( "partial", partialName );
				}

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
				var defaultLayout = me.getDefaultLayout();

				// Parse contentIsMarkdown param
				if( contentIsMarkdown === undefined || contentIsMarkdown !== true ) {
					contentIsMarkdown = false;
				}

				// Apply default layout
				if( matterData.layout === undefined ) {
					if( defaultLayout !== null ) {
						me.log( "debug", "use.default", "      -> Using default layout: '" + defaultLayout + "'" );
					}
					matterData.layout = defaultLayout;
				}

				// Check for the 'layout' property in the front-matter
				// data.  If no layout property is included then
				// this method doesn't need to do anything.
				if( matterData.layout !== null && matterData.layout !== "null" ) {

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
				me.log( "debug", "apply.layout.html", "      -> Applying layout '" + layoutName + "' to a HTML content file" );

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
				me.log( "debug", "apply.layout.md", "      -> Applying layout '" + layoutName + "' to a Markdown content file" );

				// Prepend the layout partial inclusion tag
				// and surround the content with bodyContent tags
				ret = 	"{@notmd}{>\"" + layoutName + "\"/}" +
						"{<bodyContent}{/notmd}\n\n" +
							content +
						"\n\n{@notmd}{/bodyContent}{/notmd}";

				// Finished
				return ret;

			},

			/**
			 * Sets the default layout for content files.  Once set, the default layout
			 * will be used if a content file does not specify a layout.
			 *
			 * @instance
			 * @access public
			 * @param {?string} [newVal=null] The default layout to use.  If NULL is passed
			 * then the default layout will be removed.
			 * @returns {void}
			 */
			setDefaultLayout: function( newVal ) {

				var me = this;

				// Sanitize newVal
				if( newVal === undefined || tipe(newVal) !== "string" ) {
					newVal = null;
				}

				// Log it
				if( newVal === null ) {
					me.log("debug", "default.set.null", "Default layout set to: <null> (none)");
				} else {
					me.log("debug", "default.set", "Default layout set to: '" + newVal + "'");
				}

				// Store the value
				me.$$defaultLayout = newVal;

			},

			/**
			 * Returns the current "default layout" setting.
			 *
			 * @instance
			 * @access public
			 * @returns {null|string} Either the default layout or NULL if
			 * no default layout has been set.
			 */
			getDefaultLayout: function() {
				return this.$$defaultLayout;
			}


		}
	}
);
