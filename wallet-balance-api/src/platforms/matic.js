const config = require(`${__dirname}/../config.js`).default;
const { ethers } = require('ethers');
const axios = require('axios');
const providers = {};
const BigNumber = require('bignumber.js');
const { validateAddressEthers } = require('../utils');
const { validateAddress } = require(`${__dirname}/../utils.js`);

// all users addresses (if user is connected it contains clientId for update sending via ws)
const addresses = {};

const lastBlockNumber = {};
const blockGapLimit = 50;

exports.getBalance = async (data) => {
  const { performance } = require('perf_hooks');
  const start = performance.now();
  const address = data.address;
  const platform = data.platform;
  const walletId = data.walletId;
  const result = {
    success: false,
    type: 'coin',
    walletId,
    address,
    platform,
    name: data.walletName,
  };
  try {
    const provider = getProvider(
      platform,
      'Matic. Get balance. RPC url missed'
    );
    let balance = await provider.getBalance(address);
    balance = ethers.utils.formatEther(balance);
    result.success = true;
    result.balance = new BigNumber(Number(balance));
  } catch (error) {
    console.error('Ethers.js request failed', platform, error);
  }
  const end = performance.now();
  console.log(`Get balance, ${platform} , execution time ${end - start} ms`);
  return result;
};

exports.onRestart = async (data) => {
  const platform = data.platform;
  // get all user's addresses from data base
  // await getAddresses({ platform });
  const emitter = data.emitter;
  // read data from blocks missed when application was down (tokens discovering) in the background
  // getMissedBlocks({
  //   platform,
  //   emitter,
  // }).catch(console.error);
  const platformData = config.ethereum.providers[platform];
  if (!platformData) {
    console.error('On restart. Empty platformData', platform);
    return { success: false };
  }
  if (!platformData.wss) return { success: false };
  try {
    const provider = new ethers.providers.WebSocketProvider(platformData.wss);
    // get new blocks for ethereum like platforms
    provider.on('block', (blockNumber) => {
      if (!addresses[platform]) {
        return;
      }
      // check block transactions for a new tokens for all users addresses and balance changing for connected users addresses
      readBlock({
        blockNumber,
        emitter,
        platform,
      }).catch(console.error);
    });

    provider.on('error', (error) => {
      console.error('Ethereum subscription error', platform, error);
    });
  } catch (e) {
    console.log('Web socket provider fail', platform);
  }
};

// action on client connection
exports.onConnect = async (data) => {
  const platform = data.platform;
  const address = data.address;
  const lowerAddress = address.toLowerCase();
  const userId = data.userId;
  if (!addresses[platform]) addresses[platform] = {};
  if (!addresses[platform][lowerAddress])
    addresses[platform][lowerAddress] = {};
  if (addresses[platform][lowerAddress][userId]) {
    addresses[platform][lowerAddress][userId].clientId = data.clientId;
  } else {
    addresses[platform][lowerAddress][userId] = data;
  }
  return { success: true };
};

// action on import
exports.onImport = async (data) => {
  return await exports.onConnect(data);
};

// assets transfer
exports.transfer = async (data) => {
  const privateData = data.privateData;
  const receiverAddress = data.receiverAddress;
  const address = data.address;
  const platform = data.platform;
  let value = Number(data.value);
  if (!(value > 0)) value = 0;
  const provider = getProvider(platform, 'Matic. Transfer. RPC url missed');
  let wallet;
  if (privateData.type === 'mnemonic') {
    const rootNode = ethers.utils.HDNode.fromMnemonic(privateData.data);
    let path;
    switch (platform) {
      case 'ethereum':
      case 'binance-smart-chain':
        path = "m/44'/60'/0'/0/0";
        break;
      case 'ethereum-testnet':
      case 'binance-smart-chain-testnet':
        path = "m/44'/1'/0'/0/0";
        break;
    }
    const node = rootNode.derivePath(path);
    wallet = new ethers.Wallet(node.privateKey, provider);
  } else {
    wallet = new ethers.Wallet(privateData.data, provider);
  }

  const balance = await wallet.getBalance();
  value = ethers.utils.parseEther(value.toString());
  if (!balance.gte(value)) {
    return {
      success: false,
      errors: [`Not enough balance at address ${address} platform ${platform}`],
    };
  }
  const tx = {
    to: receiverAddress,
    value,
  };
  const result = await wallet.sendTransaction(tx);
  return { success: true, result };
};

