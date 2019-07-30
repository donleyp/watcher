const http = require('http');

const Helpers = require('./helpers');
const config = require('./config');
const App = require('./app');

const userUrl = "http://localhost:3000/users";
const tokenUrl = "http://localhost:3000/tokens";
const checkUrl = "http://localhost:3000/checks";
const addressUrl = "http://localhost:3000/addresses";

const TEST_PORT = 7001

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
        password: "password",
        tosAccepted: true,
    };
    let createUserResponse = await Helpers.request(userUrl, "POST", false, user);
    console.log("user creation status: ", createUserResponse.statusCode, "(ignored)");
    let loginResponse = await Helpers.request(tokenUrl, "POST", false, {phone: user.phone, password: user.password});
    let token = JSON.parse(loginResponse.body).id;
    return token;
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
    return await Helpers.request(addressUrl, "POST", false, testAddress, {token: token});
}

async function testToken(token) {
    const getTokenResponse = await Helpers.request(tokenUrl, "GET", false, {id:token}, {token});
    const tokenData = JSON.parse(getTokenResponse.body);
    if(tokenData.id !== token) {
        throw "the tokens do not match!";
    }
    const putTokenResponse = await Helpers.request(tokenUrl, "PUT", false, {id: token, extend: true}, {token});
    const newTokenData = JSON.parse(putTokenResponse.body);
    if(newTokenData.expires <= tokenData.expires) {
        throw "we expected the new expiration date to be after the old expiration date.";
    }

    await Helpers.request(tokenUrl, "DELETE", false, {id:token}, {token});
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

async function testWatcherApp() {
    // await setupTestServer();
    await setupTestApp();

    const token = await login();

    // await testCheck(token);
    await testAddress(token);

    await testToken(token);

    await shutdown();
}

testWatcherApp().catch(console.log);