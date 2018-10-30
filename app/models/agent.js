var dynamoose = require('dynamoose');
var bcrypt = require('bcrypt-nodejs');
//ok ok
var Schema = dynamoose.Schema;

var agentSchema = new Schema({
  email: {
    	type: String,
    	hashKey: true
  },
	password: String,
  firstName: String,
  lastName: String,
  agentStatus: String,
  directWorkPhone: Number,
  homePhone: Number,
  isDeleted: Boolean,
  licenseState: String,
  licenseType: String,
  membershipDate: String,
  terminationDate: String,
  fbID: String,
  fullName: String,
  fbToken: String,
  verified: Boolean,
  real: String,
  mlsMembership: String,
  mlsNumber: Number,
  linkedinID: String,
  promocode: String
});

// methods ======================
// generating a hash
agentSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
agentSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = dynamoose.model('Agents', agentSchema);