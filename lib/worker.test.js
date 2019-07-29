const Worker = require('./worker');
const util = require('util');

const setTimeoutPromise = util.promisify(setTimeout);

class TestWorker extends Worker {
    constructor() {
        super();
        this.timeout = 1000;
        this.counter = 0;
    }

    async exec() {
        this.counter++;
    }
}

async function testWorker() {
    const testWorker = new TestWorker();
    await Promise.all([
        testWorker.loop(),
        setTimeoutPromise(1100).then(() => testWorker.shutdown())
    ]);
    
    if(testWorker.counter !== 2) {
        console.log("test failed. We expected the counter to == 2.");
    }
}

testWorker();
