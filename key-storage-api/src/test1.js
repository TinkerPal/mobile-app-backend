const { ethers, BigNumber } = require("ethers");
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
const signature1 =  {
  r: "0x8c2fbad6aa7d4034044007abe3e2be16eb29b8a8543caf28012a5872869e9d85",
  s: "0x12628f88764aed1635b7a17edd7490a40f97b7aa774844f49d2124c3521393df",
  v: 119
}
console.log(signature1);

let pubKey = ethers.utils.recoverPublicKey(tosign, signature1);
let address = ethers.utils.computeAddress(pubKey);

console.log('pubKey', pubKey);
console.log('address', address);

const signature2 = {
  r: "0x8c2fbad6aa7d4034044007abe3e2be16eb29b8a8543caf28012a5872869e9d85",
  s: "0x12628f88764aed1635b7a17edd7490a40f97b7aa774844f49d2124c3521393df",
  v: 120
}
console.log(signature2);

pubKey = ethers.utils.recoverPublicKey(tosign, signature2);
address = ethers.utils.computeAddress(pubKey);

console.log('pubKey', pubKey);
console.log('address', address);

let realAddress = ethers.utils.computeAddress('0x02dae42e7b92d85c6977e9bb10553d79ddfafadf1ce0be84e99050d5eeed0476c0');
console.log(1, realAddress);
realAddress = ethers.utils.computeAddress('0x04dae42e7b92d85c6977e9bb10553d79ddfafadf1ce0be84e99050d5eeed0476c0d20b328499507cbfb474782147cd7fc9be3d3ab8617a9eb75e88f5d8c1d3c30c');
console.log(2, realAddress);
