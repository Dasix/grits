/**
 * This class is a "renderer extension" that assists in the
 * management of static content.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.StaticContentManager
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
var fs		= require( "fs-extra" 	);
var pth		= require( "path" 		);
var tipe	= require( "tipe"		);

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.StaticContentManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.StaticContentManager **/ {

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
				me.setLogTopic("static.manager");

			},

			/**
			 * Provides the collection settings for statics, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				return {
					short          : "static",
					name           : "Dedicated Static Content Path",
					defaultSubdir  : null,
					scanExtensions : null,
					//scanExtensions : [ "png", "jpg", "gif", "bmp", "*" ],
					methodName     : "StaticContent"
				};

			},

			/**
			 * Loads all statics. This is the main entry point for the
			 * static content manager's part in render operations.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			copyAll: function() {

				// Locals
				var me = this;

				// Emit Pre-operation Event
				me.emit( "beforeCopyStatic" );

				return Promise.resolve().then(

					function() {

						// First, copy all in-line static content
						return me._copyInlineContent();

					}

				).then(

					function() {

						// Next, copy all dedicated static content
						return me._copyDedicatedContent();

					}

				).then(

					function() {

						// Emit Post-operation Event
						me.emit( "afterCopyStatic" );

					}


				);

			},

			// --

			/**
			 * Copies all static content files from the 'content' directories.
			 * Any file that is not considered as a source dust.js template file
			 * will be considered as static content.  In-line static content will be
			 * given an identical output directory structure as its input
			 * directory structure.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_copyInlineContent: function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();

				// Notice we use 'content' here; we're looking for static
				// content that is embedded within the content templates.
				var col 	= grits.getPathCollection("content");

				// Create a special scan config since we
				// want ALL files, not just those defined by the
				// content collection.
				var scanConfig = {
					extensions: null
				};

				// We store the actual extensions for content templates
				// in a cache to cut back on method calls.  This is implemented
				// later (see: #_isContentTemplate) but the cache is reset here.
				me._resetScanExtensionCache();

				// Emit Pre-operation Event
				me.emit( "beforeCopyInlineStatic" );

				// Log it
				me.log( "Scanning for in-line static content" );

				// Iterate over each resource
				return col.eachResource( me._handleOneInlineFile.bind(me), scanConfig ).then(

					function() {

						// Emit Post-operation Event
						me.emit( "afterCopyInlineStatic" );

					}
				);

			},

			/**
			 * This method is executed for each file, regardless of its
			 * extension, within the "content" paths.  The goal is to separate
			 * content templates, which will not be copied, from static content
			 * files, which will be copied.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file
			 * @returns {Promise}
			 */
			_handleOneInlineFile: function( file ) {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();

				if( me._isContentTemplate( file ) ) {

					// When copying inline static content, we will ignore
					// any content templates.  Thus, we simply return
					// a resolved promise here.
					return Promise.resolve();

				} else {

					// For static content files we will initiate
					// a file copy operation.  That operation will
					// be returned as a pending promise.
					return me._copyOneStaticFile( file );

				}

			},

			/**
			 * Copies a single static resource file.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} srcFile The file to copy.
			 * @param {?string} [relativeTarget=""] A path relative to each output
			 * path in which the static file will be placed.
			 * @returns {Promise}
			 */
			_copyOneStaticFile: function( srcFile, relativeTarget ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();
				var abs 		= srcFile.getAbsoluteFilePath();
				var outputPaths = grits.getOutputPaths();
				var copyOps 	= [];

				// Default the relative target param
				if( relativeTarget === undefined || relativeTarget === null || tipe( relativeTarget ) !== "string" ) {
					relativeTarget = "";
				}

				me.log( "Copying static resource: " + abs );

				if( relativeTarget !== "" ) {
					me.log( " -> Rel Target: '" + relativeTarget + "'" );
				}

				// Copy the static file.  Since Grits allows multiple output
				// directories (copies), we will copy the file to each.
				_.each( outputPaths, function( dPath ) {

					if( relativeTarget !== "" ) {
						dPath = pth.join( dPath, relativeTarget );
					}

					// Create a new Dasix.grits.File object
					// for the target output file.
					var destFile = new Dasix.grits.File(
						dPath, srcFile.getRelativePath(), srcFile.getFilename()
					);

					// Determine the absolute output path for the file
					var destFilePath = destFile.getAbsoluteFilePath();

					// Ensure the target output directory exists
					destFile.createDirectoryPath();

					// Create the file copy operation
					me.log( " -> Copying to: '" + destFilePath + "'" );
					var copyOp = fs.copyAsync( abs, destFilePath );

					// Append the copy operation
					copyOps.push( copyOp );

					// Tell the cleanup manager about this file
					grits.cleanupManager.addTrackedFile( destFile );

				});

				return Promise.all( copyOps );

			},

			/**
			 * This method resets the cache used by `#_getTemplateExtensions`.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_resetScanExtensionCache: function() {

				var me = this;
				me.$$templateExtensionCache = null;

			},

			/**
			 * Gets the file extensions used by "content templates".
			 * This method uses a cache for efficiency.
			 *
			 * @instance
			 * @access private
			 * @returns {array} The file extensions used by content templates.
			 */
			_getTemplateExtensions: function() {

				// Locals
				var me = this;
				var grits, col, cfg;

				// If the cache does not already exist, we will create it..
				if( me.$$templateExtensionCache === undefined || me.$$templateExtensionCache === null ) {

					// Get the Grits Renderer
					grits = me.getGrits();

					// Grab the resource collection for content files
					col = grits.getPathCollection("content");

					// Store the scan extensions in a cache
					me.$$templateExtensionCache = col.getScanExtensions();

				}

				// Finished
				return me.$$templateExtensionCache;

			},

			/**
			 * Checks a file to see if it is a content template file.
			 * This method is used when copying "inline static content"
			 * (static content embedded within the content template source)
			 * to ensure that content template source files (e.g. index.md)
			 * are not copied as static content.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The file to check
			 * @returns {boolean} TRUE if the target file is a content template; false otherwise.
			 */
			_isContentTemplate: function( file ) {

				// Locals
				var me = this;
				var isTemplate = false;

				// Fetch the file extensions used by content templates
				var templateExtensions = me._getTemplateExtensions();

				// Check our file to see if it matches any of those
				// extensions; if so, its a content template.
				_.each( templateExtensions, function( ext ) {
					if( file.is( ext ) ) {
						isTemplate = true;
					}
				});

				// Finished
				return isTemplate;

			},


			// --

			/**
			 * Copies all "dedicated" (as opposed to "inline") static content files.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_copyDedicatedContent : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("static");

				// Emit Pre-operation Event
				me.emit( "beforeCopyDedicatedStatic" );

				// Log it
				me.log( "Scanning for dedicated static content" );

				// Iterate over each resource
				return col.eachResource( me._handleOneDedicatedFile.bind(me) ).then(

					function() {

						// Emit Post-operation Event
						me.emit( "afterCopyDedicatedStatic" );

					}

				);

			},

			/**
			 * This method is called once for each file within the
			 * dedicated, static content, resource paths.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The source file
			 * @param {object} detailed The detailed resource file match result
			 * @param {object[]} allFiles All matched resources (detailed)
			 * @param {Dasix.grits.ResourcePathCollection} collection The resource collection
			 * @returns {Promise}
			 */
			_handleOneDedicatedFile: function( file, detailed, allFiles, collection ) {

				// Locals
				var me 			= this;
				var promises 	= [];

				// Dedicated static source files may be matched by more
				// than one resource path and each resource path may have
				// a different target.  So, we'll need to iterate over each
				// match and send each to the copy method.
				_.each( detailed.matches, function( match ) {

					var rp = match.scan.resourcePath;
					var rpCfg = rp.getConfig();
					var target;

					if( rpCfg.target === undefined ) {
						target = null;
					} else {
						target = rpCfg.target;
					}

					promises.push( me._copyOneStaticFile( file, target ) );

				});

				return Promise.all( promises );

			}

		}

	}

);
