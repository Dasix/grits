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

				// Break lines into multiple messages
				var messages = message.split("\n");

				// Output each line
				_.each( messages, function( line ) {
					me._logOneLine( topic, line );
				});

			},

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
				var topicTarget	= 20;
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

			setLogFilter: function( filterVal ) {

				// Locals
				var me = this;

				// Handle undefined param
				if( filterVal === undefined || filterVal === null ) {
					me.$$logFilter = null;
					me.log("log.filter", "Log filtering DISABLED");
				} else if( tipe( filterVal ) === "string" ) {
					me.log("log.filter", "Log filtering ENABLED:");
					me.log("log.filter", "  - '" + filterVal + "'");
					me.$$logFilter = [ filterVal ];
				} else if( tipe( filterVal ) === "array" ) {
					me.log("log.filter", "Log filtering ENABLED:");
					_.each( filterVal, function( str ) {
						me.log("log.filter", "  - '" + str + "'");
					});
					me.$$logFilter = filterVal;
				} else {
					me.log("log.filter", "Log filtering DISABLED (invalid setting)");
					me.$$logFilter = null;
				}

				// Log it



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

				// Append .error to topic
				topic += ".error";

				// Enable output
				me.setVerbose( true );

				// Disable log filtering
				me.setLogFilter( null );

				// Log about the log..
				me.log( "log.verbosity", 	"Verbose logging has been forcefully ENABLED by the error reporter.");
				me.log( "log.filter", 		"Log filtering has been forcefully DISABLED by the error reporter.");

				// Output the error
				me.log( topic, "" );
				me.log( topic, "" );
				me.log( topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( topic, "" );
				me.log( topic, "A CRITICAL ERROR HAS OCCURRED:" );
				me.log( topic, "" );
				me.log( topic, err.message );
				me.log( topic, "" );
				me.log( topic, "-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-" );
				me.log( topic, "" );
				me.log( topic, "" );

				// Terminate the process
				me.log( "render.fail", "The Grits render operation has failed and will exit..");
				process.exit(1);

			}


		}
	});
