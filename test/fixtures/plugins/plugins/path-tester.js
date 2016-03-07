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
	me.pluginName = "path-tester";

};

var pr = pl.prototype;

/**
 * Called automatically when attached (added) to a renderer
 *
 * @param renderer
 */
pr.onAttach = function( renderer ) {

	var me = this;
	var pm = renderer.getPathManager();


	// Good examples, these will be protected ---------------------------------------------

	pm.addPluginPath( me.pluginName, "filter", "/good/path/a" );
	pm.addPluginPath( me.pluginName, "filter", [ "/good/path/b", "/good/path/c" ] );
	pm.addPluginPath( me.pluginName, "filter", { path: "/good/path/d", plugin: "will-be-ignored", arbitrary: "meta" } );
	pm.addPluginPath( me.pluginName, "filter", [ { path: "/good/path/e", plugin: "will-be-ignored" }, { path: "/good/path/f", plugin: "will-be-ignored" } ] );

	renderer.addFilterPath( { path: "/good/path/g", plugin: me.pluginName } );
	renderer.addFilterPath( [ { path: "/good/path/h", plugin: me.pluginName }, { path: "/good/path/i", plugin: me.pluginName } ] );

	renderer.addPathOfType( "filter", { path: "/good/path/j", plugin: me.pluginName } );
	renderer.addPathOfType( "filter", [ { path: "/good/path/k", plugin: me.pluginName }, { path: "/good/path/l", plugin: me.pluginName } ] );


	// Bad examples, these might be accidentally discarded! ------------------------------

	renderer.addFilterPath( "/bad/path/a" );
	renderer.addFilterPath( { path: "/bad/path/b" } );

	renderer.addPathOfType( "filter", "/bad/path/c" );
	renderer.addPathOfType( "filter", [ "/bad/path/d", "/bad/path/e" ] );
	renderer.addPathOfType( "filter", { path: "/good/path/f", plugin: me.pluginName } );
	renderer.addPathOfType( "filter", [ { path: "/good/path/g" }, { path: "/good/path/h" } ] );

};
