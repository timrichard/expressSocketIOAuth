var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('MockUser', new Schema({
    // Must define the index property before the other flags?
    email           : {type: String, index: true, unique: true, required: true},
    name            : {type: String, required: true},
    status          : {type: String, index: true, required: true},
    verificationHash: {type: String, index: true, required: true},
    pwd             : {type: String, required: true},
    pwd_salt        : {type: String, required: true},
    crypto          : {
        randomDataLength: {type: Number, required: true},
        hashIterations  : {type: Number, required: true},
        hashKeyLength   : {type: Number, required: true}
    },
    joined          : {type: Date, default: Date.now, required: true}
}), 'testusers');
