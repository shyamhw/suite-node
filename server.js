var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk');
var app = express();
var port = process.env.PORT || 8080;
// var stripeApiKey = "sk_live_G9zfJkoWndSbIvMXEoGm01EG";
// var stripeApiKeyTesting = "pk_live_mvYZP8TK0bTMpMusNVSDJwVJ"
// var stripe = require('stripe')(stripeApiKey);

//Dynamoose connects to our AWS database
var dynamoose = require('dynamoose');
//requried config for first time connecting
dynamoose.AWS.config.update({
    accessKeyId: 'AKIAIB7HY35UJZ7TICSA',
    secretAccessKey: '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',
    region: 'us-east-1'
});

//authentication packages needed
var passport = require('passport');
var flash    = require('connect-flash');
var bodyParser = require('body-parser')
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var session      = require('express-session');

//===KEY
process.env.SECRET_KEY = "atlantaGUCCIMANE";
//HTTP TO HTTPS FORWARDING
/*app.all('*', ensureSecure);*/

app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

//setting files to the right directories
app.set('views', __dirname + '/views');
require('./config/passport')(passport);
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

//creating a session
var DynamoDBStore = require('connect-dynamodb')({session: session});
app.use(session({store: new DynamoDBStore(), secret: 'ubdthelegendPULLS', resave: true, saveUninitialized: true}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.listen(port);
require('./app/routes.js')(app, passport);

//HTTP TO HTTPS FORWARDING
function ensureSecure(req, res, next){
	console.log(req.secure)
	if(req.secure){
    	// OK, continue
    	return next();
  	};
  	// handle port numbers if you need non defaults
  	// res.redirect('https://' + req.host + req.url); // express 3.x
  	res.redirect('https://www.suiteestates.com'); // express 4.x
}


console.log('suite server up and running at ' + port);
