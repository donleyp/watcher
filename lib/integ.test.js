const http = require('http');
const assert = require('assert');

const Helpers = require('./helpers');
const config = require('./config');
const App = require('./app');

const userUrl = "http://localhost:3000/users";
const tokenUrl = "http://localhost:3000/tokens";
const checkUrl = "http://localhost:3000/checks";
const addressUrl = "http://localhost:3000/addresses";

const TEST_PORT = 7001;

let testServer;
let testApp;

async function setupTestApp() {
    testApp = new App();
    testApp.init();
}

async function setupTestServer() {
    testServer = http.createServer((req, res) => {
        res.statusCode = Math.random() >= 0.5 ? 200 : 500; // randomly fail half the time.
        res.end();
    });
    testServer.listen(TEST_PORT, () => {
        console.log("The http server is listening on port", TEST_PORT);
    });
}

async function login() {
    let user = {
        firstName: "Donley",
        lastName: "P'Simer",
        phone: config.twilio.testPhone,
        email: "test@test.com",
        password: "password",
        tosAccepted: true,
    };
    let createUserResponse = await Helpers.request(userUrl, "POST", false, user);
    console.log("user creation status: ", createUserResponse.statusCode, "(ignored)");
    let loginResponse = await Helpers.request(tokenUrl, "POST", false, {phone: user.phone, password: user.password});
    let token = JSON.parse(loginResponse.body).id;
    return token;
}

async function logout(token) {
    const deleteResponse = await Helpers.request(tokenUrl, "DELETE", false, {id:token}, {token});
    assert.equal(deleteResponse.statusCode, 200);
}

async function cleanupChecks(token) {
    const response = await Helpers.request(userUrl, "GET", false, {phone: config.twilio.testPhone}, {token});
    const user = JSON.parse(response.body);
    if (user.checks) {
        const deletes = user.checks.map(async (id) => Helpers.request(checkUrl, "DELETE", false, {id}, {token}));
        return await Promise.all(deletes);
    }
    return [];
}

async function createTestCheck(token) {
    const testCheck = {
        protocol: "http",
        url: "localhost:7001",
        method: "get",
        successCodes: [200],
        timeoutSeconds: 5,
    };
    return await Helpers.request(checkUrl, "POST", false, testCheck, {token: token});
}

async function cleanupAddresses(token) {
    const response = await Helpers.request(userUrl, "GET", false, {phone: config.twilio.testPhone}, {token});
    const user = JSON.parse(response.body);
    if (user.addresses) {
        const deletes = user.addresses.map(async (id) => Helpers.request(addressUrl, "DELETE", false, {id}, {token}));
        return await Promise.all(deletes);
    }
    return [];
}

async function testCreateAddress(token) {
    const testAddress = {
        street1: "123 Main St.",
        city: "Seattle",
        state: "WA",
        zip: "98115",
    };
    const postAddressResponse = await Helpers.request(addressUrl, "POST", false, testAddress, {token: token});
    assert.equal(postAddressResponse.statusCode, 200);
    const addressData = JSON.parse(postAddressResponse.body);
    assert(addressData.id);
    assert(addressData.userPhone);
    assert.equal(addressData.street1, testAddress.street1);
    assert.equal(addressData.street2, false);
}

async function testToken(token) {
    const getTokenResponse = await Helpers.request(tokenUrl, "GET", false, {id:token}, {token});
    assert.equal(getTokenResponse.statusCode, 200);
    const tokenData = JSON.parse(getTokenResponse.body);
    assert.equal(tokenData.id, token);
    const putTokenResponse = await Helpers.request(tokenUrl, "PUT", false, {id: token, extend: true}, {token});
    assert.equal(putTokenResponse.statusCode, 200);
    const newTokenData = JSON.parse(putTokenResponse.body);
    assert(newTokenData.expires > tokenData.expires, "we expected the new expiration date to be after the old expiration date.");
}

async function shutdown() {
    testApp.shutdown();
    // testServer.close(() => {
    //     console.log("Test http server closed.");
    // });
}

async function testCheck(token) {
    await cleanupChecks(token);
    await createTestCheck(token);
    await cleanupChecks(token);
}

async function testAddress(token) {
    await cleanupAddresses(token);
    await testCreateAddress(token);
    await cleanupAddresses(token);
}

async function testUser(token) {
    const getUserResponse = await Helpers.request(userUrl, "GET", false, {phone: config.twilio.testPhone}, {token});
    assert.equal(getUserResponse.statusCode, 200);
    const userData = JSON.parse(getUserResponse.body);
    assert.deepEqual(userData, { 
        firstName: "Donley",
        lastName: "P'Simer",
        phone: config.twilio.testPhone,
        email: "test@test.com",
        tosAccepted: true,
        checks: [],
        addresses: [],
    });
}

async function deleteUser(token) {
    const deleteUserResponse = await Helpers.request(userUrl, "DELETE", false, {phone: config.twilio.testPhone}, {token});
    assert.equal(deleteUserResponse.statusCode, 200);
}

async function testWatcherApp() {
    // await setupTestServer();
    await setupTestApp();
    try {
        const token = await login();
        try {

            await testCheck(token);

            await testAddress(token);
        
            await testUser(token);
        
            await testToken(token);

            await deleteUser(token);

        } finally {
            await logout(token);
        }
    } finally {
        await shutdown();
    }
}

testWatcherApp().catch(console.log);