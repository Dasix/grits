/**
 * This class is a wrapper for the sass module.
 *
 * @class Dasix.grits.ext.SassRenderer
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

const qx = require( "qooxdoo" );
const marked = require( "marked" );
const _ = require( "lodash" );
const sass = require( "sass" );
const Promise = require( "bluebird" );
const vError = require("verror");

Promise.promisifyAll( sass );

require("./../abs-render-extension");
require("./../file");

qx.Class.define(

	"Dasix.grits.ext.SassRenderer", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.SassRenderer **/ {

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
				me.setLogTopic("sass.render");

				// Init the stats tracking variable
				me.$$includeRefs = {};

			},

			/**
			 * Provides the collection settings for sass files, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function( pathType ) {

				var ret;

				switch( pathType ) {

					case "sass":
						ret = {
							short          : "sass",
							name           : "Sass Source Files",
							defaultSubdir  : "scss",
							scanExtensions : ["scss"],
							methodName     : "Sass"
						};
						break;

					case "sassi":
						ret = {
							short          : "sassi",
							name           : "Sass Include Path",
							defaultSubdir  : null,
							scanExtensions : null,
							methodName     : "SassInclude"
						};
						break;

				}

				return ret;

			},

			/**
			 * Starts the Sass render operation.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			render : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("sass");

				// Initial log message
				me.logOpStart("Rendering SASS/SCSS");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("info", "found.none", "No SCSS files were found or loaded!");
					}
				};

				// Clean/empty the stats tracking variable
				me.$$includeRefs = {};
				grits.watchManager.resetIndFiles("sass");

				// Emit Pre-operation Event
				me.emit( "beforeRenderSass" );

				// Iterate over each resource
				return col.eachResource( function( file ) {

					return me._renderOne( file );

				}).then(

					function( resourceFiles ) {

						// Add watch config
						me._addCollectionWatcher( col, me._handleWatchUpdateForSource.bind(me) );

						// Emit Post-operation Event
						me.emit( "afterRenderSass", { sassRenderer: me, grits: grits } );

					}

				);

			},

			/**
			 * Renders a single Sass file
			 *
			 * @param srcFile
			 * @returns {*}
			 * @private
			 */
			_renderOne: function( srcFile ) {

				// Locals
				var me 				= this;
				var grits			= me.getGrits();
				var filePath 		= srcFile.getAbsoluteFilePath();
				var outputPaths 	= grits.getOutputPaths();
				var includePaths 	= grits.getSassIncludePaths();

				// Configure the sass renderer
				var sassRenderSettings = {
					file: filePath,
					includePaths: includePaths,
					indentType: "tab",
					indentWidth: 1
				};

				// Don't render files prefixed with _
				if( _.startsWith( srcFile.getFilename(), "_" ) ) {
					return Promise.resolve(true);
				}

				// Render
				return sass.renderAsync( sassRenderSettings ).then(
					function( res ) {

						// Store the references for the watcher
						me._setIncludeRefs( srcFile, res.stats.includedFiles );

						// Log the source file
						me.log("debug", "read", "Read SCSS Source File: " + filePath );

						// Write the files
						var cssFiles = srcFile.writeMultipleSync( res.css, outputPaths, "css", "css" );

						// Log each file written
						_.each( cssFiles, function( cssFile ) {
							me.log("info", "write", "-> Wrote '" + cssFile.getAbsoluteFilePath() + "'" );

							// Fire an event
							me.emit( "onSassRendered", { srcFile: srcFile, destFile: cssFile, sassRenderer: me, sass: sass, renderSettings: sassRenderSettings, result: res } );

						});

						// Tell the cleanup manager about this file
						grits.cleanupManager.addTrackedFile( cssFiles );

						// Tell the live reload server about this file
						grits.reloadServer.onFileUpdated( cssFiles );


					}
				).catch(

					function( err ) {

						me.logWarning( vError(err, "Sass Rendering Failed") );

					}

				);

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
			_handleWatchUpdateForSource: function( eventName, file, extra ) {

				var me 				= this;

				if( eventName === "add" || eventName === "change" ) {

					// Reload handler
					me._renderOne( file );

				}

			},

			/**
			 * Called by the watch manager when individual INCLUDE files are updated.
			 *
			 * @instance
			 * @access private
			 * @param {string} eventName Can be "add", "change", or "unlink"
			 * @param {string} watchFileAbs The absolute file path of the file that triggered the watch event.
			 * @returns {void}
			 */
			_handleWatchUpdateForInclude: function( eventName, watchFileAbs ) {

				// Locals
				var me 			= this;
				var toRender 	= {};

				// Log the start
				me.log( "debug", "ref.check", "Checking for SCSS that references '" + watchFileAbs + "'" );

				// Iterate over each source file
				_.each( me.$$includeRefs, function( refData, sourceFileAbs ) {

					// Iterate over each include file related to the source file
					_.each( refData.refs, function( includeFileAbs ) {

						// If the include is referenced by the source file...
						if( watchFileAbs === includeFileAbs ) {

							// Add the source file to the "to be re-rendered" list
							toRender[ sourceFileAbs ] = refData.file;

							// Log the hit
							me.log("debug", "ref.found", "  -> Referenced By: '" + sourceFileAbs + "'");
						}

					});
				});

				// Iterate over the "to be re-rendered" list
				_.each( toRender, function( file, abs ) {

					// Re-render the file
					me._renderOne( file );

				});

			},


			_setIncludeRefs: function( srcFile, includedFiles ) {

				var me 		= this;
				var grits 	= me.getGrits();
				var abs 	= srcFile.getAbsoluteFilePath();
				var handler = me._handleWatchUpdateForInclude.bind(me);
				var refs	= {};

				_.each( includedFiles, function( includeAbsPath ) {
					if( includeAbsPath !== abs ) {
						grits.watchManager.addIndHandler( "sass", includeAbsPath, handler );
						refs[ includeAbsPath ] = includeAbsPath;
					}
				});

				me.$$includeRefs[ abs ] = {
					file: srcFile,
					refs: refs
				};

			}

		}
	}
);
