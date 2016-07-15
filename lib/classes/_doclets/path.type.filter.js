/**
 * Adds one or more paths to the 'filter' path configuration. This method is
 * a convenience alas because, internally, this method simply calls
 * {@link Dasix.grits.Renderer#addPathOfType} with the first param set to 'filter'.
 *
 * Important Note: This method is automatically created by {@link Dasix.grits.HasPathConfig#_createPathTypeAddMethod}
 * and will, therefore, not be found in the source code.
 *
 * @method Dasix.grits.Renderer#addFilterPath
 * @instance
 * @access public
 * @param {string|string[]} newPath An absolute path, or an array of
 * paths, to be add to the 'filter' path configuration.
 * @returns {void}
 */

/**
 * Clears any existing 'filter' paths and adds one more into the
 * configuration.  This method is just convenient replacement
 * for calling {@link Dasix.grits.Renderer#clearFilterPaths} and
 * {@link Dasix.grits.Renderer#addFilterPath}.
 *
 * Important Note: This method is automatically created by {@link Dasix.grits.HasPathConfig#_createPathTypeSetMethod}
 * and will, therefore, not be found in the source code.
 *
 * @method Dasix.grits.Renderer#setFilterPath
 * @instance
 * @access public
 * @param {string|string[]} newPath A path, or an array of paths, to add
 * to the 'filter' path configuration.
 * @returns {void}
 */

/**
 * Returns the number of 'filter' paths currently stored in the path
 * configuration object. This method is a convenience alas because,
 * internally, this method simply calls {@link Dasix.grits.Renderer#countPathsOfType}
 * with the first param set to 'filter'.
 *
 * Important Note: This method is automatically created by {@link Dasix.grits.HasPathConfig#_createPathTypeCountMethod}
 * and will, therefore, not be found in the source code.
 *
 * @method Dasix.grits.Renderer#countFilterPaths
 * @instance
 * @access public
 * @returns {number} The number of 'filter' paths currently stored in the path
 * configuration object
 */

/**
 * Returns all 'filter' paths currently defined in the renderer's path
 * configuration object. This method is a convenience alas because,
 * internally, this method simply calls {@link Dasix.grits.Renderer#getPathsOfType}
 * with the first param set to 'filter'.
 *
 * Important Note: This method is automatically created by {@link Dasix.grits.HasPathConfig#_createPathTypeGetMethod}
 * and will, therefore, not be found in the source code.
 *
 * @method Dasix.grits.Renderer#getFilterPaths
 * @instance
 * @access public
 * @param {boolean} [returnAsObject=false] If TRUE, then a standard
 * javascript object will be returned instead of an array.
 * @returns {number} All 'filter' paths currently stored in the path configuration object
 */

/**
 * Clears all 'filter' paths from the path configuration. This method is
 * a convenience alas because, internally, this method simply calls
 * {@link Dasix.grits.Renderer#clearPathsOfType} with the first param set to 'filter'.
 *
 * Important Note: This method is automatically created by {@link Dasix.grits.HasPathConfig#_createPathTypeClearMethod}
 * and will, therefore, not be found in the source code.
 *
 * @method Dasix.grits.Renderer#clearFilterPaths
 * @instance
 * @access public
 * @returns {void}
 */
