module.exports = function(chunk, context, bodies) {
	var username = context.get("username"),
		password = context.get("password"),
		status = authorizeUser(username, password);

	switch(status.message) {
		case "OK":
			return true;
		case "InvalidUserName":
			return chunk.render(bodies.usernameError, context);
		case "InvalidPassword":
			return chunk.render(bodies.passwordError,
				context.push(status.loginAttemptsRemaining));
	}

	return false;
};

function authorizeUser(username, password) {

	/* fake API - change the message and change the output! */
	return { message: "InvalidPassword",
		loginAttemptsRemaining: 42 };

}
