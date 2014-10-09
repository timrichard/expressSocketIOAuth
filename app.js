/**
 * Module dependencies.
 */

var express = require('express')
    , socketIO = require('socket.io')
    , constants = require('./lib/constants.js')
    , _ = require('underscore')
    , usertools = require('./lib/usertools.js')
    , tools = require('./lib/tools.js')
    , User = require('./models/user.js')
    , crypto = require('crypto')
    , http = require('http')
    , util = require('util')
    , cookie = require('cookie')
    , passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , path = require('path')
    , mongoose = require('mongoose')
    , SessionMongoose = require('session-mongoose')
    , expressValidator = require('express-validator');

mongoose.connect('mongodb://localhost/' + constants.MONGO_DBNAME);

var app = express(),
    server = http.createServer(app),
    io = socketIO.listen(server);

var mongooseSessionStore = new SessionMongoose({
    url     : "mongodb://localhost/" + constants.MONGO_DBNAME,
    interval: constants.MILLIS_TWO_MINUTES
});

/*
 Passport session setup
 To support persistent login sessions, Passport needs to be able to
 serialize users into and deserialize users out of the session. Typically,
 this will be as simple as storing the user ID when serializing, an finding
 the user by ID when deserializing.
 */

passport.serializeUser(function (user, done) {
    console.log('serializeUser : Enter');
    // user._id should be an ObjectID
    // done(null, user.id);
    var strID = tools.mongoObjectIDtoString(user._id);
    done(null, strID);
});

passport.deserializeUser(function (id, done) {
    console.log('deserializeUser : Enter');
    usertools.findById(id, function (err, user) {
        if (err) {
            done(err, null);
            throw new Error('deserializeUser::findById');
        }
        if (user) {
            done(null, user);
        }
    });
});

/*
 Use the LocalStrategy with Passport.
 Strategies in Passport require a 'verify' function, which can accept
 credentials (in this case a username and password), and invoke a callback
 with a User object.
 */

passport.use(new LocalStrategy(function (username, password, done) {
    console.log('passport new LocalStrategy : Enter');
    process.nextTick(function () {
        /*
         Find the user by username. If there is no user with the given
         username, or the password is not correct, set the user to 'false' in
         order to indicate failure. Otherwise, return the authenticated user.
         */

        usertools.findByUsername(username, function (err, user) {
            // General error bubbled up?
            if (err) {
                return done(err);
            }

            // User not found in database?
            if (!user) {
                return done(null, false);
            }

            crypto.pbkdf2(password, user.pwd_salt, user.crypto.hashIterations, user.crypto.hashKeyLength, function (err, hash) {
                var generatedHash = new Buffer(hash).toString('hex');
                if (err) {
                    throw err;
                }
                if (user.pwd === generatedHash) {
                    // Password match. Valid user.
                    // Check to see if we need to upgrade crypto.
                    // Supply the user details and the plaintext password that we've just hash verified.
                    usertools.checkForCryptoUpgrade(user, password);
                    return done(null, user);
                } else {
                    // No password match
                    return done(null, false);
                }
            });
        });
    });
}));

app.configure(function () {
    app.set('port', process.env.PORT || 8080);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    // Don't want to kill console.log for the time being...
    // app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(expressValidator);
    app.use(express.methodOverride());
    app.use(express.cookieParser(constants.SITE_SECRET));
    app.use(express.session({
        secret: constants.SITE_SECRET,
        store : mongooseSessionStore,
        cookie: {
            // Don't want sessions to last longer than a month
            // in case we want to rehash the password with
            // lengthier iterations
            maxAge: constants.MILLIS_THIRTY_DAYS
        }
    }));
    // Initialise Passport. Also use passport.session() middleware, to support
    // persistent login sessions (recommended)
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(app.router);
    app.use(require('stylus').middleware(__dirname + '/public'));
    app.use(express.static(path.join(__dirname, 'public')));
});

