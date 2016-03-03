/**
 * This class is a file abstraction that has several helpful utilities
 * that are useful to the DustJS renderer.
 *
 * @class C2C.dustjs.File
 * @extends qx.core.Object
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 C2C Schools, LLC. All rights reserved.
 */

var qx = require( "qooxdoo" );
var vError = require( "verror" );
var Promise = require( "bluebird" );
var _ = require( "lodash" );
var pth = require( "path" );
var tipe = require( "tipe" );
var mkdirp = require( "mkdirp" );
var fs = require( "fs" );

// Create the base renderer class
qx.Class.define(
	"C2C.dustjs.File", {

		//include : [C2C.dustjs.Loggable],
		extend : qx.core.Object,

		/**
		 * @constructs C2C.dustjs.File
		 * @param {string} basePath The initial value for the {@link C2C.dustjs.File#basePath} property.
		 * @param {string} relativePath The initial value for the {@link C2C.dustjs.File#relativePath} property.
		 * @param {string} filename The initial value for the {@link C2C.dustjs.File#filename} property.
		 */
		construct : function( basePath, relativePath, filename ) {

			var me = this;
			me.setBasePath( basePath );
			me.setRelativePath( relativePath );
			me.setFilename( filename );

		},

		properties : {

			/**
			 * @var {boolean} C2C.dustjs.File#basePath Stores the root path of
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
			 * @var {boolean} C2C.dustjs.File#relativePath The location of the file
			 * relative to the {@link C2C.dustjs.File#basePath}
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
			 * @var {boolean} C2C.dustjs.File#filename The name of the file
			 * @getter getFilename
			 * @mutator setFilename
			 * @instance
			 */
			filename : {
				init  : "",
				check: "String",
				transform: "_transformFilename"
			}

		},

		members : /** @lends C2C.dustjs.File **/ {

			/**
			 * This is a property transformation method (facilitated by the Qooxdoo library)
			 * for the {@link C2C.dustjs.File#basePath} property.  This method is called
			 * automatically when {@link C2C.dustjs.File#setBasePath} is called and will
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
			 * for the {@link C2C.dustjs.File#relativePath} property.  This method is called
			 * automatically when {@link C2C.dustjs.File#setRelativePath} is called and will
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
			 * for the {@link C2C.dustjs.File#filename} property.  This method is called
			 * automatically when {@link C2C.dustjs.File#setFilename} is called and will
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.txt");
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.txt");
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.txt");
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
			 * @see C2C.dustjs.File#getAbsolutePath
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.html");
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.html");
			 * console.log( f.getRelativeBaseName() );
			 * // => subdir/afile
			 *
			 * @example
			 * var f = new C2C.dustjs.File("/base/path", "", "afile.md.html");
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.getFileExtensions( false ) );
			 * // => { html: true, md: true }
			 *
			 * @example
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.HTML");
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
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.HTML");
			 * console.log( f.hasFileExtention( "Html" ) );
			 * // => true
			 *
			 * @example
			 * var f = new C2C.dustjs.File("/base/path", "subdir", "afile.md.HTML");
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
			 * This is a convenience alias for {@link C2C.dustjs.File#hasFileExtension},
			 * see the documentation for that method for more information.
			 *
			 * @instance
			 * @see C2C.dustjs.File#hasFileExtension
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
			writeSync: function( content ) {

				// Locals
				var me = this;

				// Create the directory for our file, if it does not exist
				me.createDirectoryPath();

				// Write the file
				fs.writeFileSync( me.getAbsoluteFilePath(), content, {encoding : "utf-8"} );

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
			 * Reads the file content (using {@link C2C.dustjs.File#readSync) and
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
