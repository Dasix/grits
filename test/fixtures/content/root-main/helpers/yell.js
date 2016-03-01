module.exports = function yell( chunk, context, bodies, params ) {

	return chunk.tap(function(data) {
		return data.toUpperCase();
	}).render(bodies.block, context).untap();

};
