module.exports = function hhtml( chunk, context, bodies, params ) {

	return chunk.tap(function(data) {
		return "<span>" + data.toUpperCase() + "</span>";
	}).render(bodies.block, context).untap();

};
