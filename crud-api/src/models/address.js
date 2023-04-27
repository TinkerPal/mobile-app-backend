var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  userId: {type: String},
  walletId: {type: String},
  platform: {type: String},
  address: {type: String},
});
schema.index(
  {
    userId: 1,
    walletId: 1,
    platform: 1,
    address: 1,
  },
  { "unique": true }
);

module.exports = mongoose.model('Address', schema);