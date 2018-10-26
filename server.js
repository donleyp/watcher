const url = require('url');
const string_decoder = require('string_decoder');
const StringDecoder = string_decoder.StringDecoder;

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
                throw {
                    message: "this sucks!",
                }
            },
            async notFound(data) {
                throw {
                    statusCode: 404,
                };
            },    
        };
        
        // Define the request router
        this.router = {
          ping: this.handlers.ping,
          hello: this.handlers.hello,
          error: this.handlers.error,
        };
    }

    /**
     * @returns {Function} a bound requestHandler for passing to http(s).createServer().
     */
    getHandler() {
        return this.requestHandler.bind(this);
    }

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
        let payload = '';
        req.on('data', (data) => {
            payload += decoder.write(data);
        });
        req.on('end', () => {
            payload += decoder.end();
            // default to the notFound handler.
            const routeHandler = this.router[path] ? this.router[path] : this.handlers.notFound;
    
            const data = {
                path,
                query,
                method,
                headers,
                payload,
            };
    
            routeHandler(data).then((handlerResponse) => {
                let {statusCode, response} = handlerResponse;
                // default status code to 200.
                statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    
                // response will be normalized to an empty object.
                response = typeof(response) == 'object' ? response : {};
    
                const responseString = JSON.stringify(response);s
    
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(statusCode);
                res.end(responseString);
                console.log(path, statusCode);
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