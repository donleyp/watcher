/**
 * A class that runs background processes 
 */
class Worker {
    constructor() {
        this._timeout = 1000 * 60;
        this._shutdown = false;
    }

    get timeout() {
        return this._timeout;
    }

    set timeout(t) {
        this._timeout = t;
    }

    async loop() {
        if(this._shutdown)
            return;
            
        return this.exec()
            .then(new Promise((resolve) => setTimeout(resolve, this.timeout))
            .then(this.loop.bind(this)));
    }

    shutdown() {
        this._shutdown = true;
    }

    async exec() {
        console.log('exec() not implemented!');
    }
}

module.exports = Worker;