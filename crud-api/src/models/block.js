var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  blockNumber: {type: String},
  platform: {type: String},
});

module.exports = mongoose.model('Block', schema);