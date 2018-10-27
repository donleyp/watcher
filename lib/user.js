const Data = require('./data');
const exception = require('./exception');

const Exception = exception.Exception;

const _data = new Data();

/**
 * Handles User crud requests.
 * POST (C), GET (R), PUT (U), and DELETE (D)
 */
class UserHandler {
    constructor() {

    }

    getHandler() {
        return this.requestHander.bind(this);
    }

    /**
     * handles the user request.
     * @param {object} data object containing the request parameters and payload
     */
    async requestHander(data) {
        const ACCEPTABLE_METHODS = ['post', 'get', 'put', 'delete'];
        if(ACCEPTABLE_METHODS.indexOf(data.method) == -1) {
            return this.clientError(405, 'method must be one of POST, GET, PUT, DELETE.');
        }

        return await this[data.method](data);
    }

    /**
     * Creates a user.
     * Required fields: firstName, lastName, phone, password, tosAccepted (must be true).
     * @param {object} data object containing the request parameters.
     */
    async post(data) {
        try {
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
        } catch (err) {
            this.handleServerError(err);
        }
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
            try {
                const userData = await _data.read('users', phone);
                // we don't want to send the hashed password back out.
                delete userData.hashedPassword;
                return {
                    response: userData,
                }
            } catch (err) {
                // return a 404 on
                if (err.code == exception.codes.NOT_FOUND) {
                    return this.clientError(404);
                } else {
                    handleServerError(err);
                }
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
            try {
                // at least one has to be set.
                if (firstName || lastName || password) {
                    let userData = await _data.read('users', phone);
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
                    return {};
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

    /**
     * constructs a client error message to send back to the customer.
     * @param {integer} statusCode the http status code.
     * @param {string} message (optional) the error message to send back to the user.
     */
    clientError(statusCode, message) {
        if (message) {
            return {
                statusCode,
                response: {
                    message,
                },
            };
        } else {
            return { statusCode };
        }
    }

    /**
     * Handles unexpected exceptions in a standard way. If the exception is already
     * an instance of Exception we'll simply rethrow it. If not, we'll wrap it up and
     * rethrow it.
     * @param {object} err either an exception or other error object.
     */
    handleServerError(err) {
        if (err instanceof Exception) {
            // rethrow it.
            throw err;
        } else {
            // wrap it.
            throw new Exception(exception.code.UNEXPECTED, 'unexpected error', err);
        }
    }
}

module.exports = UserHandler;