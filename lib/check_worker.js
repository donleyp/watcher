const url = require('url');

const { Exception, codes } = require('./exception');
const { Data } = require('./data');
const { Log } = require('./log');
const helpers = require('./helpers');
const Worker = require('./worker');

const checks = new Data("checks");
const _log = new Log();

/**
 * A class that runs background processes and 
 */
class CheckWorker extends Worker {
    constructor() {
        super();
    }

    async exec() {
        return this.gatherAllChecks()
            .then((checks) => {
                checks.forEach((check) => {
                    check.then(this.validateCheck.bind(this))
                        .then(this.performCheck.bind(this))
                        .then(this.proccessCheckOutcome.bind(this))
                        .then(this.alertToStatusChange.bind(this))
                        .catch(console.log);
                });
            }).catch(console.log);
    }

    async gatherAllChecks() {
        const promises = [];
        const checkIdList = await checks.list();
        checkIdList.forEach((checkId) => {
            const check = checks.read(checkId)
                .catch((err) => {
                    console.log(err);
                });
            promises.push(check);
        })
        return promises;
    }

    async validateCheck(check) {
        console.log(`validateCheck(${check.id})`);
        check = typeof(check) == 'object' && check !== null ? check : {};
        check.id = typeof(check.id) == 'string' && check.id.trim().length == 16 ? check.id.trim() : false;
        check.userPhone = typeof(check.userPhone) == 'string' && check.userPhone.trim().length == 10 ? check.userPhone.trim() : false;
        check.protocol = typeof(check.protocol) == 'string' && ['http','https'].indexOf(check.protocol) > -1 ? check.protocol : false;
        check.url = typeof(check.url) == 'string' && check.url.trim().length > 0 ? check.url.trim() : false;
        check.method = typeof(check.method) == 'string' &&  ['post','get','put','delete'].indexOf(check.method) > -1 ? check.method : false;
        check.successCodes = typeof(check.successCodes) == 'object' && check.successCodes instanceof Array && check.successCodes.length > 0 ? check.successCodes : false;
        check.timeoutSeconds = typeof(check.timeoutSeconds) == 'number' && check.timeoutSeconds >= 1 && check.timeoutSeconds <= 5 ? check.timeoutSeconds : false;
        // Set the keys that may not be set (if the CheckWorkers have never seen this check before)
        check.state = typeof(check.state) == 'string' && ['up','down'].indexOf(check.state) > -1 ? check.state : 'down';
        check.lastChecked = typeof(check.lastChecked) == 'number' && check.lastChecked > 0 ? check.lastChecked : false;
      
        // If all validations pass, pass the data along to the next step in the process
        if( check.id &&
            check.userPhone &&
            check.protocol &&
            check.url &&
            check.method &&
            check.successCodes &&
            check.timeoutSeconds) {
            return check;
        } else {
            throw new Exception(codes.INVALID_CHECK, `Encountered an invalid check: ${check.id}`);
        }
    }

    async performCheck(check) {
        console.log(`performCheck(${check.id}).`);
        const checkOutcome = {
            error: false,
            statusCode: false,
            check: check,
        };

        const options = url.parse(`${check.protocol}://${check.url}`);
        options.timeout = Math.floor(check.timeoutSeconds * 1000);
        options.method = check.method.toUpperCase();

        return helpers.request(options).then(response => {
            checkOutcome.statusCode = response.statusCode;
            return checkOutcome;
        }).catch(err => {
            console.log(err);
            checkOutcome.error = { error: true, value: err};
            return checkOutcome;
        });
    }

    async proccessCheckOutcome(checkOutcome) {
        const {check} = checkOutcome;
        console.log(`proccessCheckOutcome(${check.id}).`);

        checkOutcome.state = !checkOutcome.error && checkOutcome.statusCode && check.successCodes.indexOf(checkOutcome.statusCode) > -1 ? 'up' : 'down';
        // decide if we'll be sending an alert here because we'll overwrite the state in a sec.
        checkOutcome.alertWarranted = check.lastChecked && check.state !== checkOutcome.state ? true : false;
        checkOutcome.checkTime = Date.now();
        await _log.append(check.id, JSON.stringify(checkOutcome));

        // set the new state.
        check.state = checkOutcome.state;
        check.lastChecked = checkOutcome.checkTime;
        await checks.update(check.id, check);

        return checkOutcome;
    }

    async alertToStatusChange(checkOutcome) {
        console.log(`alertToStatusChange(${checkOutcome.check.id}, ${checkOutcome.alertWarranted}).`);
        if (checkOutcome.alertWarranted) {
            const {check} = checkOutcome;
            const msg = `Alert: your check for ${check.method.toUpperCase()} ${check.protocol}://${check.url} is currently ${check.state}`;
            return helpers.sendSms(check.userPhone, msg)
                .then(() => console.log('Success: user alerted to status change:', check.userPhone, msg))
                .catch((err) => console.log('Error: failed to send alert to user:', err));
    
        }
    }
}

module.exports = CheckWorker;
