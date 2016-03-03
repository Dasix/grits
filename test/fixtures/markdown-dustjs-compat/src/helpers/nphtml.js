module.exports = function nphtml( chunk, context, bodies, params ) {
	var text = params.text;
	chunk.write("<span>" + text + "</span>");
	return chunk;
};
