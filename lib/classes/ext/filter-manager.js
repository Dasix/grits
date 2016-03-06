/**
 * This class is a "renderer extension" that assists in the
 * management of filters.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.FilterManager
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

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.FilterManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.FilterManager **/ {

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
				me.setLogTopic("filter.manager");

			},

			/**
			 * Provides the collection settings for filters, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				return {
					short          : "filter",
					name           : "DustJS Filter Function Path",
					defaultSubdir  : "filters",
					scanExtensions : [ "js" ],
					methodName     : "Filter"
				};

			},

			/**
			 * Loads all filters. This is the main entry point for the
			 * filter manager's part in render operations.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			loadAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("filter");

				// Emit Pre-operation Event
				me.emit( "beforeLoadFilters" );

				// Iterate over each resource
				return col.eachResource( me._loadOne.bind(me) ).then(
					function( resourceFiles ) {

						// Add built-in filters
						me._applyBuiltInFilters();

						// Emit Post-operation Event
						me.emit( "afterLoadFilters", { dust: grits.dust, filters: grits.dust.filters, resourceFiles: resourceFiles, resourcePathCollection: col } );

					}
				);

			},

			/**
			 * Loads a single filter.  This is the main work
			 * horse for this renderer extension.
			 *
			 * @instance
			 * @access private
			 * @param {Dasix.grits.File} file The source file
			 * @returns {void}
			 */
			_loadOne: function( file ) {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();
				var filterName 	= file.getBaseName();
				var filePath	= file.getAbsoluteFilePath();

				// Log the info we have so far
				me.log("Loading filter function ..");
				me.log(" -> Source       : " + filePath );
				me.log(" -> Filter Name : |" + filterName );

				// Add the filter to the DustJS object
				grits.dust.filters[ filterName ] = require( filePath );

			},

			/**
			 * Applies a number of Grits built-in filters, they're mostly
			 * useful for mutating render output.
			 *
			 * @private
			 */
			_applyBuiltInFilters: function() {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();
				var filterStore	= grits.dust.filters;

				// Add the built-in filters
				me._applyOneBuiltInFilter( filterStore, "ltrim", "_dustFilterLtrim" );
				me._applyOneBuiltInFilter( filterStore, "rtrim", "_dustFilterRtrim" );
				me._applyOneBuiltInFilter( filterStore, "trim",  "_dustFilterTrim"  );

			},

			/**
			 * Creates a single Dust.js filter using a method from this class.
			 *
			 * @instance
			 * @access private
			 * @param {object} filterStore A dust.filters object to which the filter will be attached.
			 * @param {string} filterName The name of the filter
			 * @param {string} methodName The name of the class method to use as the filter fuction
			 * @returns {void}
			 */
			_applyOneBuiltInFilter: function( filterStore, filterName, methodName ) {

				// Locals
				var me = this;

				// Avoid redundant work and allow for overrides
				if( filterStore[ filterName ] !== undefined ) {
					return;
				}

				// Log the filter addition
				me.log("Adding Built-In Filter: " + filterName);

				// Add the filter
				filterStore[ filterName ] = me[ methodName ];

			},

			/**
			 * This is the filter function for the built-in Dust.js filter "ltrim",
			 * which will be automatically inserted into dust via `_applyBuiltInFilters`.
			 * You should not call this method directly, ever.
			 *
			 * @access private
			 * @param {*} value
			 * @returns {*}
			 */
			_dustFilterLtrim: function(value) {
				if (typeof value === 'string') {
					return _.trimStart( value );
				} else {
					return value;
				}
			},

			/**
			 * This is the filter function for the built-in Dust.js filter "rtrim",
			 * which will be automatically inserted into dust via `_applyBuiltInFilters`.
			 * You should not call this method directly, ever.
			 *
			 * @access private
			 * @param {*} value
			 * @returns {*}
			 */
			_dustFilterRtrim: function(value) {
				if (typeof value === 'string') {
					return _.trimEnd( value );
				} else {
					return value;
				}
			},

			/**
			 * This is the filter function for the built-in Dust.js filter "trim",
			 * which will be automatically inserted into dust via `_applyBuiltInFilters`.
			 * You should not call this method directly, ever.
			 *
			 * @access private
			 * @param {*} value
			 * @returns {*}
			 */
			_dustFilterTrim: function(value) {
				if (typeof value === 'string') {
					return _.trim( value );
				} else {
					return value;
				}
			}

		}

	}

);
