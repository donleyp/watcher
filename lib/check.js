const crypto = require('crypto');
const util = require('util');

const config = require('./config');
const { Handler } = require('./handler');
const { Data } = require('./data');

const _data = new Data();

const randomBytes = util.promisify(crypto.randomBytes);

/**
 * handler for the /checks route. CRUD operations for check objects.
 */
class CheckHandler extends Handler {
    /**
     * Generates a 16 character random hexadecimal value for use as a check id.
     * @returns {string} a string containing a 16 character check id.
     */
    async generateCheckId() {
        const buffer = await randomBytes(8);
        return buffer.toString('hex');
    }

    /**
     * Extracts fields from the request payload for use in post and put.
     * @param {object} payload the request payload.
     * @returns {object} an object with each parameter set to a valid value or false.
     */
    extractFields(payload) {
        let { id, protocol, url, method, successCodes, timeoutSeconds } = payload;
        id = id && id.length == 16 ? id : false;
        protocol = protocol && ['http', 'https'].indexOf(protocol) > -1 ? protocol : false;
        url = url && url.length > 0 ? url : false;
        successCodes = successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
        method = method && ['get', 'post', 'put', 'delete'].indexOf(method) > -1 ? method : false;
        timeoutSeconds = typeof(timeoutSeconds) == 'number' && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? Math.floor(timeoutSeconds) : false;
        return { id, protocol, url, method, successCodes, timeoutSeconds };
    }

    /**
     * creates a new check.
     * Required fields: protocol, url, method, successCodes, timeoutSeconds
     * Optional fields: none.
     * @param {object} data the request parameters
     */
    async post(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        let { protocol, url, method, successCodes, timeoutSeconds } = this.extractFields(data.payload);

        if (protocol && url && method && successCodes && timeoutSeconds) {
            const userData = await _data.read('users', data.tokenData.phone);
            const userChecks = userData.checks instanceof Array ? userData.checks : [];
            if (userChecks.length < config.maxChecks) {
                const userPhone = data.userData.phone;
                const id = await this.generateCheckId();
                const checkObject = {
                    id, userPhone, protocol, url, method, successCodes, timeoutSeconds
                };
                await _data.create('checks', id, checkObject);

                userChecks.push(id);
                userData.checks = userChecks;
                await _data.update('users', userData.phone, userData);
                return this.clientResponse(checkObject);
            } else {
                return this.clientError(400, `you already have the maximum number of checks (${userChecks.length} of ${config.maxChecks})`)
            }
        }
        return this.clientError(400, 'missing required field(s).');
    }

    /**
     * retrieves the check given an id.
     * Required parameters: id.
     * @param {object} data the request parameters.
     */
    async get(data) {
        // client must be authenticated.
        if (!data.tokenData) {
            return this.clientError(401);
        }

        const id = data.query.id && data.query.id.length == 16 ? data.query.id : false;
        if (id) {
            try {
                const checkData = await _data.read('checks', id);
                // make sure the user owns the check.
                if (data.tokenData.phone === checkData.userPhone) {
                    return this.clientResponse(checkData);
                } else {
                    return this.clientError(403);
                }
            } catch (err) {
                if (err.code == 'NOT_FOUND') {
                    return this.clientError(404);
                } else {
                    this.handleServerError(err);
                }
            }
        }
        return this.clientError(400, 'missing id parameter.');
    }

    /**
     * updates the check.
     * Required parameters: id
     * Optional parameters: (one must be supplied) protocol, url, method, successCodes, timeoutSeconds
     * @param {object} data the request parameters.
     */
    async put(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        let { id, protocol, url, method, successCodes, timeoutSeconds } = this.extractFields(data.payload);
        if (id && (protocol || url || method || successCodes || timeoutSeconds)) {
            const checkData = await _data.read('checks', id);
            // check that the user owns the check.
            if(data.tokenData.phone === checkData.userPhone) {
                if(protocol) checkData.protocol = protocol;
                if(url) checkData.url = url;
                if(method) checkData.url = url;
                if(successCodes) checkData.successCodes = successCodes;
                if(timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                await _data.update('checks', id, checkData);
                return this.clientResponse(checkData);
            } else {
                return this.clientError(403);
            }
        }
        return this.clientError(400, 'missing required fields.');
    }

    /**
     * Deletes the check.
     * @param {object} data the request parameters.
     */
    async delete(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        const id = data.query.id && data.query.id.length == 16 ? data.query.id : false;
        if (id) {
            const checkData = await _data.read('checks', id);
            if (data.tokenData.phone === checkData.userPhone) {
                await _data.delete('checks', id);
                // that was easy, now delete the check id from the user's checks array:
                const userData = await _data.read('users', data.userData.phone);
                const userChecks = userData.checks instanceof Array ? userData.checks : [];
                const checkIndex = userChecks.indexOf(id);
                if (checkIndex > -1) {
                    userChecks.splice(checkIndex, 1);
                    userData.checks = userChecks;
                    await _data.update('users', userData.phone, userData);
                    return this.clientResponse();
                } else {
                    return this.clientError(500, 'check not found in user. The check is deleted.');
                }
            } else {
                return this.clientError(403);
            }
        }
        return this.clientError(400, 'missing id parameter.');
    }
}

module.exports = { CheckHandler };