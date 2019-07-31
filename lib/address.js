const crypto = require('crypto');
const util = require('util');

const config = require('./config');
const { Handler } = require('./handler');
const { Data } = require('./data');
const {
    validateNonEmpty,
    validateDigits,
} = require('./validations');

const users = new Data("users");
const addresses = new Data("addresses");

const randomBytes = util.promisify(crypto.randomBytes);

/**
 * handler for the /addresses route. CRUD operations for address objects.
 */
class AddressHandler extends Handler {
    /**
     * Generates a 16 character random hexadecimal value for use as a address id.
     * @returns {string} a string containing a 16 character address id.
     */
    async generateAddressId() {
        const buffer = await randomBytes(8);
        return buffer.toString('hex');
    }

    /**
     * Extracts fields from the request payload for use in post and put.
     * @param {object} payload the request payload.
     * @returns {object} an object with each parameter set to a valid value or false.
     */
    extractFields(payload) {
        let { id, street1, street2, city, state, zip } = payload;
        street1 = validateNonEmpty(street1);
        street2 = validateNonEmpty(street2);
        city = validateNonEmpty(city);
        state = validateNonEmpty(state);
        zip = validateDigits(zip);
        return { id, street1, street2, city, state, zip };
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

        let { street1, street2, city, state, zip } = this.extractFields(data.payload);

        if (street1, city, state, zip) {
            const userData = await users.read(data.tokenData.phone);
            const userAddresses = userData.addresses instanceof Array ? userData.addresses : [];
            if (userAddresses.length < config.maxAddresses) {
                const userPhone = data.userData.phone;
                const id = await this.generateAddressId();
                const addressObject = {
                    id, userPhone, street1, street2, city, state, zip,
                };
                await addresses.create(id, addressObject);

                userAddresses.push(id);
                userData.addresses = userAddresses;
                await users.update(userData.phone, userData);
                return this.clientResponse(addressObject);
            } else {
                return this.clientError(400, `you already have the maximum number of addresses (${userAddresses.length} of ${config.maxAddresses})`);
            }
        }
        return this.clientError(400, 'missing required field(s).');
    }

    /**
     * retrieves the address given an id.
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
                const addressData = await addresses.read(id);
                // make sure the user owns the address.
                if (data.tokenData.phone === addressData.userPhone) {
                    return this.clientResponse(addressData);
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
        } else {
            const addressIdList = await addresses.list();
            const filteredAddressIdList = addressIdList.filter(async (id, idx, array) => {
                const addressData = await addresses.read(id);
                return data.tokenData.phone === addressData.userPhone;
            });
            return this.clientResponse(filteredAddressIdList);
        }
    }

    /**
     * updates the address.
     * Required parameters: id
     * Optional parameters: (one must be supplied) protocol, url, method, successCodes, timeoutSeconds
     * @param {object} data the request parameters.
     */
    async put(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        let { id, street1, street2, city, state, zip } = this.extractFields(data.payload);
        if (id && (street1 || street2 || city || state || zip)) {
            const addressData = await addresses.read(id);
            // check that the user owns the address.
            if(data.tokenData.phone === addressData.userPhone) {
                if(street1) addressData.street1 = street1;
                if(street2) addressData.street2 = street2;
                if(city) addressData.city = city;
                if(state) addressData.state = state;
                if(zip) addressData.zip = zip;

                await addresses.update(id, addressData);
                return this.clientResponse(addressData);
            } else {
                return this.clientError(403);
            }
        }
        return this.clientError(400, 'missing required fields.');
    }

    /**
     * Deletes the address.
     * @param {object} data the request parameters.
     */
    async delete(data) {
        if (!data.tokenData) {
            return this.clientError(401);
        }

        const id = data.query.id && data.query.id.length == 16 ? data.query.id : false;
        if (id) {
            const addressData = await addresses.read(id);
            if (data.tokenData.phone === addressData.userPhone) {
                await addresses.delete(id);
                // that was easy, now delete the address id from the user's addresses array:
                const userData = await users.read(data.userData.phone);
                const userAddresses = userData.addresses instanceof Array ? userData.addresses : [];
                const addressIndex = userAddresses.indexOf(id);
                if (addressIndex > -1) {
                    userAddresses.splice(addressIndex, 1);
                    userData.addresses = userAddresses;
                    await users.update(userData.phone, userData);
                    return this.clientResponse();
                } else {
                    return this.clientError(500, 'address not found in user. The address is deleted.');
                }
            } else {
                return this.clientError(403);
            }
        }
        return this.clientError(400, 'missing id parameter.');
    }
}

module.exports = { AddressHandler };