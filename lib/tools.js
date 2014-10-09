var mongoose = require('mongoose');

/**
 * Helper to truncate SessionID from Session Cookie, so we can use it with
 * MongooseSessionStore.
 *
 * @param longSessionID Original Session ID from the Session Cookie.
 * @return              Shorter Session ID as String, suitable for MongooseSessionStore.
 */
exports.shortenLongSessionID = function (longSessionID) {
    // Long SessionID being returned because of a change to
    // Connect. Bring back 24 chars from char 3 onwards.
    return longSessionID.substr(2, 24);
};

/**
 * Helper to safely determine whether a deeply nested property exists in an object.
 *
 * @param baseObject    Object structure to examine.
 * @param propertyArray Nested object property to search for.
 * @return              True if property exists.
 */
exports.hasProperty = function (baseObject, propertyArray) {
    var result = true, thisProperty;

    // If we have the right parameters to continue...
    // Iterate over the properties in the array, and redefine the base object for the next check.
    // If we encounter one that doesn't have the particular property (instance or inherited), return false.
    if (baseObject && propertyArray.length) {
        do {
            thisProperty = propertyArray.shift();
            // Important to use 'in' to search the prototype chain, rather than hasOwnProperty,
            // to avoid introducing regressions in the SocketIO authentication module.
            if ((typeof baseObject == 'object') && (thisProperty in baseObject)) {
                baseObject = baseObject[thisProperty];
            } else {
                result = false;
                break;
            }
            // ...while there are still properties to shift() from the front of the array...
        } while (propertyArray.length);
        return result;
    } else {
        throw new Error('_tools.hasProperty : Insufficient arguments');
    }
};

/**
 * Helper to check whether user has been authenticated by Passport middleware.
 *
 * @param socket    SocketIO socket object to examine for user session.
 * @return          True if the user has been authenticated in Passport.
 */
exports.passportAuthenticated = function (socket) {
    return exports.hasProperty(socket, ['handshake', 'session', 'passport', 'user']);
};

/**
 * Helper to extract the Mongo _id property into string format.
 *
 * @param mongoObjectID Mongo ID object from a valid document.
 * @return              String containing the ID.
 */
exports.mongoObjectIDtoString = function (mongoObjectID) {
    if (exports.hasProperty(mongoObjectID, ['id'])) {
        return mongoObjectID.id;
    } else {
        throw new Error('tools:mongoObjectIDtoString :: invalid ID object');
    }
};

/**
 * Helper to convert a string containing a Mongo ID into a full Mongo ID object.
 * @param mongoStringID String containing Mongo ID
 * @return              Mongo ID object for that ID.
 */
exports.mongoStringIDtoObjectID = function (mongoStringID) {
    return mongoose.Types.ObjectId(mongoStringID);
};
