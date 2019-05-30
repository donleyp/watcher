const url = require('url');
const string_decoder = require('string_decoder');
const http = require('http');
const https = require('https');
const fs = require('fs');
const StringDecoder = string_decoder.StringDecoder;

const config = require('./config');
const { UserHandler } = require('./user');
const { TokenHandler } = require('./token');
const { CheckHandler } = require('./check');
const helpers = require('./helpers');
const exception = require('./exception');
const {Exception, codes} = exception;
const { Data } = require('./data');

const _data = new Data();
const users = new UserHandler();
const tokens = new TokenHandler();
const checks = new CheckHandler();

/**
 * Implements a general purpose routing request/response server.
 * Expects http(s) semantics in the request and response objects
 * passed to 'requestHandler()'.
 */
class Server {
    constructor() {
        this.handlers = {
            async ping(data) {
                console.log('pong.');
                return {
                    responseCode: 200,
                };
            },
            async hello(data) {
                return {
                    responseCode: 200,
                    response: {
                        message: "welcome to the api!",
                    },
                };
            },
            async error(data) {
                throw new Exception(500, "this sucks!");
            },
            async notFound(data) {
                return {
                    statusCode: 404,
                    response: {
                        message: 'not found.',
                    },
                };
            },    
        };
        
        // Define the request router
        this.router = {
          ping: this.handlers.ping,
          hello: this.handlers.hello,
          error: this.handlers.error,
          users: users.getHandler(),
          tokens: tokens.getHandler(),
          checks: checks.getHandler(),
        };
    }

    /**
     * @returns {Function} a bound requestHandler for passing to http(s).createServer().
     */
    getHandler() {
        return this.requestHandler.bind(this);
    }

    init() {
        this.httpServer = http.createServer(this.getHandler());

        this.httpServer.listen(config.httpPort, () => {
            console.log("The http server is listening on port", config.httpPort);
        });
        
        // Loading up SSL certificates. This will fail if the files do not exist.
        const httpsServerOptions = {
            'key': fs.readFileSync('./.https/key.pem'),
            'cert': fs.readFileSync('./.https/cert.pem'),
        };
        this.httpsServer = https.createServer(httpsServerOptions, this.getHandler());
        
        this.httpsServer.listen(config.httpsPort, () => {
            console.log("The https server is listening on port", config.httpsPort);
        });
    }

    /**
     * decorates the request data object with information about the token and
     * the user to which it applies for use by the request handlers.
     * @param {object} data contains the request parameters.
     * @returns the data object possibly decorated with 'userData' and 'tokenData' properties 
     */
    async tokenHandler(data) {
        if(data.headers.token) {
            try {
                const tokenData = await _data.read('tokens', data.headers.token);
                if (tokenData.expires >= Date.now()) {
                    const userData = await _data.read('users', tokenData.phone);
                    data.tokenData = tokenData;
                    // remove the hashed password so it doesn't get logged anywhere.
                    delete userData.hashedPassword;
                    data.userData = userData;
                } else {
                    console.log('expired token encountered.');
                }
            } catch (err) {
                console.log('invalid token encountered.', err);
            }
        }
        return data;
    }

    /**
     * handles requests to this server.
     * @param {http.IncomingMessage} req the request from the user. 
     * @param {http.ServerResponse} res the response to the user.
     */
    requestHandler(req, res) {
        // parse out all the individual parts of a request into bits
        // to be passed down to the handler.
        const parsedUrl = url.parse(req.url, true);
        // This bit strips the '/' from the front and back of the path.
        const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
        // since we passed 'true' to parse above this will be an object.
        const query = parsedUrl.query;
        const method = req.method.toLowerCase();
        const headers = req.headers;
        const decoder = new StringDecoder('utf-8');
        let payloadString = '';

        req.on('data', (data) => {
            payloadString += decoder.write(data);
        });
        req.on('end', () => {
            payloadString += decoder.end();
            const payload = helpers.parseJson(payloadString);
            // default to the notFound handler.
            const routeHandler = this.router[path] ? this.router[path] : this.handlers.notFound;

            const data = {
                path,
                query,
                method,
                headers,
                payload,
            };

            this.tokenHandler(data).then((data) => routeHandler(data)).then((handlerResponse) => {
                console.log('response:', handlerResponse);
                let {statusCode, response} = handlerResponse;
                // default status code to 200.
                statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    
                // response will be normalized to an empty object.
                response = typeof(response) == 'object' ? response : {};
    
                const responseString = JSON.stringify(response);
    
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(statusCode);
                res.end(responseString);
                console.log(method, path, statusCode);
            }).catch((err) => {
                console.log("error in route handler or post processing.", err);
                let { statusCode, message } = err;
                res.writeHead(statusCode || 500);
                res.end(message || '');
            });
        });
    }
}

module.exports = Server;