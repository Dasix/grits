/**
 * Adds log output functionality.
 *
 * @mixin Dasix.grits.Loggable
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require("qooxdoo");
var eyes = require("eyes");
var tipe = require("tipe");
var _ = require("lodash");
var bunyan = require("bunyan");

qx.Mixin.define("Dasix.grits.Loggable", {

		//include: [SuperMixins],

		properties :  {

			/**
			 * @var {boolean} Dasix.grits.Loggable.verbose Enables or disables verbose
			 * log output which is useful for debugging.
			 * @getter getVerbose isVerbose
			 * @toggler toggleVerbose
			 * @mutator setVerbose
			 * @deprecated
			 */

			/**
			 * @var {boolean} Dasix.grits.Loggable.logLevel The minimum log level to output.
			 * @getter getLogLevel
			 * @mutator setLogLevel
			 */
			logLevel: {
				init: "error",
				apply: "_applyLogLevel"
			},

			/**
			 * @var {boolean} Dasix.grits.Loggable.logFormat The output format for logs.
			 * @getter getLogFormat
			 * @mutator setLogFormat
			 */
			logFormat: {
				init: "console",
				apply: "_applyLogFormat"
			}

		},

		members: /** @lends Dasix.grits.Loggable **/ {


			//<editor-fold desc="+++++ Config: Log Level +++++">

			/**
			 * This method is provided for backward compatibility, as the
			 * 'verbose' property is deprecated.
			 *
			 * @deprecated in favor of `#setLogLevel`
			 * @param newVal The new verbosity value.
			 */
			setVerbose: function( newVal ) {

				// Locals
				var me = this;

				// Defer to logLevel
				if( newVal === true ) {
					me.log("log.verbosity", "Verbose logging has been ENABLED");
					me.setLogLevel("debug");
				} else {
					me.log("log.verbosity", "Verbose logging has been DISABLED");
					me.setLogLevel("error");
				}

			},

			/**
			 * Whether or not the current log output level is considered to be 'verbose'.
			 *
			 * @returns {boolean} TRUE if the log output level is considered to be 'verbose'; FALSE otherwise.
			 */
			getVerbose: function() {

				// Locals
				var me = this;
				var cur = me.getLogLevel();

				switch( cur ) {

					case "debug":
					case "trace":
						return true;

					case "fatal":
					case "error":
					case "warn":
					case "info":
					default:
						return false;

				}

			},

			/**
			 * Alias for `Dasix.grits.Loggable.getVerbose`
			 * @returns {boolean} TRUE if the log output level is considered to be 'verbose'; FALSE otherwise.
			 */
			isVerbose: function() {
				return this.getVerbose();
			},

			/**
			 * This method is provided for backward compatibility, as the
			 * 'verbose' property is deprecated.
			 *
			 * @deprecated in favor of `#setLogLevel`
			 */
			toggleVerbose: function() {

				// Locals
				var me = this;
				var cur = me.getLogLevel();

				if( cur === true ) {
					me.setVerbose( false );
				} else {
					me.setVerbose( true );
				}

			},

			/**
			 * Apply handler for the `#logLevel` property
			 *
			 * @access private
			 * @param {string?} val
			 * @param {string?} old
			 * @returns {void}
			 */
			_applyLogLevel: function( val, old ) {

				// Locals
				var me = this;

				// Manually Coerce Special Values
				if( val === true ) {
					val = "info";
				} else if( val === false || val === null || val === undefined ) {
					val = "none";
				}

				// Coerce to String
				val = val + "";

				// Force lower case
				val = val.toLowerCase();

				// Handle the setting
				switch( val ) {

					case "none":
					case "off":
					case "disabled":
					case "false":
						val = null;
						break;

					default:
						if( !me._isValidLogLevel( val ) ) {
							val = "info";
						}
						break;

				}

				// Force re-initialization of the logger
				// object before the next log line is written
				if( me.$$logger !== undefined ) {
					delete me.$$logger;
				}

				return val;

			},

			/**
			 * Checks to see if a string refers to a valid log level.
			 *
			 * @access private
			 * @param {string} str The string to check
			 * @returns {boolean} TRUE if the string is a valid log level, false otherwise.
			 */
			_isValidLogLevel: function( str ) {

				switch( str.toLowerCase() ) {

					case "fatal":
					case "error":
					case "warn":
					case "info":
					case "debug":
					case "trace":
						return true;

					default:
						return false;

				}

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Config: Log Format +++++">

			/**
			 * Apply handler for the `#logFormat` property
			 *
			 * @access private
			 * @param {string?} val
			 * @param {string?} old
			 * @returns {void}
			 */
			_applyLogFormat: function( val, old ) {

				// Locals
				var me = this;

				// Basic Arg Parsing
				val = val.toLowerCase();

				switch( val ) {

					case "json":
					case "console":

						// For valid settings, we leave it as-is ..

						break;

					default:

						// For invalid settings, we force a default ("console")
						val = "console";

						break;

				}

				// Force re-initialization of the logger
				// object before the next log line is written
				if( me.$$logger !== undefined ) {
					delete me.$$logger;
				}

				return val;

			},

			//</editor-fold>

			//<editor-fold desc="+++++ Config: Log Filter +++++">

			/**
			 * Sets the log filter string (or strings) which limits verbose log
			 * output to only topics that contain the filter.
			 *
			 * @param {null|string|string[]} filterVal The new filter string, or
			 * an array of strings.  Omitting this param or providing a value of NULL
			 * will disable log filtering.
			 * @returns {void}
			 */
			setLogFilter: function( filterVal ) {

				// Locals
				var me = this;

				if( filterVal === undefined || filterVal === null ) {

					// If filterVal is not passed, or if it is NULL,
					// then we will disable log filtering.
					me.$$logFilter = null;
					me.log("debug", "log.filter", "Log filtering DISABLED");

				} else if( tipe( filterVal ) === "string" ) {

					// If a string is passed then log messages will
					// be limited to topics containing that string.
					me.log("debug", "log.filter", "Log filtering ENABLED:");
					me.log("debug", "log.filter", "  - '" + filterVal + "'");
					me.$$logFilter = [ filterVal ];

				} else if( tipe( filterVal ) === "array" ) {

					// If an array of strings is passed then log
					// messages will be limited to topics containing
					// ANY of those strings.
					me.log("debug", "log.filter", "Log filtering ENABLED:");
					_.each( filterVal, function( str ) {
						me.log("log.filter", "  - '" + str + "'");
					});
					me.$$logFilter = filterVal;

				} else {

					// If anything else is passed, we will disable filtering
					// with a warning message.
					me.log("debug", "log.filter", "Log filtering DISABLED (invalid setting)");
					me.$$logFilter = null;

				}


			},

			/**
			 * Returns the current log filter.
			 *
			 * @returns {null|string} The current log filter string or NULL if
			 * filtering is not enabled.
			 */
			getLogFilter: function() {

				var me = this;
				if( me.$$logFilter === undefined ) {
					me.$$logFilter = null;
				}
				return me.$$logFilter;

			},

			//</editor-fold>


			/**
			 * A helper function that evaluates function arguments based
			 * on a parameter pattern/algorithm and returns the parsed result
			 * as an object.
			 *
			 * @access protected
			 * @param {arguments} args
			 * @returns {object}
			 */
			_parseLogParams: function( args ) {

				var me = this;
				var ret = {
					level: "info",
					message: "",
					topic: null
				};

				// Argument Parsing
				switch( args.length ) {

					// If no arguments are passed, we will
					// log a blank line with "debug" level
					case 0:
						ret.level = "debug";
						break;

					// If only one argument is passed, then
					// we will assume that it is the message..
					case 1:
						ret.message = args[0];
						break;

					// Here's where it gets tricky..
					// We will try to determine if the first param
					// is a valid log level, if not, then we'll
					// assume that it's a topic..
					case 2:

						// The 2nd param is assumed to always be the message
						// when only 2 params are passed...
						ret.message = args[1];

						if( !me._isValidLogLevel( args[0] ) ) {

							// The first param is not a valid log level,
							// so we assume that it's a topic..
							ret.topic = args[0];

						}
						break;

					// If 3+ params are passed, we keep the first three
					default:
						ret.level = args[0];
						ret.topic = args[1];
						ret.message = args[2];
						break;
				}

				return ret;

			},


			// -------------

			/**
			 * Gets the Bunyan logger object.  This method will call `#_initLogger`
			 * if the Bunyan object does not exist.
			 *
			 * @access private
			 * @returns {object} A bunyan logger
			 */
			_getLogger: function() {

				var me = this;
				if( me.$$logger === undefined ) {
					me._initLogger();
				}
				return me.$$logger;

			},

			/**
			 * Creates a new Bunyan logger object.
			 *
			 * @access private
			 * @returns {object} A bunyan logger
			 */
			_initLogger: function() {

				// Locals
				var me 				= this;
				var cfg 			= { name: "app", application: "grits.js", streams: [] };
				var format 			= me.getLogFormat();
				var level 			= me.getLogLevel();
				var streamLib, streamObj;

				// Create the output stream
				if( format === "json" ) {

					cfg.streams.push(
						{
							level: level,
							stream: process.stdout
						}
					);

				} else {

					streamLib = require("../util/log-formatters/console");
					streamObj = new streamLib();
					streamObj.pipe( process.stdout );

					cfg.streams.push(
						{
							level: level,
							type: "raw",
							stream: streamObj
						}
					);

				}

				// Create a bunyan Logger
				me.$$logger = bunyan.createLogger( cfg );

				// Return the new logger
				return me.$$logger;

			},

			// -------------


			/**
			 * Output a log message.
			 *
			 * @example
			 * var me = this;
			 * me.log("info", "something.init", "The thing is initialized");
			 *
			 * @example
			 * var me = this;
			 * me.log( "something.init", "This thing is initializing");
			 *
			 * @example
			 * var me = this;
			 * me.log( "page.render", "Rendering somepage.html..");
			 *
			 * @example
			 * var me = this;
			 * me.log( "Topic is optional" );
			 *
			 * @access public
			 * @param {string} [level="info"] The log level to log at, can be: "trace", "debug", "info", "warn", "error", or "fatal"
			 * @param {string} [topic] A topic, or category, for the log message.
			 * @param {string|string[]} message The log message to output. If the log
			 * message is an array of strings, each will be treated as a separate message.
			 * @returns {void}
			 */
			log: function( level, topic, message ) {

				// Locals
				var me		= this;

				// Parse Arguments
				var opts 	= me._parseLogParams( arguments );
				level = opts.level;
				topic = opts.topic;
				message = opts.message;

				// Handle arrays
				if( tipe(message) === "array" ) {
					_.each( message, function( line ) {
						me.log( level, topic, line );
					});
					return;
				}

				// Coerce to string
				message = message + "";

				// Break lines into multiple messages
				var messages = message.split("\n");

				// Output each line
				_.each( messages, function( line ) {
					me._logOneLine( level, topic, line );
				});

			},

			/**
			 * Logs a single line.  This method is a helper method
			 * for the `#log` method and should not be called directly.
			 *
			 * @access private
			 * @param {string} [level="info"] The log level to log at, can be: "trace", "debug", "info", "warn", "error", or "fatal"
			 * @param {string} topic The topic of the message
			 * @param {string} line A single-line message
			 * @returns {void}
			 */
			_logOneLine: function( level, topic, line ) {

				// Locals
				var me			= this;
				var logr		= me._getLogger();
				var logFn;

				// Check filter
				if( me._checkLogFilter(topic, line) === false ) {
					return;
				}

				// Output to Bunyan
				// Get the bunyan output function
				if( level === "warning" ) {
					logFn = logr.warn.bind( logr );
				} else {
					logFn = logr[ level ].bind( logr );
				}

				logFn( { topic: topic }, line );

			},

			/**
			 * Checks a message to see if it meets the requirements
			 * of the current log filter.  If log filtering is disabled
			 * then this method will always return TRUE.
			 *
			 * @access private
			 * @param {string} topic
			 * @param {string} line
			 * @returns {boolean} TRUE if the message matches the log filter
			 * or if log filtering is disabled; FALSE otherwise.
			 */
			_checkLogFilter: function( topic, line ) {

				// Locals
				var me = this;
				var ret = false;

				// If there is no filter, we always return true
				if( me.$$logFilter === undefined || me.$$logFilter === null || tipe( me.$$logFilter ) !== "array" ) {
					return true;
				}

				// We have a filter.. let's check for matches..
				_.each( me.$$logFilter, function( filter ) {

					if( topic.toLowerCase().indexOf( filter.toLowerCase() ) !== -1 ) {
						ret = true;
					}

				});

				// Finished
				return ret;

			},

			/**
			 * Logs (dumps) the contents of a variable for debugging. This method
			 * will not do anything if {@link Dasix.grits.Loggable#verbose} is set to FALSE.
			 *
			 * @example
			 * var me = this;
			 * var somevar = [ {a: 1, b: 2 ];
			 * me.logv( somevar );
			 *
			 * @example
			 * var me = this;
			 * var somevar = [ {a: 1, b: 2 ];
			 * me.logv( "A Name", somevar );
			 *
			 * @access public
			 * @param {string} [name] A recognizable name for the variable
			 * @param {*} target The variable to dump
			 * @returns {void}
			 */
			logv: function( name, target ) {

				// Locals
				var me			= this;

				// Argument shifting (if name is omitted)
				if( arguments.length === 1 ) {
					target = name;
					name = "variable";
					me.log("debug","var.inspect", "Dumping variable contents for an unnamed variable ...");
				} else {
					me.log("debug","var.inspect", "Dumping variable contents for a variable named '" + name + "' ...");
				}

				me.log("debug","\n\n");
				me.log("debug","----[ var: " + name + " ]----");
				eyes.inspect(target);
				me.log("debug","\n\n");


			},

			/**
			 * Useful for logging a simple key/value (plain) object.
			 *
			 * @access public
			 * @param {string} topic The log topic to use when logging the object.
			 * @param {object} obj The object to log.
			 * @returns {void}
			 */
			logObject: function( topic, obj ) {

				// Locals
				var me = this;

				// Log each key
				_.each( obj, function( v, k ) {
					me.logKeyVal( topic, k, v );
				});

			},

			/**
			 * Logs a single key/value pair using a bit of special
			 * formatting. (` -> key: val`).
			 *
			 * @access public
			 * @param {string} topic The log topic to use when logging the key/value.
			 * @param {string} key The key (or name) of the value.
			 * @param {string} val The value to log.  If anything other than
			 * a string is passed then it will be coerced to a string before it is logged.
			 * @returns {void}
			 */
			logKeyVal: function( topic, key, val ) {

				// Locals
				var me = this;
				var keyPadLength = 15;
				var paddedKey, finalString;

				// Coerce the key and value
				key = key + "";
				val = val + "";

				// Pad the key
				paddedKey = _.padEnd( key, keyPadLength );

				// Create the final string
				finalString = "  -> " + paddedKey + " : " + val;

				// Defer to .log
				me.log( "debug", topic, finalString );

			},

			/**
			 * A formatting helper for logging the start of an operation.
			 * The special functionality of this method is purely cosmetic.
			 *
			 * @access public
			 * @param {string} topic The log topic to use when logging the string
			 * @param {string} str The operation name or title.
			 * @returns {void}
			 */
			logOpStart: function( topic, str ) {

				// Locals
				var me = this;

				// Defer to .log
				me._logBlank( topic, 2 );
				me.log( "debug", topic, "--- " + _.padEnd( str + " ", 70, "-" ) );
				me._logBlank( topic, 2 );

			},

			/**
			 * Logs an error
			 *
			 * @param {string} topic
			 * @param {Error} err
			 */
			logError: function( topic, err ) {

				// Locals
				var me = this;
				var stack = null;

				// Append .error to topic
				topic += ".error";

				// Enable output
				me.setVerbose( true );
				me.setLogLevel( "debug" );

				// Disable log filtering
				me.setLogFilter( null );

				// Log about the log..
				me.log( "debug", "log.verbosity", 	"Verbose logging has been forcefully ENABLED by the error reporter.");
				me.log( "debug", "log.filter", 		"Log filtering has been forcefully DISABLED by the error reporter.");

				// Parse the stack trace a bit for proper display
				if( err.stack !== undefined && err.stack !== null && tipe(err.stack) === "string" ) {

					var stackSplit = err.stack.split("\n");
					stack = "Stack Trace:";
					_.each( stackSplit, function(line) {
						if( line.match(/^\s{3}/) !== null ) {
							stack += "\n" + line;
						}
					});

				}

				// Output the error
				me.log( "debug", topic, "" );
				me.log( "debug", topic, "" );
				me.log( "debug", topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( "debug", topic, "" );
				me.log( "error", topic, "A CRITICAL ERROR HAS OCCURRED:" );
				me.log( "debug", topic, "" );

				me.log( "error", topic, err.message );
				me.log( "debug", topic, "" );

				if( stack !== null ) {
					me.log( "debug", topic, stack );
					me.log( "debug", topic, "" );
				}

				me.log( "debug", topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( "debug", topic, "" );
				me.log( "debug", topic, "" );

				// Terminate the process if haltOnErrors=true
				me.log( "error", "render.fail", "The Grits render operation has failed and will exit..");
				process.exit(1);

			},

			/**
			 * Logs a warning (non-critical error)
			 *
			 * @param {string} topic
			 * @param {Error} err
			 */
			logWarning: function( topic, err ) {

				// Locals
				var me = this;

				// Upgrade this warning to an error if grits.$$haltOnWarnings is true
				if( me.$$haltOnWarnings === true ) {
					me.logError( topic, err );
					return;
				}

				// Output the warning
				me.log( "debug", topic, "" );
				me.log( "warning", topic, "Warning! " + err.message );
				me.log( "debug", topic, "" );

			},

			/**
			 * Logs source code, or file contents.
			 *
			 * @access public
			 * @param {string} topic
			 * @param {string} name
			 * @param {string} content
			 * @returns {void}
			 */
			logSource: function( topic, name, content ) {

				// Locals
				var me = this;

				// Append the topic
				topic += ".src";

				// Create a fancy title
				var title = _.padEnd( "---- " + name + " ", 80, "-" );

				// Output the title
				me._logBlank( topic, 2 );
				me.log( "debug", topic, title );
				me._logBlank( topic, 2 );

				// Split the content into lines.  We don't want to
				// rely on `#log` to do this for us because we want
				// to include line numbers.
				var spl = content.split("\n");

				// Output each line...
				_.each( spl, function( line, index ) {

					// Find the line number
					var lineNo = ( index + 1 );

					// Zero pad the line number
					var strLineNo = _.padStart( lineNo + "", 5, "0" );

					// Output the line...
					me.log( "debug", topic, "    " + strLineNo + ": " + line );

				});

				// A bit of extra padding at the end
				me._logBlank( topic, 2 );

			},

			/**
			 * Logs one or more blank lines.  This method is a formatting
			 * heler for the other, complex, output methods.
			 *
			 * @access private
			 * @param {string} topic Even blank lines require a topic
			 * @param {number} [numberOfLines=1] The number of blank lines to output.
			 * @returns {void}
			 */
			_logBlank: function( topic, numberOfLines ) {

				// Locals
				var me = this;

				// Default and parse the line count
				if( numberOfLines === undefined || numberOfLines === null ) {
					numberOfLines = 1;
				} else {
					numberOfLines = parseInt( numberOfLines, 10 );
				}

				// If the line count is zero, we do not
				// need to do anything.
				if( numberOfLines < 1 ) {
					return;
				}

				// Why would anyone ever want
				// more than 100 blank lines?
				if( numberOfLines > 100 ) {
					numberOfLines = 100;
				}

				// Output the blank lines
				_.times( numberOfLines, function() {
					me.log( "debug", topic, " " );
				});

			}


		}

});
