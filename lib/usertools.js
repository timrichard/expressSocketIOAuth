var crypto = require('crypto');
var tools = require('./tools.js');
var constants = require('./constants.js');

var User = require('../models/user.js');

/**
 * Helper for Passport Local to allow users to be deserialized from sessions.
 *
 * @param id String containing ID of User document.
 * @param callback To be invoked with nullable error object or User document.
 * user digest. Keep minimum details in memory.
 */
exports.findById = function (id, callback) {
    console.log('findById : Enter');
    console.log('findById : id was ' + id);

    if (id) {
        var objectID = tools.mongoStringIDtoObjectID(id);

        User.findById(objectID, function (err, userDoc) {
            if (err) {
                callback(new Error('Cannot find user by ID'));
            } else {
                if (userDoc) {
                    callback(null, exports.userDocDigest(userDoc.toObject()));
                } else {
                    callback(new Error('User doc is undefined'));
                }
            }
        });
    }
};

/**
 * Used by Passport Local setup routine to resolve username into full user doc from DB.
 *
 * @param username  String containing email address, returned from the MongooseSessionStore.
 * @param callback  To be invoked with a full User document supplied.
 */

exports.findByUsername = function (username, callback) {
    // Called by Passport LocalStrategy
    console.log('findByUsername : Enter');
    console.log('findByUsername : username was ' + username);

    User.findOne({"email": username, "status": "verified"},
        function (err, userDoc) {
            if (err) {
                callback(new Error('User.find error condition'));
            } else {
                if (userDoc) {
                    callback(null, userDoc.toObject());
                } else {
                    callback(new Error('userDoc not present'));
                }
            }
        });
};

/**
 * Development helper. Scan the main User collection for users.
 * Pre-populate if empty.
 */
exports.prepopCollection = function (callback) {
    // Determine whether the User collection is already populated
    var testUsers = 2;
    var addresses = [];

    function userCreated(emailAddress) {
        addresses.push(emailAddress);
        if (addresses.length === testUsers) {
            if (callback) {
                callback(addresses);
            }
        }
    }

    User.count({}, function (err, count) {
        if (err) {
            throw new Error('User.count()');
        }
        if (count === 0) {
            // Collection is empty. Pre-populate
            exports.createUser('User One', 'userone@gmail.com', 'userone', function (err, user) {
                exports.forceVerificationStatus(user.email, function (err, user) {
                    if (!err) {
                        userCreated(user.email);
                    }
                });
            });
            exports.createUser('User Two', 'usertwo@gmail.com', 'usertwo', function (err, user) {
                exports.forceVerificationStatus(user.email, function (err, user) {
                    if (!err) {
                        userCreated(user.email);
                    }
                });
            });
        } else {
            console.log('Using existing user set');
        }
    });
};

/**
 * Takes the full User document, and returns the bare minimum required as a digest.
 * This is so that we don't waste memory on details that won't be necessary.
 *
 * @param fullUserDoc Full User document.
 * @return Simple digest containing just Mongo ID and full name of User document.
 */
exports.userDocDigest = function (fullUserDoc) {
    // Helps us store the bare minimum about the user in each Req object the Express routings are passed.
    return {
        'id': fullUserDoc._id, // Object - mongoID
        'name': fullUserDoc.name // String - user name
    }
};

/**
 * Single method used to create new User documents.
 * TODO : We also need a failure callback so we can inform user of problem and reroute.
 *        Can also throw an error after invoking that callback.
 *
 * @param realName          String containing User's Firstname, Lastname.
 * @param userEmail         String containing User's email address.
 * @param userPwd           String containing User's requested password in plaintext.
 * @param successCallback   Callback to invoke if the User document was created successfully.
 */
exports.createUser = function (realName, userEmail, userPwd, successCallback) {
    crypto.randomBytes(constants.CRYPTO_DEFAULTS.randomDataLength, function (err, salt) {
        if (err) {
            throw err;
        }

        // Convert salt returned into hex string
        salt = new Buffer(salt).toString('hex');

        crypto.pbkdf2(userPwd, salt, constants.CRYPTO_DEFAULTS.hashIterations, constants.CRYPTO_DEFAULTS.hashKeyLength, function (err, hash) {
            if (err) {
                throw err;
            }

            var generatedHash = new Buffer(hash).toString('hex');

            var nowUTC = new Date().getTime();
            var verificationHash = crypto.createHmac("md5", constants.SITE_SECRET)
                .update(nowUTC + userEmail)
                .digest("hex");

            var usr = new User({
                email: userEmail,
                name: realName,
                status: 'unverified',
                verificationHash: verificationHash,
                pwd: generatedHash,
                // Salt generation is a one-time process. We can call pbkdf2 directly from now with the stored salt.
                // Can regenerate salt and pwd in the future if we decide stored crypto settings are out of date.
                pwd_salt: salt,
                crypto: {
                    randomDataLength: constants.CRYPTO_DEFAULTS.randomDataLength,
                    hashIterations: constants.CRYPTO_DEFAULTS.hashIterations,
                    hashKeyLength: constants.CRYPTO_DEFAULTS.hashKeyLength
                }
            }).save(function (err, user) {
                    if (err) {
                    } else {
                        if (successCallback) {
                            successCallback(err, user ? user.toObject() : null);
                        }
                    }
                });
        });
    });
};

