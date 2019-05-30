const { Log } = require('./log');
const Worker = require('./worker');
const _log = new Log();

/**
 * A class that runs background processes and 
 */
class LogWorker extends Worker {
    constructor() {
        super();
        this.timeout = 1000 * 60 * 60 * 24;
    }

    async exec() {
        return _log.list(false)
            .then((logs) => {
                const pall = [];
                logs.forEach((logId) => {
                    pall.push(_log.rotate(logId));
                });
                return Promise.all(pall);
            }).catch(console.log);
    }
}

module.exports = LogWorker;
