/**
 * A base class for all Grits renderer extensions.
 *
 * @class Dasix.grits.AbsRenderExtension
 * @extends qx.core.Object
 * @author Luke Chavers <luke@chavers.io>
 * @since 0.1.0
 * @version 0.1.0
 * @copyright 2016 Dasix, Inc. All rights reserved.
 */

var qx = require( "qooxdoo" );
var _ = require( "lodash" );
var Promise = require( "bluebird" );
var tipe = require( "tipe" );

qx.Class.define(
	"Dasix.grits.AbsRenderExtension", {

		extend : qx.core.Object,

		/**
		 * @constructs Dasix.grits.AbsRenderExtension
		 */
		construct : function( grits ) {

			// Locals
			var me = this;

			// Store reference to grits renderer
			me.$$grits = grits;

			// Default log topic
			me.setLogTopic( null );

			// Call init(), if its available
			if( tipe( me.init ) === "function" ) {
				me.init();
			}

		},

		members : /** @lends Dasix.grits.AbsRenderExtension **/ {

			setLogTopic: function( newTopic ) {

				var me = this;

				if( newTopic === undefined || newTopic === null || tipe(newTopic) !== "string" ) {
					newTopic = "extension";
				}

				me.$$logTopic = newTopic;

			},

			getGrits: function() {
				var me = this;
				return me.$$grits;
			},

			emit: function( eventName, eventData ) {

				var me = this;
				var grits = me.getGrits();
				return grits._callPluginEventOnAll( eventName, eventData );

			},

			log: function( message ) {

				var me = this;
				var grits = me.getGrits();
				return grits.log( me.$$logTopic, message );

			},

			logError: function( err ) {

				var me = this;
				var grits = me.getGrits();
				return grits.logError( me.$$logTopic, err );

			}

		}
	}
);
