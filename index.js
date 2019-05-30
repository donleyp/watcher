/**
 * The main entry point for the server-side of the service.
 * Responsibilities include 
 *  - basic runtime environment setup.
 *  - reading/managing configuration.
 *  - gluing major components together.
 */
const Server = require('./lib/server');
const CheckWorker = require('./lib/check_worker.js');
const LogWorker = require('./lib/log_worker');

class App {
    static init() {
        // Create an instance of the server.
        const server = new Server();
        server.init();

        // Worker is a static class, just call init():
        const checkWorker = new CheckWorker();
        checkWorker.loop().catch(console.log);

        // Log Worker
        const logWorker = new LogWorker();
        logWorker.loop().catch(console.log);
    }
}

App.init();

module.export = { App };