const config = require(`${__dirname}/config.js`).default;
const fs = require('fs');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(config.trongrid.baseUrls['tron-testnet']);
const solidityNode = new HttpProvider(config.trongrid.baseUrls['tron-testnet']);
const eventServer = new HttpProvider(config.trongrid.baseUrls['tron-testnet']);
const privateKey =
  '9359ce314b3c49021940e617f559b61623f19ca0137ea95e71e7c57c3262d6c1';
// const privateKey = 'c0cc491695408bbab95a69b6ab6f2defc3abc035a22e89654e52fb3b6b72c339';
// const privateKey = config.trongrid.privateKey;
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
tronWeb.setHeader({ 'TRON-PRO-API-KEY': config.trongrid.apiKey });
// const TronGrid = require('trongrid');
// const tronGrid = new TronGrid(tronWeb);
// tronGrid.account.get('TD2SL2JXx8EjHXcGg267HZwpVd1dZFH7kF', {onlyConfirmed: true})
// .then(result => {
//   console.log(result.data[0].trc20);
// });

// tronGrid.account.getTransactions('TD2SL2JXx8EjHXcGg267HZwpVd1dZFH7kF', {onlyConfirmed: true})
//   .then(result => {
//     console.log(result);
//   });

// tronWeb.trx.getBlock('latest')
// .then(result => {
//   console.log(result);
// });

// const trc_options = {
//   name : "Test",//Token name, default string
//   abbreviation : "TST",//Token name abbreviation, default string
//   description : "Wallet testing",//Token description, default string
//   url : "etna.network",//Token official website url, default string
//   totalSupply : 100000,//Token total supply
//   trxRatio : 1, // Define the price by the ratio of trx_num/num
//   tokenRatio : 10, // Define the price by the ratio of trx_num/num
//   saleStart : 1627367853000,//ICO start time
//   saleEnd : 1629992749000,//ICO end time
//   freeBandwidth : 0, // The creator's "donated" bandwidth for use by token holders
//   freeBandwidthLimit : 0, // Out of `totalFreeBandwidth`, the amount each token holder get
//   frozenAmount : 0, //Token frozen supply
//   frozenDuration : 0,
//   // for now there is no default for the following values
//   precision : 6,//Precision of issued tokens
//   permission_id : 1//Optional, for multi-signature use
// }
// tronWeb.transactionBuilder.createAsset(trc_options, 'TH4h52ui4zdGaN2KZx1wy7pfNuB2DnCc24')
// .then(transaction => {
//   return tronWeb.trx.sign(transaction);
// })
// .then(transaction => {
//   return tronWeb.trx.sendRawTransaction(transaction);
// })
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
// })
// .catch(console.error);

// tronWeb.transactionBuilder.purchaseToken('TBpoZs3kqp2Q7qbQYonEm4qjT5vdtVHD2y', '1000900', 10000)
// tronWeb.transactionBuilder.purchaseToken('TD2SL2JXx8EjHXcGg267HZwpVd1dZFH7kF', '1000899', 9000)
// .then(transaction => {
//   return tronWeb.trx.sign(transaction);
// })
// .then(transaction => {
//   return tronWeb.trx.sendRawTransaction(transaction);
// })
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
// })
// .catch(console.error);

// const amount = 100;
// const to = 'TD2SL2JXx8EjHXcGg267HZwpVd1dZFH7kF';
// const tokenId = '1000899';

// const amount = 100;
// const to = 'TBpoZs3kqp2Q7qbQYonEm4qjT5vdtVHD2y';
// const tokenId = '1000902';
// tronWeb.trx.sendToken(to, amount, tokenId)
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
//   return tronWeb.trx.getAccount();
// })
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
// })
// .catch(console.error);

//console.log(tronWeb.address.fromHex('412184c0020af6b9aae2c379bb39385060e0bb0dbe'));

// tronWeb.trx.getAccount('412184c0020af6b9aae2c379bb39385060e0bb0dbe')
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
// })
// .catch(console.error);

// tronWeb.trx.getTokenFromID('1000900')
// .then(result => {
//   console.log(JSON.stringify(result, null, 2));
// })
// .catch(console.error);

console.log(Buffer.from('31303030393030', 'hex').toString('utf8'));
