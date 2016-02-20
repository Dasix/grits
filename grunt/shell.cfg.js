/**
 * Grunt configuration for `grunt-shell`
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @created 2015-09-21
 */

module.exports = {

	buildDocs: {
		command: "npm run-script doc"
	},

	runTests: {
		command: "scripts/test.sh"
	}

};
