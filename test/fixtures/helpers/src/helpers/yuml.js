var _ = require("lodash");

module.exports = function yell( chunk, context, bodies, params ) {

	return chunk.tap(function(data) {
		return "<img src=\"" + _.trim( data ) + "\">";
	}).render(bodies.block, context).untap();

};
