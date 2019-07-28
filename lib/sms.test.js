const helpers = require('./helpers');
const config = require('./config');

helpers.sendSms(config.twilio.testPhone, 'this is a test.')
    // .then(JSON.parse)
    // .then(data => JSON.stringify(data, null, 2))
    .then(console.log)
    .catch(console.log);