// async function getAddresses(data) {
//   const response = await axios.post('http://localhost:8508', {
//     method: 'find',
//     params: {
//       model: 'address',
//       search: {
//         platform: data.platform,
//       },
//     },
//   });
//   if (!response.data) {
//     console.error('Addresses request fail');
//     return;
//   }
//   const result = response.data.data;
//   result.forEach((item) => {
//     if (!item.address) return;
//     const lowerAddress = item.address.toLowerCase();
//     if (!addresses[data.platform]) addresses[data.platform] = {};
//     if (!addresses[data.platform][lowerAddress])
//       addresses[data.platform][lowerAddress] = {};
//     delete item._id;
//     delete item.__v;
//     addresses[data.platform][lowerAddress][item.userId] = item;
//   });
// }

// async function getMissedBlocks(data) {
//   const platform = data.platform;
//   const provider = getProvider(
//     platform,
//     'Matic. Get missed blocks. RPC url missed'
//   );
//   try {
//     // get max saved block number for current platform
//     const response = await axios.post('http://localhost:8508', {
//       method: 'findMax',
//       params: {
//         model: 'block',
//         search: {
//           platform: data.platform,
//         },
//         max: 'blockNumber',
//       },
//     });
//     if (!response || !response.data || !response.data.success) {
//       console.error('blockNumber record fail', response);
//     }
//     if (!response.data.data) return;
//     const lastBlockNumberLocal = parseInt(response.data.data.blockNumber);
//     if (!(lastBlockNumberLocal > 0)) return;
//     const currentBlockNumber = await provider.getBlockNumber();
//     if (!(currentBlockNumber > lastBlockNumberLocal)) return;
//     lastBlockNumber[platform] = lastBlockNumberLocal;
//     for (
//       let blockNumber = lastBlockNumberLocal;
//       blockNumber >= currentBlockNumber;
//       blockNumber++
//     ) {
//       // one by one in order to prevent memory out error
//       await readBlock({
//         blockNumber,
//         emitter: data.emitter,
//         platform,
//       });
//     }
//   } catch (e) {
//     console.error('blockNumber record error', e);
//   }
// }

// read block data in order to discover transfers to or from users addresses
async function readBlock(data) {
  const platform = data.platform;
  const blockNumber = data.blockNumber;
  const provider = getProvider(
    platform,
    'Ethereum. Read block. RPC url missed'
  );
  try {
    const blockData = await provider.getBlockWithTransactions(blockNumber);
    if (!blockData || !blockData.transactions) return;
    const emitter = data.emitter;
    for (let i = 0; i < blockData.transactions.length; i++) {
      const tx = blockData.transactions[i];
      if (!tx.to || !tx.from) {
        continue;
      }
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();

      // if sender or receiver address exists updateEthereum event is fired
      if (tx.data === '0x' && addresses[platform][to]) {
        for (const userId in addresses[platform][to]) {
          emitter.emit('update', {
            type: 'coin',
            platform,
            address: addresses[platform][to][userId].address,
            clientId: addresses[platform][to][userId].clientId,
            walletId: addresses[platform][to][userId].walletId,
          });
        }
        // eth transfer to tx.to
      }
      if (tx.data === '0x' && addresses[platform][from]) {
        for (const userId in addresses[platform][from]) {
          emitter.emit('update', {
            type: 'coin',
            platform,
            address: addresses[platform][from][userId].address,
            clientId: addresses[platform][from][userId].clientId,
            walletId: addresses[platform][from][userId].walletId,
          });
        }
        // eth transfer from tx.from;
      }
    }
  } catch (e) {}
}

function getProvider(platform, errorMessage) {
  let provider = providers[platform];
  if (!provider) {
    const platformData = config.ethereum.providers[platform];
    if (!platformData || !platformData.rpc) {
      console.error(errorMessage || 'Get provider. RPC missed', platform);
      throw `Empty RPC for platform ${platform}`;
    }
    provider = new ethers.providers.StaticJsonRpcProvider(platformData.rpc);
    providers[platform] = provider;
  }
  return provider;
}

exports.checkWalletValid = async (data) => {
  const { platform, address } = data;

  return validateAddress(address, platform);
};
