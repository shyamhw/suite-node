// app/routes.js

module.exports = function(app, passport) {
    //Read config values from a JSON file.
    var fs = require('fs');
    var AWS = require('aws-sdk');
    var config = fs.readFileSync('./app_config.json', 'utf8');
    var Contact = require('../app/models/contact');
    var Referral = require('../app/models/referral');
    var stripeApiKey = "sk_live_G9zfJkoWndSbIvMXEoGm01EG";
    var stripeApiKeyTesting = "pk_live_mvYZP8TK0bTMpMusNVSDJwVJ"
    var stripe = require('stripe')(stripeApiKey);
    config = JSON.parse(config);
    var Agent = require('../app/models/agent');
    var Customer = require('../app/models/customer');
    var Promos = require('../app/models/promos')
    var Reg = require('../app/models/reg-mlsid')
    var dynamoose = require('dynamoose');
    var randomstring = require("randomstring");
    var bcrypt = require('bcrypt-nodejs');
    //===SENDING MAIL
    var host
    var nodemailer = require("nodemailer");
    var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "suiteestates@gmail.com",
            pass: "Suite2017"
        }
    });

    //===TOKEN FOR CONFIRMATION EMAIL
    var jwt = require('jsonwebtoken');
    var jwtDecode = require('jwt-decode');

    log = false;
    //Create DynamoDB client and pass in region.
    var db = new AWS.DynamoDB({region: config.AWS_REGION});
    //=====SUITE HOMEPAGE====
    app.get('/', transfer, function(req, res) {
        var error = req.flash('loginMessage');
        console.log(error);
        res.render('main.jade',{ message : error});
    });
    
    app.get('/launch', function(req, res){
        res.render('launch.jade');
    });


    app.get('/comingSoon', isLoggedIn, function(req, res) {
        res.render('comingSoon.jade'); 
    });

    app.get('/referralConfirm',isLoggedIn, function(req, res) {
        res.render('referralConfirm.jade'); 
    });
    app.get('/referral', isLoggedIn, function(req, res) {
        res.render('referral.jade'); 
    });
    app.get('/privacy', function(req, res) {
        res.render('privacyPolicy.jade')
    })
    app.get('/emailConfirmation', function(req, res){
        res.render('emailConfirmation.jade')
    })
    //====REGISTER 1 PAGE====
    app.get('/register1', function(req, res) {
        var error = req.flash('message');
        res.render('register1.jade', { message: error });
    });
    //====REGISTRATION SET UP WIZARD
    app.get('/registration', function(req, res) {
        var error = req.flash('message');
        res.render('registration.jade', { message: error});
    });
    app.get('/registrationSocial', ensure, function(req, res) {
        console.log("ERROR")
    });
    app.get('/clients', isLoggedIn, function(req, res) {
        res.render('clients.jade');
    });
    //===SOCIAL AGENT MIDDLEWARE
    function ensure(req, res, next) {
        var error = req.flash('message');
        return res.render('registrationSocial.jade', { message: error, agent: req.user});
    }

    //===POST LAUNCH PAGE INFO
    app.post('/launch', function(req, res) {
        
        var name = req.body.name;
        var email = req.body.email;
        var launchParams = {
            TableName: config.LANDINGPAGEUSERS,
            Item: {
                "email": {
                    "S": email
                },
                "name": {
                    "S": name
                }
            }
        }
        db.putItem(launchParams, function(err, data) {
            if (err){
                console.log("error: " + err)
            } 
            else{
                console.log('DATA');
                console.log(data);
                res.redirect('/launch');
            }
        });
    });

    //===GET CLIENT INFO
    app.get('/clients/info', function(req,res) {
        var email = req.flash('email');
        req.flash('email', email);

        var clientParams = {
            TableName: config.AGENTS_TABLE,
            Key: {
                "email": {
                    "S": email[0]
                }
            },
            ProjectionExpression: "clientListings"
        };
        db.getItem(clientParams, function(err, data) {
            if (err) {
                console.log("error: " + err);
            } else {
                // console.log('********DATA********');
                // console.log(data.Item.clientListings.SS[0]);
                // console.log(typeof data.Item.clientListings.SS[0]);
                // console.log(data.Item.clientListings.SS.length);
                if (data.Item.clientListings) {
                    // var clients = [];
                    // for (var i=0; i<data.Item.clientListings.SS.length; i++) {
                    //     // console.log(data.Item.clientListings.SS[i]);
                    //     var getClientParam = {
                    //         TableName: config.CLIENTS_TABLE,
                    //         Key: {
                    //             "MLSNumber": {
                    //                 "S": data.Item.clientListings.SS[i]
                    //             }
                    //         }
                    //     };
                    //     db.getItem(getClientParam, function(err, clientData) {
                    //         if (err) {
                    //             console.log(err);
                    //             // console.log('ERROR');
                    //         } else {
                    //             console.log("CLIENT DATA");
                    //             console.log(clientData);
                    //             clients.push(clientData);
                    //         }
                    //     });
                    // }
                    // var allClients = {
                    //     "clients": clients
                    // }
                    // console.log('*********CLIENTS********');
                    // console.log(clients);
                    // console.log(allClients);
                    var mlsnumbs = [];
                    // console.log(req.body.Item.favListings.NS);
                    var ids = data.Item.clientListings.SS;
                    for (var i=0; i<ids.length; i++) {
                        mlsnumbs.push({
                            "MLSNumber": {
                                "S":ids[i]
                            }
                        });
                    }
                    // console.log('gethere2');    
                    var getClientParam = {
                        "RequestItems": {
                            "Clients": {
                                "Keys": mlsnumbs
                            }
                        }
                    };
                    // console.log('gethere3');
                    db.batchGetItem(getClientParam, function(err, clientsData) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(clientsData.Responses.Clients);
                        }
                        res.json(JSON.stringify(clientsData));
                    });
                }
            }
        });

    });
    //===POST CLIENT LISTINGS TO CLIENTS/AGENTS TABLE
    app.post('/clients', function(req, res) {
        var mls = req.body.mls;
        var name = req.body.name;
        var email = req.body.email;
        var month = req.body.buymonth;
        var year = req.body.buyyear;
        var date = month + ', ' + year
        var prop = req.body.proptype;

        var agentEmail = req.flash('email');
        req.flash('email', agentEmail);

        //ADDS MLS# TO AGENTS ATTRIBUTE LIST
        var agentUpdateParams = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": agentEmail[0]
                }
            },
            AttributeUpdates: {
                "clientListings": {
                    "Action": "ADD",
                    "Value": {
                        "SS": [mls]
                    }
                }
            }
        }
        db.updateItem(agentUpdateParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log('DATA');
                console.log(data);
                res.redirect('/clients');
            }
        });

        //QUERY LISTING ADDRESS/SUBDIVISION FROM FIRST TABLE --> ADD CLIENT
        var queryParam1 = {
            TableName: config.CLIENT_LISTINGS,
            Key: {
                "MLSNumber": {
                    "S": mls
                }
            },
            ProjectionExpression: "StreetNumber, StreetName, StreetSuffix, PostalCode, CountyOrParish, City, SubdivisionName"
        }
        db.getItem(queryParam1, function(err, clientListingData) {
            if (err) {
                console.log(err);
            } else {
                if (clientListingData.Item) {

                    //Get subdivision and address
                    var subdiv = clientListingData.Item.SubdivisionName.S;
                    var street = clientListingData.Item.StreetName.S;
                    var num = clientListingData.Item.StreetNumber.S;
                    var suff = clientListingData.Item.StreetSuffix.S;

                    var address = num + ' ' + street;
                    if (suff != 'None') {
                        address = address + ' ' + suff;
                    }

                    //Get new hood name using current hoodname
                    var hoodMap = {
                        TableName: config.MAPPING,
                        Key: {
                            SubdivisionName: {
                                "S": subdiv
                            }
                        },
                        ProjectionExpression: "ZillowNeighborhood"
                    }
                    db.getItem(hoodMap, function(err, data) {
                        if(err) {
                            console.log('Error on getting zillow hood');
                        } else {
                            if (data.Item && data.Item.ZillowNeighborhood.S != 'Zip') {
                                //Get value at date/new hoodname from [proptype]MedianVals according to proptype
                                if (prop == 'Condo') {
                                    var queryDate = month.slice(0,3) + year;
                                    var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.CONDOMPV,
                                        Key: {
                                            Neighborhood: {
                                                "S": zillowName
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": zillowName
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                                else if (prop == 'SingleFamily') {
                                    var queryDate = month.slice(0,3) + year;
                                    var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.SINGLEFAMMPV,
                                        Key: {
                                            Neighborhood: {
                                                "S": zillowName
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": zillowName
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                            } else {
                                console.log('returned "Zip" or wasnt there');
                                //Get value at date/new hoodname from [proptype]MedianVals according to proptype
                                if (prop == 'Condo') {
                                    var queryDate = month.slice(0,3) + year;
                                    // var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.CONDOMPV_ZIP,
                                        Key: {
                                            ZipCode: {
                                                "S": "Z" + String(clientListingData.Item.PostalCode.N)
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": "None"
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                                else if (prop == 'SingleFamily') {
                                    var queryDate = month.slice(0,3) + year;
                                    // var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.SINGLEFAMMPV_ZIP,
                                        Key: {
                                            ZipCode: {
                                                "S": "Z" + String(clientListingData.Item.PostalCode.N)
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": "None"
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                // res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        });
        ////////////ABOVE CODE REPEATED BELOW FOR SECOND TABLE SYNCHRONOUSLY
        //QUERY LISTING ADDRESS/SUBDIVISION FROM SECOND TABLE --> ADD CLIENT
        var queryParam2 = {
            TableName: config.CLIENT_LISTINGS2,
            Key: {
                "MLSNumber": {
                    "S": mls
                }
            },
            ProjectionExpression: "StreetNumber, StreetName, StreetSuffix, PostalCode, CountyOrParish, City, SubdivisionName"
        }
        db.getItem(queryParam2, function(err, clientListingData) {
            if (err) {
                console.log(err);
            } else {
                if (clientListingData.Item) {
                    var subdiv = clientListingData.Item.SubdivisionName.S;
                    var street = clientListingData.Item.StreetName.S;
                    var num = clientListingData.Item.StreetNumber.S;
                    var suff = clientListingData.Item.StreetSuffix.S;

                    var address = num + ' ' + street;
                    if (suff != 'None') {
                        address = address + ' ' + suff;
                    }

                    //Get new hood name using current hoodname
                    var hoodMap = {
                        TableName: config.MAPPING,
                        Key: {
                            SubdivisionName: {
                                "S": subdiv
                            }
                        },
                        ProjectionExpression: "ZillowNeighborhood"
                    }
                    db.getItem(hoodMap, function(err, data2) {
                        if(err) {
                            console.log('Error on getting zillow hood');
                        } else {
                            if (data2.Item && data2.Item.ZillowNeighborhood.S != 'Zip') {
                                //Get value at date/new hoodname from [proptype]MedianVals according to proptype
                                if (prop == 'Condo') {
                                    var queryDate = month.slice(0,3) + year;
                                    var zillowName = data2.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.CONDOMPV,
                                        Key: {
                                            Neighborhood: {
                                                "S": zillowName
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data3) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data3.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data3.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": zillowName
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data4) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                                else if (prop == 'SingleFamily') {
                                    var queryDate = month.slice(0,3) + year;
                                    var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.SINGLEFAMMPV,
                                        Key: {
                                            Neighborhood: {
                                                "S": zillowName
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, clientListingData) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": zillowName
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                            } else {
                                console.log('returned "Zip" or wasnt there');
                                //Get value at date/new hoodname from [proptype]MedianVals according to proptype
                                if (prop == 'Condo') {
                                    var queryDate = month.slice(0,3) + year;
                                    // var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.CONDOMPV_ZIP,
                                        Key: {
                                            ZipCode: {
                                                "S": "Z" + String(clientListingData.Item.PostalCode.N)
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": "None"
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                                else if (prop == 'SingleFamily') {
                                    var queryDate = month.slice(0,3) + year;
                                    // var zillowName = data.Item.ZillowNeighborhood.S;

                                    var valueParam = {
                                        TableName: config.SINGLEFAMMPV_ZIP,
                                        Key: {
                                            ZipCode: {
                                                "S": "Z" + String(clientListingData.Item.PostalCode.N)
                                            }
                                        },
                                        ProjectionExpression: queryDate
                                    }

                                    db.getItem(valueParam, function(err, data) {
                                        if (err) {
                                            console.log('error on getting value from MedianPropVals');
                                        } else {
                                            if (data.Item[queryDate]) {
                                                //ADD CLIENT LISTING INFO (mls, name, email, date(month, year), subdiv, address)
                                                //Store originalValue in client table
                                                //Store mapped hoodname
                                                var addClientParam = {
                                                    TableName: config.CLIENTS_TABLE,
                                                    Item: {
                                                        "MLSNumber": {
                                                            "S": mls
                                                        },
                                                        "PropType": {
                                                            "S": prop
                                                        },
                                                        "Name": {
                                                            "S": name
                                                        },
                                                        "Email": {
                                                            "S": email
                                                        },
                                                        "Date": {
                                                            "S": date
                                                        },
                                                        "Subdivision": {
                                                            "S": subdiv
                                                        },
                                                        "Address": {
                                                            "S": address
                                                        },
                                                        "OriginalValue": {
                                                            "N": data.Item[queryDate].N
                                                        },
                                                        "ZillowHood": {
                                                            "S": "None"
                                                        },
                                                        "Zip": {
                                                            "N": clientListingData.Item.PostalCode.N
                                                        }
                                                    },
                                                    ConditionExpression: "attribute_not_exists(MLSNumber)"
                                                }
                                                db.putItem(addClientParam, function(err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('Added all fields!');
                                                    }
                                                });
                                                res.redirect('/clients');

                                            } else {
                                                console.log('no data.Item[queryDate]');
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        });
        // res.redirect('/clients');
    });
    app.post('/clients/appreciation', function(req, res) {

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var today = new Date();
        var monthIndex = today.getMonth();
        var month = months[monthIndex];
        var year = today.getFullYear();
        var todayDate = month+String(year);

        console.log('REQ.BODY')
        console.log(req.body);
        var zillowHood = req.body.ZillowHood.S;

        if (req.body.PropType.S == 'SingleFamily') {
            var getValueParam = {
                TableName: config.SINGLEFAMMPV,
                Key: {
                    Neighborhood: {
                        "S": zillowHood
                    }
                },
                ProjectionExpression: todayDate
            };
        }
        else if (req.body.PropType.S == 'Condo') {
            var getValueParam = {
                TableName: config.CONDOMPV,
                Key: {
                    Neighborhood: {
                        "S": zillowHood
                    }
                },
                ProjectionExpression: todayDate
            };
        }
        db.getItem(getValueParam, function(err, data) {
                if (err) {
                    console.log('error getting todays value, checking zip table');
                } else {
                    data['client'] = req.body;
                    res.json(JSON.stringify(data));
                }
        });
    });
    app.post('/clients/appreciation_zip', function(req, res) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var today = new Date();
        var monthIndex = today.getMonth();
        var month = months[monthIndex];
        var year = today.getFullYear();
        var todayDate = month+String(year);

        console.log('REQ.BODY')
        console.log(req.body);
        var zip = req.body.Zip.N;

        if (req.body.PropType.S == 'SingleFamily') {
            var getValueParamZip = {
                TableName: config.SINGLEFAMMPV_ZIP,
                Key: {
                    ZipCode: {
                        "S": "Z" + String(zip)
                    }
                },
                ProjectionExpression: todayDate
            };
        }
        else if (req.body.PropType.S == 'Condo') {
            var getValueParamZip = {
                TableName: config.CONDOMPV_ZIP,
                Key: {
                    ZipCode: {
                        "S": "Z" + String(zip)
                    }
                },
                ProjectionExpression: todayDate
            };
        }
        db.getItem(getValueParamZip, function(err, data_zip) {
            if(err) {
                console.log('error getting from _zip table');
            } else {
                data_zip['client'] = req.body;
                res.json(JSON.stringify(data_zip));
            }
        });
    });
    //===DELETE INFO
    app.post('/clients/delete', function(req, res) {

        //DELETE FROM AGENTS CLIENTLISTINGS
        var email = req.flash('email');
        req.flash('email', email);
        // console.log(email[0]);
        // console.log(req.body);
        var agentUpdateParams = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email[0]
                }
            },
            AttributeUpdates: {
                "clientListings": {
                    "Action": "DELETE",
                    "Value": {
                        "SS": [req.body.MLSNumber.S]
                    }
                }
            }
        }
        db.updateItem(agentUpdateParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log('DATA');
                console.log(data);
                //DELETE FROM CLIENTS TABE
                var deleteParam = {
                    TableName: config.CLIENTS_TABLE,
                    Key: {
                        "MLSNumber": {
                            "S": req.body.MLSNumber.S
                        }
                    }
                };
                db.deleteItem(deleteParam, function(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(data);
                        //res.redirect('/clients');
                    }
                });
            }
        });
    });
    //===POST INFORMATION TO DB HANDLE DB ERRORS
    app.post('/registration', function(req, res) {
        var email = req.body.email;
        var id = req.body.f1NRDS;
        Agent.query('email').eq(email).exec(function (err, agents) {
            if (agents[0]) {
                req.flash("message", "EMAIL ALREADY TAKEN")
                console.log("ALREADY TAKEN");
                res.redirect('/registration')
            } else {
                var params = {
                    TableName: config.ACTIVE_AGENTS,
                    KeyConditions: {
                        "MLSID": {
                            "AttributeValueList": [{
                                S: id
                            }],
                            "ComparisonOperator" : "EQ"
                        }
                    }
                };
                db.query(params, function(err, data) {
                    if (err) {
                        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                    }
                    if (data["Count"] !== 0) {
                        Reg.get(id).then(function(data){
                            if (data) {
                                console.log("ID ALREADY USED")
                                req.flash("message", "MLSID ALREADY REGISTERED")
                                res.redirect('/registration')
                            } else {
                                console.log("ID IS REAL")
                                payment(req, res)
                            }
                        })
                    } else {
                        req.flash("message", "INVALID MLSID")
                        res.redirect('/registration')
                        console.log("MLSID USED CHECK FLASH")
                    }
                });
            }
        });
        //-console.log("SYNC TEST")
    });
    //===REGISTRATION MIDDLEWARE
    function checkRegistration(req, res, next) {
        var email = req.body.email
        var mlsid = req.body.f1NRDS
    }
    //===SOCIAL MEDIA REGISTRATION
    app.post('/registrationSocial',socialReg, function(req, res) {
        res.redirect('/registrationSocial')
    })

    function socialReg(req, res, next) {
        console.log(req.body)
        var id = req.body.f1NRDS
        var params = {
            TableName: config.ACTIVE_AGENTS,
            KeyConditions: {
                "MLSID": {
                    "AttributeValueList": [{
                        S: id
                    }],
                    "ComparisonOperator" : "EQ"
                }
            }
        };
        db.query(params, function(err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            }
            if (data["Count"] !== 0) {
                Reg.get(id).then(function(data){
                    if (data) {
                        console.log("ID ALREADY USED")
                        req.flash("message", "MLSID ALREADY REGISTERED")
                        return next()
                    } else {
                        console.log("ID IS REAL")
                        payment(req, res)
                    }
                })
            } else {
                req.flash("message", "INVALID MLSID")
                return next()
            }
        });
    }
    //===PAYMENT PROCESSING
    function payment(req, res) {
        var code = req.body.f1Promo
        var name = req.body.email
        if (code) {
            Promos.get(code).then(function (data) {
                if (data) {
                    var rc = parseInt(data.rcount) + 1
                    Promos.update({promocode: code}, {$PUT: {rcount: rc}}, function (err) {
                        if(err) { return console.log(err); }
                        console.log('NEW AGENT');
                        getBalance(data.email)
                    })
                    stripe.customers.create({
                        email: req.body.email
                    }).then(function(customer){
                        customerInfo(req, res, customer.id)
                        return stripe.customers.createSource(customer.id, {
                            source: req.body.stripeToken
                        });
                    }).then(function(source) {
                        var sub = stripe.subscriptions.create({
                            plan: "suite-estates-live", 
                            customer: source.customer,
                            coupon: "suitepromo2017"
                        });
                        generatePromos(req, res)
                        return sub
                    }).catch(function(err) {
                        if (err) {
                            console.log("ERRROR ALERT")
                            return false;
                        }
                    });
                } else {
                    if (code == "SUITE23") {
                        stripe.customers.create({
                            email: req.body.email
                        }).then(function(customer){
                            customerInfo(req, res, customer.id)
                            return stripe.customers.createSource(customer.id, {
                                source: req.body.stripeToken
                            });
                        }).then(function(source) {
                            var sub = stripe.subscriptions.create({
                                plan: "suite-estates-live", 
                                customer: source.customer,
                                coupon: "suite-promo-trial"
                            });
                            generatePromos(req, res)
                            return sub
                        }).catch(function(err) {
                            if (err) {
                                console.log("ERRROR ALERT")
                                return false;
                            }
                        });
                    } else {
                        paymentHelper(req, res)
                    }
                }
            });
        } else {
            paymentHelper(req, res)
        }
        
    };
    function getBalance(email) {
        var balance = 0
        Customer.get(email).then(function (data) {
            stripe.customers.retrieve(data.customerid,
                function(err, customer) {
                    console.log("before")
                    balance = customer.account_balance - 3300
                    updateBalance(balance, data.customerid)
                    console.log("after")
                }
            );

        });
    }

    function updateBalance(balance, id) {
        stripe.customers.update(id, {
            account_balance: balance
        }, function(err, customer) {
            console.log("SUCCESSFULLY UPDATED BALANCE")
        });
    }

    function paymentHelper(req, res) {
        var name = req.body.email
        stripe.customers.create({
            email: req.body.email
        }).then(function(customer){
            customerInfo(req, res, customer.id)
            return stripe.customers.createSource(customer.id, {
                source: req.body.stripeToken
            });
        }).then(function(source) {
            var sub = stripe.subscriptions.create({
                plan: "suite-estates-live", 
                customer: source.customer
            });
            generatePromos(req, res)
            return sub
        }).catch(function(err) {
            if (err) {
                req.flash("message", "INVALID PAYMENT")
                return res.redirect('/register1');
            }
        });
    }

    function customerInfo(req, res, id) {
        var cust = new Customer();
        cust.email = req.body.email
        cust.customerid = id
        cust.save(function(err){
            if (err) {
                return console.log(err)
            }
        })
    }

    function generatePromos(req, res) {
        var pc = randomstring.generate(7);
        Promos.get(pc).then(function(data){
            if(data) {
                generatePromos(req, res)
            } else {
                sendMail(req, res, pc)
            }
        })
    }

    function sendMail(req, res, promo) {
        //create agent here
        var newAgent = new Agent();
        newAgent.email = req.body.email;
        // newAgent.save(function(err) {
        //     if(err) { return console.log(err); }
        // });
        host = req.get('host');
        //expires in 3600 seconds
        var token = jwt.sign(newAgent, process.env.SECRET_KEY, {
            expiresIn: 3600
        });
        newAgent.password = newAgent.generateHash(req.body.password);
        newAgent.firstName = req.body.f1firstname;
        newAgent.lastName = req.body.f1lastname;
        newAgent.fullName = newAgent.firstName + " " + newAgent.lastName;
        newAgent.verified = false;
        newAgent.mlsMembership = req.body.f1MSL;
        newAgent.mlsNumber = req.body.f1NRDS;

        //=== save used mslid here
        var regID = new Reg()
        regID.mlsid = newAgent.mlsNumber
        regID.save(function(err){
            if(err) { return console.log(err); }  
        })
        //===design promo code here
        var pcu = new Promos()
        pcu.promocode = promo
        pcu.email = newAgent.email
        pcu.rcount = 0
        pcu.save(function(err){
            if (err) {
                return console.log(err);
            }
        });
        newAgent.promocode = promo
        newAgent.save(function(err) {
            if(err) { return console.log(err); }         
        });
        var link="https://"+req.get('host')+"/verify?id="+token;

        var mailOptions={
            to : newAgent.email,
            subject : "Suite Email Verification",
            html : "Dear "+ newAgent.firstName + ",<br><br><strong>Welcome to Suite!</strong><br><br>Please Click on the link below to verify your email and complete your registration.<br><br><a href="+link+">Confirmation Link</a><br><br>Regards,<br>The Suite Team" 
        }
        smtpTransport.sendMail(mailOptions, function(error, response) {
            if (error) { 
                console.log(error);
                res.end("error");
            } else {
                console.log("Message sent");
                res.redirect('/emailConfirmation');
            }
        });

    }
    //===VERIFY EMAIL CONFIRMATION
    app.get('/verify',function(req,res){
        console.log(req.protocol+"://"+req.get('host'));
        if((req.protocol+"s://"+req.get('host'))==("https://"+host)) {
            console.log("Domain is matched. Information is from Authentic email");
            var token = req.query.id;
            if(token) {
                jwt.verify(token, process.env.SECRET_KEY, function(err){
                    if (err) {
                        res.status(500).send("INVALID TOKEN");
                    } else {
                        var decoded = jwtDecode(token)
                        console.log("email is verified");
                        Agent.update({email: decoded.email}, {$PUT: {verified: true}}, function (err) {
                          if(err) { return console.log(err); }
                          console.log('NEW AGENT');
                        })
                        log = true
                        //=== payment -> email -> save agent should have a loading screen
                        req.flash("email", decoded.email)
                        res.redirect("/initialQuery");
                    }
                })
            } else {
                res.end("BAD REQUEST")
            }
        } else {
            var message = req.protocol+"://"+req.get('host')
            res.end(message);
        }
    });
    //====REGISTER 2 PAGE====
    app.get('/register2', function(req, res) {
        var error = req.flash('message');
        res.render('register2.jade', { message: error });
    });
    //====REGISTER 3 PAGE====
    app.get('/register3', function(req, res) {
        var error = req.flash('message');
        res.render('register3.jade', { message: error });
    });

    //====FORGOT PASSWORDS PAGES====
    app.get('/tempPasswordEmail', function(req, res) {
        var error = req.flash('message');
        res.render('tempPasswordEmail.jade', { message: error });
    });
    app.post('/tempPasswordEmail', function(req, res) {
        // console.log('****************');
        // console.log(req.body.email);
        if (req.body.email) {
            // var userInfo;
            //Generate Random Code
            var code = randomstring.generate(6);
            //Check if Agent with email exists
            var getAgent = {
                TableName: config.AGENTS_TABLE,
                Key: {
                    email: {
                        "S": req.body.email
                    }
                },
                ProjectionExpression: "email"
            }
            db.getItem(getAgent, function(err, data) {
                if (err) {
                    console.log('****ERROR****');
                    console.log(err);
                } else {
                    //Save code to Agent table if userInfo has data
                    if (data.Item) {
                        var agentUpdateParams = {
                            TableName: config.AGENTS_TABLE,
                            Key: {
                                email: {
                                    "S": req.body.email
                                }
                            },
                            AttributeUpdates: {
                                "newPWCode": {
                                    "Action": "PUT",
                                    "Value": {
                                        "S": code
                                    }
                                }
                            }
                        }
                        db.updateItem(agentUpdateParams, function(err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('DATA');
                                console.log(data);
                            }
                        });

                        //Send Email with code
                        var mail = {
                            to: req.body.email,
                            subject: "Please confirm your Email account",
                            html: "Hello, <br><br> Your password reset code is:<br><br>"+code+"<br>Copy/Paste this code in the appropriate field in your current session" 
                        }
                        smtpTransport.sendMail(mail, function(error, response) {
                            if (error) { 
                                console.log(error);
                                // alert("There was an error sending to this email.")
                            } else {
                                console.log("Message sent");
                            }
                        });
                        res.redirect('/codeNewPassword');
                    } else {
                        console.log('There was an error finding your account. Make sure the email entered matches your account email');
                    }
                }
            });
        }
    });
    app.get('/codeNewPassword', function(req, res) {
        var error = req.flash('message');
        res.render('codeNewPassword.jade', { message: error });
    });
    app.post('/codeNewPassword', function(req, res) {
        console.log('*******POST_DATA********');
        // console.log(req.body.email);
        // console.log(req.body.code);
        // console.log(req.body.newPW);
        // console.log(req.body.newPWConfirm);
        var email = req.body.email;
        var code = req.body.code;
        var newPW = req.body.newPW;
        var newPWConfirm = req.body.newPWConfirm;

        var getAgentCode = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email
                }
            },
            ProjectionExpression: "newPWCode"
        }
        db.getItem(getAgentCode, function(err, data) {
            if (err) {
                console.log('****ERROR****');
                console.log(err);
            } else {
                // console.log('RETRIEVED CODE');
                // console.log(data.Item.newPWCode);
                if (data.Item && code == data.Item.newPWCode.S && newPW == newPWConfirm) {

                    //TODO: set new encrypted pw
                    var agentUpdateParams = {
                        TableName: config.AGENTS_TABLE,
                        Key: {
                            email: {
                                "S": email
                            }
                        },
                        AttributeUpdates: {
                            "password": {
                                "Action": "PUT",
                                "Value": {
                                    "S": bcrypt.hashSync(newPW, bcrypt.genSaltSync(8), null)
                                }
                            }
                        }
                    }
                    //UNCOMMENT DB UPDATE ONCE ENCRYPTED PW IS SET
                    db.updateItem(agentUpdateParams, function(err, data) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('DATA');
                            console.log(data);
                        }
                    });
                    res.redirect('/');
                }
            }
        });
    });
    //====RESET PASSWORDS PAGE====
    app.get('/resetOldPassword', isLoggedIn, function(req, res) {
        res.render('resetOldPassword.jade', {appTitle: "ResetPassword"});
    })
    app.post('/resetOldPassword', isLoggedIn, function(req, res) {
        var email = req.flash('email');
        req.flash('email', email);
        // var oldpw = bcrypt.hashSync(req.body.currentPW, bcrypt.genSaltSync(8), null);
        // var newpw = bcrypt.hashSync(req.body.newPW, bcrypt.genSaltSync(8), null);
        // var newpw2 = bcrypt.hashSync(req.body.newPWConfirm, bcrypt.genSaltSync(8), null);
        var oldpw = req.body.currentPW;
        var p1 = req.body.newPW;
        var p2 = req.body.newPWConfirm;

        // console.log('********ANSWERS********');
        console.log(email[0]);
        // console.log(newpw == newpw2);
        // console.log(newpw === newpw2);
        // console.log(p == p2);
        var getAgentCode = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email[0]
                }
            },
            ProjectionExpression: "password"
        }
        db.getItem(getAgentCode, function(err, data) {
            if (err) {
                console.log('****ERROR****');
                console.log(err);
            } else {
                console.log('*****ANSWERS*******');
                console.log(bcrypt.compareSync(oldpw, data.Item.password.S));
                // console.log(data.Item.password.S);
                // console.log(oldpw);
                if (data.Item && bcrypt.compareSync(oldpw, data.Item.password.S) && p1 == p2) {

                    //TODO: set new encrypted pw
                    var agentUpdateParams = {
                        TableName: config.AGENTS_TABLE,
                        Key: {
                            email: {
                                "S": email[0]
                            }
                        },
                        AttributeUpdates: {
                            "password": {
                                "Action": "PUT",
                                "Value": {
                                    "S": bcrypt.hashSync(p1, bcrypt.genSaltSync(8), null)
                                }
                            }
                        }
                    }
                    //UNCOMMENT DB UPDATE ONCE ENCRYPTED PW IS SET
                    db.updateItem(agentUpdateParams, function(err, data) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('DATA');
                            console.log(data);
                        }
                    });
                    res.redirect('/');
                }
            }
        });
    })

    app.get('/initialQuery', isLoggedIn, function(req, res) {
        console.log("HIT INITIAL QUERY")
        res.render('initialQuery.jade', {appTitle: "InitialSearch"});
    });
    app.get('/listings', isLoggedIn, function(req, res){
        //-var error = req.flash('zipMessage');
        res.render('listings.jade', {message: req.flash('zipMessage')});
    });
    app.get('/listings.json', function(req, res) {
        var zip = req.flash("zip")
        var table = req.flash("table")
        var pk = req.flash("pk")
        zip = zip[0]
        var zipParams = {
            TableName: table[0],
            // TableName: config.STARTUP_LISTINGS_TABLE,
            KeyConditionExpression: "#PostalCode = :zip",
            ExpressionAttributeNames: {
                "#PostalCode": pk[0]
            },
            ExpressionAttributeValues: {
                ":zip":{'N': zip}
            }
        }
        db.query(zipParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log('DATA');
                var count = data["Count"];
                if (count == 0) {
                    req.flash('zipMessage', 'NO RESULTS');
                    res.json(JSON.stringify(data));
                } else {
                    //-req.flash('zipMe', "Results");
                    res.json(JSON.stringify(data));
                }
            }
        });
        // var listingsData = {
        //     TableName: config.STARTUP_LISTINGS_TABLE
        //     //Limit: 48
        // };
        // db.scan(listingsData, function(err, data) {
        //     if (err) {
        //         console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        //     } else {
        //         var dataJSON = JSON.stringify(data);
        //     }
        //     //console.log("Added item:", JSON.stringify(data));
        //     res.json(JSON.stringify(data));
        // });
    });
    app.post('/listings', function(req, res) {
        var email = req.flash('email');
        req.flash('email', email);
        // console.log(email[0]);
        console.log(req.body);
        var agentUpdateParams = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email[0]
                }
            },
            AttributeUpdates: {
                "favListings": {
                    "Action": "ADD",
                    "Value": {
                        "NS": [req.body.MLSNumber.N]
                    }
                }
            }
        }
        db.updateItem(agentUpdateParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log('DATA');
                console.log(data);
            }
        });
    });
    //need to make function here to 
    // function myFunction(p1, p2) {
    //     return p1 * p2;              // The function returns the product of p1 and p2
    // }

    // CONTACTS FORMS
    //TODO ADD SEND EMAIL 
    app.post('/contact', function(req, res) {
        Contact.get({'email' : req.body.email }, function(err, contact) {
            if (!contact) {
                newContact = new Contact();
                newContact.email = req.body.email;
                newContact.name = req.body.name;
                console.log(newContact.email);
                console.log(newContact.name);
                newContact.save(function(err) {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
    });
    // Referrals FORMS
    app.post('/referral', function(req, res) {
        Referral.get({'email' : req.body.email }, function(err, referral) {
            if (!referral) {
                var email = req.flash("email")
                req.flash('email', email)
                newReferral = new Referral();
                newReferral.email = req.body.email;
                newReferral.firstName = req.body.firstName;
                newReferral.lastName = req.body.lastName;
                newReferral.referedBy = email[0];
                console.log(newReferral.email);
                console.log(newReferral.firstName);
                console.log(newReferral.referedBy);
                newReferral.save(function(err) {
                    if (err) {
                        throw err;
                    }
                });

                //Query Agents Table for Agent Name and Promo Code
                var getAgentPromo = {
                    TableName: config.AGENTS_TABLE,
                    Key: {
                        email: {
                            "S": email[0]
                        }
                    },
                    ProjectionExpression: "fullName, promocode"
                }
                db.getItem(getAgentPromo, function(err, data) {
                    if (err) {
                        console.log('****ERROR****');
                        console.log(err);
                    } else {
                        // console.log(data.Item);
                        //Send Email
                        var referredEmail = req.body.email;
                        var referredFName = req.body.firstName;
                        var referredLName = req.body.lastName;
                        var link="https://"+req.get('host')+"/registration";
                        var mail = {
                            to: referredEmail,
                            subject: "Suite Referral",
                            html: "Hey "+referredFName+",<br><br>YOU JUST GOT A FREE MONTH'S WORTH OF MEMBERSHIP!<br><br>Welcome to Suite, your deal closing sidekick!<br><br>Claim your free month of membership from "+data.Item.fullName.S+", worth up to $33!<br><br>Just click the link below and enter the promo code "+data.Item.promocode.S+" during registration:<br><br><a href="+link+">Register!</a><br><br>Enjoy!<br>Suite team" 
                        }
                        smtpTransport.sendMail(mail, function(error, response) {
                            if (error) { 
                                console.log(error);
                                // alert("There was an error sending to this email.")
                            } else {
                                console.log("Message sent");
                            }
                        });
                    }
                });                
            }
        });
        //get the promo code from emailOfficial and email the new person being referred that promo code
        res.render('referralConfirm.jade')
    });

    app.post('/register2', function(req, res) {
        mail = req.body.email;
        p1 = req.body.password;
        p2 = req.body.password2;
        fname = req.body.firstName;
        lname = req.body.lastName;
        //checks to see if fields are empty in register2
        if (mail === '' || p1 === '' || p2 === '' || fname === '' || lname === '') {
            console.log("EMPTY")
            req.flash("message", "Some Fields Are Empty");
            res.redirect('register2');
        } else {
            Agent.query('email').eq(mail).exec(function (err, agents) {
                if (agents[0]) {
                    console.log("ALREADY TAKEN");
                    req.flash("message", "Email Is Already In Use");
                    res.redirect('register2');
                } else if (p1 != p2) {
                    console.log("PASSWORDS DON'T MATCH");
                    req.flash("message", "Passwords Don't Match");
                    res.redirect('register2');
                } else {
                    req.flash("data", req.body);
                    res.redirect('/register3')
                }
            });
        }
        console.log(req.body);
    });

    app.post('/register3', function(req, res) {
        id = req.body.mlsID;
        mem = req.body.mlsMembership
        if (id === '' || mem === '') {
            console.log("Some Fields Are Empty");
            req.flash("message", "Some Fields Are Empty");
            res.redirect('register3');
        } else {
            var params = {
                TableName: config.ACTIVE_AGENTS,
                KeyConditions: {
                    "MLSID": {
                        "AttributeValueList": [{
                            S: id
                        }],
                        "ComparisonOperator" : "EQ"
                    }
                }
            };
            db.query(params, function(err, data) {
                if (err) {
                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                }
                if (data["Count"] !== 0) {
                    res.redirect('/payment');
                } else {
                    req.flash("message", "MSLID NUMBER IS NOT REGISTERED");
                    res.redirect('register3');
                }
            });
        }
        
    });

    //login screen
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/initialQuery', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook-register', { scope : 'email' }));
    app.get('/auth/facebook-login', passport.authenticate('facebook-login', { scope : 'email' }));
    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook-register', {
            successRedirect : '/registrationSocial',
            failureRedirect : '/register1',
            failureFlash : true
        }));

    app.get('/auth/facebook/callback-login',
        passport.authenticate('facebook-login', {
            successRedirect : '/initialQuery',
            failureRedirect : '/'
        }));

    //====LINKEDIN ROUTES
    app.get('/auth/linkedin', passport.authenticate('linkedin-register'))
    app.get('/auth/linkedin-login', passport.authenticate('linkedin-login'))
    app.get('/auth/linkedin/callback', passport.authenticate('linkedin-register', {
        successRedirect: '/registrationSocial',
        failureRedirect: '/register1',
        failureFlash : true
    }));
    app.get('/auth/linkedin/callback-login', passport.authenticate('linkedin-login', {
        successRedirect: '/initialQuery',
        failureRedirect: '/'
    }));
    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        log = false;
        req.session.destroy(function (err) {
            res.redirect('/'); //Inside a callback… bulletproof!
        });
    });
    app.get('/savedListings', isLoggedIn, function(req, res){
        res.render('savedListings.jade', {appTitle: "Saved Searches"});
    });
    app.get('/savedListings.json', function(req, res) {
        var ids;
        var email = req.flash('email');
        req.flash('email', email);
        console.log(email);
        var getAgentListings = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email[0]
                }
            },
            ProjectionExpression: "favListings"
        }
        db.getItem(getAgentListings, function(err, data) {
            if (err) {
                console.log('****ERROR****');
                console.log(err);
            } else {
                //console.log(data.Item.favListings.NS);
            }
            res.json(JSON.stringify(data));
            console.log(data);
            //return data;
        });
    });
    app.post('/savedListings/saved', function(req, res) {
        // console.log('got here');
        var keys = [];
        console.log(req.body.Item.favListings.NS);
        var ids = req.body.Item.favListings.NS;
        for (var i=0; i<ids.length; i++) {
            keys.push({
                "MLSNumber": {
                    "N":ids[i]
                }
            });
        }
        // console.log('gethere2');    
        var savedListingParams = {
            "RequestItems": {
                "resi_table": {
                    "Keys": keys
                }
            }
        };
        // console.log('gethere3');
        db.batchGetItem(savedListingParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
            }
            res.json(JSON.stringify(data));
        });
    });
    app.post('/savedListings', function(req, res) {

        var email = req.flash('email');
        req.flash('email', email);
        // console.log(email[0]);
        // console.log(req.body);
        var agentUpdateParams = {
            TableName: config.AGENTS_TABLE,
            Key: {
                email: {
                    "S": email[0]
                }
            },
            AttributeUpdates: {
                "favListings": {
                    "Action": "DELETE",
                    "Value": {
                        "NS": [req.body.MLSNumber.N]
                    }
                }
            }
        }
        db.updateItem(agentUpdateParams, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log('DATA');
                console.log(data);
            }
        });
    });
    app.post('/initialQuery', initialQueryConfigure, function(req, res) {
        res.redirect("/listings");
    });
    
    function initialQueryConfigure(req, res, next) {
        console.log(req.body)
        console.log('*****DATA*****');
        var zip = parseInt(req.body.zip)
        console.log(zip)
        //NEED TO CHANGE THE WAY WE DETERMINE ZIP CODE OR MLSNUMBER
        if (zip > 99999) {
            // MLSID NEED TO MAKE SURE THIS FLOWS IN ORDER
            req.flash('table', "resi_table");
            req.flash('zip', req.body.zip);
            req.flash('pk', "MLSNumber");
            return next()

        } else {
            //ZIP CODE NEED TO MAKE SURE THIS FLOWS IN ORDER
            req.flash('zip', req.body.zip);
            req.flash('table', "resi_table_zip");
            req.flash('pk', "PostalCode");
            return next()
        }
        res.redirect('/initialQuery')
    }
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() || log)
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

// route middleware to make sure a user is logged in
function transfer(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() || log) {
        return res.redirect('/initialQuery');
    }
    else {
        return next()
    }
}