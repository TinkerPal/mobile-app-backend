var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  id: {type: String, unique: true},
  data: Schema.Types.Mixed,
});

module.exports = mongoose.model('Wallet', schema);