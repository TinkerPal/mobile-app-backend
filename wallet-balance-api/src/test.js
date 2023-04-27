const {
  getAddressByPublicKey,
} = require(`${__dirname}/utils.js`);

const address = getAddressByPublicKey('0202d40687f4d7b082d520770f655a7db99a30c075ef2baf51aadcf1f2621dd296', 'ethereum-testnet');
console.log(address);
