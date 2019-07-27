const assert = require('assert');
const { Data } = require('./data');

const dataTest1 = new Data("test1");
const dataTest2 = new Data("test2");

const testCreateData = {foo:'bar'};
const testUpdateData = {foo:'snafu'};

async function cleanup() {
    await dataTest1.delete('testfile').catch((err) => {});
    await dataTest2.delete('testfile').catch((err) => {});
}

async function testData() {
    await cleanup();
    assert.ok(await dataTest1.create('testfile', testCreateData), "create failed.");
    assert.equal(await dataTest1.exists('testfile'), true, "the file we created doesn't exist.");
    assert.notEqual(await dataTest2.exists('testfile'), true, "data file never created exists?!?");
    assert.deepEqual(await dataTest1.read('testfile'), testCreateData);
    assert.ok(await dataTest1.update('testfile', testUpdateData), "update failed.");
    assert.deepEqual(await dataTest1.read('testfile'), testUpdateData);
    assert.ok(await dataTest1.delete('testfile'));
    return "all tests passed."
}

testData().then(console.log).catch(console.log);
