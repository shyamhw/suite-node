module.exports = {

    'facebookAuth' : {
        'clientID'      : '310960599354428', // your App ID
        'clientSecret'  : 'c642a66f81e4001b0f1aa2fde1352b1c', // your App Secret
        'callbackURL'   : 'https://www.suiteestates.com/auth/facebook/callback'
    },
    'linkedInAuth' : {
        'clientID'      : '77k11i80azezw9', // your App ID
        'clientSecret'  : 'QCLOCKwXu5NK2g5Z', // your App Secret
        'callbackURL'   : 'https://www.suiteestates.com/auth/linkedin/callback'
    }
};

//need to change fb app domain name so that it works
//production urls: https://suiteestates.com/auth/linkedin/callback, https://suiteestates.com/auth/facebook/callback
//local urls: http://localhost:8080/auth/linkedin/callback, http://localhost:8080/auth/facebook/callback
