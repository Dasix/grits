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
			 * Adds one or more path types to the manager.
			 *
			 * @instance
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

			getCollectionNames: function() {

				var me = this;
				var ret = [];

				_.each( me.getPathCollections(), function( col, name ) {
					ret.push( name );
				});

				return ret;

			},

			clearCollections: function() {

				var me = this;
				me.setPathCollections( {} );

			},

			addCollection: function( collectionName, cfg ) {

				var me = this;
				var collections = me.getPathCollections();
				var col = new Dasix.grits.ResourcePathCollection( me.getGrits() );
				col.configure( me, collectionName, cfg );
				collections[ collectionName ] = col;

			},

			clearAllPaths: function() {

				// Locals
				var me = this;

				// Iterate over each collection
				_.each( me.getPathCollections(), function( col ) {
					col.clearPaths();
				});

			},

			clearCollectionPaths: function( collectionName ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				col.clearPaths();

			},

			getCollectionPathCount: function( collectionName ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				return col.getPathCount();

			},

			getCollection: function( collectionName ) {

				// Locals
				var me = this;
				var collections = me.getPathCollections();

				// Validate
				me.validateCollectionName( collectionName );

				// Do the check
				return collections[ collectionName ];

			},

			getAbsolutePaths: function( collectionName, returnAsObject ) {

				// Locals
				var me = this;
				var col = me.getCollection( collectionName );

				// Defer to collection
				return col.getAbsolutePaths( returnAsObject );

			},

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
			 * Adds a path to one of the path collections.
			 *
			 * @access public
			 * @param {string} collectionName A valid path type
			 * @param {string|string[]} newPath An absolute path, or an array of
			 * paths, to be add to the 'root' path configuration.
			 * @returns {void}
			 */
			addPath: function( collectionName, newPath ) {

				// Locals
				var me = this;
				var collection = me.getCollection( collectionName );

				// Add the path
				collection.addPath( newPath );

			}



		}

	}
);
