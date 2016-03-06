/**
 * This class is a wrapper for the node-sass module.
 *
 * @todo move to ext
 * @class Dasix.grits.SassRenderer
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require( "qooxdoo" );
var marked = require( "marked" );
var _ = require( "lodash" );
var sass = require( "node-sass" );
var Promise = require( "bluebird" );
var vError = require("verror");

Promise.promisifyAll( sass );

require("./abs-render-extension");
require("./file");

qx.Class.define(

	"Dasix.grits.SassRenderer", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.SassRenderer **/ {

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

			},

			/**
			 * Starts the Sass render operation.
			 *
			 * @returns {Promise}
			 */
			render: function() {

				var me = this;
				var grits = me.getGrits();

				// Stored references and stats
				grits.$$scssStats = {};

				// Pre-operation Events
				me.emit( "beforeRenderSass" );

				// Get all Sass include paths
				var incPaths = grits.getSassIncludePaths();

				// Get all output paths
				var outputPaths = grits.getOutputPaths();

				// Scan for content
				return grits._scanPathType( "sass" ).then(
					function onFiltersScanned ( result ) {

						// Collect the base files
						var files = result.result.files;
						var sourceFiles = [];

						// Remove files that are prefixed with `_`
						_.each( files, function( file ) {
							if( file.getFilename().substr(0,1) !== "_" ) {
								sourceFiles.push( file );
							}
						});

						// Create a render operation for each source file
						var renderOps = [];
						_.each( sourceFiles, function( file ) {

							var op = me._renderOne( file, incPaths, outputPaths );
							renderOps.push( op );

						});

						// Return
						return Promise.all( renderOps ).then(

							function() {

								me.emit( "afterRenderSass", { sassRenderer: me, sourceFiles: sourceFiles, includePaths: incPaths } );

							}

						);

					}
				);

			},

			/**
			 * Renders a single Sass file
			 *
			 * @param srcFile
			 * @param includePaths
			 * @param outputPaths
			 * @returns {*}
			 * @private
			 */
			_renderOne: function( srcFile, includePaths, outputPaths ) {

				// Locals
				var me = this;
				var grits = me.getGrits();
				var filePath = srcFile.getAbsoluteFilePath();
				var sassRenderSettings = {
					file: filePath,
					includePaths: includePaths,
					indentType: "tab",
					indentWidth: 1
				};

				// Stored references and stats
				if( grits.$$scssStats === undefined || grits.$$scssStats === null ) {
					grits.$$scssStats = {};
				}

				// Render
				return sass.renderAsync( sassRenderSettings ).then(
					function( res ) {

						me.log("Read SCSS Source File: " + filePath );

						var cssFiles = srcFile.writeMultipleSync( res.css, outputPaths, "css", "css" );
						_.each( cssFiles, function( cssFile ) {
							me.log("-> Wrote '" + cssFile + "'" );
						});

						grits.$$scssStats[ filePath ] = res.stats;
						grits.$$scssStats[ filePath].outputPaths = cssFiles;

					}
				).catch(

					function( err ) {

						console.log( sassRenderSettings );
						me.logError( vError(err, "Sass Rendering Failed") );

					}

				);

			}

		}
	}
);
