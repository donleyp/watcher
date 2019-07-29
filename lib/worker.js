/**
 * A class that runs background processes 
 */
class Worker {
    constructor() {
        this._timeoutMillis = 1000 * 60;
    }

    get timeout() {
        return this._timeoutMillis;
    }

    set timeout(t) {
        this._timeoutMillis = t;
    }

    async loop() {
        return this.exec()
            .then(() => {
                this._timeout = setTimeout(this.loop.bind(this), this.timeout);
            });
    }

    shutdown() {
        if(this._timeout) {
            clearTimeout(this._timeout);
            console.log(`${this.constructor.name} is shutting down.`);
        }
    }

    async exec() {
        console.log('exec() not implemented!');
    }
}

module.exports = Worker;