const Helpers = require('./helpers');
const config = require('./config');

const userUrl = "http://localhost:3000/users";
const tokenUrl = "http://localhost:3000/tokens";
const checkUrl = "http://localhost:3000/checks";

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

async function createTestCheck(token) {
    let testCheck = {
        protocol: "http",
        url: "www.psimer.net",
        method: "get",
        successCodes: [200],
        timeoutSeconds: 5,
    };
    return Helpers.request(checkUrl, "POST", false, testCheck, {token: token});
}

login().then(createTestCheck).then(console.log).catch(console.log);