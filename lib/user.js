const { Data } = require('./data');
const exception = require('./exception');
const { Handler } = require('./handler');
const _data = new Data();

/**
 * Handles User crud requests.
 * POST (C), GET (R), PUT (U), and DELETE (D)
 */
class UserHandler extends Handler {
    /**
     * Creates a user.
     * Required fields: firstName, lastName, phone, password, tosAccepted (must be true).
     * @param {object} data object containing the request parameters.
     */
    async post(data) {
        // gather the stuff in payload into locals for manipulation.
        let { firstName, lastName, phone, password, tosAccepted } = data.payload;
        firstName = firstName && firstName.trim().length > 0 ? firstName.trim() : false;
        lastName = lastName && lastName.trim().length > 0 ? lastName.trim() : false;
        phone = phone && phone.trim().length == 10 ? phone.trim() : false;
        password = password && password.trim().length > 0 ? password.trim() : false;
        tosAccepted = typeof(tosAccepted) == 'boolean' && tosAccepted;

        if (firstName && lastName && phone && password && tosAccepted) {
            const userExists = await _data.exists('users', phone);
            if (!userExists) {
                const hashedPassword = Data.hash(password);
                const userData = {
                    firstName, lastName, phone, hashedPassword, tosAccepted
                }
                await _data.create('users', phone, userData);
                return {};
            } else {
                return this.clientError(400, 'the user already exists.');
            }
        }
        return this.clientError(400, 'missing required fields.');
    }

    /**
     * Gets the user given a phone number in the 'phone' query string parameter:
     * /users?phone=5551234567
     * It will include all data about the user except for their hashed password.
     * @param {object} data object containing the request parameters.
     */
    async get(data) {
        let { phone } = data.query;
        phone = phone && phone.length == 10 ? phone : false;
        if (phone) {
            // check to make sure they're only changing their own record.
            if (!data.tokenData || phone !== data.tokenData.phone) {
                return this.clientError(403, 'not authorized.');
            } else {
                return { response: data.userData };
            }
        }
        return this.clientError(400, 'gotta give me a phone number.');
    }

    /**
     * Updates the user given the parameters. Uses the phone as an identifier (cannot be updated).
     * Can update: firstName, lastName, password
     * One MUST be supplied.
     * tosAccepted, if set will be ignored.
     * @param {object} data the request parameters
     */
    async put(data) {
        let { firstName, lastName, phone, password } = data.payload;
        firstName = firstName && firstName.trim().length > 0 ? firstName.trim() : false;
        lastName = lastName && lastName.trim().length > 0 ? lastName.trim() : false;
        phone = phone && phone.trim().length == 10 ? phone.trim() : false;
        password = password && password.trim().length > 0 ? password.trim() : false;
        if (phone) {
            // check to make sure they're only changing their own record.
            if (!data.tokenData || phone !== data.tokenData.phone) {
                return this.clientError(403, 'not authorized.');
            }
            try {
                // at least one has to be set.
                if (firstName || lastName || password) {
                    // no need to read the user data, we have it in the request data.
                    let userData = data.userData;
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        const hashedPassword = Data.hash(password);
                        userData.hashedPassword = hashedPassword;
                    }
                    await _data.update('users', phone, userData);
                    delete userData.hashedPassword;
                    return { response: userData };
                }
            } catch (err) {
                if (err.code = exception.codes.NOT_FOUND) {
                    return this.clientError(400, 'user not found.');
                } else {
                    handleServerError(err);
                }
            }
        }
        // if it gets here, validation failed.
        return this.clientError(400, 'gotta give me a phone number.');
    }

    /**
     * deletes the user specified in the request.
     * The user is specified via query parameter as in GET:
     * /users?phone=5551234567
     * 
     * @param {object} data the request parameters
     */
    async delete(data) {
        let { phone } = data.query;
        phone = phone && phone.length == 10 ? phone : false;
        if (phone) {
            // check to make sure they're only changing their own record.
            if (!data.tokenData || phone !== data.tokenData.phone) {
                return this.clientError(403, 'not authorized.');
            }

            const userExists = await _data.exists('users', phone);
            if (userExists) {
                await _data.delete('users', phone);
                return {};
            } else {
                return this.clientError(404);
            }
        }
        return this.clientError(400, 'gotta give me a phone number.');
    }
}

module.exports = { UserHandler };