const http = require('http');

const Helpers = require('./helpers');
const config = require('./config');

const userUrl = "http://localhost:3000/users";
const tokenUrl = "http://localhost:3000/tokens";
const checkUrl = "http://localhost:3000/checks";

const TEST_PORT = 7001

let testServer;

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
        await Promise.all(deletes);
    }
    return token;
}

async function createTestCheck(token) {
    let testCheck = {
        protocol: "http",
        url: "localhost:7001",
        method: "get",
        successCodes: [200],
        timeoutSeconds: 5,
    };
    return await Helpers.request(checkUrl, "POST", false, testCheck, {token: token});
}

setupTestServer()
    .then(login)
    .then(cleanupChecks)
    .then(createTestCheck)
    .then(console.log)
    .catch(console.log);