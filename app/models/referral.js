var dynamoose = require('dynamoose');

var Schema = dynamoose.Schema;

var referralSchema = new Schema({
  	email: {
    	type: String,
    	hashKey: true
  	},
	firstName : String,
	lastName : String,
	referedBy: String
});

module.exports = dynamoose.model('Referrals', referralSchema);