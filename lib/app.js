/**
 * The main entry point for the server-side of the service.
 * Responsibilities include 
 *  - basic runtime environment setup.
 *  - reading/managing configuration.
 *  - gluing major components together.
 */
const Server = require('./server');
const CheckWorker = require('./check_worker');
const LogWorker = require('./log_worker');

class App {
    constructor() {
        this.server = new Server();
        this.checkWorker = new CheckWorker();
        this.logWorker = new LogWorker();
    }

    init() {
        // Create an instance of the server.
        this.server.init();

        // Worker is a static class, just call init():
        this.checkWorker.loop().catch(console.log);

        // Log Worker
        this.logWorker.loop().catch(console.log);
    }
}

module.exports = App;