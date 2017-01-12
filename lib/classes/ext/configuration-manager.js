/**
 * This class is a "renderer extension" that assists with Grits.js configuration
 * options. See {@link Dasix.grits.AbsRenderExtension} to learn more about
 * renderer extensions.
 *
 * @class Dasix.grits.ext.ConfigurationManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.7.15
 * @version 1.0
 * @copyright 2017 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 	);
var _ 		= require( "lodash" 	);
var Promise = require( "bluebird" 	);
var vError 	= require( "verror" 	);
var tipe 	= require( "tipe" 		);
var fs		= require( "fs-extra"   );
var pth 	= require( "path"       );


// Promisification
Promise.promisifyAll(fs);

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.ConfigurationManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.ConfigurationManager **/ {

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
				me.setLogTopic("config.manager");

				// Instantiate config variables
				me.$$configData = null;


			},

			//<editor-fold desc="+++++ Configuration: Base Config +++++">

			/**
			 * Applies a default renderer configuration.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			initConfig : function() {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				me.setConfig(
					{
						paths   : {},
						components: {}
					}
				);

				// Set halt on warnings default
				grits.$$haltOnWarnings = false;

			},

			/**
			 * Ensures that the configuration data placeholder variable exists.
			 *
			 * @access private
			 */
			_initConfigData: function() {

				// Locals
				var me = this;

				// Log the event
				// Note: This is _usually_ called before logging is enabled and nothing will be output.
				if( me.$$configData === null ) {
					me.log( "debug", "config.init", "Initializing renderer configuration" );
					me.$$configData = {};
				} else {
					me.log( "debug", "config.new", "Applying new renderer configuration" );
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

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// Build the return
				return {
					verbose 		: grits.getVerbose(),
					logLevel		: grits.getLogLevel(),
					logFilter		: grits.getLogFilter(),
					logFormat		: grits.getLogFormat(),
					haltOnWarnings	: grits.$$haltOnWarnings,
					autoClean		: grits.cleanupManager.isEnabled(),
					cleanMode		: grits.cleanupManager.getCleanMode(),
					loadedPlugins	: grits.pluginManager.getPluginNames(),
					defaultLayout	: grits.layoutManager.getDefaultLayout(),
					paths			: grits.getAllPaths()
				};

			},

			/**
			 * Sets new configuration options ..
			 *
			 * @instance
			 * @access private
			 * @param {?object} newConfig
			 * @param {?object} old
			 * @param {string} name
			 * @returns {void}
			 */
			setConfig : function( newConfig ) {

				// Locals
				var me = this;

				// Ignore NULL configurations
				if( newConfig === null ) {

					// Note: This is _usually_ called before logging is enabled and nothing will be output.
					me.log( "debug", "configuration", "Ignoring NULL renderer configuration" );

					// Exit
					return;

				}

				// Ensure the config data variable exists
				me._initConfigData();


				// Defer to the step methods to load each type
				// of configuration data ..
				newConfig = me._stepConfigFile( newConfig );

				me._stepLogging( newConfig );
				me._stepCleanup( newConfig );
				me._stepPaths( newConfig );
				me._stepGlobals( newConfig );
				me._stepPlugins( newConfig );
				me._stepWatch( newConfig );
				me._stepServe( newConfig );
				me._stepErrors( newConfig );
				me._stepLayout( newConfig );
				me._stepComponents( newConfig );

			},

			//<editor-fold desc="+++++ Load Config Step: Load Config from File +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method is checking to see if the config data
			 * indicates that a config file should be loaded and where we
			 * should look for the file.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepConfigFile : function( configData ) {

				// Locals
				var me 			= this;
				var configPath 	= null;

				// Configuration file loading..
				// If the config data is a string, rather than an object,
				// we will assume it is a config file path.
				if( tipe( configData ) === "string" ) {
					configPath = configData;
					configData = {};
				} else {
					if( configData.configFile !== undefined && configData.configFile !== null ) {
						configPath = configData.configFile;
					}
				}

				// If a config path is provided, then we know that we
				// must load a config file ..
				if( configPath !== null ) {
					return me._loadConfigFromFile( configData, configPath );
				} else {
					return configData;
				}

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
				var me 			= this;
				var configDir 	= pth.dirname( configPath );
				var existingPaths, allConfigPaths, configFileContent,
					configFileValues, mergedConfig;

				// Log it
				me.log( "info", "file", "Loading configuration from file: " + configPath );

				// Load the config file
				configFileContent 	= fs.readFileSync( configPath, { encoding: "utf8" } );
				configFileValues 	= JSON.parse( configFileContent );

				// Ensure that all .paths are in array format; this prevents
				// breakages during the merge operation later.
				if( configFileValues.paths !== undefined && configFileValues.paths !== null ) {

					allConfigPaths = me._ensurePropsAreArrays( configFileValues.paths );

					// Resolve paths specified in the configuration file
					// to be relative to the configuration file itself.
					_.each( allConfigPaths, function( pathsOfType, pathTypeName ) {

						_.each( pathsOfType, function( onePath, pathIndex ) {

							// Resolve to be relative to config file
							allConfigPaths[ pathTypeName ][ pathIndex ] = pth.resolve( configDir, onePath );

						});

					});

				} else {
					allConfigPaths = {};
				}

				// Parse and standardize any paths that existed before we loaded the file
				if( existingConfig.paths !== undefined && existingConfig.paths !== null ) {
					existingPaths = me._ensurePropsAreArrays( existingConfig.paths );
				} else {
					existingPaths = {};
				}

				// We don't want these merged systematically (with the rest of the
				// config) because we need to provide custom logic for path merging..
				delete configFileValues.paths;
				delete existingConfig.paths;

				// Merge the configs
				mergedConfig = _.merge( existingConfig, configFileValues );
				mergedConfig.paths = {};

				// Manually merge the paths and add them back to the config
				_.each( [allConfigPaths, existingPaths], function( targetPaths ) {

					_.each( targetPaths, function( pathVals, pathType ) {

						_.each( pathVals, function( pathVal ) {

							if( mergedConfig.paths[ pathType ] === undefined ) {
								mergedConfig.paths[ pathType ] = [];
							}
							mergedConfig.paths[ pathType ].push( pathVal );

						});

					});
				});

				return mergedConfig;

			},

			/**
			 * A simple helper/utility method created for `_loadConfigFromFile`,
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

			//<editor-fold desc="+++++ Load Config Step: Logging +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads settings related to logging.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepLogging : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// Log Level
				if( configData.logLevel !== undefined ) {

					grits.setLogLevel( configData.logLevel );

				} else {

					// The 'verbose' setting is deprecated so we'll only
					// consider it if the 'logLevel' setting is not provided.
					if( configData.verbose !== undefined && configData.verbose !== null ) {
						grits.setVerbose( configData.verbose );
					}

				}



				// If provided: Apply the 'logFilter' setting
				if( configData.logFilter !== undefined && configData.logFilter !== null ) {
					grits.setLogFilter( configData.logFilter );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Cleanup +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads settings related to cleanup operations.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepCleanup : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply the 'autoClean' setting
				if( configData.autoClean !== undefined && configData.autoClean !== null ) {
					grits.cleanupManager.setEnabled( configData.autoClean );
				}

				// If provided: Apply the 'cleanMode' setting
				if( configData.cleanMode !== undefined && configData.cleanMode !== null ) {
					grits.cleanupManager.setCleanMode( configData.cleanMode );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Paths +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads path settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepPaths : function( configData ) {

				// Locals
				var me 			= this;

				// If provided: Apply path settings
				if( configData.paths !== undefined && configData.paths !== null ) {
					me.setPaths( configData.paths );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Global and Plugin Settings +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads global and plugin settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepGlobals : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply settings (includes global plugin config)
				if( configData.settings !== undefined && configData.settings !== null ) {
					grits.pluginManager.setGlobalConfig( configData.settings );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Plugins +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads grits plugins.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepPlugins : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply plugins
				if( configData.plugins !== undefined && configData.plugins !== null ) {
					grits.pluginManager.addPlugin( configData.plugins );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Watch +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads watch settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepWatch : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply watch config
				if( configData.watch !== undefined && configData.watch !== null ) {
					grits.watchManager.setConfig( configData.watch );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Serve +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads live/webserver settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepServe : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply serve config (live reload server)
				if( configData.serve !== undefined && configData.serve !== null ) {
					grits.reloadServer.setConfig( configData.serve );
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Warnings & Errors +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads error and warning settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepErrors : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply "halt on errors" config
				if( configData.haltOnWarnings !== undefined && configData.haltOnWarnings !== null ) {
					if( configData.haltOnWarnings === true ) {
						grits.$$haltOnWarnings = true;
					} else {
						grits.$$haltOnWarnings = false;
					}
				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Layouts +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads settings related to layouts.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepLayout : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply "default layout" setting
				if( configData.defaultLayout !== undefined ) {
					grits.layoutManager.setDefaultLayout( configData.defaultLayout );
				}


			},

			//</editor-fold>

			//<editor-fold desc="+++++ Load Config Step: Sub-Components +++++">

			/**
			 * This is one of many helpers for the {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * methods that loads new configuration data.  Each of the "_step"
			 * methods will be called, according to a particular order, with
			 * each one parsing a different part of the config object.
			 *
			 * Specifically, this method loads component-specific settings.
			 *
			 * @access private
			 * @param configData A full configData object, passed verbatim from {@link Dasix.grits.ext.ConfigurationManager#setConfig}
			 * @returns {void}
			 */
			_stepComponents : function( configData ) {

				// Locals
				var me 			= this;
				var grits		= me.getGrits();

				// If provided: Apply sub-component configurations
				if( configData.components !== undefined ) {
					grits.componentConfigManager.setAllBaseConfigs( configData.components );
				}

			},

			//</editor-fold>



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
				var me 			= this;
				var grits		= me.getGrits();

				// Default the 'keepExisting' param
				if( keepExisting === undefined || keepExisting === null || keepExisting !== true ) {
					keepExisting = false;
				}

				// First, clear all paths
				if( !keepExisting ) {
					grits.clearAllPaths();
				}

				// Second, apply root paths, if found
				// (this prevents the root path from resetting the others)
				if( objPaths.root !== undefined ) {
					grits.setRootPath( objPaths.root );
					delete objPaths.root;
				}

				// Now apply all of the path settings
				_.each( objPaths, function( paths, pathType ) {

					// Clear the existing paths for the current type
					// This seems redundant but its actually on purpose:
					// We want the provided paths to overwrite any
					// generated by 'setRootPath' above.
					if( !keepExisting ) {
						grits.clearPathsOfType( pathType );
					}

					// Add the paths for the current type
					grits.addPathOfType( pathType, paths );

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
				var grits		= me.getGrits();

				// Defer to the `addPathOfType` method for adding
				// the reference to the root directory
				grits.addPathOfType( 'root', newPath );

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
				var me 			= this;
				var grits		= me.getGrits();
				var pathTypes 	= grits.getPathTypeDetails();

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
						me.log("debug", "path.auto." + pathTypeShort, "Implying '" + pathTypeShort + "' path: '" + subDirPath + "' (from root)");
						grits.addPathOfType( pathTypeShort, subDirPath );

					}

				});

			}

			//</editor-fold>


		}

	}

);
