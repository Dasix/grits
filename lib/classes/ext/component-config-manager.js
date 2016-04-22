/**
 * This class is a "renderer extension" that assists in the
 * management of component configurations.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.ComponentConfigManager
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

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.ComponentConfigManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.ComponentConfigManager **/ {

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
				me.setLogTopic("component.cfg.manager");

			},

			/**
			 * Sets the "factory default" values for a component (a.k.a. the "Factory Layer").
			 * These values should reflect the absolute and pure defaults provided by the
			 * component module, which will be used as the foundational layer for building
			 * component configuration objects.  (i.e. all other config layers will override these).
			 *
			 * @instance
			 * @access public
			 * @param {string} componentName The name of the component
			 * @param {object} config The factory default configuration for the component.
			 * @returns {void}
			 */
			setFactoryConfig: function( componentName, config ) {

				// Locals
				var me = this;

				// Defer to `#_setManyLayerValues()` for config data injection
				me._setManyLayerValues( componentName, "factory", config );

			},

			/**
			 * Applies the Grits.js defaults for a component (a.k.a the "Default" layer).
			 * The Grits default layer exists one layer above the factory defaults
			 * and are second-to-last in line for precidence.
			 *
			 * @instance
			 * @access public
			 * @param {string} componentName The name of the component being configured.
			 * @param {object} config The configuration data to inject.
			 * @returns {void}
			 */
			setDefaultConfig: function( componentName, config ) {

				// Locals
				var me = this;

				// Defer to `#_setManyLayerValues()` for config data injection
				me._setManyLayerValues( componentName, "default", config );

			},

			/**
			 * Applies the global configuration settings for a component (a.k.a the "Base" layer).
			 * The base layer exists one layer above the Grits defaults and are
			 * third-to-last in line for precidence (and second-to-first).
			 * The only values that will override these are per-page overrides.
			 *
			 * @instance
			 * @access public
			 * @param {string} componentName The name of the sub-component to configure (e.g. "dust")
			 * @param {object} componentConfig A sub-component configuration object for one sub-component.
			 * @returns {void}
			 */
			setBaseConfig: function( componentName, componentConfig ) {

				// Locals
				var me = this;

				// Defer to `#_setManyLayerValues()` for config data injection
				me._setManyLayerValues( componentName, "base", componentConfig );

			},

			// --

			/**
			 * Ensures that provided component names are consistent.  This method
			 * will make component names lower case and also provides a platform
			 * for implementing aliases (e.g. `hljs -> highlightjs`).
			 *
			 * @instance
			 * @access public
			 * @param {string} componentName The component name before standardization.
			 * @returns {string} The standardized component name.
			 */
			standardizeComponentName: function( componentName ) {

				// Locals
				var me = this;

				// Force to lower case
				componentName = componentName.toLowerCase().trim();

				// Aliases..
				switch( componentName ) {
					case "hljs":
						componentName = "highlightjs";
						break;
				}

				// Return
				return componentName;

			},

			/**
			 * Applies sub-component configuration data from the Grits renderer's
			 * configuration (setConfig or from a configuration file).  This method
			 * simply calls `#setBaseConfig` for each property found in the provided
			 * config, which makes this an ideal entry point for configuration values
			 * coming from the Renderer's `setConfig` method.
			 *
			 * @see setBaseConfig
			 * @instance
			 * @access private
			 * @param {object} config A sub-component configuration object.
			 * @returns {void}
			 */
			setAllBaseConfigs: function( config ) {

				// Locals
				var me = this;

				// Validate Params
				if( tipe( config ) !== "object" ) {
					return;
				}

				// Pass each component config to `#setComponentConfig()`
				_.each( config, function( componentConfig, componentName ) {
					me.setBaseConfig( componentName, componentConfig );
				});

			},

			/**
			 * Ensures that the data store for a given component+layer combination exists.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The target component
			 * @param {string} layer The configuration layer for the target component
			 * @private
			 */
			_initLayerConfig: function( componentName, layer ) {

				// Locals
				var me = this;

				// Ensure the top-level store is initialized
				if( _.isNil( me.$$configData ) ) {
					me.$$configData = {};
				}

				// Ensure the component-level store is initialized
				if( _.isNil( me.$$configData[ componentName ] ) ) {
					me.$$configData[ componentName ] = {};
				}

				// Ensure the layer store is initialized
				if( _.isNil( me.$$configData[ componentName ][ layer ] ) ) {
					me.$$configData[ componentName ][ layer ] = {};
				}

			},

			/**
			 * This method loads one or more values into the configuration store
			 * within the appropriate layer.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the component being configured
			 * @param {string} layer The layer to which the configuration data should be applied
			 * @param {object} config The configuration data to apply/inject
			 * @returns {void}
			 */
			_setManyLayerValues: function( componentName, layer, config ) {

				// Locals
				var me = this;

				// Validate params
				if( tipe( config ) !== "object" ) {
					return;
				}

				// Send each value to `_#setLayerValue`
				_.each( config, function( configValue, configKey ) {
					me._setLayerValue( componentName, layer, configKey, configValue );
				});

			},

			/**
			 * This method loads a single value into the configuration store
			 * within the appropriate layer.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the component being configured
			 * @param {string} layer The layer to which the configuration data should be applied
			 * @param {string} configKey The setting name
			 * @param {*} configValue The value for the setting
			 * @returns {void}
			 */
			_setLayerValue: function( componentName, layer, configKey, configValue ) {

				// Locals
				var me = this;

				// Validate params
				if( tipe( componentName ) !== "string" ) {
					throw new Error("Invalid component name provided to ComponentConfigManager#_setLayerValue.  The `componentName` parameter must be a string.")
				}

				// Force layer to lower case
				layer = layer.toLowerCase();

				// Standardize Component Name
				componentName = me.standardizeComponentName( componentName );

				// Ensure store is initialized
				me._initLayerConfig( componentName, layer );

				// Set the value
				me.$$configData[ componentName ][ layer ][ configKey ] = configValue;

			},

			/**
			 * Retrieves the configuration data for a component within a certain layer.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the component
			 * @param {string} layer The layer from which to pull the configuration data
			 * @returns {object}
			 */
			_getLayerValues: function( componentName, layer ) {

				// Locals
				var me = this;

				// Validate params
				if( tipe( componentName ) !== "string" ) {
					throw new Error("Invalid component name provided to ComponentConfigManager#_getLayerValues.  The `componentName` parameter must be a string.")
				}

				// Force layer to lower case
				layer = layer.toLowerCase();

				// Standardize Component Name
				componentName = me.standardizeComponentName( componentName );

				// Ensure store is initialized
				me._initLayerConfig( componentName, layer );

				// Return the values
				return _.clone( me.$$configData[ componentName ][ layer ] );

			},

			/**
			 * Gets the final configuration for a component.  This method will
			 * merge all of the configuration layers and ensure the proper precidence
			 * is applied.
			 *
			 * @instance
			 * @access public
			 * @param {string} componentName The name of the component
			 * @param {?string} overrides Optional overrides to be applied to the
			 * merged configuration.  Values provided here will override ALL of
			 * the configuration layers.
			 * @returns {object}
			 */
			getComponentConfig: function( componentName, overrides ) {

				// Locals
				var me = this;

				// Load the config data from each layer
				var factory = me._getLayerValues( componentName, "factory" 	);
				var grits 	= me._getLayerValues( componentName, "default" 	);
				var config 	= me._getLayerValues( componentName, "base" 	);

				// Default the 'overrides' param
				if( _.isNil( overrides ) || tipe( overrides ) !== "object" ) {
					overrides = {};
				} else {
					overrides = _.clone( overrides );
				}

				// Compose and return
				return _.defaults(
					overrides, config, grits, factory
				);


			},



			// -- legacy --




			/**
			 * Sets sub-component configuration for a SINGLE config value for ONE
			 * sub-component (dust, sass, etc). Like Grits configuration, component
			 * configuration is _exclusive_, so omitted configuration values will
			 * not affect the configuration of the sub-components.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the sub-component to configure (e.g. "dust")
			 * @param {string} configKey The setting to set (e.g. "whitespace")
			 * @param {*} configValue The new setting value (e.g. false)
			 * @returns {void}
			 */
			XXX_setComponentConfigValue: function( componentName, configKey, configValue ) {

				// Locals
				var me = this;

				// Validate Params
				if( tipe( componentName ) !== "string" ) {
					throw new Error("Invalid component name provided to Renderer#_setComponentConfigValue.  The `componentName` parameter must be a string.");
				}
				if( tipe( configKey ) !== "string" ) {
					return;
				}
				if( _.isNil( configValue ) ) {
					return;
				}

				// Coercion/standardization
				componentName = componentName.toLowerCase();

				// Ensure we have a local store for this component
				me._initComponentConfig( componentName );

				// Store the value
				me.$$subComponentConfig[componentName][configKey] = configValue;

			},

			/**
			 * Ensures that a component configuration store exists for a single component.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the component
			 * @returns {void}
			 */
			XXX_initComponentConfig: function( componentName ) {

				// Locals
				var me = this;

				// Validate Params
				if( tipe( componentName ) !== "string" ) {
					throw new Error("Invalid component name provided to Renderer#_initComponentConfig.  The `componentName` parameter must be a string.");
				}

				// Coercion/standardization
				componentName = componentName.toLowerCase();

				// Ensure we have a local store for component configs
				if( me.$$subComponentConfig === undefined || tipe( me.$$subComponentConfig ) !== "object" ) {
					me.$$subComponentConfig = {};
				}

				// Ensure we have a local store for this component
				if( me.$$subComponentConfig[ componentName ] === undefined || tipe( me.$$subComponentConfig[ componentName ] ) !== "object" ) {
					me.$$subComponentConfig[ componentName ] = {};
				}

			},

			/**
			 * Returns the custom configuration data for a single component (dust, sass, etc).
			 * If no custom settings are found, an empty object will be returned.
			 *
			 * @instance
			 * @access private
			 * @param {string} componentName The name of the component
			 * @returns {object}
			 */
			XXXgetComponentConfig: function( componentName ) {

				// Locals
				var me = this;

				// Validate Params
				if( tipe( componentName ) !== "string" ) {
					throw new Error("Invalid component name provided to Renderer#getComponentConfig.  The `componentName` parameter must be a string.");
				}

				// Coercion/standardization
				componentName = componentName.toLowerCase();

				// Ensure we have a local store for this component
				me._initComponentConfig( componentName );

				// Return the component config
				return me.$$subComponentConfig[componentName];

			},



			/**
			 * Returns the "factory" configuration for Dust.js.  This default configuration
			 * represents the absolute Dust.js defaults, as provided by the module itself.
			 *
			 * @instance
			 * @access private
			 * @returns {{whitespace: boolean, amd: boolean, cjs: boolean, cache: boolean}}
			 */
			XXX_getFactoryDustConfig: function() {

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
			 */
			XXX_getDefaultDustConfig: function() {

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
			 */
			XXX_getBaseDustConfig: function() {

				// Locals
				var me = this;
				var final;

				// Load default config
				var cfg = me._getDefaultDustConfig();

				// Load config overrides
				var ov = me.getComponentConfig("dust");

				// Apply values from the Grits config and return
				return _.defaults( {}, ov, cfg );

			}



		}

	}

);
