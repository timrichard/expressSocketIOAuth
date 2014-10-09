var User = require('../models/user.js')
    , usertools = require('../lib/usertools.js')
    , constants = require('../lib/constants.js');

exports.getAccount = function(req, res) {
    // Retrieve the full User doc. We store the bare minimum (name and ID) in the Req.
    User.findById(req.user.id, function (err, fullUserDoc) {
        if (err) {
            throw new Error(err);
        }

        if (fullUserDoc) {
            res.render('account', {user: fullUserDoc.toObject()});
        }
    });
};

exports.getRegister = function(req, res) {
    res.render('register');
};

exports.postRegister = function (req, res) {
    // Client side JS should have taken care of this validation.
    // Can't stop them turning off JS, but can stop them putting crap in the DB.

    req.assert("emailAddress", "Email address is empty").notEmpty();
    req.assert("emailAddress", "Invalid email address").isEmail();
    req.assert("fullName", "Full name empty").notEmpty();
    req.assert("password", "Password empty").notEmpty();
    req.assert("password", "Password not long enough").len(constants.MIN_PASSWORD_LENGTH);
    req.assert("repeatPassword", "Repeat password empty").notEmpty();
    req.assert("password", "Passwords don't match").equals(req.body.repeatPassword);

    var errors = req.validationErrors();

    if (!errors) {
        // Enter this user into the DB, and await email link confirmation
        usertools.createUser(req.body.fullName, req.body.emailAddress, req.body.password, function () {
            // Success
            res.redirect('/login')
        });
    } else {
        // The only way a user could get here is by subverting the clientside checks.
        // Just re-render it. Good enough.
        res.redirect('/register');
    }
};

exports.getConfirmHash = function (req, res, next) {
    var verificationHash = req.params.hash ? req.params.hash : "";

    if (verificationHash.length) {
        User.findOne({"verificationHash": verificationHash}, function (err, result) {
            if (err) {
                throw new Error(err);
            }
            if (result) {
                result.status = 'verified';
                result.save(function (err, user) {
                    if (err) {
                        throw new Error(err);
                    }
                    res.redirect('testconfirm');
                });
            }
        });
    } else {
        res.redirect('fail');
    }
};

