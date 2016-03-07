/**
 * This class represents a resource path manager.
 *
 * @class Dasix.grits.ResourcePathManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require( "qooxdoo" );
var vError = require( "verror" );
var Promise = require( "bluebird" );
var _ = require( "lodash" );
var pth = require( "path" );
var tipe = require( "tipe" );
var mkdirp = require( "mkdirp" );
var fs = require( "fs" );

require("./abs-render-extension");
require("./resource-path-collection");

// Create the base renderer class
qx.Class.define(
	"Dasix.grits.ResourcePathManager", {

		extend : Dasix.grits.AbsRenderExtension,

		properties : {

			/**
			 * @var {Dasix.grits.ResourcePathCollection[]} Dasix.grits.ResourcePathManager.pathCollections Stores all resource path collections
			 * @instance
			 * @getter getPathCollections
			 * @mutator setPathCollections
			 */
			pathCollections : {
				init  : {}
			}

		},

		members : /** @lends Dasix.grits.ResourcePathManager **/ {

			/**
			 * This method is automatically called on all children
			 * of {@link Dasix.grits.AbsRenderExtension}, if it exists.
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			init: function() {

				// Locals
				var me = this;

				// Set the log topic for this extension
				me.setLogTopic("path.manager");

				// Initialize the path collections
				me.clearCollections();

			},

			/**
			 * Clears all collections and adds new collections using `newPathTypes`.
			 *
			 * @instance
			 * @access public
			 * @param {object|object[]} newPathTypes
			 * @returns {void}
			 */
			setPathTypes: function( newPathTypes ) {

				// Locals
				var me = this;

				// Initialize/clear the path collections
				me.clearCollections();

				// Add the path types
				me.addPathType( newPathTypes );

			},

			/**
			 * Adds one or more path types to the manager.  This method is, basically,
			 * an alias for `addCollection()` with added logic to support arrays and to
			 * add the ability to extract the collection name from the config object.
			 * It's named `addPathType` for backwards compatibility with some older code
			 * and it should, eventually, be removed.
			 *
			 * @instance
			 * @deprecated
			 * @access public
			 * @param {object|object[]} newPathType The new path type (or types)
			 * @returns {void}
			 */
			addPathType: function( newPathType ) {

				var me = this;

				// Allow arrays
				if( tipe( newPathType ) === "array" ) {
					_.each( newPathType, function( npt ) {
						me.addPathType( npt );
					});
					return;
				}

				// Defer to #createPathCollection
				me.addCollection( newPathType.short, newPathType );

			},

			/**
			 * Returns the details of all collections.  Each collection will be
			 * represented by an object that contains the collection's config.
			 *
			 * @instance
			 * @access public
			 * @returns {object[]} All collection configs.
			 */
			getCollectionConfigArray: function() {

				// Locals
				var me = this;
				var collections = me.getPathCollections();
				var ret = [];

				// Iterate over the collections
				_.each( collections, function( col ) {
					ret.push( col.getConfig() );
				});

				// Finished
				return ret;

			},

			/**
			 * Returns the details of a single collection, as an object.
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName
			 * @returns {object} The configuration of the target collection.
			 */
			getCollectionConfig: function( collectionName ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				return col.getConfig();

			},

			/**
			 * Validates that a collection exists and throws an error
			 * if it does not.
			 *
			 * @instance
			 * @access public
			 * @uses Dasix.grits.ResourcePathManager#hasCollection
			 * @throws Error
			 * @param {string} collectionName The collection name to validate
			 * @returns {void}
			 */
			validateCollectionName: function( collectionName ) {

				var me = this;
				if( !me.hasCollection( collectionName ) ) {
					throw new Error("Dasix.grits.ResourcePathManager#validateCollectionName encountered an invalid collection!");
				}

			},

			/**
			 * Checks to see if a collection exists.
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The name of the collection to check for.
			 * @returns {boolean} TRUE if the collection exists; FALSE otherwise
			 */
			hasCollection: function( collectionName ) {

				// Locals
				var me = this;
				var collections = me.getPathCollections();

				// Do the check
				if( collections[ collectionName ] === undefined || collections[ collectionName ] === null ) {
					return false;
				} else {
					return true;
				}

			},

			/**
			 * Gets an array of all of the collection names.
			 *
			 * @instance
			 * @access public
			 * @returns {string[]} All of the collection names being managed.
			 */
			getCollectionNames: function() {

				var me = this;
				var ret = [];

				_.each( me.getPathCollections(), function( col, name ) {
					ret.push( name );
				});

				return ret;

			},

			/**
			 * Removes all collections, entirely (not just their paths).
			 *
			 * @instance
			 * @access public
			 * @returns {void}
			 */
			clearCollections: function() {

				var me = this;
				me.setPathCollections( {} );

			},

			/**
			 * Adds a collection (a.k.a a path/resource type)
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The new collection's name
			 * @param {object} cfg Information (configuration) for the new collection
			 * @returns {void}
			 */
			addCollection: function( collectionName, cfg ) {

				var me = this;
				var collections = me.getPathCollections();
				var col = new Dasix.grits.ResourcePathCollection( me.getGrits() );
				col.configure( me, collectionName, cfg );
				collections[ collectionName ] = col;

			},

			/**
			 * Clears all paths in all collections.  By default, this method
			 * will not remove any paths that belong to 'plugins' unless `force`
			 * is passed as `TRUE`.
			 *
			 * @instance
			 * @access public
			 * @param {boolean} force When TRUE, forces ALL paths to be removed, even plugin paths.
			 * @returns {void}
			 */
			clearAllPaths: function( force ) {

				// Locals
				var me = this;

				// Iterate over each collection
				_.each( me.getPathCollections(), function( col ) {
					col.clearPaths( force );
				});

			},

			/**
			 * Clears the paths within a single collection. By default, this method
			 * will not remove any paths that belong to 'plugins' unless `force`
			 * is passed as `TRUE`.
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The collection to clear.
			 * @param {boolean} force When TRUE, forces ALL paths to be removed, even plugin paths.
			 * @returns {void}
			 */
			clearCollectionPaths: function( collectionName, force ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Default force param
				if( force === undefined || force === null || force !== true ) {
					force = false;
				}

				// Defer to collection
				col.clearPaths( force );

			},

			/**
			 * Removes all paths from all collections that belong the specified plugin.
			 * This will be called automatically whenever a plugin is 'detached' (removed).
			 *
			 * @instance
			 * @access public
			 * @param {string} pluginName The plugin that paths should be removed for
			 * @returns {void}
			 */
			clearPluginPaths: function( pluginName ) {

				// Locals
				var me = this;

				// Iterate over each collection
				_.each( me.getPathCollections(), function( col ) {
					col.clearPluginPaths( pluginName );
				});

			},

			/**
			 * Gets the total number of paths within one of the resource path collections.
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The collection to count the paths within.
			 * @returns {Number}
			 */
			getCollectionPathCount: function( collectionName ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				return col.getPathCount();

			},

			/**
			 * Returns a single collection.
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The name of the collection to return.
			 * @returns {Dasix.grits.ResourcePathCollection}
			 */
			getCollection: function( collectionName ) {

				// Locals
				var me = this;
				var collections = me.getPathCollections();

				// Validate
				me.validateCollectionName( collectionName );

				// Do the check
				return collections[ collectionName ];

			},

			/**
			 * Returns the actual, string, path from all resource paths in one collection.
			 * By default, these paths will be returned as an array (e.g. `[ '/a/path' ]`)
			 * unless `returnAsObject = true`, in which case an object will be returned
			 * instead (e.g. `{ '/a/path': '/a/path' }`).
			 *
			 * @instance
			 * @access public
			 * @param {string} collectionName The collection from which to retrieve the paths
			 * @param {boolean} [returnAsObject=false] See method description for details
			 * @returns {string[]|object}
			 */
			getAbsolutePaths: function( collectionName, returnAsObject ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				return col.getAbsolutePaths( returnAsObject );

			},

			/**
			 * Returns all absolute paths from all collections.
			 *
			 * @instance
			 * @access public
			 * @returns {object} All absolute paths from all collections.  The
			 * return object will have a property for each collection with
			 * an array of paths within.
			 */
			getAllAbsolutePaths: function() {

				// Locals
				var me = this;
				var ret = {};

				// Iterate over each collection
				_.each( me.getPathCollections(), function( col, name ) {
					ret[ name ] = col.getAbsolutePaths( false );
				});

				return ret;

			},

			/**
			 * Adds one or more paths to one of the path collections.
			 *
			 * @access public
			 * @param {string} collectionName The collection to add the path (or paths) to
			 * @param {string|string[]|object|object[]} newPath The new path,
			 * or an array of paths, to add to the collection.  Configuration objects
			 * are also accepted but each must, at least, contain a `.path` property.
			 * @param {object} [pathConfig] Optional path configuration (metadata) for each path.  If
			 * `newPath` is also an object, it will win any conflicts with this parameter.
			 * This parameter is especially useful for providing metadata that should be
			 * applied to all paths, when more than one is provided.
			 * @returns {void}
			 */
			addPath: function( collectionName, newPath, pathConfig ) {

				// Locals
				var me = this;
				var collection = me.getCollection( collectionName );

				// Add the path
				collection.addPath( newPath, pathConfig );

			},

			/**
			 * An entry point for plugins to use when adding paths.
			 * This method will affix a `{ plugin: 'xx' }` property in the
			 * path meta that prevents the path from being accidentally removed
			 * by the implementer or by other plugins.
			 *
			 * @instance
			 * @access public
			 * @param {string} pluginName The name of the plugin adding the path (should match plugin.pluginName)
			 * @param {string} collectionName The resource path collection to add the path to
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'root' path configuration.
			 * @param {object} [pathConfig] Optional path configuration (metadata) for each path.  If
			 * `newPath` is also an object, it will win any conflicts with this parameter.
			 * This parameter is especially useful for providing metadata that should be
			 * applied to all paths, when more than one is provided.
			 * @returns {void}
			 */
			addPluginPath: function( pluginName, collectionName, newPath, pathConfig ) {

				// Locals
				var me = this;
				var collection = me.getCollection( collectionName );

				// Default 'pathConfig'
				if( pathConfig === null || pathConfig === null || tipe( pathConfig ) !== "object" ) {
					pathConfig = {};
				}

				// Force 'plugin' property on pathConfig
				pathConfig.plugin = pluginName;

				// Add the path
				collection.addPath( newPath, pathConfig );

			}

		}

	}
);
