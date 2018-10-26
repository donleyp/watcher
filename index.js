/**
 * The main entry point for the server-side of the service.
 * Responsibilities include 
 *  - basic runtime environment setup.
 *  - reading/managing configuration.
 *  - gluing major components together.
 */
const http = require('http');
const https = require('https');
const config = require('./config');
const fs = require('fs');
const Server = require('./server');

// Create an instance of the server.
const server = new Server();

const httpServer = http.createServer(server.getHandler());

httpServer.listen(config.httpPort, () => {
    console.log("The http server is listening on port", config.httpPort);
});

// Loading up SSL certificates. This will fail if the files do not exist.
const httpsServerOptions = {
    'key': fs.readFileSync('./.https/key.pem'),
    'cert': fs.readFileSync('./.https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions, server.getHandler());

httpsServer.listen(config.httpsPort, () => {
    console.log("The https server is listening on port", config.httpsPort);
});
