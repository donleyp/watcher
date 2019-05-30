const helpers = require('./helpers');

helpers.sendSms('5005550010', 'this is a test.')
    // .then(JSON.parse)
    // .then(data => JSON.stringify(data, null, 2))
    .then(console.log)
    .catch(console.log);
