/**
 * Grunt configuration for `grunt-contrib-watch`
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @created 2016-01-25
 */

//var forkDistProcesses = false;
var nterval = 1000; //ms

module.exports = {

	// Watch for changes to source files and rebuild
	// the documentation when changes are detected.
	docs: {
		files: [
			"conf/*.json",
			"lib/**/*.js",
			"jsdoc-plugins/*.js"
		],
		tasks: [ "shell:buildDocs" ],
		options: {
			spawn: true,
			interval: nterval
		}
	},

	// Watch for changes to source files and execute
	// the unit tests when changes are detected.
	tests: {
		files: [
			"lib/**/*.js",
			"test/*.js",
			"test/fixtures/content/root-main/content/**/*.html",
			"test/fixtures/content/root-main/content/**/*.md",
			"test/fixtures/content/root-main/content/**/*.dust",
			"test/fixtures/content/root-main/layouts/**/*.html",
			"test/fixtures/content/root-main/layouts/**/*.md",
			"test/fixtures/content/root-main/layouts/**/*.dust",
			"test/fixtures/content/root-main/partials/**/*.html",
			"test/fixtures/content/root-main/partials/**/*.md",
			"test/fixtures/content/root-main/partials/**/*.dust",
			"test/fixtures/content/root-main/filters/**/*.js",
			"test/fixtures/content/root-main/handlers/**/*.js",
			"test/fixtures/content/root-main/helpers/**/*.js",
			"test/fixtures/content/root-main/data/**/*"
		],
		tasks: [ "shell:runTests" ],
		options: {
			spawn: true,
			interval: nterval
		}
	}

};
