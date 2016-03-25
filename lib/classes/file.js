/**
 * This class is a file abstraction that has several helpful utilities
 * that are useful to the DustJS renderer.
 *
 * @class Dasix.grits.File
 * @extends qx.core.Object
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx 		= require( "qooxdoo" );
var vError 	= require( "verror" );
var Promise = require( "bluebird" );
var _ 		= require( "lodash" );
var pth 	= require( "path" );
var tipe 	= require( "tipe" );
var mkdirp 	= require( "mkdirp" );
var fs		= require( "fs-extra" 	);
var yaml	= require( "js-yaml" );
var toml	= require( "toml" );

// Promisification
Promise.promisifyAll(fs);


// Create the base renderer class
qx.Class.define(
	"Dasix.grits.File", {

		//include : [Dasix.grits.Loggable],
		extend : qx.core.Object,

		/**
		 * @constructs Dasix.grits.File
		 * @param {string} basePath The initial value for the {@link Dasix.grits.File#basePath} property.
		 * @param {string} relativePath The initial value for the {@link Dasix.grits.File#relativePath} property.
		 * @param {string} filename The initial value for the {@link Dasix.grits.File#filename} property.
		 */
		construct : function( basePath, relativePath, filename ) {

			var me = this;
			me.setBasePath( basePath );
			me.setRelativePath( relativePath );
			me.setFilename( filename );

		},

		properties : {

			/**
			 * @var {boolean} Dasix.grits.File#basePath Stores the root path of
			 * the virtual file system.
			 * @instance
			 * @getter getBasePath
			 * @mutator setBasePath
			 */
			basePath : {
				init  : "",
				check: "String",
				transform: "_transformBasePath"
			},

			/**
			 * @var {boolean} Dasix.grits.File#relativePath The location of the file
			 * relative to the {@link Dasix.grits.File#basePath}
			 * @getter getRelativePath
			 * @mutator setRelativePath
			 * @instance
			 */
			relativePath : {
				init  : "",
				check: "String",
				transform: "_transformRelativePath"
			},

			/**
			 * @var {boolean} Dasix.grits.File#filename The name of the file
			 * @getter getFilename
			 * @mutator setFilename
			 * @instance
			 */
			filename : {
				init  : "",
				check: "String",
				transform: "_transformFilename"
			},

			/**
			 * @var {?Dasix.grits.ResourcePath} Dasix.grits.File#resourcePath The parent
			 * resource path for this file.  This will be NULL if it does not belong
			 * to a resource path.
			 * @getter getResourcePath
			 * @mutator setResourcePath
			 * @instance
			 */
			resourcePath : {
				init  : null
			}


		},

		members : /** @lends Dasix.grits.File **/ {

			/**
			 * This is a property transformation method (facilitated by the Qooxdoo library)
			 * for the {@link Dasix.grits.File#basePath} property.  This method is called
			 * automatically when {@link Dasix.grits.File#setBasePath} is called and will
			 * simply clean up the value before storing it.
			 *
			 * @instance
			 * @access private
			 * @param {string} val The new value
			 * @returns {string} The parsed value, which will be stored.
			 */
			_transformBasePath: function( val ) {

				// Normalize the path
				val = pth.normalize( val );

				// Strip trailing slash
				val = val.replace(/\/+$/, "");
				val = val.replace(/\\+$/, "");

				// Finished
				return val;

			},

			/**
			 * This is a property transformation method (facilitated by the Qooxdoo library)
			 * for the {@link Dasix.grits.File#relativePath} property.  This method is called
			 * automatically when {@link Dasix.grits.File#setRelativePath} is called and will
			 * simply clean up the value before storing it.
			 *
			 * @instance
			 * @access private
			 * @param {string} val The new value
			 * @returns {string} The parsed value, which will be stored.
			 */
			_transformRelativePath: function( val ) {

				// Normalize the path
				val = pth.normalize( val );

				// Strip forward dot(s)
				val = val.replace(/^\.+/, "");

				// Strip forward slash
				val = val.replace(/^\/+/, "");
				val = val.replace(/^\\+/, "");

				// Strip trailing slash
				val = val.replace(/\/+$/, "");
				val = val.replace(/\\+$/, "");

				// Done
				return val;

			},

			/**
			 * This is a property transformation method (facilitated by the Qooxdoo library)
			 * for the {@link Dasix.grits.File#filename} property.  This method is called
			 * automatically when {@link Dasix.grits.File#setFilename} is called and will
			 * simply clean up the value before storing it.
			 *
			 * @instance
			 * @access private
			 * @param {string} val The new value
			 * @returns {string} The parsed value, which will be stored.
			 */
			_transformFilename: function( val ) {

				// Normalize the path
				val = pth.normalize( val );

				// Convert backslashes to forward slashes
				val = val.replace(/\\+/g, "/");

				// Trim the directory path off, if necessary
				if( val.indexOf("/") !== -1 ) {
					var spl = val.split("/");
					val = spl[ (spl.length-1) ];
				}

				// Done
				return val;

			},

			/**
			 * Returns the FULL path for the file, including the filename.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.txt");
			 * console.log( f.getAbsoluteFilePath() );
			 * // => /base/path/subdir/afile.txt
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			getAbsoluteFilePath: function() {

				var me = this;
				var basePath = me.getBasePath();
				var relPath = me.getRelativeFilePath();
				return pth.join( basePath, relPath );

			},

			/**
			 * Returns the relative path for the file, including the filename.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.txt");
			 * console.log( f.getRelativeFilePath() );
			 * // => subdir/afile.txt
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			getRelativeFilePath: function() {

				var me = this;
				var relPath = me.getRelativePath();
				var filename = me.getFilename();

				return pth.join( relPath, filename );

			},

			/**
			 * Returns the absolute directory path for the file.  This is the
			 * same as the absolute file path except that the filename will
			 * not be included in the return.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.txt");
			 * console.log( f.getAbsoluteDirPath() );
			 * // => /base/path/subdir
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			getAbsolutePath: function() {

				var me = this;
				var basePath = me.getBasePath();
				var relPath = me.getRelativePath();
				return pth.join( basePath, relPath );

			},

			/**
			 * This method will create the directory path of the file, if
			 * it does not already exist, by way of the `mkdirp` module.
			 *
			 * @instance
			 * @see Dasix.grits.File#getAbsolutePath
			 * @access public
			 * @returns {void}
			 */
			createDirectoryPath: function() {

				var me = this;
				var path = me.getAbsolutePath();
				mkdirp.sync( path );

			},

			/**
			 * Gets the base file name, which is the filename without any path
			 * information or any file extensions.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.html");
			 * console.log( f.getBaseName() );
			 * // => afile
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			getBaseName: function() {

				var me = this;
				var filename = me.getFilename();

				if( filename.indexOf(".") === -1 ) {
					return filename;
				} else {
					var spl = filename.split(".");

					if( spl[0] === "" && spl[1] !== undefined ) {
						return spl[1];
					} else {
						return spl[0];
					}
				}

			},

			/**
			 * Gets the relative path and base name of the file.  This is useful
			 * for producing a "long name" for a file that can be used in dictionaries
			 * or collections.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.html");
			 * console.log( f.getRelativeBaseName() );
			 * // => subdir/afile
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "", "afile.md.html");
			 * console.log( f.getRelativeBaseName() );
			 * // => afile
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			getRelativeBaseName: function() {

				var me = this;
				var rp = me.getRelativePath();
				var bn = me.getBaseName();

				if( rp === "" ) {
					return bn;
				} else {
					return rp + "/" + bn;
				}

			},

			/**
			 * Gets all of the file extensions for file with the understanding that
			 * each ".something" in a file (excluding its base name) is a file extension.
			 * Depending on the `asArray` param, this method will return the lower-cased
			 * file extensions as either an array or as an object.
			 *
			 * Notes:
			 * * Duplicate file extensions will be ignored (e.g. myfile.html.html will only register 'html' once)
			 * * The return values will be sorted alphabetically (but this is only dependable for arrays)
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.getFileExtensions( false ) );
			 * // => { html: true, md: true }
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.getFileExtensions( true ) );
			 * // => [ "html", "md" ]
			 *
			 * @instance
			 * @access public
			 * @param {boolean} [asArray=false] When FALSE (default) an object is returned;
			 * when TRUE an array is returned.
			 * @returns {object|string[]} The lower-cased file extensions for the file.
			 */
			getFileExtensions: function( asArray ) {

				var me = this;
				var fn = me.getFilename().toLowerCase();
				var bn = me.getBaseName().toLowerCase();
				var extensions = [];

				// Default the asArray param
				if( asArray === undefined || asArray !== true ) {
					asArray = false;
				}

				// Start the processing
				if( fn.indexOf(".") === -1 ) {

					// If the filename does not include any dots then it
					// does not have any file extensions

				} else {

					var spl = fn.split(".");
					_.each( spl, function( part ) {

						if( part === "" ) {

							// Ignore blanks

						} else if( part === bn && bn !== "md" && bn !== "html" ) {

							// Also ignore the base name

						} else {

							extensions.push( part );

						}

					})

				}

				// Ensure each array element is unique
				extensions = _.uniq( extensions );

				// Sort the extensions
				extensions = _.sortBy( extensions );

				// If an array is desired, we can return now..
				if( asArray ) {

					return extensions;

				} else {

					// Convert the extensions array into an object
					var ret = {};
					_.each( extensions, function( ext ) {
						ret[ext] = true;
					});
					return ret;

				}

			},

			/**
			 * Checks to see if the file has a particular file extension (regardless of order).
			 * Note: The file extension is case-insensitive.
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.hasFileExtention( "Html" ) );
			 * // => true
			 *
			 * @example
			 * var f = new Dasix.grits.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.is( "txt" ) );
			 * // => false
			 *
			 * @instance
			 * @access public
			 * @param {string} ext The file extension to check for
			 * @returns {boolean} TRUE if the file has the given extension, FALSE otherwise.
			 */
			hasFileExtension: function( ext ) {

				var me = this;
				var extensions = me.getFileExtensions( false );
				ext = ext.toLowerCase();

				if( extensions[ ext ] === undefined ) {
					return false;
				} else if( extensions[ ext ] === true ) {
					return true;
				} else {
					return false;
				}

			},

			/**
			 * This is a convenience alias for {@link Dasix.grits.File#hasFileExtension},
			 * see the documentation for that method for more information.
			 *
			 * @instance
			 * @see Dasix.grits.File#hasFileExtension
			 * @access public
			 * @param {string} ext The file extension to check for
			 * @returns {boolean} TRUE if the file has the given extension, FALSE otherwise.
			 */
			is: function( ext ) {
				return this.hasFileExtension( ext );
			},

			/**
			 * Write data to the file, synchronously.  UTF-8 encoding is always
			 * used by this method.
			 *
			 * @instance
			 * @access public
			 * @param {string} content The content to write to the file.
			 * @returns {void}
			 */
			writeSync: function( content, writeOptions ) {

				// Locals
				var me = this;

				// Default write options
				if( writeOptions === undefined || writeOptions === null ) {
					writeOptions = {encoding : "utf-8"};
				}

				// Create the directory for our file, if it does not exist
				me.createDirectoryPath();

				// Write the file
				fs.writeFileSync( me.getAbsoluteFilePath(), content, writeOptions );

			},

			/**
			 * Writes to multiple output files.  Since only the metadata of
			 * the base file (this) is used in this operation, this method
			 * is only really handy for writing one or more output files,
			 * which usually have different contents than this source file,
			 * to one or more output locations that are, in part, determined
			 * by this file's path.
			 *
			 * For example, if a SASS/SCSS file is read, rendered, and should
			 * then have the result output to multiple CSS files, this is the
			 * method you could use to write the CSS output.
			 *
			 * @param {*} content The content to write to the output file(s)
			 * @param {string|string[]} outputPaths The root output paths.
			 * @param {string} [newExt] The new file extension for the target files; if not
			 * provided, then the file extensions will match the base file (this).
			 * @param {string} [prependPath] If provided (and not NULL), this string will
			 * be prepended to the relative portion of each output path.
			 * @param {string} [appendPath] If provided (and not NULL), this string will
			 * be appended to each output path.
			 * @param {object} [writeOptions] Options to pass to fs.writeSync()
			 * @returns {Dasix.grits.File[]} All files that were written
			 */
			writeMultipleSync: function( content, outputPaths, newExt, prependPath, appendPath, writeOptions ) {

				// Locals
				var me = this;
				var ret = [];

				// Handle newExt
				if( newExt === undefined || tipe(newExt) !== "string" ) {
					newExt = null;
				}

				// Handle prependPath
				if( prependPath === undefined || tipe(prependPath) !== "string" ) {
					prependPath = null;
				}

				// Handle appendPath
				if( appendPath === undefined || tipe(appendPath) !== "string" ) {
					appendPath = null;
				}

				// Handle single output paths
				if( tipe( outputPaths ) === "string" ) {
					outputPaths = [ outputPaths ];
				}

				// Iterate over each output path
				_.each( outputPaths, function( dPath ) {

					var outputFilename, relPath;

					// Determine output filename
					if( newExt === null ) {
						outputFilename = me.getFilename();
					} else {
						outputFilename = me.getBaseName() + ".css";
					}

					// Prepend path, if desired
					if( prependPath === null ) {
						relPath = me.getRelativePath();
					} else {
						relPath = pth.join( prependPath, me.getRelativePath() );
					}

					// Append path, if desired
					if( appendPath !== null ) {
						relPath = pth.join( relPath, appendPath );
					}

					// Create a new Dasix.grits.File object for
					// the target output file.
					var destFile = new Dasix.grits.File(
						dPath,
						relPath,
						outputFilename
					);

					// Write the file
					destFile.writeSync( content, writeOptions );

					// Append the method return
					ret.push( destFile );

				});

				// Finished
				return ret;

			},

			/**
			 * Reads the file contents and returns them verbatim.  UTF-8 encoding
			 * is always used by this method.
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			readSync: function() {

				var me = this;
				return fs.readFileSync( me.getAbsoluteFilePath(), "utf8" );

			},

			/**
			 * Reads the file content (using {@link Dasix.grits.File#readSync) and
			 * then parses the file as JSON.
			 *
			 * @instance
			 * @access public
			 * @returns {object} The data extracted from the JSON file.
			 */
			readJsonSync: function() {

				var me = this;
				var content = me.readSync();
				return JSON.parse( content );

			},

			/**
			 * Reads the file content (using {@link Dasix.grits.File#readSync) and
			 * then parses the file as YAML.
			 *
			 * @instance
			 * @access public
			 * @returns {object} The data extracted from the YAML file.
			 */
			readYamlSync: function() {

				var me = this;
				var content = me.readSync();
				return yaml.load( content, { filename: me.getAbsoluteFilePath() } );

			},

			/**
			 * Reads the file content (using {@link Dasix.grits.File#readSync) and
			 * then parses the file as TOML.
			 *
			 * @instance
			 * @access public
			 * @returns {object} The data extracted from the TOML file.
			 */
			readTomlSync: function() {

				var me = this;
				var content = me.readSync();
				return toml.parse( content );

			},

			/**
			 * Creates a new File object for this file, but within a target
			 * (presumably different) destination path.  Since `Dasix.grits.File`
			 * objects store information about their absolute directory path in two
			 * parts, using a 'base path' (a.k.a "root" or "absolute" path) and
			 * then a "relative path" (which is relative to the "base path"),
			 * the parameters of this method offer a means of injecting changes
			 * between the root and relative path and/or between the relative
			 * path and file name.
			 *
			 * The dest file path will be constructed like so:
			 * > `( destBasePath + opts.baseSuffix ) + ( opts.relativePrefix + this.getRelativePath() + opts.relativeSuffix ) + this.getFileName()`
			 *
			 * @instance
			 * @access public
			 * @param {string} destBasePath The destination's base (a.k.a "root" or "absolute") path
			 * @param {?object} [opts={}]
			 * @param {?string} [opts.baseSuffix=null] If provided (and not null or blank), then this will be appended to the destination file's base (a.k.a "root" or "absolute") path.
			 * @param {?string} [opts.relativePrefix=null] If provided (and not null or blank), then this will be prepended to the destination file's relative path.
			 * @param {?string} [opts.relativeSuffix=null] If provided (and not null or blank), then this will be appended to the destination file's relative path.
			 * @returns {Dasix.grits.File} The new file object
			 */
			dest: function( destBasePath, opts ) {

				// Locals
				var me = this;
				var destBaseFinal, destRelFinal;

				// Require the first param
				if( destBasePath === undefined || destBasePath === null ) {
					throw new Error("Dasix.grits.File.dest(): destination path is required");
				} else if( tipe(destBasePath) !== "string" ) {
					throw new Error("Dasix.grits.File.dest(): destination path must be a string");
				} else if( destBasePath.replace(/\s/g, '') === "" ) {
					throw new Error("Dasix.grits.File.dest(): destination path cannot be blank");
				}

				// Default 'opts' param
				if( opts === undefined || opts === null || tipe( opts ) !== "object" ) {
					opts = {};
				}

				// Default options
				_.each( ["baseSuffix", "relativePrefix", "relativeSuffix"], function( prop ) {
					if( opts[ prop ] === undefined || opts[ prop ] === null || opts[ prop ].replace(/\s/g, '') === "" ) {
						opts[ prop ] = null;
					} else if( tipe( opts[ prop ] ) !== "string" ) {
						throw new Error("Dasix.grits.File.dest(): opts." + prop + " must be a string, null, or undefined.");
					}
				});

				// Assemble the destination base path
				if( opts.baseSuffix !== null ) {
					destBaseFinal = pth.join( destBasePath, opts.baseSuffix );
				} else {
					destBaseFinal = destBasePath;
				}

				// Assemble the destination relative path
				if( opts.relativePrefix !== null ) {
					destRelFinal = pth.join( opts.relativePrefix, me.getRelativePath() );
				} else {
					destRelFinal =me.getRelativePath();
				}
				if( opts.relativeSuffix !== null ) {
					destRelFinal = pth.join( destRelFinal, opts.relativeSuffix );
				}

				// Create the destination object
				var destFile = new Dasix.grits.File(
					destBaseFinal, destRelFinal, me.getFilename()
				);

				// Finished
				return destFile;

			},

			/**
			 * Copies the file to a new destination.
			 *
			 * @instance
			 * @access public
			 * @param {string} destBasePath The destination's base (a.k.a "root" or "absolute") path.
			 * If an array is passed for this parameter then multiple copies will be created.
			 * @param {?object} [opts={}]
			 * @param {?string} [opts.force=false] By default, this method will not overwrite
			 * files that have the same mtime (last modified time) as the source. Set this option
			 * to TRUE to force the copy, regardless of mtime.
			 * @param {?string} [opts.baseSuffix=null] See: {@link Dasix.grits.File#dest}
			 * @param {?string} [opts.relativePrefix=null] See: {@link Dasix.grits.File#dest}
			 * @param {?string} [opts.relativeSuffix=null] See: {@link Dasix.grits.File#dest}
			 * @returns {Promise} A promise that will be resolved with a new `Dasix.grits.File`
			 * representing the new copy.  If the `destBasePath` parameter is an array, then the
			 * promise will be resolved with an array of new `Dasix.grits.File` objects, one for
			 * each copy made.
			 */
			copyTo: function( destBasePath, opts ) {

				var me = this;

				// Require the first param
				if( destBasePath === undefined || destBasePath === null ) {
					throw new Error("Dasix.grits.File.copyTo(): destination path is required");
				} else if( tipe(destBasePath) === "array" ) {

					var promises = [];
					_.each( destBasePath, function( dbp ) {
						promises.push(
							me.copyTo( dbp, opts )
						);
					});
					return Promise.all( promises );

				} else if( tipe(destBasePath) !== "string" ) {
					throw new Error("Dasix.grits.File.copyTo(): destination path must be a string or an array of strings");
				} else if( destBasePath.replace(/\s/g, '') === "" ) {
					throw new Error("Dasix.grits.File.copyTo(): destination path cannot be blank");
				}

				// Default 'opts' param
				if( opts === undefined || opts === null || tipe( opts ) !== "object" ) {
					opts = {};
				}

				// Default 'opts.force'
				if( opts.force === undefined || opts.force === null || opts.force !== true ) {
					opts.force = false;
				}

				// Create the destination file
				var destFile = me.dest( destBasePath, opts );

				// Determine the absolute output path for the file
				var destFilePath = destFile.getAbsoluteFilePath();

				// Ensure the target output directory exists
				destFile.createDirectoryPath();

				// Check for newer/older file
				var srcMtime = me.mtime();
				var destMtime = destFile.mtime();
				var destIsIdentical = false;
				if( destMtime !== null && destMtime === srcMtime ) {
					destIsIdentical = true;
				}

				// Copy the file, or skip it ..
				if( !destIsIdentical || opts.force === true ) {

					// Not skipping ..
					// Create the file copy operation
					return fs.copyAsync(

						me.getAbsoluteFilePath(),
						destFilePath,
						{
							preserveTimestamps: true
						}

					).then(

						function afterFileCopy() {
							return destFile;
						}

					);

				} else {

					// Skipping ..
					return Promise.resolve( destFile );

				}

			},

			/**
			 * Returns whether or not the target file currently exists.
			 *
			 * @instance
			 * @access public
			 * @returns {boolean} TRUE if the file exists; FALSE otherwise.
			 */
			exists: function() {

				// Locals
				var me 		= this;
				var stat	= me.stat();

				// Return
				if( stat === null ) {
					return false;
				} else {
					return true;
				}

			},

			/**
			 * Returns statistics for the target file, or NULL if they could not be
			 * gathered (usually because the file does not exist).
			 *
			 * @instance
			 * @access public
			 * @returns {object|null} Either file statistics or NULL if they
			 * could not be gathered (usually because the file does not exist).
			 */
			stat: function() {

				// Locals
				var me 		= this;

				// Stat
				try {
					return fs.statSync( me.getAbsoluteFilePath() );
				} catch( err ) {
					return null;
				}

			},

			/**
			 * Returns the mtime (last modified time, in milliseconds) for the target file,
			 * or NULL if it could not be determined. (usually because the file does not exist).
			 *
			 * @instance
			 * @access public
			 * @returns {object|null} Either the mtime (last modified time, in milliseconds)
			 * for the target file or NULL if it could not be determined (usually
			 * because the file does not exist).
			 */
			mtime: function() {

				// Locals
				var me = this;

				// Stat the file
				var stat = me.stat();

				// Return
				if( stat === null ) {
					return null;
				} else {
					return stat.mtime.getTime();
				}

			}

			/*
			LEGACY METHODS


			/**
			 * Resolves information about a file based on its filename.
			 * This information is used in several places within
			 *
			 * @param absoluteFilePath
			 * @private
			 * /
			_resolveFileMeta: function( absoluteFilePath ) {

				// Locals
				var me = this;
				var srcFilePath = srcFileInfo.filename;
				var srcRelPath = srcFileInfo.dir;
				var srcMeta = me._getFileContentMeta( srcFileInfo.basename );
				var srcName = srcMeta.name;
				var srcType = srcMeta.contentType;
				var destFilename = srcName + "." + srcType;
				var renderOps = [];
				var srcLongName;
				var destRelPath;
				var destPaths;

				// Parse the relative source path a bit
				if( srcRelPath === "." ) {
					srcRelPath = "";
				} else {
					srcRelPath += "/";
				}

				// Find the relative output path
				destRelPath = srcRelPath + destFilename;

				// Find the output paths
				destPaths = me._resolveOutputFilePaths(destRelPath);

				// Find the longer name for the template
				srcLongName = srcRelPath + srcName;

				// Log the info we have so far
				me.log("render.content", "Rendering content file..");
				me.log("render.content", " -> Source    : " + srcFilePath);
				me.log("render.content", " -> Name      : " + srcName);
				me.log("render.content", " -> Long Name : " + srcLongName);
				me.log("render.content", " -> Type      : " + srcType);

			},

			_getFileContentMeta: function( filename ) {

				var contentType = "html";

				filename = filename.replace(/\.dust/ig,'');

				if( filename.match(/\.html/i) ) {
					contentType = "html";
					filename = filename.replace(/\.html/ig,'');
				}
				if( filename.match(/\.md/i) ) {
					contentType = "md";
					filename = filename.replace(/\.md/ig,'');
				}

				return {
					name: filename,
					contentType: contentType
				};

			},

			_resolveOutputFilePaths: function( destRelPath ) {

				// Locals
				var me = this;
				var outputPaths = me.getOutputPaths();
				var ret = [];

				_.each( outputPaths, function( outputPath ) {

					ret.push( pth.join( outputPath, destRelPath ) );

				});

				return ret;

			},

			/**
			 * Finds the directory path of a full string file path.
			 * (i.e. It removes the filename from a long path)
			 *
			 * @instance
			 * @access private
			 * @param {string} filePath
			 * @returns {string} The directory portion of the provided file path
			 * /
			_getFilePath : function( filePath ) {

				var sep = pth.sep;
				var spl = filePath.split( sep );
				spl.pop();
				var directoryPath = spl.join( sep );
				return directoryPath;

			}
			*/


		}

	}
);
