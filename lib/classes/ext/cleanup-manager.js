/**
 * This class is a "renderer extension" that assists in the
 * management of pre and post render cleanup.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.CleanupManager
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
var tipe 	= require( "tipe" 		);
var fs		= require( "fs-extra" 	);

Promise.promisifyAll( fs );

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.CleanupManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.CleanupManager **/ {

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
				me.setLogTopic("cleanup.manager");

				// Clear the tracker
				me.clearTracker();

				// Set defaults
				me.setEnabled( false );
				me.setCleanMode( "after" );

			},

			/**
			 * Clears the output file tracker.  "Tracked files" are those
			 * that were produced by the renderer during a render operation
			 * and will be preserved in the post-render cleanup (if it is
			 * executed).
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearTracker: function() {

				var me = this;
				me.$$tracked = {};

			},

			/**
			 * Adds one or more files to the tracker.  "Tracked files" are those
			 * that were produced by the renderer during a render operation
			 * and will be preserved in the post-render cleanup (if it is
			 * executed).
			 *
			 * @instance
			 * @access public
			 * @param {Dasix.grits.File|Dasix.grits.File[]} file The file to add to the tracker
			 * @returns {void}
			 */
			addTrackedFile: function( file ) {

				// Locals
				var me = this;

				// Validate the 'file' param
				if( file === undefined || file === null ) {

					// The file param must be provided
					throw new Error("CleanupManager.addTrackedFile() was passed an empty file param.");

				} else if( tipe( file ) === "array" ) {

					// If an array is passed, we will send each element through individually
					_.each( file, function( f ) {
						me.addTrackedFile( f );
					});

				} else if( tipe( file ) === "object" && file.classname !== undefined && file.classname === "Dasix.grits.File" ) {

					// We only accept proper file objects
					me._addTrackedFileObject( file );

				} else {

					// The file param must be a Dasix.grits.File object, or an array of them
					throw new Error("CleanupManager.addTrackedFile() was passed an invalid file.");

				}

			},

			/**
			 * Adds a single file object to the tracker.  This method should not
			 * be called directly; use {@link Dasix.grits.ext.CleanupManager#addTrackedFile}
			 * instead.
			 *
			 * @instance
			 * @access public
			 * @param {Dasix.grits.File} file The file to add to the tracker
			 * @returns {void}
			 */
			_addTrackedFileObject: function( file ) {

				// Locals
				var me = this;

				// Add the file to the tracked file store
				var abs = file.getAbsoluteFilePath();
				me.$$tracked[ abs ] = file;

			},

			/**
			 * Enables or disables output cleaning.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [enable=true] When set to TRUE, output will be cleaned
			 * either before or after a render operation (see `#setCleanMode`);
			 * when FALSE, output will not be cleaned before or after a render.
			 * @returns {void}
			 */
			setEnabled: function( enable ) {

				// Locals
				var me = this;

				// Coerce 'enable' param
				if( enable === undefined || enable === null || enable !== false ) {
					enable = true;
				}

				// Store the value
				me.$$enabled = enable;

			},

			/**
			 * Returns whether or not output cleaning is enabled.
			 *
			 * @instance
			 * @access public
			 * @returns {boolean}
			 */
			isEnabled: function() {

				// Locals
				var me = this;

				// Store the value
				return me.$$enabled;

			},

			/**
			 * Sets the "cleanup mode" (or strategy).
			 *
			 * @instance
			 * @access public
			 * @param {string} [mode="after"] Can either be "after" (default)
			 * or "before".  When set to "after", the renderer will clear any
			 * files from the output paths that it did not create (aka "untracked files").
			 * When set to "before", the renderer will empty the output directories
			 * before rendering. Although both strategies produce the same result,
			 * the "after" strategy will usually be slightly better since it
			 * will allow the renderer to skip unchanged static files.
			 * @returns {void}
			 */
			setCleanMode: function( mode ) {

				// Locals
				var me = this;

				// Coerce mode param
				if( mode === undefined || mode === null || mode !== "before" ) {
					mode = "after";
				}

				// Store the value
				me.$$cleanMode = mode;

			},

			/**
			 * Returns the current "cleanup mode".
			 *
			 * @see Dasix.grits.ext.CleanupManager#setCleanMode
			 * @instance
			 * @access public
			 * @returns {string} Either "before" or "after"
			 */
			getCleanMode: function() {
				var me = this;
				return me.$$cleanMode;
			},

			/**
			 * *Conditionally* executes a "before" (pre-render) cleanup operation.
			 * This method will not do anything if cleanup is disabled or if
			 * the `cleanMode` is not set to "before".  This method is automatically
			 * called by the renderer before it executes a render operation.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise} A promise that resolved with TRUE if cleanup was performed, FALSE otherwise.
			 */
			condCleanBefore: function() {

				// Locals
				var me = this;
				var enabled = me.isEnabled();
				var mode = me.getCleanMode();

				// Check to see if we should do the cleanup
				if( !enabled || mode !== "before" ) {
					return Promise.resolve( false );
				}

				// Execute the pre-render cleanup operation
				return me.doCleanBefore();

			},

			/**
			 * *Conditionally* executes an "after" (post-render) cleanup operation.
			 * This method will not do anything if cleanup is disabled or if
			 * the `cleanMode` is not set to "after".  This method is automatically
			 * called by the renderer after it executes a render operation.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise} A promise that resolved with TRUE if cleanup was performed, FALSE otherwise.
			 */
			condCleanAfter: function() {

				// Locals
				var me = this;
				var enabled = me.isEnabled();
				var mode = me.getCleanMode();

				// Check to see if we should do the cleanup
				if( !enabled || mode !== "after" ) {
					return Promise.resolve( false );
				}

				// Execute the post-render cleanup operation
				return me.doCleanAfter();

			},

			/**
			 * Executes a "before" (pre-render) cleanup operation.  Calling
			 * this method will initiate a cleanup operation regardless of
			 * whether or not the cleanup manager is set to `enabled` and
			 * its mode set to "before".  For a conditional cleanup, use
			 * {@link Dasix.grits.ext.CleanupManager#condCleanBefore} instead.
			 *
			 * This method will cleans the target output directories.  It will ensure
			 * that all output directories exist but that they are entirely empty.
			 * Because this method will completely empty the output directories,
			 * it should not be called after a render operation has completed, as
			 * it will delete all of the files created by the renderer.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			doCleanBefore: function() {

				// Locals
				var me = this;
				var grits = me.getGrits();

				// Pre-operation Event
				me.emit( "beforePreClean" );

				// Say Hello
				me.log( "debug", "pre.start", "Cleaning all output paths (pre-render cleanup)" );

				// Get a list of output paths
				var paths = grits.getOutputPaths();

				// Iterate over each output path
				_.each( paths, function( outputPath ) {

					// Log it
					me.log( "debug", "pre.path", " -> Clean Path    : " + outputPath );

					// Clean the target directory
					fs.emptyDirSync( outputPath );

				});

				// Post-operation Event
				me.emit( "afterPreClean" );

				// Return a Promise
				return Promise.resolve( true );


			},

			/**
			 * Executes an "after" (post-render) cleanup operation.  Calling
			 * this method will initiate a cleanup operation regardless of
			 * whether or not the cleanup manager is set to `enabled` and
			 * its mode set to "after".  For a conditional cleanup, use
			 * {@link Dasix.grits.ext.CleanupManager#condCleanAfter} instead.
			 *
			 * During a render operation, the renderer will tell the cleanup
			 * manager about all of the files being created.  This method will
			 * remove any files that were not provided to it ("tracked").
			 * Because of the dependency on notifications from the renderer, this
			 * method should never be called before a render operation.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			doCleanAfter: function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("output");

				// Pre-operation Event
				me.emit( "beforePostClean" );

				// Say Hello
				me.log( "debug", "post.start", "Cleaning all untracked files (post-render cleanup)" );

				// Iterate over each resource
				return col.eachResource( me._checkOneOutputFile.bind(me) ).then(
					function( resourceFiles ) {

						// Emit Post-operation Event
						//me.emit( "afterLoadFilters", { dust: grits.dust, filters: grits.dust.filters, resourceFiles: resourceFiles, resourcePathCollection: col } );

						// Post-operation Event
						me.emit( "afterPostClean" );

						// Finished
						return true;

					}
				);

			},

			_checkOneOutputFile: function( file ) {

				// Locals
				var me = this;
				var tracked = me.$$tracked;
				var abs = file.getAbsoluteFilePath();

				if( tracked[ abs ] === undefined ) {
					me.log( "info", "file.removed", " -> Removing File : " + abs );
					return fs.unlinkAsync( abs );
				} else {
					return Promise.resolve( true );
				}

			}

		}

	}

);
