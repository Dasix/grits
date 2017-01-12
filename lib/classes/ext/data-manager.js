/**
 * This class is a "renderer extension" that assists in the
 * management of datas.  See {@link Dasix.grits.AbsRenderExtension} to
 * learn more about renderer extensions.
 *
 * @class Dasix.grits.ext.DataManager
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.5.6
 * @version 1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 	);
var marked 	= require( "marked" 	);
var _ 		= require( "lodash" 	);
var Promise = require( "bluebird" 	);
var vError 	= require( "verror" 	);
var matter 	= require( "gray-matter" );
var dot 	= require( "dot-object" );
var pth		= require( "path" 		);
var tipe    = require( "tipe"       );

// Other classes
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.DataManager", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.DataManager **/ {

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
				me.setLogTopic("data.manager");

				// Store reference to dot-object module
				me.dot = dot;

				// Store reference to gray-matter module
				me.matter = matter;

				// Initialize the extension handler container
				me.$$extHandlers = {};

				// Add the initial file types
				me.addExtensionHandler( "json", me._readFromJsonFile.bind(me) );
				me.addExtensionHandler( "toml", me._readFromTomlFile.bind(me) );
				me.addExtensionHandler( "ini", me._readFromTomlFile.bind(me) );
				me.addExtensionHandler( "yaml", me._readFromYamlFile.bind(me) );
				me.addExtensionHandler( "yml", me._readFromYamlFile.bind(me) );

				// Initialize the data object
				me._initData();

			},

			/**
			 * This method simply ensures that the global DustJS context
			 * object exists.  This method is idempotent.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			_initData: function() {

				var me = this;
				if( me.$$data === undefined ) {
					me.clearData();
				}

			},

			/**
			 * Clears all existing data.
			 *
			 * @instance
			 * @access private
			 * @returns {void}
			 */
			clearData: function() {
				this.$$data = {
					page: {},
					data: {}
				};
			},

			/**
			 * Provides the collection settings for datas, which will
			 * be used by the ResourcePathManager.
			 *
			 * @instance
			 * @access public
			 * @returns {object} A collection settings object
			 */
			getCollectionSettings: function() {

				return {
					short          : "data",
					name           : "Data Source Path",
					defaultSubdir  : "data",
					scanExtensions : this._getHandledExtensions(),
					methodName     : "Data"
				};

			},

			/**
			 * Loads all datas. This is the main entry point for the
			 * data manager's part in render operations.
			 *
			 * @instance
			 * @access public
			 * @returns {Promise}
			 */
			loadAll : function() {

				// Locals
				var me 		= this;
				var grits 	= me.getGrits();
				var col 	= grits.getPathCollection("data");

				// Initial log message
				me.logOpStart("Loading all Data Files");

				// Setup scan options
				var scanOpts = {
					noMatchHandler: function() {
						me.log("debug", "found.none", "No data files were found or loaded!");
					}
				};

				// Emit Pre-operation Event
				me.emit( "beforeLoadData" );

				// Iterate over each resource
				return col.eachResource( me._loadOne.bind(me), scanOpts ).then(
					function( resourceFiles ) {

						// Add watch config
						me._addCollectionWatcher( col, me._handleWatchUpdate.bind(me) );

						// Emit Post-operation Event
						me.emit( "afterLoadData", { dust: grits.dust, data: me.$$data } );

					}
				);

			},

			/**
			 * Loads a single data.  This is the main work
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
				var filePath	= file.getAbsoluteFilePath();

				// Log the info we have so far
				me.log("debug", "load", "Loading data file ..");
				me.log("debug", "load", " -> Source       : " + filePath );

				// Load the data
				var data = me._readFileData( file );

				// Decide where to store the data
				var storeAs = "data";
				if( data.$storeAs !== undefined ) {
					storeAs = data.$storeAs;
					delete data.$storeAs;
				}

				// Store the data
				me._storeData( storeAs + "." + file.getBaseName(), data );

				// Fire an event
				me.emit( "onDataFileLoaded", { fileType: "json", file: file, data: data, dataManager: me } );

			},

			addExtensionHandler: function( ext, fnHandler ) {
				var me = this;
				var grits 	= me.getGrits();
				var pathManager = grits.getPathManager();

				if( pathManager !== null ) {
					var col 	= grits.getPathCollection("data");
					col.addScanExtension( ext );
				}

				ext = ext.toLowerCase();
				me.$$extHandlers[ext] = fnHandler;
			},

			_getHandledExtensions: function() {
				var me = this;
				return _.keys( me.$$extHandlers );
			},

			_readFileData: function( file ) {
				var me = this;
				var ext = file.getFileExtensions();
				var data = {};

				_.each( ext, function( a, x ) {
					if( me.$$extHandlers[x] !== undefined ) {
						data = me.$$extHandlers[x](file);
					}
				});
				return data;
			},

			_readFromJsonFile: function( file ) {
				return file.readJsonSync();
			},

			_readFromTomlFile: function( file ) {
				return file.readTomlSync();
			},

			_readFromYamlFile: function( file ) {
				return file.readYamlSync();
			},

			/**
			 * When watching is enabled, this method will be called
			 * whenever a watch event is triggered.
			 *
			 * @instance
			 * @access private
			 * @param eventName
			 * @param file
			 * @param extra
			 * @private
			 */
			_handleWatchUpdate: function( eventName, file, extra ) {

				var me 				= this;
				var grits 			= me.getGrits();

				if( eventName === "add" || eventName === "change" ) {

					// Clear existing data
					me.log("debug", "context.clear", "Data update: clearing context data");
					me.clearData();

					// Reload all data files
					me.log("debug", "data.reload", "Data update: reloading all data files");
					me.loadAll().then(

						function() {

							me.log("debug", "content.reload", "Data update: reloading all content");

							// Trigger render update op for all templates
							grits.dustManager.triggerRefUpdate( "data", "*" );

						}

					);


				}

			},

			// --

			/**
			 * Parses a string for front-matter data.
			 *
			 * @instance
			 * @access public
			 * @param {string} source
			 * @param {string} name
			 * @returns {object}
			 */
			parseMatter: function( source, name ) {

				// Locals
				var me 			= this;
				var matterData 	= me.matter( source );

				// Store the matter data
				me._storeFrontMatterData( name, matterData.data );

				// Finished
				return matterData;

			},

			/**
			 * Returns the current context data for the renderer.
			 * Unless the renderer is being manually stepped through
			 * a partial load or render process, this method will not
			 * be useful and its return will not be complete unless it
			 * is called _after_ a `#render()` call.
			 *
			 * @returns {object} The current context data for the renderer.
			 */
			getContextData: function() {

				var me = this;
				return me.$$data;

			},

			/**
			 * Parses and standardizes a data path for storage in the
			 * global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path to be parsed
			 * @returns {string} The resulting, standardized, data path.
			 */
			parseDataPath: function( dataPath ) {

				// Convert backslashes (\) to dots (.)
				// -> a\b\c becomes a.b.c
				dataPath = dataPath.replace(/\/+/g, ".");

				// Convert forward slashes (/) to dots (.)
				// -> a/b/c becomes a.b.c
				dataPath = dataPath.replace(/\\+/g, ".");

				// Remove dots from the start of the path
				// -> .a.b.c becomes a.b.c
				dataPath = dataPath.replace(/^\.+/g, "");

				// Remove dots from the end of the path
				// -> a.b.c. becomes a.b.c
				dataPath = dataPath.replace(/\.+$/g, "");

				// Done
				return dataPath;

			},

			/**
			 * Stores data extracted from a template's "front matter" in the
			 * global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} name The "relative base name" of the template
			 * @param {*} data The data to store
			 * @returns {void}
			 */
			_storeFrontMatterData: function( name, data ) {

				var me = this;

				// Front-Matter data is available globally
				// in the `{page.*}` context property.
				me._storeData( "page." + name, data );

			},

			/**
			 * Stores data in the global DustJS context object.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path that will be used when storing the data.
			 * @param {*} data The data to store
			 * @returns {void}
			 */
			_storeData: function( dataPath, data ) {

				// Locals
				var me = this;
				var existingData, newData;

				// Fetch the existing global context data
				existingData = me.$$data;

				// Parse the provided data path
				dataPath = me.parseDataPath( dataPath );

				// Convert the data, with the path, into an object
				newData = me._dotStr( dataPath, data );

				// Store the data..
				if( newData.page !== undefined ) {

					// If the new data contains "page" data, we will
					// defer to the _storePageData method for its insertion.
					me._storePageData( dataPath, newData.page );

				} else if( newData.data !== undefined ) {

					// If the new data contains "file" data, we will
					// defer to the _storeFileData method for its insertion.
					me._storeFileData( dataPath, newData.data, existingData.data );

				} else {

					// For everything else, we store it as file data
					_.each( newData, function( val, key ) {

						if( existingData[ key ] === undefined ) {
							existingData[ key ] = {};
						}
						me._storeFileData( dataPath, val, existingData[ key ] );

					});

				}

			},

			/**
			 * Creates a nested object of data using a data path.
			 *
			 * @example
			 * _dotStr( "a.b.c", { d: [ 1 ] } );
			 * // { a: { b: { c: { d: [ 1 ] } } } }
			 *
			 * @access private
			 * @param {string} dataPath
			 * @param {*} data
			 * @returns {object}
			 */
			_dotStr: function( dataPath, data ) {

				var me = this;
				var sep = ".";
				var arrPath = [];

				// Convert the string data path into an array
				if( dataPath.indexOf(".") == -1 ) {
					arrPath.push( dataPath );
				} else {
					arrPath = dataPath.split(".");
				}

				// Defer to stepper/iterator
				return me.__dotStrStep( arrPath, 0, data );

			},

			/**
			 * An iteration helper for `#_dotStr`.
			 *
			 * @access private
			 * @param {string[]} arrPath A data path, as an array
			 * @param {number} arrIndex The current index of the data path array,
			 * this number will increment for each step.
			 * @param {*} data The ending data
			 * @returns {object}
			 */
			__dotStrStep: function( arrPath, arrIndex, data ) {

				// Locals
				var me = this;

				// Find the current section name
				var section = arrPath[ arrIndex ];

				// Initialize the return
				var ret = {};

				// Determine if we've reached the end ..
				if( arrIndex === arrPath.length - 1 ) {

					// Yes, so we need to affix the final data
					ret[ section ] = data;

				} else {

					// No, we'll continue to iterate ..
					ret[ section ] = me.__dotStrStep( arrPath, ( arrIndex + 1 ), data );

				}

				// Finished!
				return ret;

			},

			/**
			 * Stores data from content front-matter into the context data store.
			 * This method is used exclusively by `#_storeData` and should
			 * probably never be called directly.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path for the new data
			 * @param {object} newData The new data
			 * @returns {void}
			 */
			_storePageData: function( dataPath, newData ) {

				var me = this;

				// Store the data..
				_.merge( me.$$data.page, newData );

			},

			/**
			 * Stores data from data files into the context data store.
			 * This method is used exclusively by `#_storeData` and should
			 * probably never be called directly.
			 *
			 * @instance
			 * @access private
			 * @param {string} dataPath The data path for the new data
			 * @param {object} newData The new data
			 * @param {object} existingData Existing file data (for ALL files)
			 * @returns {void}
			 */
			_storeFileData: function( dataPath, newData, existingData ) {

				var me = this;

				// File data is stored in a relatively flat way.  No matter
				// where the file is located, its primary key will be the
				// base name of the file and its sub-directory information will
				// be removed.  Thus, our first goal is to find that primary key.
				var dpSplit = dataPath.split(".");
				var dataKey = dpSplit[1];
				var fileData = newData[ dataKey ];

				// If the existing data doesn't have the data key
				// we found in the previous step, then we can simply
				// add it and return without needing to resolve conflicts.
				if( existingData[dataKey] === undefined || existingData[dataKey] === null ) {
					existingData[dataKey] = fileData;
					return;
				}

				// If we've arrived here then we've hit two files with the same
				// name and will either need to merge or append the two objects.
				// Let's reduce our existing data down to the target data.
				var existingFileData = existingData[dataKey];

				// Now we will iterate over all of the new file data and merge
				// it into the existing data using type-specific operations.
				_.each( fileData, function( val, key ) {

					// If the new file data is introducing data [key(s)] that
					// do not exist yet, we can simply add them in..
					if( existingFileData[key] === undefined ) {
						existingFileData[key] = val;
					} else {

						// Now we have a _real_ conflict and need to mitigate it.
						// For now, the only data type with special handling rules
						// is arrays, which will be concatenated instead of overwritten.
						if( _.isArray(val) && _.isArray( existingFileData[key] ) ) {

							// Merge the two arrays
							var merged = _.concat( existingFileData[key], val );

							// Make each item unique (only works for scalars)
							merged = _.uniq( merged );

							// Sort the elements (only works for scalars)
							merged = _.sortBy( merged );

							// Store the result of the ops above
							existingFileData[key] = merged;

						} else {

							// Everything else overwrites..
							existingFileData[key] = val;

						}

					}

				});

			},


			/**
			 * Returns a context object for a specific template.  This method
			 * will, basically, return the global DustJS context object but
			 * will ensure that variables that were defined in the front-matter
			 * of the target template exist at the bottom level of the context object.
			 * (i.e. this method facilitates the idea of "local" template variables)
			 *
			 * @instance
			 * @access public
			 * @param {string} templateName The "relative base name" of the template
			 * @returns {object} The context with "local variables" included.
			 */
			getContextForTemplate: function( templateName ) {

				// Locals
				var me 			= this;
				var grits 		= me.getGrits();
				var ret 		= {};
				var dataPath 	= me.parseDataPath( "page." + templateName );
				var localData 	= me.dot.pick( dataPath, me.$$data );
				var pkg			= require( pth.join( __dirname, "../../..", "package.json" ) );

				// Initialize the return
				ret = _.merge( ret, localData, me.$$data );

				// Apply plugin data
				ret.plugins = grits.pluginManager.getPluginInfo();

				// Apply Grits info
				ret.grits = {
					version: pkg.version,
					pkg: pkg,
					config: grits.getConfig()
				};

				// Apply context handlers
				grits.handlerManager.applyHandlersToContext( ret );

				// Finished
				return ret;

			}



		}
	}
);
