module.exports = {
    MILLIS_TWO_MINUTES: 2 * 60 * 1000,
    MILLIS_THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
    SITE_SECRET: 'GuinnessIsGood4U',
    MIN_PASSWORD_LENGTH: 6,
    SESSION_KEY: 'connect.sid',
    MONGO_DBNAME: 'projectx',
    CRYPTO_DEFAULTS: {
        randomDataLength: 256,
        hashIterations: 10000,
        hashKeyLength: 256
    },
    LOGINROUTE : '/login'
};

