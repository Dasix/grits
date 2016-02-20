/**
 * This class is a wrapper for the `marked` module.  It provides a bit of
 * extended functionality in support of some of the more advanced behaviors
 * of the DustJS renderer.
 *
 * @class C2C.dustjs.MarkdownParser
 * @extends qx.core.Object
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 C2C Schools, LLC. All rights reserved.
 */

var qx = require( "qooxdoo" );
var marked = require( "marked" );
var _ = require( "lodash" );

/*
var vError = require( "verror" );
var Promise = require( "bluebird" );
var pth = require( "path" );
var tipe = require( "tipe" );
var mkdirp = require( "mkdirp" );
var fs = require( "fs" );
*/

// Create the base renderer class
qx.Class.define(
	"C2C.dustjs.MarkdownParser", {

		extend : qx.core.Object,

		/**
		 * @constructs C2C.dustjs.MarkdownParser
		 */
		construct : function( ) {

			var me = this;

		},

		properties : {

		},

		members : /** @lends C2C.dustjs.MarkdownParser **/ {

			/**
			 * Uses the `marked` module to process a string of Markdown into
			 * a string of HTML.
			 *
			 * @instance
			 * @access public
			 * @param {string} srcMarkdown The Markdown source
			 * @returns {string} The resulting HTML
			 */
			parse: function( srcMarkdown ) {

				// Locals
				var me = this;

				// Remove "non-markdown" content from the string
				var removed = me._removeNonMarkdown( srcMarkdown );

				// Process the actual markdown
				var processed = me._parseMarkdown( removed.str );

				// Replace the "non-markdown" content
				var resHtml = me._replaceNonMarkdown( processed, removed.data );

				// Finished
				return resHtml;

			},

			/**
			 * This method configures and executes the `marked` module.
			 * It is different from {@link C2C.dustjs.MarkdownParser#parse} in
			 * that no extra functionality is added.  The `srcMarkdown` param
			 * is expected to be raw and true markdown.
			 *
			 * @instance
			 * @access private
			 * @param {string} srcMarkdown The source markdown
			 * @returns {string} The resulting HTML
			 */
			_parseMarkdown: function( srcMarkdown ) {

				// Locals
				var me = this;
				var resHtml;

				// Options for 'marked' library/module
				var markedOptions = {
					renderer: new marked.Renderer(),
					gfm: true,
					tables: true,
					breaks: true,
					pedantic: false,
					sanitize: false,
					smartLists: true,
					smartypants: false
				};

				// Process Markdown
				resHtml = marked(srcMarkdown, markedOptions);

				// All done
				return resHtml;

			},

			/**
			 * This method is step 1 (of 2) in the `{@notmd}` tag implementation.
			 * It will pre-parse a string of markdown and remove any text marked
			 * as "not markdown".
			 *
			 * @instance
			 * @access private
			 * @param {string} srcMarkdown The markdown source
			 * @returns {string} object.str The updated markdown string with "Non Markdown" replaced
			 * by temporary placeholder strings.
			 * @returns {object} object.data A special variable that will be used by
			 * {@link C2C.dustjs.MarkdownParser#_replaceNonMarkdown} to add the "Non Markdown"
			 * back into the string.
			 */
			_removeNonMarkdown: function( srcMarkdown ) {

				// Locals
				var me = this;
				var reg = me._getNonMarkdownRegex();
				var ret = {
					str: null,
					data: []
				};

				// Check for the tags
				var matches = srcMarkdown.match( reg );

				// Decide what to do next based on the matches (or lack thereof)
				if( matches === null ) {
					ret.str = srcMarkdown;
					ret.data = null;
				} else {

					// If we arrive here then at least one "Non-Markdown" tag
					// was identified in the source markdown.  We're going
					// to replace all non-markdown content with temporary
					// placeholder tags so that markdown parsing can be
					// performed on the rest of the content.

					var parsedMarkdown = srcMarkdown;
					var noMdTagCount = 0;

					// Initialize the 'data' return variable
					ret.data = [];

					// Iterate over each "Non-Markdown" result
					_.each( matches, function( matchBody ) {

						// Create the temporary placeholder tag (string)
						var tmpTagStrings = me._createTempTagStrings( noMdTagCount );

						// This object will be included in the return
						// data, which will be used by `#_replaceNonMarkdown`
						// later to re-insert the non-markdown content after
						// markdown parsing has been completed.
						var item = {
							orig: matchBody,
							tempTags: tmpTagStrings,
							id: noMdTagCount
						};
						ret.data.push( item );

						// Update the markdown string
						parsedMarkdown = parsedMarkdown.replace( matchBody, tmpTagStrings.before );

						// Increment the tag count
						noMdTagCount++;

					});

					// Configure the ".str" return
					ret.str = parsedMarkdown;

				}


				// Finished
				return ret;

			},

			/**
			 * This method is step 2 (of 2) in the `{@notmd}` tag implementation.
			 * It will post-parse a string of markdown and put any "Non-Markdown"
			 * content that was removed by {@link C2C.dustjs.MarkdownParser#_removeNonMarkdown}
			 * back into the string.
			 *
			 * @instance
			 * @access private
			 * @param {string} parsedMarkdown The HTML (parsed Markdown) that needs
			 * "Non-Markdown" content reinserted into it.
			 * @returns {string} The final HTML, with "Non-Markdown" content re-inserted.
			 */
			_replaceNonMarkdown: function( parsedMarkdown, nonMdData ) {

				// Locals
				var me = this;
				var ret = parsedMarkdown;

				// If `nonMdData` is null, then no "Non-Markdown" tags
				// were found in the original markdown and there's nothing
				// for this method to do.
				if( nonMdData === null ) {
					return ret;
				}

				// Replace each non-md temp strings with the original
				// content from the original markdown.
				_.each( nonMdData, function( item ) {

					var final = me._removeNonMdTags( item.orig );
					ret = ret.replace( item.tempTags.after, final );

				});

				// Finished
				return ret;

			},

			/**
			 * A simple method that returns a static RegExp object that
			 * is used in "Non Markdown" tag identification and removal.
			 *
			 * @intance
			 * @access private
			 * @returns {RegExp}
			 */
			_getNonMarkdownRegex: function() {

				// Check for the "Not Markdown" tags
				// Possible tags (all are case insensitive):
				// Starting Tags:
				//		- {nomd}
				//		- {@nomd}
				//		- {notmd}
				//		- {@notmd}
				// Ending Tags:
				//		- {/nomd}
				//		- {/@nomd}
				//		- {/notmd}
				//		- {/@notmd}

				return /\{\@?not?md\}.*\{\/\@?not?md\}/ig;

			},

			/**
			 * This method will remove any "Non-Markdown" TAGS from a string
			 * of text and return the result.  This method is a cleanup function
			 * that is used to finalize the parsers return HTML.
			 *
			 * @instance
			 * @access private
			 * @param {string} src The string that contains non-md tags
			 * @returns {string} The `src` string with non-md tags removed.
			 */
			_removeNonMdTags: function( src ) {

				var regx = /\{\/?\@?not?md\}/ig;
				return src.replace( regx, '' );

			},

			_createTempTagStrings: function( tagId ) {

				var me = this;
				var baseTag = "!!!NOMD_TAG_" + tagId + "!!!";
				var ret;

				ret = {
					before: "\n\n\n" + baseTag + "\n\n\n",
					after: "<p>" + baseTag + "</p>"
				};



				return ret;


			}


		}

	}
);
