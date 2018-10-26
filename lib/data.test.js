const assert = require('assert');
const Data = require('./data');

const data = new Data();

const testCreateData = {foo:'bar'};
const testUpdateData = {foo:'snafu'};

async function cleanup() {
    await data.delete('test', 'testfile').catch((err) => {});
}

async function testData() {
    await cleanup();
    assert.ok(await data.create('test', 'testfile', testCreateData), "create failed.");
    assert.deepEqual(await data.read('test', 'testfile'), testCreateData);
    assert.ok(await data.update('test', 'testfile', testUpdateData), "update failed.");
    assert.deepEqual(await data.read('test', 'testfile'), testUpdateData);
    assert.ok(await data.delete('test', 'testfile'));
    return "all tests passed."
}

testData().then(console.log).catch(console.log);
