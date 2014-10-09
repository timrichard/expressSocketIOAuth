/*
 Integration test of user journey from Login.
 */

var appURL = 'http://127.0.0.1:8080/login/';
var AND_SUBMIT = true;

var casper = require('casper').create({
//    verbose : true,
//    logLevel : 'debug',
    pageSettings: {
        loadImages: false,
        userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4'
    }
});

// Print out all the messages in the headless browser context
//casper.on('remote.message', function (msg) {
//    this.echo('remote message caught: ' + msg);
//});

// At login page. About to authenticate.

casper.start(appURL, function () {
    this.test.assertEvalEquals(function () {
        return $('input[name=username]').length;
    }, 1, 'Username field exists.');
    this.test.assertEvalEquals(function () {
        return $('input[name=password]').length;
    }, 1, 'Password field exists.');

    // Pre-pop form with credentials we know of, and submit.
    // The keys in the object literal refer to the name attributes of the form inputs.
    this.fill('form#loginForm', {
        'username': 'userone@gmail.com',
        'password': 'userone'
    }, AND_SUBMIT);
});

// Using 'casper.then' as a trigger that new page has loaded following previous action.

// At the welcome page

casper.then(function () {
    // 'this' is the context of the next page after submit
    this.test.assertEvalEquals(function () {
        return $("#content").find("h2").eq(0).text();
    }, 'Hello, User One.', 'Checking user can login.');

});

casper.thenEvaluate(function () {
    delete window.wsResponse;
    socket.emit('ping', function (response) {
        window.wsResponse = response;
    })
});

casper.waitFor(function check() {
    return this.evaluate(function () {
        return 'wsResponse' in window;
    })
}, function then() {
    this.test.assertEquals(
        this.getGlobal('wsResponse'),
        'Ping received from User One',
        'Authenticated Ping OK');

    this.click('#linkLogout');
});

// Now logged out

casper.thenEvaluate(function () {
    delete window.wsResponse;
    socket.emit('ping', function (response) {
        window.wsResponse = response;
    })
});

casper.waitFor(function check() {
    return this.evaluate(function () {
        return 'wsResponse' in window;
    })
}, function then() {
    this.test.assertEquals(
        this.getGlobal('wsResponse'),
        'Ping received from unauthenticated user',
        'Unauthenticated Ping OK');
});

casper.run(function () {
    this.test.done(5);
    this.test.renderResults(true);
});

