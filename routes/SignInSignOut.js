var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , constants = require('../lib/constants.js');

exports.getLogin = function (req, res) {
    res.render('login', { user: req.user});
};

exports.getLogout = function (req, res) {
    req.logout();
    res.redirect('/');
};

/*
 POST of /login
 Use passport.authenticate() as route middleware to authenticate the
 request. If authentication fails, the user will be redirected back to the
 login page. Othewise, the primary route function will be called.
 In this example, it will redirect the user to the home page.
 */

// THIS MAY NOT WORK AT ALL, BECAUSE WE MIGHT BE CONFUSING PASSPORT WITH A REQUIRE IN HERE TOO

exports.postLogin = function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        console.log('app.post.login.passport.authenticate : Enter');
        // General error?
        if (err) {
            console.log('Passport authenticate : General error.');
            return next(err);
        }

        // User not found? Flash the message and return to /login
        if (!user) {
            console.log('Passport authenticate : User not found.');
            return res.redirect(constants.LOGINROUTE);
        }

        // No errors detected, so perform the login
        req.logIn(user, function (err) {
            console.log('Passport authenticate : Performing login.');
            if (err) {
                console.log('Passport authenticate : Error detected.');
                return next(err);
            }
            // Redirect to the welcome page, with the authentication information intact
            console.log('Passport authenticate : It worked. Redirecting to /');
            return res.redirect('/');
        });
    })(req, res, next);
};
