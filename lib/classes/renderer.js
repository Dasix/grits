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
var fs		= require( "fs-extra" );
var Promise = require( "bluebird" );
var _		= require( "lodash" );

// Require project classes & mixins
require( "../mixins/loggable" );
require( "../mixins/has-path-config" );
require( "./file-system-loader" );
require( "./file" );

// Rendering Extensions & Wrappers
require( "./ext/dust-manager" );
require( "./ext/sass-renderer" );
require( "./ext/markdown-parser" );

// Major Service Extensions
require( "./ext/cleanup-manager" );
require( "./ext/watch-manager" );
require( "./ext/plugin-manager" );
require( "./ext/reload-server" );

// Extensions relating to file types
require( "./ext/layout-manager" );
require( "./ext/partial-manager" );
require( "./ext/filter-manager" );
require( "./ext/helper-manager" );
require( "./ext/handler-manager" );
require( "./ext/data-manager" );
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

			//<editor-fold desc="+++++ Initialization & Static Configuration +++++">

			/**
			 * Initializes all of the renderer extensions.  See the documentation
			 * for {@link Dasix.grits.AbsRenderExtension} to learn more about
			 * renderer extensions.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
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
				me.watchManager 			= new Dasix.grits.ext.WatchManager( me );
				me.partialManager			= new Dasix.grits.ext.PartialManager( me );
				me.helperManager			= new Dasix.grits.ext.HelperManager( me );
				me.handlerManager			= new Dasix.grits.ext.HandlerManager( me );
				me.dataManager				= new Dasix.grits.ext.DataManager( me );
				me.reloadServer				= new Dasix.grits.ext.ReloadServer( me );

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
					},

						me.helperManager.getCollectionSettings(),
						me.handlerManager.getCollectionSettings(),
						me.filterManager.getCollectionSettings(),

						me.partialManager.getCollectionSettings(),
						me.layoutManager.getCollectionSettings(),
						me.dustManager.getCollectionSettings(),
						me.dataManager.getCollectionSettings(),

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

			//</editor-fold>

			//<editor-fold desc="+++++ Configuration: Basic +++++">

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
				me.$$haltOnWarnings = false;

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

				// If provided: Apply settings (includes global plugin config)
				if( val.settings !== undefined && val.settings !== null ) {
					me.pluginManager.setGlobalConfig( val.settings );
				}

				// If provided: Apply plugins
				if( val.plugins !== undefined && val.plugins !== null ) {
					me.addPlugin( val.plugins );
				}

				// If provided: Apply watch config
				if( val.watch !== undefined && val.watch !== null ) {
					me.watchManager.setConfig( val.watch );
				}

				// If provided: Apply serve config (live reload server)
				if( val.serve !== undefined && val.serve !== null ) {
					me.reloadServer.setConfig( val.serve );
				}

				// If provided: Apply "halt on errors" config
				if( val.haltOnWarnings !== undefined && val.haltOnWarnings !== null ) {
					if( val.haltOnWarnings === true ) {
						me.$$haltOnWarnings = true;
					} else {
						me.$$haltOnWarnings = false;
					}
				}

				// If provided: Apply "default layout" setting
				if( val.defaultLayout !== undefined ) {
					me.layoutManager.setDefaultLayout( val.defaultLayout );
				}

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
					verbose 		: me.getVerbose(),
					logFilter		: me.getLogFilter(),
					haltOnWarnings	: me.$$haltOnWarnings,
					autoClean		: me.cleanupManager.isEnabled(),
					cleanMode		: me.cleanupManager.getCleanMode(),
					loadedPlugins	: me.pluginManager.getPluginNames(),
					defaultLayout	: me.layoutManager.getDefaultLayout(),
					paths			: me.getAllPaths()
				};

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

			/**
			 * A simple utility method created for `_loadConfigFromFile`,
			 * it is not currently used anywhere else.
			 *
			 * @instance
			 * @access private
			 * @param {object} obj
			 * @returns {object}
			 */
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

			//</editor-fold>

			//<editor-fold desc="+++++ Configuration: Path Specific +++++">

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



			// --- Special Handling for 'Root' Paths ------------------------------------



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

			//<editor-fold desc="+++++ Rendering +++++">

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

						return me.helperManager.loadAll();

					}

				).then(

					function() {

						return me.handlerManager.loadAll();

					}

				).then(

					function() {

						return me.filterManager.loadAll();

					}

				).then(

					function () {

						return me.dataManager.loadAll();

					}

				).then(

					function () {

						return me.partialManager.compileAll();

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

						// Start the watcher (if enabled)
						me.watchManager.startWatching();

						// Start the live reload server (if enabled)
						me.reloadServer.start();

						// Finished
						return Promise.resolve({
							renderer: me
						});

					}

				);

			},

			//</editor-fold>

			/**
			 * Shuts down any watchers and the web server.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			shutdown: function() {

				// Locals
				var me = this;

				// Start the watcher (if enabled)
				me.watchManager.unwatch();

				// Start the live reload server (if enabled)
				me.reloadServer.stop();

			},


			// -- Convenience aliases ------------------------------------------



			//<editor-fold desc="+++++ Convenience Aliases for 'cleanup' (this.cleanupManager) +++++">

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

			//</editor-fold>

			//<editor-fold desc="+++++ Convenience Aliases for 'layouts' (this.layoutManager) +++++">

			/**
			 * This is a convenience alias for `this.layoutManager.setDefaultLayout()`
			 *
			 * @instance
			 * @access public
			 * @param {?string} newVal
			 * @returns {void}
			 */
			setDefaultLayout: function( newVal ) {
				return this.layoutManager.setDefaultLayout( newVal );
			},

			//</editor-fold>

			//<editor-fold desc="+++++ Convenience Aliases for 'data' (this.dataManager) +++++">

			/**
			 * This is a convenience alias for `this.dataManager.getContextData()`
			 * @returns {Object}
			 */
			getContextData: function() {
				return this.dataManager.getContextData();
			},

			//</editor-fold>

			//<editor-fold desc="+++++ Convenience Aliases for 'plugins' (this.pluginManager) +++++">

			/**
			 * This method is a convenience alias for `this.pluginManager.addPlugin(..)`
			 * and it simply calls {@link Dasix.grits.ext.PluginManager#addPlugin}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ext.PluginManager#addPlugin
			 * @param {string|string[]|function|function[]|object|object[]} plugin
			 * @param {?object} [config={}]
			 * @param {?object} [globalConfig={}]
			 * @returns {object[]}
			 */
			addPlugin : function( plugin, config, globalConfig ) {

				// Locals
				var me = this;

				// Defer
				return me.pluginManager.addPlugin( plugin, config, globalConfig );

			},

			/**
			 * This method is a convenience alias for `this.pluginManager.addPlugin(..)`
			 * and it simply calls {@link Dasix.grits.ext.PluginManager#addPlugin}.
			 *
			 * @instance
			 * @access public
			 * @see Dasix.grits.ext.PluginManager#addPlugin
			 * @param {string|string[]|function|function[]|object|object[]} plugin
			 * @param {?object} [config={}]
			 * @param {?object} [globalConfig={}]
			 * @returns {object[]}
			 */
			use : function( plugin, config, globalConfig ) {

				// Locals
				var me = this;

				// Defer
				return me.pluginManager.addPlugin( plugin, config, globalConfig );

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
