/**
 * A simple test filter that makes the string upper-case.
 *
 * @param value
 * @returns {*}
 */
module.exports = function(value) {
	return ( value + "" ).toUpperCase();
};
