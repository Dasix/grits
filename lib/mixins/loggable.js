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

qx.Mixin.define("Dasix.grits.Loggable", {

		//include: [SuperMixins],

		properties :  {

			/**
			 * @var {boolean} Dasix.grits.Loggable.verbose Enables or disables verbose
			 * log output which is useful for debugging.
			 * @getter getVerbose isVerbose
			 * @toggler toggleVerbose
			 * @mutator setVerbose
			 */
			verbose : {
				init : false,
				check: "Boolean",
				apply: "_applyVerbosity"
			}

		},

		members: /** @lends Dasix.grits.Loggable **/ {

			/**
			 * Output a log message.  This method will not do anything if {@link Dasix.grits.Loggable#verbose}
			 * is set to FALSE.
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
			 * @param {string} [topic] A topic, or category, for the log message.
			 * @param {string|string[]} message The log message to output. If the log
			 * message is an array of strings, each will be treated as a separate message.
			 * @returns {void}
			 */
			log: function( topic, message ) {

				// Locals
				var me			= this;

				// Argument shifting (if topic is omitted)
				if( arguments.length === 1 ) {
					message = topic;
					topic = "log.general";
				}

				// Exit Early
				if( !me.isVerbose() ) {
					return;
				}

				// Handle arrays
				if( tipe(message) === "array" ) {
					_.each( message, function( line ) {
						me.log( topic, line );
					});
					return;
				}

				// Coerce to string
				message = message + "";

				// Break lines into multiple messages
				var messages = message.split("\n");

				// Output each line
				_.each( messages, function( line ) {
					me._logOneLine( topic, line );
				});

			},

			/**
			 * Logs a single line.  This method is a helper method
			 * for the `#log` method and should not be called directly.
			 *
			 * @access private
			 * @param {string} topic The topic of the message
			 * @param {string} line A single-line message
			 * @returns {void}
			 */
			_logOneLine: function( topic, line ) {

				// Locals
				var me			= this;

				// Check filter
				if( me._checkLogFilter(topic, line) === false ) {
					return;
				}

				// Settings
				var spcPre		= "";
				var spcPst		= "";
				var topicTarget	= 30;
				var topicLen;

				// Get the topic length
				topicLen	= topic.length;

				// RPad the Topic
				if( topicLen < topicTarget ) {
					var topicDiff = topicTarget - topicLen;
					for( var i = 0; i<=topicDiff; i++ ) {
						if( i % 2 === 0 ) {
							//spcPre = spcPre + " ";
							spcPst = spcPst + " ";
						} else {
							spcPst = spcPst + " ";
						}
					}
				}

				// Output the log line
				me._console("(  " + spcPre + topic + spcPst + "  ) " + line );

			},

			/**
			 * Wraps `console.log` in order to facilitate changes to
			 * fundamental output behavior (later/not implement).
			 *
			 * @param {string} str
			 * @private
			 */
			_console: function( str ) {
				console.log( str );
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
					me.log("var.inspect", "Dumping variable contents for an unnamed variable ...");
				} else {
					me.log("var.inspect", "Dumping variable contents for a variable named '" + name + "' ...");
				}

				me._console("\n\n");
				me._console("----[ var: " + name + " ]----");
				eyes.inspect(target);
				me._console("\n\n");


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
				me.log( topic, finalString );

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
				me.log( topic, "--- " + _.padEnd( str + " ", 70, "-" ) );
				me._logBlank( topic, 2 );

			},

			/**
			 * Apply handler for the `#verbose` property.
			 *
			 * @access private
			 * @param {boolean} val The new property value
			 * @param {boolean} old The old property value
			 * @returns {void}
			 */
			_applyVerbosity: function( val, old ) {

				var me = this;
				if( val === true ) {
					me.log("log.verbosity", "Verbose logging has been ENABLED");
				} else {

					// This will probably never be seen:
					me.log("log.verbosity", "Verbose logging has been DISABLED");

				}

			},

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
					me.log("log.filter", "Log filtering DISABLED");

				} else if( tipe( filterVal ) === "string" ) {

					// If a string is passed then log messages will
					// be limited to topics containing that string.
					me.log("log.filter", "Log filtering ENABLED:");
					me.log("log.filter", "  - '" + filterVal + "'");
					me.$$logFilter = [ filterVal ];

				} else if( tipe( filterVal ) === "array" ) {

					// If an array of strings is passed then log
					// messages will be limited to topics containing
					// ANY of those strings.
					me.log("log.filter", "Log filtering ENABLED:");
					_.each( filterVal, function( str ) {
						me.log("log.filter", "  - '" + str + "'");
					});
					me.$$logFilter = filterVal;

				} else {

					// If anything else is passed, we will disable filtering
					// with a warning message.
					me.log("log.filter", "Log filtering DISABLED (invalid setting)");
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

				// Disable log filtering
				me.setLogFilter( null );

				// Log about the log..
				me.log( "log.verbosity", 	"Verbose logging has been forcefully ENABLED by the error reporter.");
				me.log( "log.filter", 		"Log filtering has been forcefully DISABLED by the error reporter.");

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
				me.log( topic, "" );
				me.log( topic, "" );
				me.log( topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( topic, "" );
				me.log( topic, "A CRITICAL ERROR HAS OCCURRED:" );
				me.log( topic, "" );

				me.log( topic, err.message );
				me.log( topic, "" );

				if( stack !== null ) {
					me.log( topic, stack );
					me.log( topic, "" );
				}

				me.log( topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( topic, "" );
				me.log( topic, "" );

				// Terminate the process if haltOnErrors=true
				me.log( "render.fail", "The Grits render operation has failed and will exit..");
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

				// Append .warning to topic
				topic += ".warning";

				// Output the warning
				me.log( topic, "" );
				me.log( topic, "Warning! " + err.message );
				me.log( topic, "" );

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
				me.log( topic, title );
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
					me.log( topic, "    " + strLineNo + ": " + line );

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
					me.log( topic, " " );
				});

			}


		}

});
