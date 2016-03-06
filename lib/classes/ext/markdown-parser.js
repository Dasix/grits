/**
 * This class is a wrapper for the `marked` module.  It provides a bit of
 * extended functionality in support of some of the more advanced behaviors
 * of the DustJS renderer.
 *
 * @class Dasix.grits.ext.MarkdownParser
 * @extends Dasix.grits.AbsRenderExtension
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

// Dependencies
var qx 		= require( "qooxdoo" 		);
var marked 	= require( "marked" 		);
var _ 		= require( "lodash" 		);
var hljs 	= require( "highlight.js" 	);

// Other classes
require("../pattern-omitter.js");
require("../abs-render-extension");

qx.Class.define(

	"Dasix.grits.ext.MarkdownParser", {

		extend : Dasix.grits.AbsRenderExtension,

		members : /** @lends Dasix.grits.ext.MarkdownParser **/ {

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

				// constants
				me.__nonMarkdownPattern = /\{\@?not?md\}[\s\S]*?\{\/\@?not?md\}/ig;

				// Set the log topic for this extension
				me.setLogTopic("markdown.parser");

			},

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

				// Use a pattern omitter to remove {@notmd}{/notmd}
				// content from the source until markdown processing
				// has completed.
				var po = new Dasix.grits.PatternOmitter(
					"nmd", srcMarkdown, me.__nonMarkdownPattern
				);
				var resHtml = po.wrap(
					function( interm ) {

						// Defer to the #_parseMarkdown
						// method for the next steps.
						return me._parseMarkdown( interm );

					}
				);

				// Strip out the actual {@notmd}{/notmd} tags
				// (the pattern omitter, being non-destructive, put
				// them back verbatim once it had completed its job);
				// otherwise Dust.js will try to process them as handlers.
				resHtml = me._removeNonMdTags( resHtml );

				// Add dust.js whitespace tags
				//resHtml = me._addDustWhitespace( resHtml );

				// Finished
				return resHtml;

			},

			/**
			 * This method configures and executes the `marked` module.
			 * It is different from {@link Dasix.grits.ext.MarkdownParser#parse} in
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
				var resHtml = "";
				var spl;
				var debug = false;

				if( srcMarkdown.indexOf(":)") !== -1 && srcMarkdown.indexOf("```") !== -1 ) {
					debug = true;
				}

				if( debug ) {
					dbg("Before Markdown Processing", srcMarkdown);
				}


				// Options for 'marked' library/module
				var markedOptions = {
					renderer: new marked.Renderer(),
					gfm: true,
					tables: true,
					breaks: true,
					pedantic: false,
					sanitize: false,
					smartLists: true,
					smartypants: false,
					highlight: function( code ) {
						return hljs.highlightAuto( code ).value;
					}
				};

				// Since code within ```code blocks``` needs to be
				// treated as literal text, we need to separate the
				// code from the normal markdown so that they can
				// be processed separately.
				if( srcMarkdown.indexOf("```") === -1 ) {

					// This markdown doesn't have any code blocks
					spl = [ srcMarkdown ];

				} else {

					// This markdown has code blocks, so we split it up.
					spl = srcMarkdown.split("```");

				}

				// Iterate over each block..
				_.each( spl, function( block, blockIndex ) {

					var isCode;
					if( blockIndex % 2 === 0 ) {
						isCode = false;
					} else {
						isCode = true;
					}

					if( isCode ) {

						// Process the markdown
						var blockHtml = marked("```" + block + "```", markedOptions);

						// Since we know that dust shouldn't process source code,
						// we can convert all { } references that remain into
						// the appropriate dust.js special tag, {~lb} and {~rb}
						// We do it in stages, though, to avoid conflicts ( e.g. {{{~rb} )
						blockHtml = blockHtml.replace(/\{/g,"{~lb>||");
						blockHtml = blockHtml.replace(/\}/g,"{~rb}");
						blockHtml = blockHtml.replace(/\~lb\>\|\|/g,"~lb}");

						// Add it to the output
						resHtml += blockHtml;

					} else {
						// Use a pattern omitter to remove ALL {dustjs} markup
						// before processing the source through marked.
						// Note: Any { in the non-code-block markup is considered
						// as the start of a dust.js tag!
						var po = new Dasix.grits.PatternOmitter(
							"bl" + blockIndex, block, /\{[^}]*}/g
						);
						resHtml += po.wrap(
							function( interm ) {
								return marked(interm, markedOptions);
							}
						);

					}

				});

				// All done

				if( debug ) {
					dbg("After Markdown Processing", resHtml);
				}

				return resHtml;

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

			/**
			 * This is currently not used because I decided to set 'whitespace: true'
			 * in the Dust.js config, which tells Dust not to strip whitespace.
			 * I left this here, though, just in case I change my mind.
			 *
			 * @param src
			 * @returns {XML|string}
			 * @private
			 */
			_addDustWhitespace: function( src ) {

				src = src.replace(/\r?\n/ig,"{~n}\n");
				src = src.replace(/(\t|\s{4})/ig,"{~s}{~s}{~s}{~s}");
				return src;

			}


		}

	}
);
