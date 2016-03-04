/**
 * This is the main class for the DustJS renderer (this module) and is usually
 * the only one you'll need for adding the functionality of this module to your
 * project.
 *
 * @example <caption>Basic Usage</caption>
 * require("c2cs-dustjs-renderer");
 * var renderConfig = {};
 * var rnd = new C2C.dustjs.Renderer( renderConfig );
 * rnd.render();
 *
 *
 * @class C2C.dustjs.Renderer
 * @mixes C2C.dustjs.Loggable
 * @mixes C2C.dustjs.HasPathConfig
 * @extends qx.core.Object
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 C2C Schools, LLC. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" );
var vError 	= require( "verror" );
var tipe 	= require( "tipe" );
var pth 	= require( "path" );
var mkdirp 	= require( "mkdirp" );
var matter 	= require( "gray-matter" );
var dot 	= require( "dot-object" );
var dust	= require( "dustjs-linkedin" );
var fs		= require( "fs-extra" );
var helpers = require( "dustjs-helpers" );
var Promise = require( "bluebird" );

// Require project classes & mixins
require( "../mixins/loggable" );
require( "../mixins/has-path-config" );
require( "./file-system-loader" );
require( "./file" );
require( "./markdown-parser" );

// Promisification
Promise.promisifyAll(fs);

// Create the base renderer class
qx.Class.define(
	"C2C.dustjs.Renderer", {

		extend  : qx.core.Object,
		include : [C2C.dustjs.Loggable, C2C.dustjs.HasPathConfig],

		/**
		 * @constructs C2C.dustjs.Renderer
		 * @param {?object} [cfg] An initial configuration object for the renderer.
		 * @param {boolean} [cfg.verbose = false] Whether or not to enable debug logging.
		 */
		construct : function( cfg ) {

			var me = this;

			// Initialize the renderer configuration
			me._initConfig();

			// Initialize path types
			me._initPathTypes();

			// Apply initial configuration
			if( cfg === undefined ) {
				cfg = null;
			}
			me.setConfig( cfg );

		},

		properties : {

			/**
			 * @var {boolean} C2C.dustjs.Renderer#config The current renderer configuration.
			 * Important Note: This property cannot be accessed directly, _always_ use `#getConfig` instead.
			 * @accessor getConfig
			 * @mutator setConfig
			 * @instance
			 */
			config : {
				init  : null,
				apply : "_configure"
			},

			/**
			 * @var {boolean} C2C.dustjs.Renderer#autoClean When set to TRUE, the
			 * renderer will clean all target output paths prior to rendering.
			 * @accessor getAutoClean
			 * @mutator setAutoClean
			 * @toggler toggleAutoClean
			 * @instance
			 */
			autoClean : {
				init  : false,
				check : "Boolean"
			}

		},

		members : /** @lends C2C.dustjs.Renderer **/ {

			//<editor-fold desc="+++++ Configuration Methods +++++">

			/**
			 * Apply handler method for the {@link C2C.dustjs.Renderer#config} property.
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

				// If the new config is a string, we will assume it is a config file path
				if( tipe( val ) === "string" ) {
					me.log( "configuration.file", "Loading configuration from file: " + val );
					var cf = fs.readFileSync( val, { encoding: "utf8" } );
					val = JSON.parse( cf );
				}

				// If provided: Apply the 'verbose' setting
				if( val.verbose !== undefined && val.verbose !== null ) {
					me.setVerbose( val.verbose );
				}

				// If provided: Apply the 'autoClean' setting
				if( val.autoClean !== undefined && val.autoClean !== null ) {
					me.setAutoClean( val.autoClean );
				}

				// If provided: Apply path settings
				if( val.paths !== undefined && val.paths !== null ) {
					me.setPaths( val.paths );
				}

				// If provided: Apply plugins
				if( val.plugins !== undefined && val.plugins !== null ) {
					me.addPlugin( val.plugins );
				}

				// Configure Dust.js
				dust.config.whitespace = true;

			},

			/**
			 * Sets the paths using a single configuration object.
			 *
			 * @instance
			 * @access public
			 * @param {object} objPaths A configuration object containing path information.
			 * @returns {void}
			 */
			setPaths: function( objPaths ) {

				// Locals
				var me = this;

				// First, clear all paths
				me.clearAllPaths();

				// Second, apply root paths, if found
				// (this prevents the root path from resetting the others)
				if( objPaths.root !== undefined ) {
					me.setRootPath( objPaths.root );
					delete objPaths.root;
				}

				// Now apply all of the path settings
				_.each( objPaths, function( paths, pathType ) {

					me.clearPathsOfType( pathType );
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
						scanExtensions : null
					}, {
						short          : "helper",
						name           : "DustJS Helper Function Path",
						defaultSubdir  : "helpers",
						scanExtensions : ["js"]
					}, {
						short          : "handler",
						name           : "DustJS Handler Function Path",
						defaultSubdir  : "handlers",
						scanExtensions : ["js"]
					}, {
						short          : "filter",
						name           : "DustJS Filter Function Path",
						defaultSubdir  : "filters",
						scanExtensions : ["js"]
					}, {
						short          : "partial",
						name           : "DustJS Partial Path",
						defaultSubdir  : "partials",
						scanExtensions : contentExtensions
					}, {
						short          : "layout",
						name           : "DustJS Layout Path",
						defaultSubdir  : "layouts",
						scanExtensions : contentExtensions
					}, {
						short          : "content",
						name           : "Content Source Path",
						defaultSubdir  : "content",
						scanExtensions : contentExtensions
					}, {
						short          : "data",
						name           : "Data Source Path",
						defaultSubdir  : "data",
						scanExtensions : ["json"]
					}, {
						short          : "output",
						name           : "Render Output Path",
						defaultSubdir  : "output",
						scanExtensions : null
					}]
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
			 * A getter override for the {@link C2C.dustjs.Renderer#config} property.
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
					paths: me.getAllPaths()
				};

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods +++++">

			//<editor-fold desc="+++++ Path Management Methods for 'root' paths +++++">

			/**
			 * Clears ALL existing paths paths and adds one more root paths into
			 * the  configuration.  This method is a convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearAllPaths}
			 * {@link C2C.dustjs.Renderer#addRootPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'root' path configuration.
			 * @returns {void}
			 */
			setRootPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearAllPaths();

				// Add the new path, or paths
				me.addRootPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'root' path configuration. Much like
			 * the other path methods, this method is  a convenience alas because,
			 * internally, this method calls {@link C2C.dustjs.Renderer#addPathOfType}
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
			 * by {@link C2C.dustjs.Renderer#addRootPath} and should not be called
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

						me.log("config.paths.auto", "Automatically adding a '" + pathTypeName + "' as a root subdirectory");
						var subDirPath = pth.join( rootPath, pathType.defaultSubdir );
						me.addPathOfType( pathTypeShort, subDirPath );

					}

				});

			},

			/**
			 * Clears all 'root' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'root'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearRootPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'root' );

			},

			/**
			 * Returns the number of 'root' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'root'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'root' paths currently stored in the path
			 * configuration object
			 */
			countRootPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "root" );

			},

			/**
			 * Returns all 'root' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'root'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'root' paths currently stored in the path
			 * configuration object
			 */
			getRootPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "root", returnAsObject );

			},

			/**
			 * Returns all paths stored in the renderer's configuration.
			 *
			 * @instance
			 * @access public
			 * @returns {object} An object containing the current configuration paths
			 */
			getAllPaths: function() {

				// Locals
				var me = this;
				var pathTypes = me.getPathTypeDetails();
				var ret = {};

				// Iterate over each path type
				_.each( pathTypes, function( pathType ) {

					var pathTypeName 	= pathType.name;
					var pathTypeShort 	= pathType.short;

					ret[pathTypeShort] = me.getPathsOfType( pathTypeShort );

				});

				return ret;

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'helper' paths +++++">

			/**
			 * Clears any existing 'helper' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearHelperPaths} and
			 * {@link C2C.dustjs.Renderer#addHelperPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'helper' path configuration.
			 * @returns {void}
			 */
			setHelperPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearHelperPaths();

				// Add the new path, or paths
				me.addHelperPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'helper' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'helper'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'helper' path configuration.
			 * @returns {void}
			 */
			addHelperPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'helper', newPath );

			},

			/**
			 * Clears all 'helper' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'helper'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearHelperPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'helper' );

			},

			/**
			 * Returns the number of 'helper' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'helper'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'helper' paths currently stored in the path
			 * configuration object
			 */
			countHelperPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "helper" );

			},

			/**
			 * Returns all 'helper' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'helper'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'helper' paths currently stored in the path
			 * configuration object
			 */
			getHelperPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "helper", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'handler' paths +++++">

			/**
			 * Clears any existing 'handler' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearHandlerPaths} and
			 * {@link C2C.dustjs.Renderer#addHandlerPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'handler' path configuration.
			 * @returns {void}
			 */
			setHandlerPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearHandlerPaths();

				// Add the new path, or paths
				me.addHandlerPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'handler' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'handler'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'handler' path configuration.
			 * @returns {void}
			 */
			addHandlerPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'handler', newPath );

			},

			/**
			 * Clears all 'handler' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'handler'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearHandlerPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'handler' );

			},

			/**
			 * Returns the number of 'handler' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'handler'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'handler' paths currently stored in the path
			 * configuration object
			 */
			countHandlerPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "handler" );

			},

			/**
			 * Returns all 'handler' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'handler'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'handler' paths currently stored in the path
			 * configuration object
			 */
			getHandlerPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "handler", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'filter' paths +++++">

			/**
			 * Clears any existing 'filter' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearFilterPaths} and
			 * {@link C2C.dustjs.Renderer#addFilterPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'filter' path configuration.
			 * @returns {void}
			 */
			setFilterPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearFilterPaths();

				// Add the new path, or paths
				me.addFilterPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'filter' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'filter'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'filter' path configuration.
			 * @returns {void}
			 */
			addFilterPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'filter', newPath );

			},

			/**
			 * Clears all 'filter' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'filter'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearFilterPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'filter' );

			},

			/**
			 * Returns the number of 'filter' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'filter'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'filter' paths currently stored in the path
			 * configuration object
			 */
			countFilterPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "filter" );

			},

			/**
			 * Returns all 'filter' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'filter'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'filter' paths currently stored in the path
			 * configuration object
			 */
			getFilterPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "filter", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'partial' paths +++++">

			/**
			 * Clears any existing 'partial' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearPartialPaths} and
			 * {@link C2C.dustjs.Renderer#addPartialPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'partial' path configuration.
			 * @returns {void}
			 */
			setPartialPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearPartialPaths();

				// Add the new path, or paths
				me.addPartialPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'partial' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'partial'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'partial' path configuration.
			 * @returns {void}
			 */
			addPartialPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'partial', newPath );

			},

			/**
			 * Clears all 'partial' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'partial'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearPartialPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'partial' );

			},

			/**
			 * Returns the number of 'partial' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'partial'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'partial' paths currently stored in the path
			 * configuration object
			 */
			countPartialPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "partial" );

			},

			/**
			 * Returns all 'partial' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'partial'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'partial' paths currently stored in the path
			 * configuration object
			 */
			getPartialPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "partial", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'layout' paths +++++">

			/**
			 * Clears any existing 'layout' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearLayoutPaths} and
			 * {@link C2C.dustjs.Renderer#addLayoutPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'layout' path configuration.
			 * @returns {void}
			 */
			setLayoutPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearLayoutPaths();

				// Add the new path, or paths
				me.addLayoutPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'layout' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'layout'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'layout' path configuration.
			 * @returns {void}
			 */
			addLayoutPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'layout', newPath );

			},

			/**
			 * Clears all 'layout' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'layout'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearLayoutPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'layout' );

			},

			/**
			 * Returns the number of 'layout' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'layout'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'layout' paths currently stored in the path
			 * configuration object
			 */
			countLayoutPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "layout" );

			},

			/**
			 * Returns all 'layout' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'layout'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'layout' paths currently stored in the path
			 * configuration object
			 */
			getLayoutPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "layout", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'content' paths +++++">

			/**
			 * Clears any existing 'content' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearContentPaths} and
			 * {@link C2C.dustjs.Renderer#addContentPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'content' path configuration.
			 * @returns {void}
			 */
			setContentPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearContentPaths();

				// Add the new path, or paths
				me.addContentPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'content' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'content'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'content' path configuration.
			 * @returns {void}
			 */
			addContentPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'content', newPath );

			},

			/**
			 * Clears all 'content' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'content'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearContentPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'content' );

			},

			/**
			 * Returns the number of 'content' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'content'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'content' paths currently stored in the path
			 * configuration object
			 */
			countContentPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "content" );

			},

			/**
			 * Returns all 'content' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'content'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'content' paths currently stored in the path
			 * configuration object
			 */
			getContentPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "content", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'data' paths +++++">

			/**
			 * Clears any existing 'data' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearDataPaths} and
			 * {@link C2C.dustjs.Renderer#addDataPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'data' path configuration.
			 * @returns {void}
			 */
			setDataPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearDataPaths();

				// Add the new path, or paths
				me.addDataPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'data' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'data'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'data' path configuration.
			 * @returns {void}
			 */
			addDataPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'data', newPath );

			},

			/**
			 * Clears all 'data' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'data'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearDataPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'data' );

			},

			/**
			 * Returns the number of 'data' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'data'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'data' paths currently stored in the path
			 * configuration object
			 */
			countDataPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "data" );

			},

			/**
			 * Returns all 'data' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'data'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'data' paths currently stored in the path
			 * configuration object
			 */
			getDataPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "data", returnAsObject );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Path Management Methods for 'output' paths +++++">

			/**
			 * Clears any existing 'output' paths and adds one more into the
			 * configuration.  This method is just convenient replacement
			 * for calling {@link C2C.dustjs.Renderer#clearOutputPaths} and
			 * {@link C2C.dustjs.Renderer#addOutputPath}.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath A path, or an array of paths, to add
			 * to the 'output' path configuration.
			 * @returns {void}
			 */
			setOutputPath : function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me.clearOutputPaths();

				// Add the new path, or paths
				me.addOutputPath( newPath );

			},

			/**
			 * Adds one or more paths to the 'output' path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#addPathOfType} with the first param set to 'output'.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'output' path configuration.
			 * @returns {void}
			 */
			addOutputPath : function( newPath ) {

				// Locals
				var me = this;

				// Defer to the `addPathOfType` method
				me.addPathOfType( 'output', newPath );

			},

			/**
			 * Clears all 'output' paths from the path configuration. This method is
			 * a convenience alas because, internally, this method simply calls
			 * {@link C2C.dustjs.Renderer#clearPathsOfType} with the first param set to 'output'.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearOutputPaths : function() {

				// Locals
				var me = this;

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( 'output' );

			},

			/**
			 * Returns the number of 'output' paths currently stored in the path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#countPathsOfType}
			 * with the first param set to 'output'.
			 *
			 * @instance
			 * @access public
			 * @returns {number} The number of 'output' paths currently stored in the path
			 * configuration object
			 */
			countOutputPaths : function() {

				// Locals
				var me = this;

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( "output" );

			},

			/**
			 * Returns all 'output' paths currently defined in the renderer's path
			 * configuration object. This method is a convenience alas because,
			 * internally, this method simply calls {@link C2C.dustjs.Renderer#getPathsOfType}
			 * with the first param set to 'output'.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
			 * javascript object will be returned instead of an array.
			 * @returns {number} The number of 'output' paths currently stored in the path
			 * configuration object
			 */
			getOutputPaths : function( returnAsObject ) {

				// Locals
				var me = this;

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( "output", returnAsObject );

			},

			//</editor-fold>

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
			render : function() {

				// Locals
				var me = this;

				// Logging
				me.log( "render", "A render operation has started.." );

				// Call beforeRender event
				me._callPluginEventOnAll( "beforeRender" );

				// Auto-Clean Logic
				if( me.getAutoClean() === true ) {
					me.cleanOutputTargets();
				}

				// Start the main promise chain..
				return Promise.resolve().then(

					function() {

						return me._loadAllHelpers();

					}

				).then(

					function() {

						return me._loadAllHandlers();

					}

				).then(

					function() {

						return me._loadAllFilters();

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

						return me._compileAllLayouts();

					}

				).then(

					function () {

						return me._compileAllContentFiles();

					}

				).then(

					function () {

						return me._renderAllContentFiles();

					}

				).then(

					function () {

						return me._copyStaticContent();

					}

				).then(

					function () {

						me._callPluginEventOnAll( "afterRender" );

					}

				);

			},

			/**
			 * Iterates over, and renders, all source content files.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_renderAllContentFiles : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me._callPluginEventOnAll( "beforeRenderContent" );

				// Scan for content
				return me._scanPathType( "content" ).then(
					function onContentFilesScanned ( result ) {

						var files = result.result.files;
						var renderOps = [];

						_.each( files, function( file ) {
							renderOps.push(
								me._renderOneContentFile( file )
							)
						});

						//return result;
						return Promise.all( renderOps ).then(

							function() {

								// Post-operation Events
								me._callPluginEventOnAll( "afterRenderContent", { dust: dust, contentFiles: files } );

							}

						);

					}
				);

			},

			/**
			 * Renders a single content file.
			 *
			 * @instance
			 * @access private
			 * @param {C2C.dustjs.File} srcFile The source file to render
			 * @returns {Promise}
			 */
			_renderOneContentFile: function( srcFile ) {

				// Locals
				var me = this;
				var outputPaths = me.getOutputPaths();
				var templateName = srcFile.getRelativeBaseName();
				var renderOps = [];

				// Log the info we have so far
				me.log("render.content", "Rendering content file..");
				me.log("render.content", " -> Source    : " + srcFile.getAbsoluteFilePath() );
				me.log("render.content", " -> Name      : " + srcFile.getBaseName() );
				me.log("render.content", " -> Long Name : " + templateName );

				// Define the context
				//var context = me._getDustContext();
				var context = me._getContextForTemplate( templateName );

				// Render the output.  Since the renderer allows multiple
				// output directories (copies), we will execute one render operation
				// for each output directory.
				_.each( outputPaths, function( dPath ) {

					// Create a new C2C.dustjs.File object for
					// the target output file.
					var destFile = new C2C.dustjs.File(
						dPath,
						srcFile.getRelativePath(),
						srcFile.getBaseName() + ".html"
					);

					// Determine the absolute output path for the file
					var destFilePath = destFile.getAbsoluteFilePath();

					// Log the destination path
					me.log("render.content", " -> Dest      : " + destFilePath );

					// Create a promise for each output copy
					var renderOpPromise = new Promise(

						function( resolve, reject ) {

							// Execute the render operation
							dust.render( templateName, context, function( err, out ) {

								// Handle result
								if( err ) {

									console.log( "\n\n\n\n" );
									console.log( "------- ERROR Rendering Dust Template --------------------------------\n" );

									console.log( err );
									//console.log("\n");
									//console.log(err.stack);

									console.log( "\n----------------------------------------------------------------------" );
									console.log( "\n\n\n\n" );

									// Error!
									reject( err );

								} else {

									// Log the write operation
									me.log( "render.content", " -> [ Writing file: " + destFilePath + " (" + out.length + " bytes) ]" );

									// Write the file content
									destFile.writeSync( out );

									// Finished
									resolve(
										{
											output : out,
											path   : destFilePath
										}
									);

								}

							})

						}

					);

					// Add the render op to the collection
					renderOps.push( renderOpPromise );

				});


				// Return the promise for all ops
				return Promise.all( renderOps );


			},

			/**
			 * This method will scan for files of a particular type.  Path
			 * types are defined by {@link C2C.dustjs.Renderer#_initPathTypes}.
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
				var fsl = new C2C.dustjs.FileSystemLoader();
				fsl.setVerbose( me.getVerbose() );

				// Log it
				me.log( "renderer.scan", "Scanning for files in '" + pathType.name + "' (short: " + pathType.short + ")" );

				// Scan
				return fsl.scanForFiles( paths, pathType.scanExtensions );

			},

			/**
			 * Copies all static content files from the 'content' directories.
			 * Any file that is not considered as a source dust.js template file
			 * will be considered as static content.  Static content will be
			 * given an identical output directory structure as its input
			 * directory structure.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_copyStaticContent: function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me._callPluginEventOnAll( "beforeCopyStatic" );

				// Get path type info and settings
				var pathType = me.getSinglePathType("content");

				// Get all associated paths
				var paths = me.getPathsOfType("content");

				// Create a loader
				var fsl = new C2C.dustjs.FileSystemLoader();
				fsl.setVerbose( me.getVerbose() );

				// Log it
				me.log( "static.scan", "Scanning for static content files in '" + pathType.name + "' (short: " + pathType.short + ")" );

				// Scan
				return fsl.scanForFiles( paths ).then(

					function afterStaticContentScan( result ) {

						// This array will contain all static file copy
						// operations that will be used in a Promise.all call
						var staticCopyOps = [];

						// Capture ALL content files
						// (this will include both static and "source" files)
						var files = result.result.files;

						// Iterate over each
						_.each( files, function( file ) {

							// Here we differentiate the "source" dust.js files
							// from static content files by looking at the file
							// extensions.  Everything that is not specified
							// as a dust.js source will be considered static.
							var isStatic = true;
							_.each( pathType.scanExtensions, function( dynExt ) {
								if( file.is( dynExt ) ) {
									isStatic = false;
								}
							});

							// With static files identified, we can copy them
							// to their target location(s).
							if( isStatic ) {
								staticCopyOps.push(
									me._copySingleStaticFile( file )
								);
							}

						});

						return Promise.all(staticCopyOps ).then(

							function() {

								// Post-operation Events
								me._callPluginEventOnAll( "afterCopyStatic", { staticFiles: files } );

							}

						);

					}

				);

			},

			/**
			 * Copies a single static resource file.  This method is called
			 * exclusively by {@link C2C.dustjs.Renderer#_copyStaticContent}.
			 *
			 * @instance
			 * @access private
			 * @param {C2C.dustjs.File} srcFile
			 * @returns {Promise}
			 */
			_copySingleStaticFile: function( srcFile ) {

				var me = this;
				var abs = srcFile.getAbsoluteFilePath();
				var outputPaths = me.getOutputPaths();
				var copyOps = [];

				me.log( "static.found", "Found static resource: " + abs );

				// Render the output.  Since the renderer allows multiple
				// output directories (copies), we will execute one render operation
				// for each output directory.
				_.each( outputPaths, function( dPath ) {

					// Create a new C2C.dustjs.File object for
					// the target output file.
					var destFile = new C2C.dustjs.File(
						dPath, srcFile.getRelativePath(), srcFile.getFilename()
					);

					// Determine the absolute output path for the file
					var destFilePath = destFile.getAbsoluteFilePath();

					// Ensure the target output directory exists
					destFile.createDirectoryPath();

					// Create the file copy operation
					me.log( "static.copy", " -> Copying to: '" + destFilePath + "'" );
					var copyOp = fs.copyAsync( abs, destFilePath );

					// Append the copy operation
					copyOps.push( copyOp );

				});

				return Promise.all( copyOps );

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Util: Compilation & Context +++++">

			/**
			 * Loads and compiles all of the 'content' files.
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_compileAllContentFiles : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me._callPluginEventOnAll( "beforeCompileContent" );

				// Scan for content
				return me._scanPathType( "content" ).then(

					function onContentFilesScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							// Log the info we have so far
							me.log("compile.content", "Compiling content file..");
							me.log("compile.content", " -> Source    : " + srcFile.getAbsoluteFilePath() );
							me.log("compile.content", " -> Long Name : " + srcFile.getRelativeBaseName() );

							// Compile the template
							me._compileOneTemplate(
								srcFile.getRelativeBaseName(),
								srcFile,
								true
							);

						});

						// Post-operation Events
						me._callPluginEventOnAll( "afterCompileContent", { dust: dust, contentFiles: files } );

						return files;

					}
				);

			},

			/**
			 * Compiles a single template (or partial) and adds it to Dust.js
			 *
			 * @instance
			 * @access private
			 * @param {string} name The name of the template
			 * @param {C2C.dustjs.File} srcFile The source file to be compiled
			 * @param {boolean} [parseFrontMatter=false] When TRUE the file will
			 * be parsed for "front matter" (using the `gray-matter` library)
			 * before being compiled by DustJS.
			 * @returns {void}
			 */
			_compileOneTemplate : function( name, srcFile, parseFrontMatter ) {

				// Locals
				var me = this;
				var srcPath = srcFile.getAbsoluteFilePath();

				// Default the parseFrontMatter param
				if( parseFrontMatter === undefined || parseFrontMatter !== true ) {
					parseFrontMatter = false;
				}

				// Load Source File
				//var src = fs.readFileSync( srcPath, "utf8" );
				var src = srcFile.readSync();

				// Front-Matter Handling
				if( parseFrontMatter ) {
					me.log( "parse.matter", " -> [ Checking template: '" + name + "' for front-matter]" );
					var matterData = matter(src);
					me._storeFrontMatterData( name, matterData.data );
					src = matterData.content;

					// Apply a 'layout' template, if applicable..
					src = me._applyLayoutToTemplate( src, matterData.data, srcFile.is("md") );

				}

				// Markdown Processing
				if( srcFile.is("md") ) {
					me.log( "markdown.parse", " -> [ Parsing Markdown for Template: '" + name + "'" );
					src = me._parseMarkdown( src );
				}

				// Logging for Compilation
				me.log( "compile.template", " -> [ Compiling template: '" + name + "' ]" );

				// Compile the Source as a Dust.js Template
				var compiled = dust.compile( src, name );

				// Add the compiled template to the Dust.js store
				dust.loadSource( compiled );

			},

			/**
			 * Uses a {@link C2C.dustjs.MarkdownParser} object to parse a bit of
			 * markdown into HTML.  This method is used exclusively by
			 * {@link C2C.dustjs.Renderer#_compileOneTemplate}.
			 *
			 * @instance
			 * @access private
			 * @param {string} srcMarkdown The Markdown source
			 * @returns {string} The resulting HTML
			 */
			_parseMarkdown: function( srcMarkdown ) {

				// Locals
				var me = this;
				var resHtml;

				// Ensure we have a markdown parser instantiated
				if( me.$$markdownParser === undefined ) {
					me.$$markdownParser = new C2C.dustjs.MarkdownParser();
					me.log( "markdown.parse", "      -> Instantiating Markdown Parser" );
				}

				// Start the log
				me.log( "markdown.parse", "      -> Source Markdown: " + srcMarkdown.length + " bytes" );

				// Parse and return
				resHtml = me.$$markdownParser.parse( srcMarkdown );

				// Finish the log
				me.log( "markdown.parse", "      -> Resulting HTML : " + resHtml.length + " bytes" );

				// All done
				return resHtml;

			},

			/**
			 * Loads the dust context info from the provided
			 * config file location (in the `cfg` object).
			 *
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

			//<editor-fold desc="+++++ Util: Cleaning +++++">

			/**
			 * Cleans the target output directories.  This will ensure
			 * that all output directories exist but that they are
			 * entirely empty.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			cleanOutputTargets: function() {

				// Locals
				var me = this;

				// Pre-operation Event
				me._callPluginEventOnAll( "beforePreClean" );

				// Say Hello
				me.log( "clean", "Cleaning all output paths" );

				// Get a list of output paths
				var paths = me.getOutputPaths();

				// Iterate over each output path
				_.each( paths, function( outputPath ) {

					// Log it
					me.log( "clean.path", " -> Path    : " + outputPath );

					// Clean the target directory
					fs.emptyDirSync( outputPath );

				});

				// Post-operation Event
				me._callPluginEventOnAll( "afterPreClean" );


			},


			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'data' +++++">

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
				me._callPluginEventOnAll( "beforeLoadData" );

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
						me._callPluginEventOnAll( "afterLoadData", { data: contextData, dataFiles: files } );

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
				me._callPluginEventOnAll( "beforeCompilePartials" );

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
							me._compileOneTemplate(
								partialName,
								srcFile,
								false
							);

						});

						// Post-operation Events
						me._callPluginEventOnAll( "afterCompilePartials", { dust: dust, partialFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'layouts' +++++">

			/**
			 * Loads and compiles all layouts (in-line partials).
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_compileAllLayouts : function() {

				// Locals
				var me = this;

				// Pre-operation Events
				me._callPluginEventOnAll( "beforeCompileLayouts" );

				// Scan for content
				return me._scanPathType( "layout" ).then(
					function onLayoutsScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							var layoutName = "layout/" + srcFile.getRelativeBaseName();

							// Log the info we have so far
							me.log("compile.layout", "Compiling layout..");
							me.log("compile.layout", " -> Source    : " + srcFile.getAbsoluteFilePath() );
							me.log("compile.layout", " -> Long Name : " + layoutName );

							// Compile the template
							me._compileOneTemplate(
								layoutName,
								srcFile,
								false
							);

						});

						// Post-operation Events
						me._callPluginEventOnAll( "afterCompileLayouts", { dust: dust, layoutFiles: files } );

						return files;

					}
				);

			},

			/**
			 * Applies a "layout" to a template if the "front-matter" data
			 * of the content contains a ".layout" property.
			 *
			 * @instance
			 * @access private
			 * @param {string} srcContent The source content.  This content will
			 * be inserted into the layout as the "bodyContent"
			 * @param {object} matterData The front-matter data from the content file
			 * @param {boolean} [contentIsMarkdown=false] Whether or not the content
			 * held in `srcContent` is from a markdown file.
			 * @returns {string}
			 */
			_applyLayoutToTemplate: function( srcContent, matterData, contentIsMarkdown ) {

				// Locals
				var me = this;

				// Parse contentIsMarkdown param
				if( contentIsMarkdown === undefined || contentIsMarkdown !== true ) {
					contentIsMarkdown = false;
				}

				// Check for the 'layout' property in the front-matter
				// data.  If no layout property is included then
				// this method doesn't need to do anything.
				if( matterData.layout !== undefined ) {

					// Resolve the proper layout name
					var layoutName = "layout/" + matterData.layout;

					// Depending on whether or not the content source is markdown
					// we will append and prepend different strings
					if( contentIsMarkdown ) {

						// Log the layout application
						me.log( "layout.apply", "      -> Applying layout '" + layoutName + "' to a Markdown content file" );

						// Prepend the layout partial inclusion tag
						// and surround the content with bodyContent tags
						srcContent = 	"{@notmd}{>\"" + layoutName + "\"/}" +
										"{<bodyContent}{/notmd}" +
										srcContent +
										"{@notmd}{/bodyContent}{/notmd}";

					} else {

						// Log the layout application
						me.log( "layout.apply", "      -> Applying layout '" + layoutName + "' to a HTML content file" );

						// Prepend the layout partial inclusion tag
						// and surround the content with bodyContent tags
						srcContent = 	"{>\"" + layoutName + "\"/}" +
										"{<bodyContent}" +
										srcContent +
										"{/bodyContent}";

					}




				}

				return srcContent;

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
				me._callPluginEventOnAll( "beforeLoadHelpers" );

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
							dust.helpers[ helperName ] = require( srcFile.getAbsoluteFilePath() );

						});

						// Pre-operation Events
						me._callPluginEventOnAll( "afterLoadHelpers", { helpers: dust.helpers, helperFiles: files } );

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
				me._callPluginEventOnAll( "beforeLoadHandlers" );

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
						me._callPluginEventOnAll( "afterLoadHandlers", { handlers: me.$$contextHelpers, handlerFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'filters' +++++">

			/**
			 * Loads all filter functions and adds them to `dustjs.filters`
			 *
			 * @instance
			 * @access private
			 * @returns {Promise}
			 */
			_loadAllFilters : function() {

				// Locals
				var me = this;
				me.$$contextHelpers = {};

				// Pre-operation Events
				me._callPluginEventOnAll( "beforeLoadFilters" );

				// Scan for content
				return me._scanPathType( "filter" ).then(
					function onFiltersScanned ( result ) {

						var files = result.result.files;

						_.each( files, function( srcFile ) {

							var filterName = srcFile.getBaseName();

							// Log the info we have so far
							me.log("filter.load", "Loading filter function ..");
							me.log("filter.load", " -> Source       : " + srcFile.getAbsoluteFilePath() );
							me.log("filter.load", " -> Filter Name : |" + filterName );

							// Add the filter to the DustJS object
							dust.filters[ filterName ] = require( srcFile.getAbsoluteFilePath() );

						});

						// Post-operation Events
						me._callPluginEventOnAll( "afterLoadFilters", { filters: dust.filters, filterFiles: files } );

						return files;

					}
				);

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Methods for 'plugins' +++++">

			/**
			 * Adds a plugin to the renderer.  This method will call the
			 * 'onAttach' event on the plugin after it has been initialized.
			 *
			 * @instance
			 * @access public
			 * @param {string|string[]|function|function[]} plugin The plugin (or plugins) to add.
			 * If a string (or an array of strings) is passed then it will be used in a require() statement to resolve the plugin function.
			 * Otherwise, this method expects this parameter to be a constructor function (or an array of constructor functions) and
			 * will use it to initialize a new plugin with the new keyword.
			 * @returns {object|object[]} The initialized plugin that was added. If an array was
			 * passed to `plugin`, then an array will also be returned here.
			 */
			addPlugin : function( plugin ) {

				// Locals
				var me = this;
				var name = null;
				var errMessage;

				// Handle arrays
				if( tipe(plugin) === "array" ) {
					var ret = [];
					_.each( plugin, function( plug ) {
						var iplug = me.addPlugin( plug );
						ret.push(iplug);
					});
					return ret;
				}

				// Prep
				me._initPluginStore();

				// Log
				me.log("plugin.load", "Loading plugin..");

				// Handle strings
				if( tipe(plugin) === "string" ) {
					try {
						plugin = require(plugin);
					} catch( err ) {
						errMessage = "#addPlugin() was given a string ('" + plugin + "'), which is assumed to be a file path, but could not find a plugin at that location.";
						me.log( "plugin.error", errMessage );
						throw new vError( err, errMessage );
					}
				}

				// Ensure we have an object
				if( tipe(plugin) !== "function" ) {
					errMessage = "Attempted to load an invalid plugin.  #addPlugin() expects either a string path to a plugin module or a plugin constructor function.";
					me.log( "plugin.error", errMessage );
					throw new vError( errMessage );
				}

				// Initialize the plugin object
				var initialized = new plugin( me );

				// Call the 'onAttach' event for the new plugin
				me._callPluginEventOnOne( initialized, "onAttach" );

				// Add the plugin to the internal store
				me.$$pluginStore.push( initialized );

				// Done
				return initialized;

			},

			/**
			 * Convenience alias for the {@link C2C.dustjs.Renderer#addPlugin} method.
			 *
			 * @instance
			 * @access public
			 * @see C2C.dustjs.Renderer#addPlugin
			 */
			use : function( plugin ) {
				return this.addPlugin( plugin );
			},

			/**
			 * Clears all plugins.  The `onDetach` event will be called on
			 * each plugin during this operation.
			 *
			 * @instance
			 * @access public
			 * @returns {object[]} An array of the plugins that were removed.
			 */
			clearPlugins: function() {

				// Locals
				var me = this;
				var ret;

				// Call the 'onDetach' event before removing the plugins
				me._callPluginEventOnAll( "onDetach" );

				// Store plugin array for return
				ret = me.$$pluginStore;

				// Clear plugins
				me.$$pluginStore = [];

				// Done
				return ret;

			},

			/**
			 * Calls an event on all loaded plugins.
			 *
			 * @instance
			 * @access private
			 * @param {string} eventName The event to call
			 * @param {?object} [eventData=null] Extra data that should be passed to the event
			 * @returns {void}
			 */
			_callPluginEventOnAll: function( eventName, eventData ) {

				// Locals
				var me = this;

				// Handle optional eventData param
				if( eventData === undefined || tipe(eventData) !== "object" ) {
					eventData = null;
				}

				// Prep
				me._initPluginStore();

				// Save a little effort if no plugins exist
				if( me.$$pluginStore.length === 0 ) {
					return;
				}

				// Log
				me.log("plugin.event.all", "Calling plugin event on all plugins: '" + eventName + "'");

				// Iterate
				_.each( me.$$pluginStore, function( plugin ) {
					me._callPluginEventOnOne( plugin, eventName, eventData );
				});

			},

			/**
			 * Calls an event on a single, loaded, plugin.
			 *
			 * @instance
			 * @access private
			 * @param {object} plugin The plugin to call the event on
			 * @param {string} eventName The event to call
			 * @param {?object} [eventData=null] Extra data that should be passed to the event
			 * @returns {void}
			 */
			_callPluginEventOnOne: function( plugin, eventName, eventData ) {

				// Locals
				var me = this;

				// Handle optional eventData param
				if( eventData === undefined || tipe(eventData) !== "object" ) {
					eventData = {};
				}

				// Log
				me.log("plugin.event.one", "Calling plugin event on one plugin: '" + eventName + "'");

				// Call the event
				if( plugin[ eventName ] !== undefined && tipe( plugin[ eventName ] ) === "function" ) {
					var fn = plugin[ eventName].bind( plugin );
					fn( me, eventData );
					me.log("plugin.event.one", "  -> Call succeeded");
				}


			},

			/**
			 * Ensures that the internal plugin store is initialized.
			 * This method is idempotent.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initPluginStore: function() {

				var me = this;
				if( me.$$pluginStore === undefined ) {
					me.$$pluginStore = [];
				}

			}

			//</editor-fold>

		}

	}
);
