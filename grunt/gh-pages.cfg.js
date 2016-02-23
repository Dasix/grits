/**
 * Grunt configuration for `grunt-gh-pages`
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @created 2016-02-23
 */

var path = require("path");
var pkg = require( path.join(__dirname, "../package.json") );
var repo = pkg.repository.url;

module.exports = {
	options: {
		base: "docs/html",
		push: false,
		repo: repo
	},
	src: ["**"]
};