/**
 * Invoked immediately after user login.
 * Compares snapshot of crypto standards stored during registration of this User with
 * the current crypto standards stored within Constants. If the User crypto standards
 * are lower, then re-salt and re-hash using the current standards and supplied plaintext password,
 * and update the User document.
 * @param fullUser Full User document
 * @param plainPassword Plaintext password that was entered during login process
 */
exports.checkForCryptoUpgrade = function (fullUser, plainPassword, callback) {
    var userCrypto = fullUser.crypto, defaults = constants.CRYPTO_DEFAULTS;

    if (defaults.hashKeyLength > userCrypto.hashKeyLength
        || defaults.randomDataLength > userCrypto.randomDataLength
        || defaults.hashIterations > userCrypto.hashIterations) {

        // Silently upgrade the user crypto to the latest defaults
        // ... so we need to just tweak the system defaults and everyone gets gradually upgraded :-)

        console.log("Need to upgrade the user");

        crypto.randomBytes(constants.CRYPTO_DEFAULTS.randomDataLength, function (err, salt) {
            if (err) {
                throw err;
            }

            // Convert salt returned into hex string
            salt = new Buffer(salt).toString('hex');

            crypto.pbkdf2(plainPassword, salt, constants.CRYPTO_DEFAULTS.hashIterations, constants.CRYPTO_DEFAULTS.hashKeyLength, function (err, hash) {
                if (err) {
                    throw err;
                }

                var generatedHash = new Buffer(hash).toString('hex');

                User.findByIdAndUpdate(
                    fullUser._id,
                    {
                        crypto: {
                            hashKeyLength: constants.CRYPTO_DEFAULTS.hashKeyLength,
                            randomDataLength: constants.CRYPTO_DEFAULTS.randomDataLength,
                            hashIterations: constants.CRYPTO_DEFAULTS.hashIterations
                        },
                        pwd: generatedHash,
                        pwd_salt: salt
                    },
                    function (err, doc) {
                        if (callback) {
                            if (err) {
                                callback(new Error(err), null);
                            } else {
                                callback(null, doc);
                            }
                        }
                    }
                );
            });
        });
    } else {
        console.log("Don't need to upgrade the user");
    }
};

/**
 * Developement helper to alter User documents so we can simulate a successful account verification.
 * @param emailAddress
 */
exports.forceVerificationStatus = function (emailAddress, callback) {
    // Cannot pass the actual user object to the callback as it was invoked
    // during the callback of the save() event, so had no reference to pass here.

    User.findOne({email: emailAddress}, function (err, userObj) {
        if (err) {
            throw new Error(err);
        }
        userObj.status = "verified";
        userObj.save(function (err, user) {
            if (err) {
                callback(err, null);
                throw new Error("Cannot change " + emailAddress + " to 'verified'.");
            }
            callback(null, user);
        });
    });
};

/**
 * Main routine to verify user accounts, once they have followed the correct URL from their email
 * @param urlHash   Identifier generated at registration time to use as a slug to verify user
 * @param callback  Invoked with the error thrown, or the User document of the verified user.
 */
exports.verifyUserAccount = function (urlHash, callback) {
    // Cannot pass the actual user object to the callback as it was invoked
    // during the callback of the save() event, so had no reference to pass here.

    User.findOne({"verificationHash": urlHash}, function (err, userObj) {
        if (err) {
            throw new Error(err);
        }
        userObj.status = "verified";
        userObj.save(function (err, user) {
            if (err) {
                callback(err, null);
                throw new Error("Cannot change user to 'verified'.");
            }
            callback(null, user);
        });
    });
};

/**
 * Middleware used within Experess routes to ensure that the requester has been authenticated.
 * Wrapper for the Passport Local isAuthenticated() method that's included in the Request.
 * @param req Express request object.
 * @param res Express response object.
 * @param next Callback to proceed within the Express route that called this.
 */
exports.ensureAuthenticated = function (req, res, next) {
    console.log('ensureAuthenticated : Enter');
    // Is the user already authenticated? Then chain the next function in the series.
    if (req.isAuthenticated()) {
        return next();
    }
    // ...otherwise bounce to /login
    res.redirect(constants.LOGINROUTE);
};

