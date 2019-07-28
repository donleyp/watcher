
const _url = require('url');
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const config = require('./config');

class Helpers {
    static parseJson(jsonStr) {
        try {
            if (jsonStr) {
                jsonStr = jsonStr.trim();
                if (jsonStr.length > 0) {
                    return JSON.parse(jsonStr);
                }
            }
        } catch (err) {
            console.log('error parsing json:', err);
        }

        return {};
    }

    /**
     * Asynchronously sends an http(s) request to a remote server.
     * @param {string|object} url|options the url of the request or an options object to construct the request.
     * @param {string} method 'GET', 'POST', 'PUT', or 'DELETE'
     * @param {string} auth the authentication string.
     * @param {object} payload an object containing the body of the request (only for post and put)
     * @param {object} headers an object containing the headers for the request.
     */
    static async request(url, method, auth, payload, headers) {
        let options = {};
        if(typeof(url) == 'object') {
            // copy the options directly from the first parameter
            options = Object.assign({}, url);
        } else if(typeof(url) == 'string') {
            // parse the url and assign the resultant object as the request options.
            // elements from the url can be overridden by subsequent parameters.
            options = Object.assign({}, _url.parse(url));
        } else {
            options = false;
        }

        // select the library depending on the protocol of the URL.
        let lib = http;
        if (options && options.protocol.startsWith('https')) {
            lib = https;
        }

        method = typeof(method) == 'string' && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) > -1 ? method : false;
        auth = typeof(auth) == 'string' && auth.length > 0 ? auth : false;
        payload = payload ? payload : false;
        headers = typeof(headers) == 'object' ? headers : false;

        // url can be a string or an object.
        if(method) options.method = method;
        if(auth) options.auth = auth;
        if(headers) options.headers = headers;

        if (method === 'GET' && payload) {
            options.query = Object.assign(options.query || {}, payload);
            let params = new _url.URLSearchParams(options.query);
            options.path = options.pathname + "?" + params.toString();
        }

        // return new pending promise
        return new Promise((resolve, reject) => {
            if (!options) {
                reject(new Error('url or options was not specified.'));
                console.log('I wonder if this ever runs.');
            }
            console.log(`making ${options.method} request to ${_url.format(options)}`);
            const request = lib.request(options, (response) => {
                // temporary data holder
                const body = [];
                // on every content chunk, push it to the data array
                response.on('data', (chunk) => body.push(chunk));
                // we are done, resolve promise with those joined chunks
                response.on('end', () => {
                    const bodyComplete = body.join('');
                    console.log('response complete:', response.statusCode, response.statusMessage);
                    resolve({
                        statusCode: response.statusCode,
                        body: bodyComplete,
                    });
                });
            });
            // handle connection errors of the request
            request.on('error', (err) => reject(err));
            // handle timeout errors:
            request.on('timeout', (err) => reject(err));
            // send the request with the payload if present.
            if (payload && method !== 'GET') {
                console.log('sending', payload);
                request.end(typeof(payload) === 'object' ? JSON.stringify(payload) : payload);
            } else {
                request.end();
            }
        });
    }

    static async sendSms(phone, msg) {
        phone = typeof(phone) == 'string' && phone.trim().length >= 10 ? phone.trim() : false;
        msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
        
        console.log(phone, msg);
        if(phone && msg) {
            const payload = {
                'From': config.twilio.fromPhone,
                'To': phone,
                'Body': msg, 
            };
            const stringPayload = querystring.stringify(payload);
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`;
            const auth = `${config.twilio.accountSid}:${config.twilio.authToken}`;
            const headers = {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),                
            };
            return this.request(twilioUrl, 'POST', auth, stringPayload, headers);
        }
        throw 'Invalid arguments.';
    }
}

module.exports = Helpers;