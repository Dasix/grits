module.exports = function yell( chunk, context, bodies, params ) {

	return chunk.tap(function(data) {
		return data + " and " + params.planet;
	}).render(bodies.block, context).untap();

};
