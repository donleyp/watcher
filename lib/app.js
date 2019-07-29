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
        this.server.init();
        this.checkWorker.loop().catch(console.log);
        this.logWorker.loop().catch(console.log);
    }

    shutdown() {
        this.server.shutdown();
        this.checkWorker.shutdown();
        this.logWorker.shutdown();
    }
}

module.exports = App;