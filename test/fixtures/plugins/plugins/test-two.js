var _ = require("lodash");

/**
 * This is a simple mock/test plugin for grits that
 * simply provides evidence that it has been included
 * and that all of the appropriate "plugin handlers"
 * have been called.
 *
 * @constructor
 */
var pl = module.exports = function( renderer ) {

	// Locals
	var me = this;

	// Set the plugin name (which is REQUIRED for all plugins)
	me.pluginName = "test-two";

	// Init
	me.addEventHandlers();

	// Add constructor evidence
	me.addEvidence( renderer, "constructor" );

};

var pr = pl.prototype;

/**
 * Adds evidence of a call
 *
 * @param renderer
 * @param name
 */
pr.addEvidence = function( renderer, name ) {

	var me = this;

	if( renderer.__evidence === undefined ) {
		renderer.__evidence = {};
	}

	if( renderer.__evidence[ me.pluginName ] === undefined ) {
		renderer.__evidence[ me.pluginName ] = {
			constructor: false
		};

		var events = me.getEventNames();
		_.each( events, function( evn ) {
			renderer.__evidence[ me.pluginName ][ evn ] = false;
		});

	}

	renderer.__evidence[ me.pluginName ][ name ] = true;

};

/**
 * Stores all of the available plugin events
 *
 * @returns {string[]}
 */
pr.getEventNames = function() {
	return require("./_eventNames.js");
};

/**
 * Dynamically creates plugin event handlers
 */
pr.addEventHandlers = function() {

	var me = this;

	var events = me.getEventNames();

	_.each( events, function( eventName ) {
		me[ eventName ] = function( renderer ) {
			me.addEvidence( renderer, eventName );
		};

	});

};