/*
 app.configure('development', function () {
 app.use(express.errorHandler());
 });
 */

// Define routes

var routes = {};
routes.main = require('./routes/main.js');
routes.signInSignOut = require('./routes/SignInSignOut.js');
routes.testRoutes = require('./routes/TestRoutes.js');
routes.userAccount = require('./routes/UserAccount.js');

app.get('/', routes.main.getRoot);

app.get('/login', routes.signInSignOut.getLogin);
app.post('/login', routes.signInSignOut.postLogin);
app.get('/logout', routes.signInSignOut.getLogout);

app.get('/account', usertools.ensureAuthenticated, routes.userAccount.getAccount);
app.get('/register', routes.userAccount.getRegister);
app.get('/confirm/:hash', routes.userAccount.getConfirmHash);
app.post('/register', routes.userAccount.postRegister);

app.get('/testconfirm', routes.testRoutes.getTestConfirm);

server.listen(app.get('port'), function () {

    console.log("Express server listening on port " + app.get('port'));
});

io.set('authorization', function (data, accept) {
    console.log('socket.io.set.authorization.callback : Enter');
    console.log('socket.io.set.authorization.callback : This will try and auth anytime client includes socket.io??');
    // Check if there's a cookie header
    if (data.headers.cookie) {
        console.log('SocketIO : data.headers.cookie is present');
        // Parse the cookie
        data.cookie = cookie.parse(data.headers.cookie);
        // We are being returned the long format session ID, so need to just extract the 24 char short form.
        data.sessionID = tools.shortenLongSessionID(data.cookie[constants.SESSION_KEY]);
        console.log('SocketIO : data.sessionID : ' + data.sessionID);
        console.log('SocketIO : About to try to retrieve the Session from the SessionStore');
        console.log('SocketIO : Going to supply this ID to mongooseSessionStore for the lookup : ' + data.sessionID);
        mongooseSessionStore.get(data.sessionID, function (err, session) {
            console.log('mongoose.SessionStore.get.callback : Enter');
            // Resolved the User ID using the cookie
            data.session = session;
            var userID = data.session.passport.user;
            usertools.findById(userID, function (err, userObj) {
                if (err) {
                    throw new Error("SocketIO : findById failed");
                }
                if (userObj) {
                    // Add as LITTLE as possible as this will persist per socket per user
                    // (findById returns the minimal digest to us here in the callback)
                    data.session.userInfo = userObj;
                    console.log('Hello there, ' + userObj.name);
                }
            });
        });
    } else {
        console.log('SocketIO : data.headers.cookie is not present');
        return accept('No cookie transmitted.', false);
    }

    // Accept the incoming connection
    accept(null, true);
});
io.sockets.on('connection', function (socket) {
    console.log('SocketIO : Socket connected.');

    // Diagnostics
    if (tools.passportAuthenticated(socket)) {
        console.log('SocketIO : User authenticated');
    } else {
        console.log('SocketIO : User not authenticated');
    }

    socket.on('ping', function (fn) {
        if (_.isFunction(fn)) {
            process.nextTick(function () {
                var userName = 'unauthenticated user';
                if (tools.passportAuthenticated(socket)) {
                    if (tools.hasProperty(socket, ['handshake', 'session', 'userInfo'])) {
                        userName = socket.handshake.session.userInfo.name;
                    }
                }
                fn('Ping received from ' + userName);
            });
        }
    });

    // Try a custom event, so we can trigger from the client when we need to examine data.
    socket.on('custom', function (data) {
        console.log('SocketIO [custom] : socket.on Custom');
        if (tools.passportAuthenticated(socket)) {
            console.log('SocketIO [custom] : User is authenticated : ');
            console.dir(socket.handshake.session.userInfo);
        } else {
            console.log('SocketIO [custom] : User is not authenticated.');
        }
        console.log('SocketIO [custom] : Data passed : ');
        console.dir(data);
    });

});

usertools.prepopCollection();
