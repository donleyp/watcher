const exception = require('./exception');

const Exception = exception.Exception;

class Handler {
    constructor() {

    }

    getHandler() {
        return this.requestHandler.bind(this);
    }

    clientResponse(responseOrCode, response) {
        if(responseOrCode && response) {
            return {
                statusCode: responseOrCode,
                response,
            };
        } else if (responseOrCode) {
            return {
                response: responseOrCode,
            }
        } else {
            return {}
        }
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
            throw new Exception(exception.codes.UNEXPECTED, 'unexpected error', err);
        }
    }

    /**
     * handles the user request.
     * @param {object} data object containing the request parameters and payload
     */
    async requestHandler(data) {
        console.log('request:', data);
    
        if(typeof(this[data.method]) != 'function') {
            return this.clientError(405, 'method not supported.');
        }
        try {
            return await this[data.method](data);
        } catch (err) {
            this.handleServerError(err);
        }
    }
}

module.exports =  { Handler };