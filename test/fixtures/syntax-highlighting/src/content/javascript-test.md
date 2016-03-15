```javascript
/**
 * Utility function for creating a random, 5 character, id.
 * from: http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
 *
 * @access private
 * @returns {string}
 */
function makeid() {

    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length) );
    }

    return text;

}
```
