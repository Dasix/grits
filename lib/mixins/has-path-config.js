/**
 * Adds a path configuration and associated logic to a class.
 *
 * @mixin Dasix.grits.HasPathConfig
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require("qooxdoo");
var eyes = require("eyes");
var tipe = require("tipe");
var _ = require("lodash");
var pth = require("path");

require("../classes/resource-path-manager");

qx.Mixin.define("Dasix.grits.HasPathConfig", {

	properties :  {

		/**
		 * @var {boolean} Dasix.grits.HasPathConfig._paths Stores the path configuration.
		 * @access private
		 * @instance
		 */

		/**
		 * @var {boolean} Dasix.grits.HasPathConfig._pathTypes Stores information about
		 * valid path types.  See {@link Dasix.grits.HasPathConfig#setPathTypes}.
		 * @access private
		 * @instance
		 */

		/**
		 * @var {Dasix.grits.ResourcePathManager} Dasix.grits.HasPathConfig.pathManager Manages resource paths
		 * @instance
		 * @getter getPathManager
		 * @mutator setPathManager
		 */
		pathManager : {
			init  : null
		}

	},

	members: /** @lends Dasix.grits.HasPathConfig **/ {

		/**
		 * Sets the valid path types for the path configuration object.
		 * Implementors of this mixin must call this method (usually in or
		 * around the constructor) or no paths can be managed.
		 *
		 * @access protected
		 * @param {object[]} pathTypes The new path type settings
		 * @returns {void}
		 */
		setPathTypes: function( pathTypes ) {

			// Locals
			var me = this;

			// Initialize the path manager
			me._initPathManager();

			// Get the path manager
			var pm = me.getPathManager();

			// Pass the new types to the manager
			pm.setPathTypes( pathTypes );

			// Begin method creation
			me._createPathTypeMethodsForAll();

		},

		/**
		 * Creates a new {@Dasix.grits.ResourcePathManager}, if it has
		 * not already been created. (This method is idempotent)
		 *
		 * @access private
		 * @returns {void}
		 */
		_initPathManager: function() {

			var me = this;
			if( me.getPathManager() === null ) {
				me.setPathManager( new Dasix.grits.ResourcePathManager( me ) );
			}

		},

		/**
		 * Returns information about all valid path types.
		 *
		 * @access protected
		 * @returns {object[]} An array of valid path types and
		 * information about each.
		 */
		getPathTypeDetails: function() {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Check for out-of-turn call..
			if( pm === null ) {
				throw new Error("Dasix.grits.HasPathConfig#getPathTypeDetails was called before Dasix.grits.HasPathConfig#setPathTypes; this should never happen!");
			}

			// Defer to the path manager
			return pm.getCollectionConfigArray();

		},

		/**
		 * Returns the full information object for a single path type.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @returns {object}
		 */
		getSinglePathType: function( pathTypeName ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Check for out-of-turn call..
			if( pm === null ) {
				throw new Error("Dasix.grits.HasPathConfig#getSinglePathType was called before Dasix.grits.HasPathConfig#setPathTypes; this should never happen!");
			}

			// Defer to the path manager
			return pm.getCollectionConfig( pathTypeName );

		},

		/**
		 * Returns an array of all valid path types.
		 * Note: Only the names are returned.
		 *
		 * @access protected
		 * @returns {string[]} All valid path types.
		 */
		getPathTypes: function() {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Check for out-of-turn call..
			if( pm === null ) {
				throw new Error("Dasix.grits.HasPathConfig#getPathTypes was called before Dasix.grits.HasPathConfig#setPathTypes; this should never happen!");
			}

			// Defer to the path manager
			return pm.getCollectionNames();

		},

		/**
		 * Returns a single ResourcePathCollection
		 *
		 * @access public
		 * @param {string} collectionName
		 * @returns {Dasix.grits.ResourcePathCollection}
		 */
		getPathCollection: function( collectionName ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Defer to the path manager
			return pm.getCollection( collectionName );

		},

		// --

		/**
		 * Clears all paths from the renderer's configuration.  By default, this method
		 * will not remove any paths that belong to 'plugins' unless `force`
		 * is passed as `TRUE`.
		 *
		 * @access public
		 * @param {boolean} force When TRUE, forces ALL paths to be removed, even plugin paths.
		 * @returns {void}
		 */
		clearAllPaths: function( force ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Default force param
			if( force === undefined || force === null || force !== true ) {
				force = false;
			}

			// Defer to PM
			pm.clearAllPaths( force );

		},

		// --

		/**
		 * Adds a path to the path configuration object.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @param {string|string[]} newPath An absolute path, or an array of
		 * paths, to be add to the 'root' path configuration.
		 * @returns {void}
		 */
		addPathOfType: function( pathTypeName, newPath ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Defer to the path manager
			pm.addPath( pathTypeName, newPath );

		},

		/**
		 * Gets all paths of a certain type and returns as
		 * either an array or an object.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
		 * javascript object will be returned instead of an array.
		 * @returns {string[]|object}
		 */
		getPathsOfType: function( pathTypeName, returnAsObject ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Defer to PM
			return pm.getAbsolutePaths( pathTypeName, returnAsObject );

		},

		/**
		 * Clears the configuration object of all paths of a certain type.
		 * By default, this method will not remove any paths that belong to
		 * 'plugins' unless `force` is passed as `TRUE`.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @param {boolean} force When TRUE, forces ALL paths to be removed, even plugin paths.
		 * @returns {void}
		 */
		clearPathsOfType: function( pathTypeName, force ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Default force param
			if( force === undefined || force === null || force !== true ) {
				force = false;
			}

			// Defer to PM
			pm.clearCollectionPaths( pathTypeName, force );

		},

		/**
		 * Returns the number of paths of a particular type
		 * that are currently being stored in the path configuration object.
		 *
		 * @access private
		 * @param {string} pathTypeName A valid path type
		 * @returns {number}
		 */
		countPathsOfType: function( pathTypeName ) {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Defer to PM
			return pm.getCollectionPathCount( pathTypeName );

		},

		/**
		 * Returns all paths stored in the renderer's configuration.
		 *
		 * @access public
		 * @returns {object} An object containing the current configuration paths
		 */
		getAllPaths: function() {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Defer to PM
			return pm.getAllAbsolutePaths();

		},

		//<editor-fold desc="+++++ Method Auto-Creation +++++">

		/**
		 * This is the entry point for path management method creation.
		 * It will iterate over all "path types" and defer to
		 * `#_createPathTypeMethodsForOne`.
		 *
		 * @access private
		 */
		_createPathTypeMethodsForAll: function() {

			// Locals
			var me = this;
			var pm = me.getPathManager();

			// Iterate
			_.each( pm.getCollectionConfigArray(), function( ptDetails ) {
				me._createPathTypeMethodsForOne( ptDetails );
			});

		},

		/**
		 * This method is called once for each "path type" by `#_createPathTypeMethodsForAll`.
		 *
		 * @access private
		 * @param {object} pathTypeDetails Information about the target path type
		 * @returns {void}
		 */
		_createPathTypeMethodsForOne: function( pathTypeDetails ) {

			// Locals
			var me = this;

			// Create each method
			me._createPathTypeAddMethod( pathTypeDetails );
			me._createPathTypeSetMethod( pathTypeDetails );
			me._createPathTypeCountMethod( pathTypeDetails );
			me._createPathTypeGetMethod( pathTypeDetails );
			me._createPathTypeClearMethod( pathTypeDetails );

		},

		/**
		 * Creates the path management method for adding paths of
		 * the target "path type".
		 *
		 * @access private
		 * @param {object} pathTypeDetails The details of a single path type.
		 * @returns {void}
		 */
		_createPathTypeAddMethod: function( pathTypeDetails ) {

			// Locals
			var me = this;
			var methodName = "add" + pathTypeDetails.methodName + "Path";

			// Exit if it already exists (thus allowing overrides)
			if( me[methodName] !== undefined ) {
				return;
			}

			// Create the method
			me[methodName] = function( newPath ) {

				// Defer to the `addPathOfType` method
				me.addPathOfType( pathTypeDetails.short, newPath );

			};



		},

		/**
		 * Creates the path management method for setting (clear+add) paths of
		 * the target "path type".
		 *
		 * @access private
		 * @param {object} pathTypeDetails The details of a single path type.
		 * @returns {void}
		 */
		_createPathTypeSetMethod: function( pathTypeDetails ) {

			// Locals
			var me = this;
			var setMethodName = "set" + pathTypeDetails.methodName + "Path";
			var addMethodName = "add" + pathTypeDetails.methodName + "Path";
			var clearMethodName = "clear" + pathTypeDetails.methodName + "Paths";

			// Exit if it already exists (thus allowing overrides)
			if( me[setMethodName] !== undefined ) {
				return;
			}

			// Create the method
			me[setMethodName] = function( newPath ) {

				// Locals
				var me = this;

				// Clear existing paths
				me[clearMethodName]();

				// Add the new path, or paths
				me[addMethodName]( newPath );

			};



		},

		/**
		 * Creates the path management method for counting paths of
		 * the target "path type".
		 *
		 * @access private
		 * @param {object} pathTypeDetails The details of a single path type.
		 * @returns {void}
		 */
		_createPathTypeCountMethod: function( pathTypeDetails ) {

			// Locals
			var me = this;
			var methodName = "count" + pathTypeDetails.methodName + "Paths";

			// Exit if it already exists (thus allowing overrides)
			if( me[methodName] !== undefined ) {
				return;
			}

			// Create the method
			me[methodName] = function() {

				// Defer to the `countPathsOfType` method
				return me.countPathsOfType( pathTypeDetails.short );

			};



		},

		/**
		 * Creates the path management method for getting paths of
		 * the target "path type".
		 *
		 * @access private
		 * @param {object} pathTypeDetails The details of a single path type.
		 * @returns {void}
		 */
		_createPathTypeGetMethod: function( pathTypeDetails ) {

			// Locals
			var me = this;
			var methodName = "get" + pathTypeDetails.methodName + "Paths";

			// Exit if it already exists (thus allowing overrides)
			if( me[methodName] !== undefined ) {
				return;
			}

			// Create the method
			me[methodName] = function( returnAsObject ) {

				// Defer to the `getPathsOfType` method
				return me.getPathsOfType( pathTypeDetails.short, returnAsObject );

			};

		},

		/**
		 * Creates the path management method for clearing paths of
		 * the target "path type".
		 *
		 * @access private
		 * @param {object} pathTypeDetails The details of a single path type.
		 * @returns {void}
		 */
		_createPathTypeClearMethod: function( pathTypeDetails ) {

			// Locals
			var me = this;
			var methodName = "clear" + pathTypeDetails.methodName + "Paths";

			// Exit if it already exists (thus allowing overrides)
			if( me[methodName] !== undefined ) {
				return;
			}

			// Create the method
			me[methodName] = function( force ) {

				// Defer to the `clearPathsOfType` method
				me.clearPathsOfType( pathTypeDetails.short, force );

			};

		}

		//</editor-fold>


	}
});
