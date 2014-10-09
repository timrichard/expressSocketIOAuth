var User = require('../models/user.js')
    , _ = require('underscore');

exports.getTestConfirm = function (req, res) {
    // Show all verification codes, so that we can pick one and update it
    // as verified in the database.

    User.find({"status": "unverified"}, function (err, collection) {
        if (err) {
            throw new Error(err);
        }

        var confirmBaseURL = req.protocol + '://' + req.get('host') + '/confirm/';
        var unverifiedUsers = [];

        _.each(collection, function (value, key, list) {
            var thisUser = {};
            var userDoc = value.toObject();
            thisUser.email = userDoc.email;
            thisUser.name = userDoc.name;
            thisUser.url = confirmBaseURL + userDoc.verificationHash;
            unverifiedUsers.push(thisUser);
        });

        if (unverifiedUsers.length) {
            res.render('testconfirm', {"unverifiedUsers": unverifiedUsers});
        } else {
            res.render('fail')
        }

    });
};
