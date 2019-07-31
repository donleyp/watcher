const { Data } = require('./data');
const exception = require('./exception');
const { Handler } = require('./handler');
const {
    validateEmail,
    validateNonEmpty,
    validateDigits,
} = require('./validations');

const users = new Data("users");
const checks = new Data("checks");
const addresses = new Data("addresses");

/**
 * Handles User crud requests.
 * POST (C), GET (R), PUT (U), and DELETE (D)
 */
class UserHandler extends Handler {
    extractFields(payload) {
        let { firstName, lastName, phone, email, password, tosAccepted } = payload;
        firstName = validateNonEmpty(firstName);
        lastName = validateNonEmpty(lastName);
        phone = validateDigits(phone, 10);
        email = validateEmail(email);
        password = validateNonEmpty(password);
        tosAccepted = typeof(tosAccepted) == 'boolean' && tosAccepted;
        return { firstName, lastName, phone, email, password, tosAccepted };
    }
    /**
     * Creates a user.
     * Required fields: firstName, lastName, phone, password, tosAccepted (must be true).
     * @param {object} data object containing the request parameters.
     */
    async post(data) {
        // gather the stuff in payload into locals for manipulation.
        let { firstName, lastName, phone, email, password, tosAccepted } = this.extractFields(data.payload);

        if (firstName && lastName && phone && password && tosAccepted) {
            const userExists = await users.exists(phone);
            if (!userExists) {
                const hashedPassword = Data.hash(password);
                const userData = {
                    firstName, lastName, phone, email, hashedPassword, tosAccepted
                }
                await users.create(phone, userData);
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
        let { firstName, lastName, phone, email, password } = this.extractFields(data.payload);
        if (phone) {
            // check to make sure they're only changing their own record.
            if (!data.tokenData || phone !== data.tokenData.phone) {
                return this.clientError(403, 'not authorized.');
            }
            try {
                // at least one has to be set.
                if (firstName || lastName || email || password) {
                    let userData = await users.read(phone);
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (email) {
                        userData.email = email;
                    }
                    if (password) {
                        const hashedPassword = Data.hash(password);
                        userData.hashedPassword = hashedPassword;
                    }
                    await users.update(phone, userData);
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

            let userData = null;
            try {
                userData = await users.read(phone);
            } catch (err) {
                if (err.code == exception.codes.NOT_FOUND) {
                    return this.clientError(404, 'user not found.');
                } else {
                    this.handleServerError(err);
                }
            }

            await users.delete(phone);

            // delete the user's checks.
            if (userData.checks && userData.checks.length > 0) {
                const deleteChecks = userData.checks.map(checkId => checks.delete(checkId).catch(console.log));
                await Promise.all(deleteChecks);
            }
            // delete the user's addresses.
            if (userData.addresses && userData.addresses.length > 0) {
                const deleteAddresses = userData.addresses.map(addressId => addresses.delete(addressId).catch(console.log));
                await Promise.all(deleteAddresses);
            }
            return {};
        }
        return this.clientError(400, 'gotta give me a phone number.');
    }
}

module.exports = { UserHandler };