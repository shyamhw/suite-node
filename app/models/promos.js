var dynamoose = require('dynamoose');
var Schema = dynamoose.Schema;

var promoSchema = new Schema({
	promocode: {
		type: String,
	   	hashKey: true
	},
	email: String,
	rcount: Number
});


// create the model for users and expose it to our app
module.exports = dynamoose.model('Promos', promoSchema);