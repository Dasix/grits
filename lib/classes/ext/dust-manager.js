/**
 * This class is a "renderer extension" that assists in the management of
 * dust compilation and rendering.  See {@link Dasix.grits.AbsRenderExtension}
 * to learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.DustManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.5.5
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
var dust	= require( "dustjs-linkedin" );
var helpers = require( "dustjs-helpers" );
var pth		= require( "path" );

Promise.promisifyAll( fs );

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.DustManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.DustManager **/ {

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

				// Store a reference to dust
				me.dust = dust;

				// Configure Dust.js
				me.dust.config.whitespace = true;

				// Set the log topic for this extension
				me.setLogTopic("dust.manager");

			},

			/**
			 * Provides the collection settings for dust source files, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				var contentExtensions = ["dust","md","html"];

				return {
					short          : "content",
					name           : "Content Source Path",
					defaultSubdir  : "content",
					scanExtensions : contentExtensions,
					methodName     : "Content"
				};

			},

			/**
			 * Renders a string as a virtual source file.
			 * Important note: The can only be called after a full render() operation;
			 * if render() has not been called, this method will call it before
			 * rendering the string.
			 *
			 * @param {string} sourceFilename A filename for the input string.  This
			 * is necessary because the renderer makes a few decisions based on the
			 * filename of the content it is rendering (like, whether or not to parse
			 * the content as markdown).  The source filename also affects the
			 * destination paths and filenames if `renderToFile` is TRUE.
			 * @param source
			 * @param renderToFile
			 * @returns {Promise}
			 */
			renderString: function( sourceFilename, source, renderToFile ) {

				var me = this;
				var grits = me.getGrits();
				var init;

				// This method won't work properly unless the render op
				// has been executed prior, so if it has not been executed
				// we will do that now.
				if( grits.hasRendered === true ) {
					init = Promise.resolve( grits );
				} else {
					me.log("Important! Forcing prerequisite render() operation for renderString()");
					init = grits.render();
				}

				return init.then(

					function() {

						// Create the source file
						var srcFile 		= me._createVirtualSourceFile( sourceFilename );

						// Resolve the template name
						var templateName 	= srcFile.getRelativeBaseName();

						// Compile the content
						me.compileString( templateName, source, srcFile, true );

						// Render the content
						return me.renderOne( srcFile, renderToFile ).then(

							function( renderResult ) {

								if( renderToFile ) {
									return renderResult;
								} else {
									return renderResult.output;
								}

							}

						);

					}

				);

			},

			/**
			 * Creates a `Dasix.grits.File` using only a filename; this is
			 * used by `renderString()` to create a virtual content file
			 * that will be passed to the Dust compiler and renderer.
			 *
			 * @instance
			 * @access private
			 * @param {string} sourceFilename The filename for the virtual path
			 * @returns {Dasix.grits.File}
			 */
			_createVirtualSourceFile: function( sourceFilename ) {

				// Locals
				var relativePath, spl;

				// Derive the relative path of the file
				if( sourceFilename.indexOf( pth.sep ) !== -1 ) {
					spl = sourceFilename.split( pth.sep );
					sourceFilename = spl.pop();
					relativePath = spl.join( pth.sep );
				} else {
					relativePath = "";
				}

				return new Dasix.grits.File(
					process.cwd(), relativePath, sourceFilename
				);

			},

			/**
			 * Loads and compiles all of the 'content' files.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			compileAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("content");

				// Initial log message
				me.logOpStart("Compiling Content");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("Notice: No content source files were found or loaded!");
					}
				};

				// Emit Pre-operation Event
				me.emit( "beforeCompileContent" );

				// Iterate over each resource
				return col.eachResource( me._compileOneContentFile.bind(me), scanOpts ).then(

					function() {

						// Add watch config
						me._addWatchConfig({
							resourceCollection: col,
							handler: me._handleWatchUpdate.bind(me),
							someSetting: "set in dust manager"
						});

						// Post-operation Events
						me.emit( "afterCompileContent", { dust: dust } );

					}

				);

			},

			/**
			 * Similar to `#compileOne` except this method was designed
			 * for content files, whereas `#compileOne` is also used for compiling
			 * partials, layouts, etc..
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file
			 * @returns {void}
			 */
			_compileOneContentFile: function( file ) {

				// Locals
				var me = this;

				// Compile the template
				me.compileOne(
					file.getRelativeBaseName(),
					file,
					true
				);

			},

			/**
			 * When watching is enabled, this method will be called
			 * whenever a watch event is triggered.
			 *
			 * @instance
			 * @access private
			 * @param eventName
			 * @param target
			 * @param extra
			 * @private
			 */
			_handleWatchUpdate: function( eventName, target, extra ) {

				var me = this;

				if( eventName === "add" || eventName === "change" ) {
					var file = extra.fileObject;

					if( file !== null ) {
						me._compileOneContentFile( file );
						me.renderOne( file, true );
					}
				}

			},

			/**
			 * Compiles a single template (or partial) and adds it to Dust.js
			 *
			 * @instance
			 * @access private
			 * @param {string} name The name of the template
			 * @param {Dasix.grits.File} srcFile The source file to be compiled
			 * @param {boolean} [parseFrontMatter=false] When TRUE the file will
			 * be parsed for "front matter" (using the `gray-matter` library)
			 * before being compiled by DustJS.
			 * @returns {void}
			 */
			compileOne : function( name, srcFile, parseFrontMatter ) {

				// Locals
				var me = this;

				// Read the file
				var src = srcFile.readSync();

				// Defer to #compileString
				me.compileString( name, src, srcFile, parseFrontMatter );

			},

			/**
			 * Compiles a single template (or partial) and adds it to Dust.js
			 *
			 * @instance
			 * @access private
			 * @param {string} name The name of the template
			 * @param {string} src The template file content
			 * @param {Dasix.grits.File} srcFile The source file to be compiled
			 * @param {boolean} [parseFrontMatter=false] When TRUE the file will
			 * be parsed for "front matter" (using the `gray-matter` library)
			 * before being compiled by DustJS.
			 * @returns {void}
			 */
			compileString : function( name, src, srcFile, parseFrontMatter ) {

				// Locals
				var me 				= this;
				var matterData 		= null;
				var grits			= me.getGrits();
				var debugMarkdown 	= false;
				var markdownNote 	= "";

				// Default the parseFrontMatter param
				if( parseFrontMatter === undefined || parseFrontMatter !== true ) {
					parseFrontMatter = false;
				}

				// Log the info we have so far
				me.log( "Compiling content file..");
				me.log( " -> Source    : " + srcFile.getAbsoluteFilePath() );
				me.log( " -> Long Name : " + srcFile.getRelativeBaseName() );

				// Front-Matter Handling
				if( parseFrontMatter ) {

					me.log( " -> [ Checking template: '" + name + "' for front-matter ]" );

					// Parse the front-matter
					matterData = grits.dataManager.parseMatter( src, name );

					// Get the new source (with front-matter removed)
					src = matterData.content;

					// Apply a 'layout' template, if applicable..
					src = grits.layoutManager.applyLayout( src, matterData.data, srcFile.is("md") );

				}

				// Markdown Processing
				if( srcFile.is("md") ) {

					// Markdown Debugging
					if( matterData !== undefined && matterData !== null
						&& matterData.data !== undefined && matterData.data !== null
						&& matterData.data.debugMarkdown !== undefined && matterData.data.debugMarkdown === true ) {
						debugMarkdown = true;
						markdownNote = " <debug enabled>";
					}

					// Log it
					me.log( " -> [ Parsing Markdown for Template: '" + name + "'" + markdownNote + " ]" );

					// Parse the markdown
					src = grits.markdownParser.parse( src, debugMarkdown );

				}

				// Pass to dust wrapper function for the
				// actual dust operations
				me._doDustCompilation( name, src );

			},

			/**
			 * This is a direct wrapper for dust.compile + dust.loadsource
			 *
			 * @instance
			 * @access private
			 * @param {string} templateName The name of the template
			 * @param {string} source The template file content.  The template
			 * content should be pre-parsed for front-matter and markdown before
			 * it arrives here.
			 * @returns {void}
			 */
			_doDustCompilation: function( templateName, source) {

				// Locals
				var me = this;

				// Logging for Compilation
				me.log( " -> [ Compiling template: '" + templateName + "' ]" );

				// Compile the Source as a Dust.js Template
				try {

					// Compile the template
					var compiled = me.dust.compile( source, templateName );

				} catch( err ) {

					// Handle Dust compile errors
					var errMessage = "Dust Compilation Failure:" + "\n" +
						" -> Template Name: " + templateName + "\n" +
						"\n" +
						err.message;

					me.logError( new vError( errMessage ) );

				}

				// Add the compiled template to the Dust.js store
				me.dust.loadSource( compiled );

			},

			/**
			 * Iterates over, and renders, all source content files.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			renderAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("content");

				// Emit Pre-operation Event
				me.emit( "beforeRenderContent" );

				// Iterate over each resource
				return col.eachResource( me.renderOne.bind( me ) ).then(

					function( resourceFiles ) {

						// Post-operation Events
						me.emit( "afterRenderContent", { dust: me.dust } );

					}

				);

			},

			/**
			 * Renders a single content file.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} srcFile The source file to render
			 * @param {boolean} [renderToFile=true] When TRUE (default) the rendered content
			 * will be output to files within each output directory.  When FALSE,
			 * nothing will be output.
			 * @returns {Promise}
			 */
			renderOne: function( srcFile, renderToFile ) {

				// Locals
				var me 				= this;
				var grits 			= me.getGrits();
				var destFiles		= me._getRenderDestinations( srcFile );
				var templateName 	= srcFile.getRelativeBaseName();
				var renderOps 		= [];

				// default param 'renderToFile'
				if( renderToFile === undefined || renderToFile === null || renderToFile !== false ) {
					renderToFile = true;
				}

				// Log the info we have so far
				me.log("Rendering content file..");
				me.log(" -> Source    : " + srcFile.getAbsoluteFilePath() );
				me.log(" -> Name      : " + srcFile.getBaseName() );
				me.log(" -> Long Name : " + templateName );

				// Define the context
				var context = grits.dataManager.getContextForTemplate( templateName );

				// Render the output.  Since the renderer allows multiple
				// output directories (copies), we will execute one render operation
				// for each output directory.
				_.each( destFiles, function( destFile ) {

					// Determine the absolute output path for the file
					var destFilePath = destFile.getAbsoluteFilePath();

					// Log the destination path
					me.log(" -> Dest      : " + destFilePath );

					// Perform the render op
					renderOps.push(

						me._doDustRender( templateName, context ).then(

							function afterDustRender( renderedContent ) {

								if( renderToFile ) {

									// Log the write operation
									me.log( " -> [ Writing file (" + renderedContent.length + " bytes) ]" );

									// Write the file content
									destFile.writeSync( renderedContent );

									// Tell the cleanup manager about this file
									grits.cleanupManager.addTrackedFile( destFile );

								}

								// Finished
								return {
									output : renderedContent,
									path   : destFilePath
								};

							}

						)

					);

				});

				// Return the promise for all ops
				return Promise.all( renderOps );


			},

			/**
			 * Resolves the render output destinations for a given source file.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} srcFile
			 * @returns {Dasix.grits.File[]}
			 */
			_getRenderDestinations: function( srcFile ) {

				// Locals
				var me 				= this;
				var grits 			= me.getGrits();
				var outputPaths 	= grits.getOutputPaths();
				var ret				= [];

				// Render the output.  Since the renderer allows multiple
				// output directories (copies), we will execute one render operation
				// for each output directory.
				_.each( outputPaths, function( dPath ) {

					// Create a new Dasix.grits.File object for
					// the target output file.
					ret.push( new Dasix.grits.File(
						dPath, srcFile.getRelativePath(), srcFile.getBaseName() + ".html"
					) );

				});

				return ret;

			},

			/**
			 * Renders a dust file.  This is a direct wrapper for dust.render
			 * with a bit of logging logic added and promisification of the
			 * dust render method.
			 *
			 * @instance
			 * @access private
			 * @param {string} templateName The name of the dust template to render.
			 * This should match the name of a template that has already been compiled.
			 * @param {object} context The render context that will be passed to Dust
			 * @returns {Promise} A promise that will be resolved with the output that
			 * was rendered by Dust.
			 */
			_doDustRender: function( templateName, context ) {

				// Locals
				var me = this;

				// Create a promise
				return new Promise(

					function( resolve, reject ) {

						// Execute the render operation
						me.dust.render( templateName, context, function( err, out ) {

							// Handle result
							if( err ) {

								// Handle Dust compile errors
								var errMessage = "Dust Render Failure:" + "\n" +
									" -> Template Name: " + templateName + "\n" +
									"\n" +
									err.message;

								me.logError( new vError( errMessage ) );

							} else {

								// Finished, resolve the promise
								// with the Dust.js output
								resolve( out );

							}

						})

					}

				);

			}


		}

	}

);
