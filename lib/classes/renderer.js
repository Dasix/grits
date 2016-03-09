/**
 * This is the main class for the DustJS renderer (this module) and is usually
 * the only one you'll need for adding the functionality of this module to your
 * project.
 *
 * @example <caption>Basic Usage</caption>
 * require("grits");
 * var renderConfig = {};
 * var rnd = new Dasix.grits.Renderer( renderConfig );
 * rnd.render();
 *
 *
 * @class Dasix.grits.Renderer
 * @mixes Dasix.grits.Loggable
 * @mixes Dasix.grits.HasPathConfig
 * @extends qx.core.Object
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" );
var vError 	= require( "verror" );
var tipe 	= require( "tipe" );
var pth 	= require( "path" );
var mkdirp 	= require( "mkdirp" );
var matter 	= require( "gray-matter" );
var dot 	= require( "dot-object" );
var fs		= require( "fs-extra" );
var Promise = require( "bluebird" );
var _		= require( "lodash" );

// Require project classes & mixins
require( "../mixins/loggable" );
require( "../mixins/has-path-config" );
require( "./file-system-loader" );
require( "./file" );

// Extensions
require( "./ext/dust-manager" );
require( "./ext/sass-renderer" );
require( "./ext/cleanup-manager" );
require( "./ext/layout-manager" );
require( "./ext/filter-manager" );
require( "./ext/markdown-parser" );
require( "./ext/plugin-manager" );
require( "./ext/static-content-manager" );

// Promisification
Promise.promisifyAll(fs);

// Create the base renderer class
qx.Class.define(
	"Dasix.grits.Renderer", {

		extend  : qx.core.Object,
		include : [Dasix.grits.Loggable, Dasix.grits.HasPathConfig],

		/**
		 * @constructs Dasix.grits.Renderer
		 * @param {?object} [cfg] An initial configuration object for the renderer.
		 * @param {boolean} [cfg.verbose = false] Whether or not to enable debug logging.
		 */
		construct : function( cfg ) {

			var me = this;

			// This will be set to true after render() has been called...
			me.hasRendered = false;

			// Inititalize extension objects
			me._initExtensions();

			// Initialize path types
			me._initPathTypes();

			// Initialize the renderer configuration
			me._initConfig();

			// Apply initial configuration
			if( cfg === undefined ) {
				cfg = null;
			}
			me.setConfig( cfg );

		},

		properties : {

			/**
			 * @var {boolean} Dasix.grits.Renderer#config The current renderer configuration.
			 * Important Note: This property cannot be accessed directly, _always_ use `#getConfig` instead.
			 * @accessor getConfig
			 * @mutator setConfig
			 * @instance
			 */
			config : {
				init  : null,
				apply : "_configure"
			}

		},

		members : /** @lends Dasix.grits.Renderer **/ {

			//<editor-fold desc="+++++ Configuration Methods +++++">

			_initExtensions: function() {

				var me = this;
				me.cleanupManager			= new Dasix.grits.ext.CleanupManager( me );
				me.dustManager				= new Dasix.grits.ext.DustManager( me );
				me.pluginManager 			= new Dasix.grits.ext.PluginManager( me );
				me.layoutManager 			= new Dasix.grits.ext.LayoutManager( me );
				me.filterManager 			= new Dasix.grits.ext.FilterManager( me );
				me.markdownParser 			= new Dasix.grits.ext.MarkdownParser( me );
				me.staticContentManager 	= new Dasix.grits.ext.StaticContentManager( me );
				me.sassRenderer 			= new Dasix.grits.ext.SassRenderer( me );

				// Store a reference to the dust module
				me.dust = me.dustManager.dust;


			},

			/**
			 * Apply handler method for the {@link Dasix.grits.Renderer#config} property.
			 *
			 * @instance
			 * @access private
			 * @param {?object} val
			 * @param {?object} old
			 * @param {string} name
			 * @returns {void}
			 */
			_configure : function( val, old, name ) {

				// Locals
				var me = this;

				// Ignore NULL configurations
				// Note: This is _usually_ called before logging is enabled and nothing will be output.
				if( val === null ) {
					me.log( "configuration", "Ignoring NULL renderer configuration" );
					return;
				}

				// Log the event
				// Note: This is _usually_ called before logging is enabled and nothing will be output.
				if( old === null ) {
					me.log( "configuration", "Initializing renderer configuration" );
				} else {
					me.log( "configuration", "Applying new renderer configuration" );
				}

				// Configuration file loading..
				// If the new config is a string, we will assume it is a config file path
				var configPath = null;
				if( val.configFile !== undefined && val.configFile !== null ) {
					configPath = val.configFile;
				}
				if( tipe( val ) === "string" ) {
					configPath = val;
					val = {};
				}
				if( configPath !== null ) {
					val = me._loadConfigFromFile( val, configPath );
				}

				// If provided: Apply the 'verbose' setting
				if( val.verbose !== undefined && val.verbose !== null ) {
					me.setVerbose( val.verbose );
				}

				// If provided: Apply the 'logFilter' setting
				if( val.logFilter !== undefined && val.logFilter !== null ) {
					me.setLogFilter( val.logFilter );
				}

				// If provided: Apply the 'autoClean' setting
				if( val.autoClean !== undefined && val.autoClean !== null ) {
					me.cleanupManager.setEnabled( val.autoClean );
				}

				// If provided: Apply the 'cleanMode' setting
				if( val.cleanMode !== undefined && val.cleanMode !== null ) {
					me.cleanupManager.setCleanMode( val.cleanMode );
				}

				// If provided: Apply path settings
				if( val.paths !== undefined && val.paths !== null ) {
					me.setPaths( val.paths );
				}

				// If provided: Apply plugins
				if( val.plugins !== undefined && val.plugins !== null ) {
					me.addPlugin( val.plugins );
				}

			},

			/**
			 * Convenience alias for `this.cleanupManager.setEnabled()`.
			 *
			 * @see Dasix.grits.ext.CleanupManager#setEnabled
			 * @param {boolean} enabled
			 */
			setAutoClean: function( enabled ) {
				this.cleanupManager.setEnabled( enabled );
			},

			/**
			 * Convenience alias for `this.cleanupManager.setCleanMode()`.
			 *
			 * @see Dasix.grits.ext.CleanupManager#setCleanMode
			 * @param {string} mode
			 */
			setCleanMode: function( mode ) {
				this.cleanupManager.setCleanMode( mode );
			},

			/**
			 * Loads configuration information from a file and merges it with
			 * any other config information found in `existingConfig`.
			 *
			 * @instance
			 * @access public
			 * @param {object} existingConfig
			 * @param {string} configPath
			 * @returns {object}
			 */
			_loadConfigFromFile: function( existingConfig, configPath ) {

				// Locals
				var me = this;
				var configDir = pth.dirname( configPath );

				// Log it
				me.log( "configuration.file", "Loading configuration from file: " + configPath );

				// Load the config file
				var configFileContent = fs.readFileSync( configPath, { encoding: "utf8" } );
				var configFileValues = JSON.parse( configFileContent );

				// Ensure that all .paths are in array format; this prevents
				// breakages during the merge operation later.
				var existingPaths, cfPaths;
				if( configFileValues.paths !== undefined && configFileValues.paths !== null ) {
					cfPaths = me._ensurePropsAreArrays( configFileValues.paths );

					// Resolve paths specified in the configuration file
					// to be relative to the configuration file itself.
					_.each( cfPaths, function( cftPaths, pathType ) {

						_.each( cftPaths, function( cfp, cfpIndex ) {

							// Resolve to be relative to config file
							cfPaths[ pathType ][ cfpIndex ] = pth.resolve( configDir, cfp );

						});

					});

				} else {
					cfPaths = {};
				}
				if( existingConfig.paths !== undefined && existingConfig.paths !== null ) {
					existingPaths = me._ensurePropsAreArrays( existingConfig.paths );
				} else {
					existingPaths = {};
				}

				// We don't want these merged systematically because we
				// will be providing custom logic for path merging..
				delete configFileValues.paths;
				delete existingConfig.paths;

				// Merge the configs
				existingConfig = _.merge( existingConfig, configFileValues );
				existingConfig.paths = {};

				// Add the paths back into the config
				_.each( [cfPaths, existingPaths], function( targetPaths ) {
					_.each( targetPaths, function( pathVals, pathType ) {

						_.each( pathVals, function( pathVal ) {

							if( existingConfig.paths[ pathType ] === undefined ) {
								existingConfig.paths[ pathType ] = [];
							}
							existingConfig.paths[ pathType ].push( pathVal );

						});

					});
				});

				return existingConfig;


			},

			_ensurePropsAreArrays: function( obj ) {

				var ret = {};
				_.each( obj, function( v, k ) {

					if( tipe(v) === "array" ) {
						ret[k] = v;
					} else {
						ret[k] = [v];
					}

				});
				return ret;
			},

			/**
			 * Sets the paths using a single configuration object.
			 *
			 * @instance
			 * @access public
			 * @param {object} objPaths A configuration object containing path information.
			 * @param {boolean} [keepExisting=false] When FALSE (default), paths provided will REPLACE
			 * all existing paths.  When TRUE the provided paths will be added to the existing paths.
			 * @returns {void}
			 */
			setPaths: function( objPaths, keepExisting ) {

				// Locals
				var me = this;

				// Default the 'keepExisting' param
				if( keepExisting === undefined || keepExisting === null || keepExisting !== true ) {
					keepExisting = false;
				}

				// First, clear all paths
				if( !keepExisting ) {
					me.clearAllPaths();
				}

				// Second, apply root paths, if found
				// (this prevents the root path from resetting the others)
				if( objPaths.root !== undefined ) {
					me.setRootPath( objPaths.root );
					delete objPaths.root;
				}

				// Now apply all of the path settings
				_.each( objPaths, function( paths, pathType ) {

					// Clear the existing paths for the current type
					// This seems redundant but its actually on purpose:
					// We want the provided paths to overwrite any
					// generated by 'setRootPath' above.
					if( !keepExisting ) {
						me.clearPathsOfType( pathType );
					}

					// Add the paths for the current type
					me.addPathOfType( pathType, paths );

				});

			},

			/**
			 * This method configures the HasPathConfig mixin and provides
			 * additional information about different types of paths that
			 * the renderer will use.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initPathTypes: function() {

				// Locals
				var me = this;
				var contentExtensions = ["dust","md","html"];

				// Add valid path types (for the HasPathConfig mixin)
				me.setPathTypes(
					[{
						short          : "root",
						name           : "Root Input Path",
						defaultSubdir  : null,
						scanExtensions : null,
						methodName     : "Root"
					},{
						short          : "helper",
						name           : "DustJS Helper Function Path",
						defaultSubdir  : "helpers",
						scanExtensions : ["js"],
						methodName     : "Helper"
					},{
						short          : "handler",
						name           : "DustJS Handler Function Path",
						defaultSubdir  : "handlers",
						scanExtensions : ["js"],
						methodName     : "Handler"
					},

						me.filterManager.getCollectionSettings(),

					{
						short          : "partial",
						name           : "DustJS Partial Path",
						defaultSubdir  : "partials",
						scanExtensions : contentExtensions,
						methodName     : "Partial"
					},

						me.layoutManager.getCollectionSettings(),
						me.dustManager.getCollectionSettings(),

					{
						short          : "data",
						name           : "Data Source Path",
						defaultSubdir  : "data",
						scanExtensions : ["json"],
						methodName     : "Data"
					},

						me.sassRenderer.getCollectionSettings( "sass" ),
						me.sassRenderer.getCollectionSettings( "sassi" ),

					{
						short          : "output",
						name           : "Render Output Path",
						defaultSubdir  : "output",
						scanExtensions : null,
						methodName     : "Output"
					},

						me.staticContentManager.getCollectionSettings()

					]
				);

			},

			/**
			 * Applies a default renderer configuration.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initConfig : function() {

				var me = this;
				me.setConfig(
					{
						verbose : false,
						paths   : {}
					}
				);

			},

			/**
			 * A getter override for the {@link Dasix.grits.Renderer#config} property.
			 * This is needed because the config is actually stored in multiple places
			 * (across multiple variables).
			 *
			 * @instance
			 * @access public
			 * @returns {object}
			 */
			getConfig : function() {

				var me = this;
				return {
					verbose : me.getVerbose(),
					logFilter: me.getLogFilter(),
					autoClean: me.cleanupManager.isEnabled(),
					cleanMode: me.cleanupManager.getCleanMode(),
					loadedPlugins: me.pluginManager.getPluginNames(),
					paths: me.getAllPaths()
				};

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods +++++">

			/**
			 * Adds one or more paths to the 'root' path configuration. Much like
			 * the other path methods, this method is  a convenience alas because,
			 * internally, this method calls {@link Dasix.grits.Renderer#addPathOfType}
			 * with the first param set to 'root'.  Unlike most of the other path
			 * methods, however, this method also adds a series of subdirectories
			 * based on the root path.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'root' path configuration.
			 * @returns {void}
			 */
			addRootPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method for adding
				// the reference to the root directory
				me.addPathOfType( 'root', newPath );

				// Add all of the automatic sub-directories
				me._addRootSubpaths( newPath );

			},

			/**
			 * Adds the automatic subpaths in response to a new root path being
			 * added the to path configuration.  This method is called exclusively
			 * by {@link Dasix.grits.Renderer#addRootPath} and should not be called
			 * directly.
			 *
			 * @instance
			 * @access private
			 * @param {string|string[]} rootPath An absolute root path, or an
			 * array of absolute root paths.
			 * @returns {void}
			 */
			_addRootSubpaths: function( rootPath ) {

				// Locals
				var me = this;
				var pathTypes = me.getPathTypeDetails();

				// Handle rootPath array
				if( tipe( rootPath ) === "array" ) {
					_.each( rootPath, function( rp ) {
						me._addRootSubpaths( rp );
					});
					return;
				}

				// Iterate over each path type
				_.each( pathTypes, function( pathType ) {

					var pathTypeName 	= pathType.name;
					var pathTypeShort 	= pathType.short;

					if( pathType.defaultSubdir !== undefined && pathType.defaultSubdir !== null ) {

						var subDirPath = pth.join( rootPath, pathType.defaultSubdir );
						me.log("path.auto." + pathTypeShort, "Implying '" + pathTypeShort + "' path: '" + subDirPath + "' (from root)");
						me.addPathOfType( pathTypeShort, subDirPath );

					}

				});

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Rendering Methods +++++">

			/**
			 * This is the main entry point for the renderer.  It is called
			 * after the renderer has been configured and will initiate the
			 * rendering process.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			render : function( config ) {

				// Locals
				var me = this;

				// Handle 'config'
				if( config !== undefined && config !== null && tipe( config ) === "object" ) {

					// Special, non-destructive, handling for config.paths
					if( config.paths !== undefined ) {
						me.setPaths( config.paths );
						delete config.paths;
					}

					// Send the reset to setConfig
					me.setConfig( config );

				}

				// Logging
				me.log( "render", "A render operation has started.." );

				// Call beforeRender event
				me.pluginManager.fireEvent( "beforeRender" );

				// Start the main promise chain..
				return Promise.resolve().then(

					function() {

						return me.cleanupManager.condCleanBefore();

					}

				).then(

					function() {

						return me.sassRenderer.render();

					}

				).then(

					function() {

						return me._loadAllHelpers();

					}

				).then(

					function() {

						return me._loadAllHandlers();

					}

				).then(

					function() {

						return me.filterManager.loadAll();

					}

				).then(

					function () {

						return me._loadAllDataFiles();

					}

				).then(

					function () {

						return me._compileAllPartials();

					}

				).then(

					function () {

						return me.layoutManager.compileAll();

					}

				).then(

					function () {

						return me.dustManager.compileAll();

					}

				).then(

					function () {

						return me.dustManager.renderAll();

					}

				).then(

					function () {

						return me.staticContentManager.copyAll()

					}

				).then(

					function () {

						// Do post-cleaning
						return me.cleanupManager.condCleanAfter();

					}

				).then(

					function() {

						// Fire the afterRender event
						me.pluginManager.fireEvent( "afterRender" );

						// Log it
						me.log( "render", "A render operation has completed" );

						// Track the fact that we've rendered
						me.hasRendered = true;

						// Finished
						return Promise.resolve({
							renderer: me
						});

					}

				);

			},

			/**
			 * This method will scan for files of a particular type.  Path
			 * types are defined by {@link Dasix.grits.Renderer#_initPathTypes}.
			 *
			 * @instance
			 * @access private
			 * @param {string} pathTypeName A valid path type
			 * @returns {Promise}
			 */
			_scanPathType : function( pathTypeName ) {

				// Locals
				var me = this;

				// Get path type info and settings
				var pathType = me.getSinglePathType( pathTypeName );

				// Get all associated paths
				var paths = me.getPathsOfType( pathTypeName );

				// Create a loader
				var fsl = new Dasix.grits.FileSystemLoader();
				//fsl.setVerbose( me.getVerbose() );
				//fsl.setVerbose( false );

				// Log it
				me.log( "renderer.scan", "Scanning for files in '" + pathType.name + "' (short: " + pathType.short + ")" );

				// Scan
				return fsl.scanForFiles( paths, pathType.scanExtensions );

			},


			//</editor-fold>

			//<editor-fold desc="+++++ Util: Markdown & Context +++++">



			/**
			 * Uses a {@link Dasix.grits.ext.MarkdownParser} object to parse a bit of
			 * markdown into HTML.  This method is used exclusively by
			 * {@link Dasix.grits.Renderer#compileOne}.
			 *
			 * @instance
			 * @access private
			 * @param {string} srcMarkdown The Markdown source
			 * @param {boolean} [enableDebug=false] When TRUE markdown parsing information
			 * will be output to the log.
			 * @returns {string} The resulting HTML
			 */
			_parseMarkdown: function( srcMarkdown, enableDebug ) {

				// Locals
				var me = this;
				var resHtml;

				// Start the log
				me.log( "markdown.parse", "      -> Source Markdown: " + srcMarkdown.length + " bytes" );

				// Parse and return
				resHtml = me.markdownParser.parse( srcMarkdown, enableDebug );

				// Finish the log
				me.log( "markdown.parse", "      -> Resulting HTML : " + resHtml.length + " bytes" );

				// All done
				return resHtml;

			},

			/**
			 * Loads the dust context info from the provided
			 * config file location (in the `cfg` object).
			 *
			 * @fixme abandoned?
			 * @access private
			 * @returns {void}
			 */
			_getDustContext : function() {

				var me = this;
				var ret = require( this.cfg.paths.config );

				_.each(
					me.cfg.handlers, function( fnHandler, key ) {
						ret[key] = fnHandler;
					}
				);

				return ret;

			},


			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'data' +++++">

			/**
			 * Parses a string for front-matter data.
			 *
			 * @instance
			 * @access private
			 * @param {string} source
			 * @param {string} name
			 * @returns {object}
			 */
			_parseMatter: function( source, name ) {

				// Locals
				var me 			= this;
				var matterData 	= matter( source );

				// Store the matter data
				me._storeFrontMatterData( name, matterData.data );

				// Finished
				return matterData;

			},

			/**
			 * Returns the current context data for the renderer.
			 * Unless the renderer is being manually stepped through
			 * a partial load or render process, this method will not
			 * be useful and its return will not be complete unless it
			 * is called _after_ a `#render()` call.
			 *
			 * @returns {object} The current context data for the renderer.
			 */
			getContextData: function() {

				var me = this;
				return me.$$contextData;

			},

			/**
			 * Parses and standardizes a data path for storage in the
			 * global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path to be parsed
			 * @returns {string} The resulting, standardized, data path.
			 */
			_parseDataPath: function( dataPath ) {

				// Convert backslashes (\) to dots (.)
				// -> a\b\c becomes a.b.c
				dataPath = dataPath.replace(/\/+/g, ".");

				// Convert forward slashes (/) to dots (.)
				// -> a/b/c becomes a.b.c
				dataPath = dataPath.replace(/\\+/g, ".");

				// Remove dots from the start of the path
				// -> .a.b.c becomes a.b.c
				dataPath = dataPath.replace(/^\.+/g, "");

				// Remove dots from the end of the path
				// -> a.b.c. becomes a.b.c
				dataPath = dataPath.replace(/\.+$/g, "");

				// Done
				return dataPath;

			},

			/**
			 * Stores data extracted from a template's "front matter" in the
			 * global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} name The "relative base name" of the template
			 * @param {*} data The data to store
			 * @returns {void}
			 */
			_storeFrontMatterData: function( name, data ) {

				var me = this;

				// Front-Matter data is available globally
				// in the `{page.*}` context property.
				me._storeData( "page." + name, data );

			},

			/**
			 * Stores data in the global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path that will be used when storing the data.
			 * @param {*} data The data to store
			 * @returns {void}
			 */
			_storeData: function( dataPath, data ) {

				// Locals
				var me = this;
				var existingData, newData;

				// Initialize the global context object, if necessary
				me._initData();

				// Fetch the existing global context data
				existingData = me.$$contextData;

				// Parse the provided data path
				dataPath = me._parseDataPath( dataPath );

				// Convert the data, with the path, into an object
				// using the `dot-object` module.
				newData = dot.str(dataPath, data, {});

				// If the new data contains "page" data, we will
				// defer to the _storePageData method for its insertion.
				if( newData.page !== undefined ) {
					me._storePageData( dataPath, newData.page );
				}

				// If the new data contains "file" data, we will
				// defer to the _storeFileData method for its insertion.
				if( newData.data !== undefined ) {
					me._storeFileData( dataPath, newData.data, existingData.data );
				}

				return;

			},

			/**
			 * Stores data from content front-matter into the context data store.
			 * This method is used exclusively by `#_storeData` and should
			 * probably never be called directly.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path for the new data
			 * @param {object} newData The new data
			 * @returns {void}
			 */
			_storePageData: function( dataPath, newData ) {

				var me = this;

				// Store the data..
				_.merge( me.$$contextData.page, newData );

			},

			/**
			 * Stores data from data files into the context data store.
			 * This method is used exclusively by `#_storeData` and should
			 * probably never be called directly.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path for the new data
			 * @param {object} newData The new data
			 * @param {object} existingData Existing file data (for ALL files)
			 * @returns {void}
			 */
			_storeFileData: function( dataPath, newData, existingData ) {

				var me = this;

				// File data is stored in a relatively flat way.  No matter
				// where the file is located, its primary key will be the
				// base name of the file and its sub-directory information will
				// be removed.  Thus, our first goal is to find that primary key.
				var dpSplit = dataPath.split(".");
				var dataKey = dpSplit[1];
				var fileData = newData[ dataKey ];

				// If the existing data doesn't have the data key
				// we found in the previous step, then we can simply
				// add it and return without needing to resolve conflicts.
				if( existingData[dataKey] === undefined || existingData[dataKey] === null ) {
					existingData[dataKey] = fileData;
					return;
				}

				// If we've arrived here then we've hit two files with the same
				// name and will either need to merge or append the two objects.
				// Let's reduce our existing data down to the target data.
				var existingFileData = existingData[dataKey];

				// Now we will iterate over all of the new file data and merge
				// it into the existing data using type-specific operations.
				_.each( fileData, function( val, key ) {

					// If the new file data is introducing data [key(s)] that
					// do not exist yet, we can simply add them in..
					if( existingFileData[key] === undefined ) {
						existingFileData[key] = val;
					} else {

						// Now we have a _real_ conflict and need to mitigate it.
						// For now, the only data type with special handling rules
						// is arrays, which will be concatenated instead of overwritten.
						if( _.isArray(val) && _.isArray( existingFileData[key] ) ) {

							// Merge the two arrays
							var merged = _.concat( existingFileData[key], val );

							// Make each item unique (only works for scalars)
							merged = _.uniq( merged );

							// Sort the elements (only works for scalars)
							merged = _.sortBy( merged );

							// Store the result of the ops above
							existingFileData[key] = merged;

						} else {

							// Everything else overwrites..
							existingFileData[key] = val;

						}

					}

				});

			},

			/**
			 * This method simply ensures that the global DustJS context
			 * object exists.  This method is idempotent.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initData: function() {

				var me = this;
				if( me.$$contextData === undefined ) {
					me.$$contextData = {
						page: {},
						data: {}
					};
				}

			},

			/**
			 * Returns a context object for a specific template.  This method
			 * will, basically, return the global DustJS context object but
			 * will ensure that variables that were defined in the front-matter
			 * of the target template exist at the bottom level of the context object.
			 * (i.e. this method facilitates the idea of "local" template variables)
			 *
			 * @instance
			 * @access private
			 * @param {string} templateName The "relative base name" of the template
			 * @returns {object} The context with "local variables" included.
			 */
			_getContextForTemplate: function( templateName ) {

				var me = this;
				var ret = {};
				var dataPath = me._parseDataPath( "page." + templateName );
				var localData = dot.pick( dataPath, me.$$contextData );
				me._initData();
				ret = _.merge( ret, localData, me.$$contextData );

				// Apply handlers (context helpers)
				_.each( me.$$contextHelpers, function( handlerFn, handlerName ) {

					ret[ handlerName ] = handlerFn;

				});

				return ret;

			},

			/**
			 * Loads all data files and makes their data available via
			 * the DustJS template context variable `{data.*}`.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_loadAllDataFiles : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me.pluginManager.fireEvent( "beforeLoadData" );

				// Scan for content
				return me._scanPathType( "data" ).then(
					function onPartialsScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							// Log the info we have so far
							me.log("data.load", "Loading Data File");
							me.log("data.load", " -> Source    : " + srcFile.getAbsoluteFilePath() );
							//me.log("compile.partial", " -> Long Name : " + partialName );

							// Load the data
							var data = srcFile.readJsonSync();
							me._storeData( "data." + srcFile.getBaseName(), data );

						});

						// Post-operation Events
						var contextData = {};
						if( me.$$contextData !== undefined && me.$$contextData.data !== undefined ) {
							contextData = me.$$contextData.data;
						}
						me.pluginManager.fireEvent( "afterLoadData", { data: contextData, dataFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'partials' +++++">

			/**
			 * Loads and compiles all partials.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_compileAllPartials : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me.pluginManager.fireEvent( "beforeCompilePartials" );

				// Scan for content
				return me._scanPathType( "partial" ).then(
					function onPartialsScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							var partialName = "partial/" + srcFile.getRelativeBaseName();

							// Log the info we have so far
							me.log("compile.partial", "Compiling partial..");
							me.log("compile.partial", " -> Source    : " + srcFile.getAbsoluteFilePath() );
							me.log("compile.partial", " -> Long Name : " + partialName );

							// Compile the template
							me.dustManager.compileOne(
								partialName,
								srcFile,
								false
							);

						});

						// Post-operation Events
						me.pluginManager.fireEvent( "afterCompilePartials", { dust: me.dust, partialFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>



			//<editor-fold desc="+++++ Methods for 'helpers' +++++">

			/**
			 * Loads all helper functions and attaches them to `dust.helpers`
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_loadAllHelpers : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me.pluginManager.fireEvent( "beforeLoadHelpers" );

				// Scan for content
				return me._scanPathType( "helper" ).then(
					function onHelpersScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							var helperName = srcFile.getBaseName();

							// Log the info we have so far
							me.log("helper.load", "Loading helper function ..");
							me.log("helper.load", " -> Source      : " + srcFile.getAbsoluteFilePath() );
							me.log("helper.load", " -> Helper Name : {@" + helperName + "}" );

							// Add the helper to the DustJS object
							me.dust.helpers[ helperName ] = require( srcFile.getAbsoluteFilePath() );

						});

						// Pre-operation Events
						me.pluginManager.fireEvent( "afterLoadHelpers", { helpers: me.dust.helpers, helperFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'handlers' +++++">

			/**
			 * Loads all handler functions (context helpers) and saves them
			 * for later inclusion into the global DustJS context.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_loadAllHandlers : function() {

				// Locals
				var me = this;
				me.$$contextHelpers = {};

				// Pre-operation Events
				me.pluginManager.fireEvent( "beforeLoadHandlers" );

				// Scan for content
				return me._scanPathType( "handler" ).then(
					function onHandlersScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							var handlerName = srcFile.getBaseName();

							// Log the info we have so far
							me.log("handler.load", "Loading handler function ..");
							me.log("handler.load", " -> Source       : " + srcFile.getAbsoluteFilePath() );
							me.log("handler.load", " -> Handler Name : context." + handlerName + "()" );

							// Add the handler to the DustJS object
							me.$$contextHelpers[ handlerName ] = require( srcFile.getAbsoluteFilePath() );

						});

						// Post-operation Events
						me.pluginManager.fireEvent( "afterLoadHandlers", { handlers: me.$$contextHelpers, handlerFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>


			//<editor-fold desc="+++++ Methods for 'plugins' +++++">

			/**
			 * This method is a convenience alias for `this.pluginManager.addPlugin(..)`
			 * and it simply calls {@link Dasix.grits.ext.PluginManager#addPlugin}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ext.PluginManager#addPlugin
			 * @param {string|string[]|function|function[]} plugin
			 * @returns {object|object[]}
			 */
			addPlugin : function( plugin ) {

				// Locals
				var me = this;

				// Defer
				return me.pluginManager.addPlugin( plugin );

			},

			/**
			 * This method is a convenience alias for `this.pluginManager.addPlugin(..)`
			 * and it simply calls {@link Dasix.grits.ext.PluginManager#addPlugin}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ext.PluginManager#addPlugin
			 * @param {string|string[]|function|function[]} plugin
			 * @returns {object|object[]}
			 */
			use : function( plugin ) {

				// Locals
				var me = this;

				// Defer
				return me.pluginManager.addPlugin( plugin );

			},

			/**
			 * This method is a convenience alias for `this.pluginManager.clearPlugins(..)`
			 * and it simply calls {@link Dasix.grits.ext.PluginManager#clearPlugins}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ext.PluginManager#clearPlugins
			 * @param {boolean} [quiet=false]
			 * @returns {object[]}
			 */
			clearPlugins : function( quiet ) {

				// Locals
				var me = this;

				// Defer
				return me.pluginManager.clearPlugins( quiet );

			}


			//</editor-fold>

		}

	}
);
