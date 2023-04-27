const { ethers } = require("ethers");
const provider = new ethers.providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/5c1d56877ec44161952956cb098259ba');
const wallet = new ethers.Wallet('bbfee28197f9a8a858188f748eed0e5d9b4fb53f55c0736d3f10522fb65bada8', provider);
console.log(wallet.publicKey);
