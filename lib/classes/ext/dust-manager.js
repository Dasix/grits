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
				me._initDust();

				// Set the log topic for this extension
				me.setLogTopic("dust.manager");

				// Create dust.onLoad handler
				me.dust.onLoad = me._dustOnLoad.bind( me );

				// Init touch data
				me.$$refData = {};

				// Notify _setActiveRenderFile
				me._setActiveRenderFile( null );

			},

			/**
			 * Initializes a new dust object and store it as `this.dust`.
			 *
			 * @instance
			 * @access private
			 * @returns {dust}
			 */
			_initDust: function() {

				// Locals
				var me = this;

				// Load dust
				var dust	= require( "dustjs-linkedin" );
				var helpers = require( "dustjs-helpers" );

				// Capture factory dust config, this will
				// be used by `#_getFactoryDustConfig()`
				me.$$factoryDustConfig = _.clone( dust.config );

				// Create a clone
				// causing issues :( .... me.dust = _.cloneDeep(dust);
				me.dust = dust;

				// Return the new object
				return me.dust;

			},

			/**
			 * Returns the "factory" configuration for Dust.js.  This default configuration
			 * represents the absolute Dust.js defaults, as provided by the module itself.
			 *
			 * @instance
			 * @access private
			 * @returns {{whitespace: boolean, amd: boolean, cjs: boolean, cache: boolean}}
			 * @private
			 */
			_getFactoryDustConfig: function() {

				// Locals
				var me = this;

				// We return a clone to avoid byRef overwrites of our
				// stored factory config, as it should never change.
				return _.clone( this.$$factoryDustConfig );

			},

			/**
			 * Returns the "default" configuration for Dust.js.  This configuration
			 * represents the default Dust.js settings for Grits.js, which will be
			 * _slightly_ different from the factory config (from `#_getFactoryDustConfig()`).
			 *
			 * @instance
			 * @access private
			 * @returns {{whitespace: boolean, amd: boolean, cjs: boolean, cache: boolean}}
			 * @private
			 */
			_getDefaultDustConfig: function() {

				// Locals
				var me = this;

				// Load factory config
				var cfg = me._getFactoryDustConfig();

				// Apply our custom default values
				cfg.whitespace = true;

				// All done
				return cfg;

			},

			/**
			 * Returns the "base" configuration for Dust.js.  This is the "default"
			 * configuration (from `#_getDefaultDustConfig()`) with any updates
			 * provided through `grits#setConfig()` (or a configuration file).
			 * Each Dust.js render will use this configuration unless overrides
			 * are provided in the front-matter.
			 *
			 * @instance
			 * @access private
			 * @returns {{whitespace: boolean, amd: boolean, cjs: boolean, cache: boolean}}
			 * @private
			 */
			_getBaseDustConfig: function() {

				// Locals
				var me = this;
				var final;

				// Load default config
				var cfg = me._getDefaultDustConfig();

				// Load config overrides
				var ov = me.getComponentConfig("dust");

				// Apply values from the Grits config and return
				return _.defaults( {}, ov, cfg );

			},

			/**
			 * Returns the Dust.js configuration object for a single page; this is
			 * called immediately before a Dust.js compilation op.  This method will
			 * combine the "base" Dust.js configuration from `#_getBaseDustConfig()`
			 * with any configuration options provided in the front-matter of the
			 * page being compiled.
			 *
			 * @instance
			 * @access private
			 * @param {?object} [whiteMatter] The white matter object from the page being rendered.
			 * @returns {{whitespace: boolean, amd: boolean, cjs: boolean, cache: boolean}}
			 */
			_getDustConfigForPage : function( whiteMatter ) {

				// Locals
				var me = this;
				var cfg = me._getBaseDustConfig();

				// Apply the Dust configuration from matter data, if it exists..
				if( !_.isNil( whiteMatter )
					&& tipe( whiteMatter ) === "object"
					&& tipe( whiteMatter.data ) === "object"
					&& tipe( whiteMatter.data.config ) === "object"
					&& tipe( whiteMatter.data.config.dust ) === "object" ) {

					// Apply the front-matter config
					_.each( whiteMatter.data.config.dust, function( configValue, configKey ) {
						cfg[ configKey ] = configValue;
					});
				}

				// Return the config
				return cfg;

			},

			/**
			 * Applies a configuration object to Dust.js.  This is usually
			 * called immediately before a Dust.js compilation op.
			 *
			 * @instance
			 * @access public
			 * @param {object} config A Dust.js configuration object
			 * @returns {void}
			 */
			_configureDust: function( config ) {

				// Locals
				var me = this;

				if( tipe( config ) === "object" ) {
					_.each( config, function( configValue, configKey ) {

						// Ensure the setting exists..
						if( me.dust.config[ configKey ] !== undefined ) {

							// Ensure the value is the correct type
							if( tipe( configValue ) == tipe( me.dust.config[ configKey ] ) ) {
								me.dust.config[ configKey ] = configValue;
							}

						}

					});
				}

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
						me._addCollectionWatcher( col, me._handleWatchUpdate.bind(me) );

						// Post-operation Events
						me.emit( "afterCompileContent", { dust: me.dust } );

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
			 * @param file
			 * @param extra
			 * @private
			 */
			_handleWatchUpdate: function( eventName, file, extra ) {

				var me = this;

				if( eventName === "add" || eventName === "change" ) {
					me._compileOneContentFile( file );
					me.renderOne( file, true );
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
				me.log( "Compiling content..");
				me.logObject({
					"Filename"		: srcFile.getAbsoluteFilePath(),
					"Template Name"	:  name
				});

				// Front-Matter Handling
				if( parseFrontMatter ) {

					me.log( "  -> [ Checking template: '" + name + "' for front-matter ]" );

					// Parse the front-matter
					matterData = grits.dataManager.parseMatter( src, name );

					// Get the new source (with front-matter removed)
					src = matterData.content;

					// Apply a 'layout' template, if applicable..
					src = grits.layoutManager.applyLayout( src, matterData.data, srcFile.is("md") );

					// Emit event for matter data
					me.emit( "onFrontMatterParsed", { content: src, srcFile: srcFile, templateName: name, dustManager: me, frontMatter: matterData } );

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
					me.log( "  -> [ Parsing Markdown for Template: '" + name + "'" + markdownNote + " ]" );

					// Emit event for markdown parsing
					me.emit( "beforeMarkdownParse", { content: src, srcFile: srcFile, templateName: name, dustManager: me, frontMatter: matterData, markdownParser: grits.markdownParser, debugMarkdown: debugMarkdown } );

					// Parse the markdown
					var beforeMdParse = src;
					src = grits.markdownParser.parse( src, debugMarkdown );

					// Emit event for markdown parsing
					me.emit( "onMarkdownParsed", { contentBefore: src, contentAfter: src, srcFile: srcFile, templateName: name, dustManager: me, frontMatter: matterData, markdownParser: grits.markdownParser, debugMarkdown: debugMarkdown } );

				}

				// Configure Dust.js
				var dustConfig = me._getDustConfigForPage( matterData );
				me._configureDust( dustConfig );

				// Pass to dust wrapper function for the
				// actual dust operations
				var compiled = me._doDustCompilation( name, src );

				// Store the compiled template
				me._storeCompiledTemplate( srcFile, name, compiled );

				// Fire an event
				me.emit( "onDustCompile", { content: src, srcFile: srcFile, templateName: name, dustManager: me, frontMatter: matterData } );


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

						// Notify _setActiveRenderFile
						me._setActiveRenderFile( null );

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

				// We will not render files prefixed with an underscore( _ )
				// See: https://github.com/Dasix/grits/issues/51
				if( _.startsWith( srcFile.getFilename(), "_" ) ) {
					return Promise.resolve([]);
				}

				// default param 'renderToFile'
				if( renderToFile === undefined || renderToFile === null || renderToFile !== false ) {
					renderToFile = true;
				}

				// Log the info we have so far
				me.log( "Rendering content..");
				me.logObject({
					"Source"			: srcFile.getAbsoluteFilePath(),
					"Name"				: srcFile.getBaseName(),
					"Template Name"		: templateName
				});

				// Notify _setActiveRenderFile()
				if( renderToFile ) {
					me._setActiveRenderFile( srcFile );
				} else {
					me._setActiveRenderFile( null );
				}

				// Define the context
				var context = grits.dataManager.getContextForTemplate( templateName );

				// Configure Dust.js
				var dustConfig = me._getDustConfigForPage( { data: context } );
				me._configureDust( dustConfig );

				// Render the output.  Since the renderer allows multiple
				// output directories (copies), we will execute one render operation
				// for each output directory.
				_.each( destFiles, function( destFile ) {

					// Determine the absolute output path for the file
					var destFilePath = destFile.getAbsoluteFilePath();

					// Log the destination path
					me.logKeyVal( "Destination", destFilePath );

					// Perform the render op
					renderOps.push(

						me._doDustRender( templateName, context ).then(

							function afterDustRender( renderedContent ) {

								if( renderedContent !== null && renderToFile ) {

									// Log the write operation
									me.log( "Writing file: '" + destFilePath + "' (" + renderedContent.length + " bytes) ]" );

									// Write the file content
									destFile.writeSync( renderedContent );

									// Tell the cleanup manager about this file
									grits.cleanupManager.addTrackedFile( destFile );

									// Tell the live reload server about this file
									grits.reloadServer.onFileUpdated( destFile );

								}

								// Fire an event
								me.emit( "onDustRender", { content: renderedContent, srcFile: srcFile, destFile: destFile, dustManager: me, context: context } );

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



			// --- wrappers ----------------------------------------------------



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
				var grits;

				// Create a promise
				return new Promise(

					function( resolve, reject ) {

						// Execute the render operation
						me.dust.render( templateName, context, function( err, out ) {

							// Handle result
							if( err ) {

								// Handle Dust compile errors
								var errMessage = "Dust Render Failure:" + "\n" +
									" -> Template Name  : " + templateName + "\n";

								// Append the active render file
								if( me.$$activeRenderFile !== null ) {
									errMessage += " -> Content Source : " + me.$$activeRenderFile.getAbsoluteFilePath() + "\n";
								}

								// Append the error
								errMessage += "\n" + err.message;

								// Log the "warning"
								me.logWarning( new vError( errMessage ) );
								resolve( null );

							} else {

								// Finished, resolve the promise
								// with the Dust.js output
								resolve( out );

							}

						})

					}

				);

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
				me.log( "  -> [ Compiling template: '" + templateName + "' ]" );

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

				// Return the compiled template
				return compiled;

			},

			/**
			 * Stores a template after compilation..
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} srcFile
			 * @param {string} templateName
			 * @param {object} compiled
			 * @private
			 */
			_storeCompiledTemplate: function( srcFile, templateName, compiled ) {

				// Locals
				var me = this;

				// Initialize the store
				if( me.$$templateStore === undefined ) {
					me.$$templateStore = {};
				}

				// Our goal is to wrap the dust.js cache so that we get
				// a little notice every time a template is loaded.
				// So, we're going to use dust to fully compile and load
				// the template, first.
				me.dust.loadSource( compiled );

				// Now we're going to store our own reference to the
				// fully compiled template.
				me.$$templateStore[ templateName ] = {
					name: templateName,
					file: srcFile,
					compiled: me.dust.cache[ templateName ]
				};

				// Finally, we take the template away from dust
				// so that dust will call _dustOnLoad for the template.
				// (it only calls dust.onLoad when a template is missing)
				delete me.dust.cache[ templateName ];

			},

			/**
			 * Called by dust.onLoad for each template, partial, and layout
			 * that gets loaded.  This method should never be called directly.
			 *
			 * @instance
			 * @access private
			 * @param {string} templateName
			 * @param {object} options
			 * @param {function} cb
			 * @returns {void}
			 */
			_dustOnLoad: function(templateName, options, cb) {

				// Locals
				var me = this;

				// Check for missing template
				if( me.$$templateStore[ templateName ] === undefined ) {

					var errMessage = "Referenced template does not exist: '" + templateName + "'";

					// Append the active render file
					/*
					if( me.$$activeRenderFile !== null ) {
						errMessage += "\n" + " -> Content Source : " + me.$$activeRenderFile.getAbsoluteFilePath();
					}
					*/

					throw new Error( errMessage );

				}

				// We'll give dust its template back so that it can do its work
				me.dust.cache[ templateName ] = me.$$templateStore[ templateName ].compiled;

				// Add a dependency reference for this partial to the active render file
				me.addTemplateDependencyRef( "partial", templateName );

				// Tell dust to do its work
				cb();

				// Now we take the template back from dust to ensure
				// that it calls _dustOnLoad again next time.
				delete me.dust.cache[ templateName ];

			},

			/**
			 * Sets a reference to the file that is currently being rendered.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file
			 * @returns {void}
			 */
			_setActiveRenderFile: function( file ) {

				// Locals
				var me = this;

				// Store the new active render file
				me.$$activeRenderFile = file;

				// Init "touch data" for the active file
				if( file !== null ) {

					var abs 			= file.getAbsoluteFilePath();
					var templateName 	= file.getRelativeBaseName();

					me.$$refData[ abs ] = {
						file: file,
						absolutePath: abs,
						templateName: templateName,
						refs: {
							data: {
								"*": "*"
							}
						}
					};

				}


			},

			/**
			 * Adds a dependency reference for the active render file.
			 * The dependency references are used later by the watchers
			 *
			 * @instance
			 * @access public
			 * @param {string} refType
			 * @param {string} refName
			 * @returns {void}
			 */
			addTemplateDependencyRef: function( refType, refName ) {

				var me = this;

				// Nothing to do if we do not have an active render file
				if( me.$$activeRenderFile === undefined || me.$$activeRenderFile === null ) {
					return;
				}

				// Update the touches data for the active render file
				var abs = me.$$activeRenderFile.getAbsoluteFilePath();
				var refData = me.$$refData[ abs ].refs;

				// Ensure we have a ref store for this type
				if( refData[ refType ] === undefined ) {
					refData[ refType ] = {};
				}

				// Add the ref
				refData[ refType ][ refName ] = refName;

			},

			/**
			 * Notifies the Dust.js manager that a dependency has been updated
			 * and that all content pages that reference that dependency should
			 * be re-rendered.
			 *
			 * @instance
			 * @access public
			 * @param {string} refType
			 * @param {string} refName
			 * @returns {void}
			 */
			triggerRefUpdate: function( refType, refName ) {

				var me = this;
				var references = {};

				// Log the ref call
				me.log( "Checking for content that references '" + refName + "' (" + refType + ")" );

				// Iterate over the reference store
				_.each( me.$$refData, function( data, absolutePath ) {

					var refs = data.refs;
					if( refs[ refType ] !== undefined ) {

						if( refs[ refType ][ refName ] !== undefined ) {

							me.log("  -> Found reference in: '" + absolutePath + "'");
							var abs = data.file.getAbsoluteFilePath();
							references[ abs ] = data.file;

						}

					}

				});

				_.each( references, function( ref, abs ) {
					me.renderOne( ref, true );
				});

			}



		}

	}

);
