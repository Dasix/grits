/**
 * Adds a path configuration and associated logic to a class.
 *
 * @mixin C2C.dustjs.HasPathConfig
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 C2C Schools, LLC. All rights reserved.
 */

var qx = require("qooxdoo");
var eyes = require("eyes");
var tipe = require("tipe");
var _ = require("lodash");
var pth = require("path");

qx.Mixin.define("C2C.dustjs.HasPathConfig", {

	properties :  {

		/**
		 * @var {boolean} C2C.dustjs.Loggable._paths Stores the path configuration.
		 * @access private
		 * @instance
		 */

		/**
		 * @var {boolean} C2C.dustjs.Loggable._pathTypes Stores information about
		 * valid path types.  See {@link C2C.dustjs.HasPathConfig#setPathTypes}.
		 * @access private
		 * @instance
		 */

	},

	members: /** @lends C2C.dustjs.HasPathConfig **/ {

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

			var me = this;
			me._pathTypes = pathTypes;

		},

		/**
		 * Returns information about all valid path types.
		 *
		 * @access protected
		 * @returns {object[]} An array of valid path types and
		 * information about each.
		 */
		getPathTypeDetails: function() {

			var me = this;
			return me._pathTypes;

		},

		/**
		 * Returns the full information object for a single path type.
		 *
		 * @access public
		 * @param {string} spathTypeName A valid path type
		 * @returns {object}
		 */
		getSinglePathType: function( pathTypeName ) {

			// Locals
			var me = this;
			var ret = null;
			var pathTypes = me.getPathTypeDetails();

			// Validate the path type
			me._validatePathType( pathTypeName );

			// Find the target path type
			_.each( pathTypes, function( pathType ) {
				if( pathType.short === pathTypeName ) {
					ret = pathType;
				}
			});

			// Return
			return ret;

		},

		/**
		 * Returns an array of all valid path types.
		 *
		 * @access protected
		 * @returns {string[]} All valid path types.
		 * information about each.
		 */
		getPathTypes: function() {

			var me = this;
			var ret = [];
			var pathInfo = me.getPathTypeDetails();

			_.each( pathInfo, function( pathType ) {
				ret.push( pathType.short );
			});

			return ret;

		},

		/**
		 * Validates a given path type (by name).
		 *
		 * @access private
		 * @param {string} pathTypeName
		 * @throws Error if the path type is invalid.
		 * @returns {void}
		 */
		_validatePathType: function( pathTypeName ) {

			var me = this;
			var validPathTypes = me.getPathTypeDetails();
			var isValid = false;

			_.each( validPathTypes, function( validPathType ) {
				if( validPathType.short === pathTypeName ) {
					isValid = true;
				}
			});

			if( !isValid ) {
				throw new vError("The provided path type ('" + pathTypeName + "') is invalid.");
			}

		},

		// --

		/**
		 * Clears all paths from the renderer's configuration.
		 *
		 * @access public
		 * @returns {void}
		 */
		clearAllPaths: function() {

			// Locals
			var me = this;

			// Log it
			me.log("config.paths.clear", "Clearing *ALL* renderer configuration paths..");

			// Clear each path type
			_.each( me.getPathTypes(), me.clearPathsOfType.bind(me) );

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
			var existingPaths;

			// Handle arrays
			if( tipe( newPath ) === "array" ) {
				_.each( newPath, function( path ) {
					me.addPathOfType( pathTypeName, path );
				});
				return;
			}

			// Ensure the path storage object has been
			// initialized for this path type.
			me._ensurePathType( pathTypeName );

			// Normalize the path
			newPath = me._normalizePath( newPath );

			// Log the operation
			me.log("config.paths.add",
				[
					"Adding a path of type: " + pathTypeName,
					"   => " + newPath
				]
			);

			// Add the path
			existingPaths = me.getPathsOfType( pathTypeName );
			existingPaths.push( newPath );

			// Sort and Make Unique
			me._paths[ pathTypeName] = _.sortedUniq( _.sortBy( existingPaths ) );

		},

		/**
		 * Normalizes a path; for consist formatting and resolution.
		 *
		 * @instance
		 * @access private
		 * @param {string} path The raw path
		 * @returns {string} The normalized path
		 */
		_normalizePath: function( path ) {

			// Locals
			var me = this;

			// Trim trailing /'s
			if( _.endsWith( path, pth.sep ) ) {
				path = path.substr(0, (path.length - 1));
			}

			// Resolve to CWD
			path = pth.resolve( process.cwd(), path );

			// Finished
			return path;

		},

		/**
		 * Gets all paths of a certain type and returns as
		 * either an array or an object.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
		 * javascript object will be returned instead of an array.
		 * @returns {array|object}
		 */
		getPathsOfType: function( pathTypeName, returnAsObject ) {

			// Locals
			var me = this;
			var arr, ret;

			// Ensure the path storage object has been
			// initialized for this path type.
			me._ensurePathType( pathTypeName );

			// Parse returnAsObject param
			if( returnAsObject !== true ) {
				returnAsObject = false;
			}

			// Fetch the array
			arr = me._paths[ pathTypeName];

			// Convert to object, if desired
			if( returnAsObject ) {
				ret = {};
				_.each( arr, function( path ) {
					ret[path] = path;
				});
			} else {
				ret = arr;
			}

			// Return
			return ret;

		},

		/**
		 * Clears the configuration object of all paths of a certain type.
		 *
		 * @access public
		 * @param {string} pathTypeName A valid path type
		 * @returns {void}
		 */
		clearPathsOfType: function( pathTypeName ) {

			// Locals
			var me = this;

			// Ensure the path storage object has been
			// initialized for this path type.
			me._ensurePathType( pathTypeName );

			// Log the operation
			me.log("config.paths.clear", "Clearing configuration paths for: " + pathTypeName);

			// Clear the path array for the target type
			me._paths[ pathTypeName ] = [];

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

			// Ensure the path storage object has been
			// initialized for this path type.
			me._ensurePathType( pathTypeName );

			// Return the count
			return me._paths[ pathTypeName ].length;

		},

		/**
		 * Ensures that the path storage object exists for a particular
		 * path type.
		 *
		 * @private
		 * @param {string} pathTypeName A valid path type
		 * @returns {void}
		 */
		_ensurePathType: function( pathTypeName ) {

			// Locals
			var me = this;

			// Validate the path type
			me._validatePathType( pathTypeName );

			// Ensure path storage object
			if( me._paths === undefined || me._paths === null ) {
				me._paths = {};
			}

			// Ensure storage array for this type
			if( me._paths[ pathTypeName ] === undefined || me._paths[ pathTypeName ] === null ) {
				me.log("config.paths.init", "Initializing the path configuration object for: " + pathTypeName);
				me._paths[ pathTypeName ] = [];
			}

		}


	}
});
