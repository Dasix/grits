/**
 * Adds log output functionality.
 *
 * @mixin C2C.dustjs.Loggable
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 C2C Schools, LLC. All rights reserved.
 */

var qx = require("qooxdoo");
var eyes = require("eyes");
var tipe = require("tipe");
var _ = require("lodash");

qx.Mixin.define("C2C.dustjs.Loggable", {

		//include: [SuperMixins],

		properties :  {

			/**
			 * @var {boolean} C2C.dustjs.Loggable.verbose Enables or disables verbose
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

		members: /** @lends C2C.dustjs.Loggable **/ {

			/**
			 * Output a log message.  This method will not do anything if {@link C2C.dustjs.Loggable#verbose}
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
				var spcPre		= "";
				var spcPst		= "";
				var topicTarget	= 20;
				var topicLen;

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

				// Break lines into multiple messages
				var messages = message.split("\n");

				// Output each line
				_.each( messages, function( line ) {
					console.log("(  " + spcPre + topic + spcPst + "  ) " + line );
				});

			},

			/**
			 * Logs (dumps) the contents of a variable for debugging. This method
			 * will not do anything if {@link C2C.dustjs.Loggable#verbose} is set to FALSE.
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

				console.log("\n\n");
				console.log("----[ var: " + name + " ]----");
				eyes.inspect(target);
				console.log("\n\n");


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

			}


		}
	});
