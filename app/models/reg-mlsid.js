var dynamoose = require('dynamoose');
var Schema = dynamoose.Schema;

var regMLSIDSchema = new Schema({
	mlsid: {
		type: String,
	   	hashKey: true
	},
});


// create the model for users and expose it to our app
module.exports = dynamoose.model('RegMLSID', regMLSIDSchema);