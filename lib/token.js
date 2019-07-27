const util = require('util');
const crypto = require('crypto');

const { Data } = require('./data');
const exception = require('./exception');
const { Handler } = require('./handler');

const users = new Data("users");
const tokens = new Data("tokens");

const randomBytes = util.promisify(crypto.randomBytes);

// The size of our tokens.
const TOKEN_SIZE = 16;

/**
 * Handles Token crud requests.
 * POST (C), GET (R), PUT (U), and DELETE (D)
 */
class TokenHandler extends Handler {
    async generateTokenId() {
        const buffer = await randomBytes(TOKEN_SIZE);
        return buffer.toString('hex');
    }

    /**
     * Creates a token given a phone number and password.
     * Required fields: phone, password.
     * @param {object} data object containing the request parameters.
     */
    async post(data) {
        // gather the stuff in payload into locals for manipulation.
        let { phone, password } = data.payload;
        phone = phone && phone.trim().length == 10 ? phone.trim() : false;
        password = password && password.trim().length > 0 ? password.trim() : false;
        if (phone && password) {
            try {
                console.log("login attempt: ", data);
                const userData = await users.read(phone);
                const hashedPassword = Data.hash(password);
                if (hashedPassword === userData.hashedPassword) {
                    const id = await this.generateTokenId();
                    // the token will expire in one hour.
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenData = { id, phone, expires };
                    await tokens.create(id, tokenData);
                    return { response: tokenData };
                } else {
                    return this.clientError(401, 'invalid credentials.');
                }
            } catch (err) {
                if (err.code == exception.codes.NOT_FOUND) {
                    return this.clientError(401, 'invalid credentials.');
                } else {
                    this.handleServerError(err);
                }
            }
        }
        return this.clientError(400, 'missing credentials.');
    }

    /**
     * Gets the token given an id.
     * /tokens?id=1fa1a65826080a2411387b61be3a5c7b
     * It will include all data about the token. 
     * Must be authentiated with the token.
     * @param {object} data object containing the request parameters.
     */
    async get(data) {
        let { id } = data.query;
        id = id && id.length == 32 ? id : false;
        if (id) {
            if (!data.tokenData || id !== data.tokenData.id) {
                return this.clientError(403, 'not authorized.');
            }
            return { response: data.tokenData };
        }
        return this.clientError(400, 'gotta give me an id.');
    }

    /**
     * Extends the expiration of the given token if the token hasn't already expired.
     * @param {object} data the request parameters
     */
    async put(data) {
        let { id, extend } = data.payload;
        id = id && id.length == 32 ? id : false;
        if (id && extend) {
            if (!data.tokenData || id !== data.tokenData.id) {
                return this.clientError(403, 'not authorized.');
            }
            try {
                let tokenData = data.tokenData;
                // extend the expiration to one hour from now: 
                tokenData.expires = Date.now() + 1000 * 60 * 60;
                // we don't want to store the 'isValidForThisRequest' prop.
                await tokens.update(id, tokenData);
                return { response: tokenData };
            } catch (err) {
                if (err.code = exception.codes.NOT_FOUND) {
                    return this.clientError(400, 'token not found.');
                } else {
                    handleServerError(err);
                }
            }
        }
        // if it gets here, validation failed.
        return this.clientError(400, 'required fields missing.');
    }

    /**
     * deletes the token specified in the request.
     * The token is specified via query parameter as in GET:
     * /tokens?id=1fa1a65826080a2411387b61be3a5c7b
     * 
     * @param {object} data the request parameters
     */
    async delete(data) {
        let { id } = data.query;
        id = id && id.length == 32 ? id : false;
        if (id) {
            if (!data.tokenData || id !== data.tokenData.id) {
                return this.clientError(403, 'not authorized.');
            }

            await tokens.delete(id);
            return {};
        }
        return this.clientError(400, 'gotta give me a token id.');
    }
}

module.exports = { TokenHandler };