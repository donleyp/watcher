const crypto = require('crypto');
const util = require('util');

const config = require('./config');
const { Handler } = require('./handler');
const { Data } = require('./data');

const _data = new Data();

const randomBytes = util.promisify(crypto.randomBytes);

class CheckHandler extends Handler {
    async generateCheckId() {
        const buffer = await randomBytes(8);
        return buffer.toString('hex');
    }

    extractFields(payload) {
        let { id, protocol, url, method, successCodes, timeoutSeconds } = payload;
        id = id && id.length == 16 ? id : false;
        protocol = protocol ? protocol.trim() : false;
        url = url ? url.trim() : false;
        successCodes = successCodes instanceof Array && successCodes.length > 0 ? successCodes : false;
        method = method ? method : false;
        timeoutSeconds = typeof(timeoutSeconds) == 'number' && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? Math.floor(timeoutSeconds) : false;
        return { id, protocol, url, method, successCodes, timeoutSeconds };
    }

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

    async get(data) {
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

    async delete(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        const id = data.query.id && data.query.id.length == 16 ? data.query.id : false;
        if (id) {
            const checkData = await _data.read('checks', id);
            if (data.tokenData.phone === checkData.userPhone) {
                await _data.delete('checks', id);
                const userData = await _data.read('users', data.userData.phone);
                const userChecks = userData.checks instanceof Array ? userData.checks : [];
                const checkIndex = userChecks.indexOf(id);
                if (checkIndex > -1) {
                    userChecks.splice(checkIndex, 1);
                    userData.checks = userChecks;
                    await _data.update('users', userData.phone, userData);
                    return this.clientResponse();
                } else {
                    return this.clientError(500, 'error updating user. The check is deleted.')                    
                }
            } else {
                return this.clientError(403);
            }
        }
        return this.clientError(400, 'missing id parameter.');
    }
}

module.exports = { CheckHandler };