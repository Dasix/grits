/**
 * Grunt configuration for `grunt-contrib-copy`
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @created 2015-09-21
 */

module.exports = {

	sharedCss: {
		files: [
			{
				expand: true, flatten: true,
				src: [
					"shared-resources/dist/css/c2c.landing.default.all.css",
					"shared-resources/dist/css/c2c.landing.default.all.min.css",
					"shared-resources/dist/css/c2c.landing.default.full-page-gzip.css",
					"shared-resources/dist/css/c2c.landing.default.full-page-minimal.css",
					"shared-resources/dist/css/c2c.landing.default.full-page-minimal.min.css",
					"shared-resources/dist/css/iconfont.css",
					"shared-resources/dist/css/logos_sm_01.css",
					"shared-resources/dist/css/bootstrap.basic.default.full-page-minimal.css",
					"shared-resources/dist/css/bootstrap.basic.default.full-page-minimal.min.css",
					"shared-resources/dist/css/bootstrap.basic.default.full-page-gzip.css"
				],
				dest: "dist/common/css", filter: "isFile"
			}
		]
	},
	sharedFonts: {
		files: [
			{expand: true, flatten: true, src: ["shared-resources/dist/fonts/*"], dest: "dist/common/fonts", filter: "isFile"}
		]
	},
	sharedImages: {
		files: [
			{expand: true, flatten: true, src: ["shared-resources/dist/images/branding/**/*"], 		dest: "dist/common/images/branding", 	filter: "isFile"},
			{expand: true, flatten: true, src: ["shared-resources/dist/images/icons/**/*"], 		dest: "dist/common/images/icons", 		filter: "isFile"},
			{expand: true, flatten: true, src: ["shared-resources/dist/images/spr/**/*"], 			dest: "dist/common/images/spr", 		filter: "isFile"},
			{expand: true, flatten: true, src: ["shared-resources/dist/images/backgrounds/*"], 		dest: "dist/common/images/backgrounds",	filter: "isFile"}
		]
	},
	sharedJs: {
		files: [
			{
				expand: true, flatten: true,
				src: [
					"shared-resources/dist/js/c2c.landing.default.full-page-gzip.js",
					"shared-resources/dist/js/c2c.landing.default.full-page-minimal.js",
					"shared-resources/dist/js/c2c.landing.default.full-page-minimal.min.js",
					"shared-resources/dist/js/bootstrap.basic.default.full-page-gzip.js",
					"shared-resources/dist/js/bootstrap.basic.default.full-page-minimal.js"
				],
				dest: "dist/common/js", filter: "isFile"
			}
		]
	},
	sharedMeta: {
		files: [
			{expand: true, flatten: true, src: ["shared-resources/dist/meta/*"], dest: "dist/", filter: "isFile"}
		]
	}

	/*,
	 shared: {
	 files: [

	 {expand: true, flatten: true, src: ["shared-resources/css/*.css"], dest: "dist/common/css", filter: "isFile"},
	 {expand: true, flatten: true, src: ["shared-resources/images/branding/** /*"], dest: "dist/common/images/branding", filter: "isFile"},
	 {expand: true, flatten: true, src: ["shared-resources/images/icons/** /*"], dest: "dist/common/images/icons", filter: "isFile"},
	 {expand: true, flatten: true, src: ["shared-resources/images/spr/** /*"], dest: "dist/common/images/spr", filter: "isFile"},

	 // libs (these should be concatenated at the shared-lib level)
	 {expand: true, flatten: true, src: ["shared-resources/javascript/*.js"], dest: "dist/common/js", filter: "isFile"}

	 ]
	 }*/
};
