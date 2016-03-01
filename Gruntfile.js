module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		"pkg"      : grunt.file.readJSON("package.json"),
		//"gh-pages" : require("./grunt/gh-pages.cfg.js"),
		"watch"    : require("./grunt/watch.cfg.js"),
		"shell"    : require("./grunt/shell.cfg.js")

		//clean: require("./grunt/clean.cfg.js"),
		//copy: require("./grunt/copy.cfg.js"),
	});

	// Load plugins
	grunt.loadNpmTasks( "grunt-contrib-watch" );
	grunt.loadNpmTasks( "grunt-shell" );
	//grunt.loadNpmTasks( "grunt-gh-pages" );

	//grunt.loadNpmTasks( "grunt-contrib-copy"  );
	//grunt.loadNpmTasks( "grunt-contrib-clean" );


	// Rebuild documentation
	grunt.registerTask( "docs", [ "shell:buildDocs" ] );

	// Default entry point
	grunt.registerTask( "default", [ "docs" ] );

};
