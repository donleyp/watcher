const http = require('http');
const https = require('https');
const url = require('url');
const string_decoder = require('string_decoder');
const config = require('./config');
const fs = require('fs');

const StringDecoder = string_decoder.StringDecoder;

const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () => {
    console.log("The http server is listening on port", config.httpPort);
});

const httpsServerOptions = {
    'key': fs.readFileSync('./.https/key.pem'),
    'cert': fs.readFileSync('./.https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, () => {
    console.log("The https server is listening on port", config.httpsPort);
});

const unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
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
        const chosenHandler = typeof(router[path]) !== 'undefined' ? router[path] : handlers.notFound;

        const data = {
            path,
            query,
            method,
            headers,
            payload,
        };

        chosenHandler(data, (statusCode, response) => {
            // default status code to 200.
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // response will be normalized to an empty object.
            response = typeof(response) == 'object' ? response : {};

            const responseString = JSON.stringify(response);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(responseString);
            console.log(path, statusCode);
        });
    });
};

const handlers = {
    ping: (data, callback) => {
        console.log(data);
        callback(200);
    },
    notFound: (data, callback) => {
        callback(404);
    },    
};

// Define the request router
const router = {
  ping : handlers.ping
};
