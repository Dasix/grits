var _ = require("lodash");

/**
 * This is a simple/mock plugin for testing the renderer's
 * "plugin path" logic.
 *
 * @constructor
 */
var pl = module.exports = function( renderer ) {

	// Locals
	var me = this;

	// Set the plugin name (which is REQUIRED for all plugins)
	me.pluginName = "data-tester";

};

var pr = pl.prototype;

/**
 * Called automatically when attached (added) to a renderer
 *
 * @param renderer
 */
pr.onAttach = function( renderer ) {

	var me = this;
	var dm = renderer.dataManager;
	dm.addExtensionHandler( "txt", me._readDataFromFile.bind(me) );

};

pr._readDataFromFile = function( file ) {

	var me = this;
	var contents = file.readSync();
	return {
		$storeAs: "storagePlace",
		one: contents
	};

};
