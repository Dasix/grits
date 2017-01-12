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
require( "./ext/configuration-manager" );
require( "./ext/cleanup-manager" );
require( "./ext/watch-manager" );
require( "./ext/plugin-manager" );
require( "./ext/reload-server" );
require( "./ext/component-config-manager" );

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
				me.configManager			= new Dasix.grits.ext.ConfigurationManager( me );
				me.cleanupManager			= new Dasix.grits.ext.CleanupManager( me );
				me.componentConfigManager	= new Dasix.grits.ext.ComponentConfigManager( me );
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
				me.log( "info", "render", "A render operation has started.." );

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
						me.log( "info", "render", "A render operation has completed" );

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


			//<editor-fold desc="+++++ Convenience Aliases for 'config' (this.configManager) +++++">

			/**
			 * Applies a default renderer configuration.
			 * This method is a convenience alias for {@link Dasix.grits.ext.ConfigurationManager#initConfig}.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initConfig : function() {

				var me = this;
				me.configManager.initConfig();

			},

			/**
			 * Apply handler method for the {@link Dasix.grits.Renderer#config} property.
			 * This method is a convenience alias for {@link Dasix.grits.ext.ConfigurationManager#setConfig}.
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
				me.configManager.setConfig( val );

			},

			/**
			 * A getter override for the {@link Dasix.grits.Renderer#config} property.
			 * This method is a convenience alias for {@link Dasix.grits.ext.ConfigurationManager#getConfig}.
			 *
			 * @instance
			 * @access public
			 * @returns {object}
			 */
			getConfig : function() {

				var me = this;
				return me.configManager.getConfig();

			},

			/**
			 * Sets the paths using a single configuration object.
			 * This method is a convenience alias for {@link Dasix.grits.ext.ConfigurationManager#setPaths}.
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
				me.configManager.setPaths( objPaths, keepExisting );

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
			 * This method is a convenience alias for {@link Dasix.grits.ext.ConfigurationManager#addRootPath}.
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
				me.configManager.addRootPath( newPath );

			},

			//</editor-fold>

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
