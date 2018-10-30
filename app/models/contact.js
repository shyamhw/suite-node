var dynamoose = require('dynamoose');

var Schema = dynamoose.Schema;

var contactSchema = new Schema({
  email: {
    	type: String,
    	hashKey: true
  },
	name : String
});

module.exports = dynamoose.model('Contacts', contactSchema);