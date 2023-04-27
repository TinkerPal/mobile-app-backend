const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const bip32 = require('bip32');
const Buffer = require('safe-buffer').Buffer;
let bech32;
({bech32} = require('bech32'));
let createHash;
createHash = require('create-hash');
const basex = require('base-x');
const ethUtil = require('ethereumjs-util');
const { ethers, BigNumber } = require("ethers");

//const mnemonic = bip39.generateMnemonic();
// console.log(mnemonic);
const mnemonic = 'broken scan retreat ability afraid garlic edge enhance measure history fault call';
// const wallet = {
//   mnemonic: mnemonic,
//   addresses: {}
// };
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = bip32.fromSeed(seed);
const BIP32RootKey = root.toBase58();
let node;

const rootEth = ethers.utils.HDNode.fromMnemonic(mnemonic);


node = rootEth.derivePath("m/44'/1'/0'/0/0");
console.log(node.publicKey);
console.log(node.privateKey);
console.log(node.address);
const provider = new ethers.providers.StaticJsonRpcProvider('https://kovan.infura.io/v3/5c1d56877ec44161952956cb098259ba');
const wallet = new ethers.Wallet(node.privateKey, provider);
const signingKey = new ethers.utils.SigningKey(node.privateKey);
const tx = {
  "to": "0xbF4669b1f7fC070B09068a3F9DBD2D206456e7D4",
  "data": "0x",
  "gasLimit": 21000,
  "nonce": 4,
  "value": {
    "type": "BigNumber",
    "hex": "0x5af3107a4000"
  },
  "gasPrice": {
    "type": "BigNumber",
    "hex": "0xb2d05e00"
  },
  "chainId": 42
};
let BN = BigNumber.from(tx.value);
tx.value = BN.toHexString();
BN = BigNumber.from(tx.gasPrice);
tx.gasPrice = BN.toHexString();
console.log('tx', tx);
let serializedTx = ethers.utils.serializeTransaction(tx);
console.log('serializedTx', serializedTx);
// const digest = ethers.utils.keccak256(serializedTx);
// console.log('digest', digest);


// const hash = ethers.utils.keccak256(serializedTx);
const message = ethers.utils.toUtf8Bytes("\x19Ethereum Signed Message:\n32" + serializedTx);
const tosign = ethers.utils.keccak256(serializedTx);
console.log('tosign', tosign);
// wallet.sendTransaction(tx)
//   .then(result => {
//     console.log(result);
//   })
//   .catch(console.error);
// const signature = {
//   r: '0xce0793b8ec736f8a1808f0dcda8f27d1bf792d50fe9528baf6ebcfb944751c3d',
//   s: '0x173e37afc6fccd251ebfaeb6e9c2a3703790fdaaf194efb23bde43c273e63b60',
//   recoveryParam: 1,
// }
// console.log(signature);
const signature1 = signingKey.signDigest(tosign);
console.log(signature1);

serializedTx = ethers.utils.serializeTransaction(tx, signature1);
console.log(serializedTx);

provider.sendTransaction(serializedTx)
  .then(result => {
    console.log('result', result);
  })
  .catch(console.error);