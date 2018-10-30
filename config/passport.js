//Facebook authentication strategies
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
// load up the user model
var Agent = require('../app/models/agent');
var configAuth = require('./auth');
var dynamoose = require('dynamoose');
// expose this function to our app using module.exports
module.exports = function(passport) {
    //need this to access current user in session
    passport.serializeUser(function(agent, done) {
        done(null, agent.email);
    });
    //need this to access current user in session
    passport.deserializeUser(function(email, done) {
        Agent.get(email, function(err, agent) {
            done(err, agent);
        });
    });

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        Agent.get({ 'email' :  email }, function(err, agent) {
            // if there are any errors, return the error before anything else
            if (err) {
                console.log(email);
                console.log("SOMETHING WHENT WRONG HERE")
                return done(err);
            }
            // if no user is found, return the message
            if (!agent) {
                console.log("NO AGENT");
                req.flash('loginMessage');
                return done(null, false, req.flash('loginMessage', 'Oops! Email Not Registered')); // req.flash is the way to set flashdata using connect-flash
            }

            // if the user is found but the password is wrong
            if (!agent.validPassword(password)) {
                req.flash('loginMessage');
                return done(null, false, req.flash('loginMessage', 'Oops! Password is Incorrect.')); // create the loginMessage and save it to session as flashdata
            }

            if (!agent.verified) {
                req.flash('loginMessage');
                return done(null, false, req.flash('loginMessage', 'Email Not Verified.')); // create the loginMessage and save it to session as flashdata
            }
            // all is well, return successful user
            // req.flash('email', email);
            req.flash('email', email);
            return done(null, agent);
        });

    }));
    //=====FACEBOOK Register
    passport.use('facebook-register', new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL,
        profileFields: ["emails", "displayName"],
        passReqToCallback : true
    },

    // facebook will send back the token and profile
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // find the user in the database based on their facebook id
            Agent.get({ 'email' : profile.emails[0].value }, function(err, agent) {

                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err) {
                    return done(null, false, req.flash('message', 'Email Already Registered'));
                }

                // if the user is found, then log them in
                if (agent) {
                    return done(null, false, req.flash('message', 'Email Already Registered')); // user found, return that user
                } else {
                    // if there is no user found with that facebook id, create them
                    var newAgent = new Agent();
                    newAgent.fbID = profile.id; // set the users facebook id                   
                    newAgent.fbToken = token; // we will save the token that facebook provides to the user                    
                    newAgent.fullName  = profile.displayName; // look at the passport user profile to see how names are returned
                    var nameSplit = newAgent.fullName.split(" ");
                    newAgent.firstName = nameSplit[0];
                    newAgent.lastName = nameSplit[1];
                    newAgent.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
                    newAgent.verified = false;
                    newAgent.save(function(err) {
                        if (err)
                            throw err;
                        return done(null, newAgent);
                    });
                }

            });


        });

    }));
    //=====FACEBOOK Register
    passport.use('facebook-login', new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL+"-login",
        profileFields: ["emails", "displayName"],
        passReqToCallback : true
    },

    // facebook will send back the token and profile
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // find the user in the database based on their email
            console.log(profile.id);
            Agent.get({ 'email' : profile.emails[0].value }, function(err, agent) {
                if (!agent) {
                    return done(null, false)
                }
                if (err) {
                    return done(err);
                }
                if (!agent.verified) {
                    req.flash('loginMessage');
                    return done(null, false, req.flash('loginMessage', 'Email Not Verified.')); // create the loginMessage and save it to session as flashdata
                }
                req.flash('email', profile.emails[0].value);
                return done(null, agent);
            });
        });

    }));
    //=====LINKEDIN REGISTER =======
    passport.use('linkedin-register', new LinkedInStrategy({
        clientID: configAuth.linkedInAuth.clientID,
        clientSecret: configAuth.linkedInAuth.clientSecret,
        callbackURL: configAuth.linkedInAuth.callbackURL,
        scope: ['r_emailaddress', 'r_basicprofile'],
        state: true,
        passReqToCallback : true
    }, 
    function(req, accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's LinkedIn profile is returned to
            // represent the logged-in user. In a typical application, you would want
            // to associate the LinkedIn account with a user record in your database,
            // and return that user instead.
            //console.log(profile);
            console.log(profile);
            // find the user in the database based on their facebook id
            Agent.get({ 'email' : profile.emails[0].value }, function(err, agent) {

                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err) {
                    return done(err);
                }
                // if the user is found, then log them in
                if (agent) {
                    return done(null, false); // user found, return that user
                } else {
                    // if there is no user found with that facebook id, create them
                    var newAgent = new Agent();
                    // set all of the facebook information in our user model
                    newAgent.linkedinID = profile.id; // set the users facebook id   
                    newAgent.fbToken = profile.id;               
                    newAgent.fullName  = profile.displayName; // look at the passport user profile to see how names are returned
                    newAgent.firstName = profile.name.givenName;
                    newAgent.lastName = profile.name.familyName;
                    newAgent.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
                    newAgent.verified = false;
                    newAgent.save(function(err) {
                        if (err)
                            throw err;
                        return done(null, newAgent);
                    });
                }

            });
        });
    }));
    //====LINKEDIN REGISTER
    passport.use('linkedin-login', new LinkedInStrategy({
        clientID: configAuth.linkedInAuth.clientID,
        clientSecret: configAuth.linkedInAuth.clientSecret,
        callbackURL: configAuth.linkedInAuth.callbackURL+"-login",
        scope: ['r_emailaddress', 'r_basicprofile'],
        state: true,
        passReqToCallback : true
    }, 

    // facebook will send back the token and profile
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // find the user in the database based on their email
            Agent.get({ 'email' : profile.emails[0].value }, function(err, agent) {
                if (!agent) {
                    return done(null, false)
                }
                if (err) {
                    return done(err);
                }
                if (!agent.verified) {
                    req.flash('loginMessage');
                    return done(null, false, req.flash('loginMessage', 'Email Not Verified.')); // create the loginMessage and save it to session as flashdata
                }
                req.flash('email', profile.emails[0].value);
                return done(null, agent);
            });
        });

    }));
};