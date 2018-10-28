/*
 * Create and export configuration.
 */

const environments = {
    staging: {
        httpPort: 3000,
        httpsPort: 3001,
        envName: 'staging',        
        maxChecks : 5,
    },
    production: {
        httpPort: 5000,
        httpsPort: 5001,
        envName: 'production',        
        maxChecks : 5,
    },
};

// determine environment passed in NODE_ENV environment variable, default to empty string.
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// get the environment from the above object. Default to staging if not found.
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;
