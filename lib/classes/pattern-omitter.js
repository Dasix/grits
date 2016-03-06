/**
 * This is a utility class for removing, and then replacing, a regex pattern
 * from a string.  This class was created for use by the {@link Dasix.grits.MarkdownParser}
 * to enable better Dust.js and Markdown compatibility.
 *
 * @class Dasix.grits.PatternOmitter
 * @extends qx.core.Object
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require( "qooxdoo" );
var marked = require( "marked" );
var _ = require( "lodash" );

qx.Class.define(
	"Dasix.grits.PatternOmitter", {

		extend : qx.core.Object,

		/**
		 * @constructs Dasix.grits.PatternOmitter
		 */
		construct : function( name, src, pattern ) {

			var me = this;
			me.__name = name;
			me.__src = src;
			me.__pattern = pattern;
			me.__db = [];

			// Set placeholder config to defaults
			me.configurePlaceholders({
				prefix: null,
				delimiter: null,
				suffix: null
			});

		},

		members : /** @lends Dasix.grits.PatternOmitter **/ {

			/**
			 * Removes the "pattern" from the "source" and injects
			 * placeholder strings for each match. This is step 1
			 * of 2 in the process this class was designed to facilitate.
			 *
			 * @instance
			 * @access public
			 * @returns {string}
			 */
			remove: function() {

				var me 		= this;
				var src 	= me.__src;
				var rgx 	= me.__pattern;
				var interm, matches, count;

				// Reset database
				me.__db = [];

				// Check for the pattern
				matches = src.match( rgx );

				// Decide what to do next based on the matches
				// (or lack thereof)
				if( matches === null ) {

					// The pattern was not matched,
					// so there's nothing to do.
					return src;

				} else {

					// At least one match was found
					interm = src;
					count = 0;

					// Iterate over each "Non-Markdown" result
					_.each( matches, function( matchBody ) {

						// Create the temporary placeholder tag (string)
						var placeholder = me._createPlaceholderTag( count );

						// We need to store information about each
						// pattern replacement for recover/replacement later.
						me.__db.push({
							orig		: matchBody,
							placeholder : placeholder,
							id			: count
						});

						// Update the interm string
						interm = interm.replace( matchBody, placeholder );

						// Increment the counter
						count++;

					});

					// Finished
					return interm;

				}

			},

			/**
			 * Re-inserts the data removed in the previous `#remove()` by
			 * replacing each placeholder.  This method accepts a `handled`
			 * parameter because the actual purpose of the PatternOmitter class
			 * is to facilitate mutation.. so, it is expected that implementors
			 * will mutate the string between the remove and replace steps.
			 *
			 * @instance
			 * @access public
			 * @param {string} handled The text to reinsert data into
			 * @returns {string}
			 */
			replace: function( handled ) {

				// Locals
				var me = this;
				var ret = handled;

				// If this.__db is an empty array, then the pattern was
				// not matched in the original source and there's nothing
				// for this method to do.
				if( me.__db.length === 0 ) {
					return ret;
				}

				// Replace the placeholders with the stored content
				_.each( me.__db, function( item ) {

					// Note/Warning: This class was actually designed for
					// usage in markdown post-processing, so this next
					// part sorta conflicts with reusability since "<p></p>"
					// is a known symptom of markdown parsing. It only
					// affects efficiency, though, because it adds an extra
					// op that is only likely to be necessary in a markdown
					// post-processing context.  It could be easily removed.

					//ret = ret.replace( "<p>" + item.placeholder + "</p>", item.orig );  // <-- see note/warning above
					ret = ret.replace( item.placeholder, item.orig );

				});

				// Finished
				return ret;

			},

			/**
			 * This convenience method provides a simple way to implement a
			 * remove, mutate, then replace workflow.
			 *
			 * @example
			 * var patternOmitter = new Dasix.grits.PatternOmitter( name, src, pattern );
			 * var result = patternOmitter.wrap(
			 *     function( interm ) {
			 *         return interm + "01234567890";
			 *     }
			 * );
			 *
			 * @param {function} fnHandler A function that allow mutation of the "interm" content.
			 * @returns {string}
			 */
			wrap: function( fnHandler ) {

				var me = this;

				// Replace the pattern with placeholder tags;
				// this creates the "interm" string.
				var interm = me.remove();

				// Pass the "interm" string to the provided handler function.
				var handled = fnHandler( interm );

				// If the handler did not return a string, we will
				// assume no modifications were made to the interm string.
				if( handled === undefined || handled === null ) {
					handled = interm;
				}

				// Replace the placeholders with the original values;
				// this creates the final string.
				return me.replace( handled );

			},

			/**
			 * Creates a placeholder string based on the pattern
			 * omitters placeholder settings and a given id.
			 *
			 * @instance
			 * @access private
			 * @param {*} id An arbitrary placeholder identifier, usually a number.
			 * @returns {string} The placeholder string
			 */
			_createPlaceholderTag: function( id ) {

				var me 			= this;
				return 	me.__placeholderPrefix +
						me.__name +
						me.__placeholderDelimiter +
						id +
						me.__placeholderSuffix;

			},

			/**
			 * Allows configuration of placeholder string generation.
			 * This will almost never be needed and was only added for
			 * testing purpose.  Still, just in case, its available.
			 *
			 * @instance
			 * @access public
			 * @param {object} cfg
			 * @returns {void}
			 */
			configurePlaceholders: function( cfg ) {

				var me = this;

				// Configure Placeholder Prefix
				if( cfg.prefix !== undefined && cfg.prefix !== null ) {
					me.__placeholderPrefix 		= cfg.prefix;
				} else {

					// Apply Default
					me.__placeholderPrefix 		= "<!---inc-";

				}

				// Configure Placeholder Delimiter
				if( cfg.delimiter !== undefined && cfg.delimiter !== null ) {
					me.__placeholderDelimiter 		= cfg.delimiter;
				} else {

					// Apply Default
					me.__placeholderDelimiter 		= "-";

				}

				// Configure Placeholder Suffix
				if( cfg.suffix !== undefined && cfg.suffix !== null ) {
					me.__placeholderSuffix 		= cfg.suffix;
				} else {

					// Apply Default
					me.__placeholderSuffix 		= "--->";

				}

			}

		}
	}
);
