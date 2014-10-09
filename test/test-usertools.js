var rewire = require('rewire');

// This test runner and the production app.js are equals....
// Need a DB connection, as the sub-modules will rely on the caller
// to have established that.

// THE RULES :
// * CANNOT REUSE STATE LEFT OVER FROM ANY OTHER TEST
// * CAN USE STATE SPECIFICALLY PROVIDED BY SETUP ROUTINE
// * DON'T LEAVE ANY STATE LINGERING AFTERWARDS.
// * ANYTHING CREATED BY SETUP MUST BE DESTROYED BY TEARDOWN
// * DON'T GET TOO HUNG UP ON UNIT vs INTEGRATION, OR WE WILL END
// * UP WITH RIDICULOUS AMOUNTS OF REPETITION

var mongoose = require('mongoose');
var constants = require('../lib/constants.js');
var usertools = rewire('../lib/usertools.js');
var MockUser = require('../mocks/user.js');

function clearTestusersCollection(cb) {
    MockUser.remove({}, function (err) {
        if (err) {
            throw new Error(err);
        }
        cb();
    });
}

module.exports = {
    setUp                      : function (callback) {
        // Remember that this is invoked for each unit test.
        mongoose.connect('mongodb://localhost/' + constants.MONGO_DBNAME);
        // Inject our mock user model into usertools, replacing the real one
        // Note : different model name in mock. Mongoose caches models. That was a pig to debug.
        usertools.__set__("User", MockUser);
        clearTestusersCollection(function () {
            callback();
        });
    },
    tearDown                   : function (callback) {
        clearTestusersCollection(function () {
            mongoose.disconnect();
            callback();
        });

    },
    testFindById               : function (test) {
        usertools.createUser('Test User 1', 'testuser1@test.com', 'testuser1password', function (err, user) {
            var newMongoID = user._id.id;
            test.expect(2);
            usertools.forceVerificationStatus('testuser1@test.com', function (err, user) {
                usertools.findById(newMongoID, function (err, user) {
                    test.ok(!err);
                    test.equal(user.id.id, newMongoID);
                    test.done();
                });
            });
        });
    },
    testFindByUsername         : function (test) {
        usertools.createUser('Test User 2', 'testuser2@test.com', 'testuser2password', function (err, user) {
            test.expect(2);
            usertools.forceVerificationStatus('testuser2@test.com', function (err, user) {
                usertools.findByUsername('testuser2@test.com', function (err, user) {
                    test.ok(!err);
                    test.equal(user.email, 'testuser2@test.com');
                    test.done();
                });
            });
        });
    },
    testPrepopCollection       : function (test) {
        test.expect(4);
        usertools.prepopCollection(function (emailAddresses) {
            test.ok(emailAddresses);
            MockUser.find({"email": emailAddresses[0]}, function (err, user) {
                test.ok(!err);
                test.ok(user && user.length);
                test.notEqual(user.length, 0);
                test.done();
            });
        })
    },
    testCreateUser             : function (test) {
        test.expect(3);
        usertools.createUser('Test User 3', 'testuser3@test.com', 'testuser3password', function (err, user) {
            usertools.forceVerificationStatus('testuser3@test.com', function (err, user) {
                test.ok(!err);
                test.ok(user && 'email' in user);
                test.equal(user.email, 'testuser3@test.com');
                test.done();
            });
        });
    },
    testCheckForCryptoUpgrade  : function (test) {
        test.expect(6);
        usertools.createUser('Test User 4', 'testuser4@test.com', 'testuser4password', function (err, user) {
            usertools.forceVerificationStatus('testuser4@test.com', function (err, user) {
                // Verify user was created successfully.
                test.ok(!err);
                test.ok(user && 'email' in user);
                // Substitute reduced crypto settings for our check routine to detect.
                MockUser.findByIdAndUpdate(
                    user._id, {
                        crypto: {
                            hashKeyLength   : constants.CRYPTO_DEFAULTS.hashKeyLength / 2,
                            randomDataLength: constants.CRYPTO_DEFAULTS.randomDataLength / 2,
                            hashIterations  : constants.CRYPTO_DEFAULTS.hashIterations / 2
                        }
                    },
                    function (err, user) {
                        user = user.toObject();
                        test.ok(!err);
                        test.ok(user && 'email' in user);
                        test.notDeepEqual(user.crypto, constants.CRYPTO_DEFAULTS);
                        usertools.checkForCryptoUpgrade(user, 'testuser4password', function (err, user) {
                            user = user.toObject();
                            // Should have now upgraded User crypto settings to match current system standards.
                            test.deepEqual(user.crypto, constants.CRYPTO_DEFAULTS);
                            test.done();
                        });
                    }
                );
            });
        });
    },
    testForceVerificationStatus: function (test) {
        test.expect(3);
        usertools.createUser('Test User 5', 'testuser5@test.com', 'testuser5password', function (err, unverifiedUser) {
            test.equal(unverifiedUser.status, 'unverified');
            usertools.forceVerificationStatus(unverifiedUser.email, function (err, verifiedUser) {
                test.ok(!err);
                test.equal(verifiedUser.status, 'verified');
                test.done();
            });

        });
    },
    testVerifyUserAccount      : function (test) {
        test.expect(4);
        usertools.createUser('Test User 6', 'testuser6@test.com', 'testuser6password', function (err, unverifiedUser) {
            test.equal(unverifiedUser.status, 'unverified');
            test.notEqual(unverifiedUser.verificationHash);
            usertools.verifyUserAccount(unverifiedUser.verificationHash, function (err, verifiedUser) {
                test.ok(!err);
                test.equal(verifiedUser.status, 'verified');
                test.done();
            });
        });
    },
    testEnsureAuthenticated    : function (test) {
        test.expect(1);
        // Establish mocks
        var req = {
            isAuthenticated: function () {
                return true;
            }
        };
        var res = {
            redirect: function (url) {
                // Should not have reached this condition, as mock req is hardcoded to True.
                test.ok(false);
                test.done();

            }
        };
        usertools.ensureAuthenticated(req, res, function () {
            // ensureAuthenticated invoked its next() parameter.
            test.ok(true);
            test.done();
        });
    }
};
