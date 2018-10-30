var dynamoose = require('dynamoose');

var Schema = dynamoose.Schema;

var customerSchema = new Schema({
	email: {
		type: String,
	    hashKey: true
	},
	customerid: String,

});

module.exports = dynamoose.model('Customers', customerSchema);