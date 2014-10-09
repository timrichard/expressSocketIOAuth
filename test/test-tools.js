var tools = require('../lib/tools.js');

exports.testShortenLongSessionID = function (test) {
    test.expect(1);
    var testString = 'abcdefghijklmnopqrstuvwxyz';
    var expected = 'cdefghijklmnopqrstuvwxyz';
    test.equal(tools.shortenLongSessionID(testString), expected);
    test.done();
};

exports.testHasProperty = function (test) {
    test.expect(2);

    var testCase = {
        "levelOne": {
            "levelTwo": "test"
        }
    };

    var propertyArray;

    // Should test true if the key/val is present
    propertyArray = ['levelOne', 'levelTwo'];
    test.strictEqual(tools.hasProperty(testCase, propertyArray), true);

    // Should test false if the key/val is missing
    propertyArray = ['levelOne', 'levelTwo', 'levelThree'];
    test.strictEqual(tools.hasProperty(testCase, propertyArray), false);

    test.done();
};

exports.testPassportAuthenticated = function(test) {
    test.expect(2);

    // Mock the incomplete passport object
    var testCase = {
        "handshake" : {
            "session" : {
                passport : {}
            }
        }
    };

    // Should test false if the key/val is missing
    test.strictEqual(tools.passportAuthenticated(testCase), false);

    // Add the required property
    testCase.handshake.session.passport.user = "";

    // Should test true if the key/val is present
    test.strictEqual(tools.passportAuthenticated(testCase), true);

    test.done();
};

exports.testMongoObjectIDtoString = function(test) {
    test.expect(2);

    var testMongoObjectID = {
        "id" : "507f1f77bcf86cd799439011",
        "_bsontype" : "ObjectID"
    };

    var expected = "507f1f77bcf86cd799439011";

    test.strictEqual(tools.mongoObjectIDtoString(testMongoObjectID), expected);

    test.throws(function(){
        tools.mongoObjectIDtoString({
            "no" : "idProperty"
        });
    }, Error);

    test.done();
};

exports.testMongoStringIDtoObjectID = function(test) {

    test.expect(1);

    var expected = {
        "id" : "Pw¼øl×C",
        "_bsontype" : "ObjectID"
    };

    var stringMongoID = "507f1f77bcf86cd799439011";

    test.deepEqual(tools.mongoStringIDtoObjectID(stringMongoID), expected);

    test.done();
};
