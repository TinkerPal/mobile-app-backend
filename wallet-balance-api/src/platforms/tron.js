const config = require(`${__dirname}/../config.js`).default;
const { ethers } = require('ethers');
const fs = require('fs');
const bip39 = require('bip39');
const bip32 = require('bip32');
const axios = require('axios');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const BigNumber = require('bignumber.js');
const { validateAddress } = require(`${__dirname}/../utils.js`);

// provider objects for different platforms
const providers = {};

// all users addresses (if user is connected it contains clientId for update sending via ws)
const addresses = {};

// token data caching
const tokens = {};
const assets = {};

const lastBlockNumber = {};
const processedBlockNumber = {};
const blockGapLimit = 20;

exports.getBalance = async (data) => {
  const { performance } = require('perf_hooks');
  const start = performance.now();
  const address = data.address;
  const platform = data.platform;
  const walletId = data.walletId;
  const tronWeb = getProvider(platform);

  const result = {
    type: 'coin',
    success: false,
    walletId,
    address,
    platform,
    name: data.walletName,
  };
  try {
    const balance = await tronWeb.trx.getBalance(address);
    result.success = true;
    result.balance = new BigNumber(Number(balance) / 1e6);
  } catch (error) {
    console.error('Tronweb request failed', platform, error);
  }
  const end = performance.now();
  console.log(`Get balance, ${platform} , execution time ${end - start} ms`);
  return result;
};

exports.getTokenBalance = {
  trc20: async (data) => {
    const { performance } = require('perf_hooks');
    const start = performance.now();
    const address = data.address;
    const tokenData = data.tokenData;
    const tokenAddress = tokenData.address;
    const platform = data.platform;
    const walletId = data.walletId;
    const tronWeb = getProvider(platform);

    const result = {
      success: false,
      type: 'token',
      walletId,
      address,
      tokenData,
      platform,
    };

    try {
      const contract = await tronWeb.contract().at(tokenAddress);
      let balance = await contract.balanceOf(address).call();
      balance = ethers.utils.formatUnits(
        balance,
        tokenData.decimals.toString()
      );
      result.success = true;
      result.balance = Number(balance);
    } catch (error) {
      console.error('Tronweb request failed', platform, error);
    }
    const end = performance.now();
    console.log(
      `Get token balance, ${platform} , execution time ${end - start} ms`
    );
    return result;
  },
  trc10: async (data) => {
    const { performance } = require('perf_hooks');
    const start = performance.now();
    const address = data.address;
    const tokenData = data.tokenData;
    const tokenId = tokenData.tokenId;
    const platform = data.platform;
    const walletId = data.walletId;
    const tronWeb = getProvider(platform);

    const result = {
      success: false,
      type: 'token',
      walletId,
      address,
      tokenData,
      platform,
    };

    const accountData = await tronWeb.trx.getAccount(address);
    const accountAssets = accountData.assetV2;
    for (let i = 0; i < accountAssets.length; i++) {
      const asset = accountAssets[i];
      if (asset.key === tokenId) {
        let value = parseInt(asset.value);
        if (!(value > 0)) value = 0;
        result.success = true;
        result.balance = ethers.utils.parseUnits(
          value.toString(),
          tokenData.decimals.toString()
        );
        result.balance = asset.value / 1e6;
        break;
      }
    }

    const end = performance.now();
    console.log(
      `Get token balance, ${platform} , execution time ${end - start} ms`
    );
    return result;
  },
};

// get trc10 asset data (with caching)
async function getAssetData(data) {
  const platform = data.platform;
  const tokenId = data.tokenId;
  const tronWeb = getProvider(platform);

  if (!assets[platform]) {
    assets[platform] = {};
  }
  if (assets[platform][tokenId]) {
    return assets[platform][tokenId];
  }
  assets[platform][tokenId] = {
    tokenId,
    type: 'trc10',
  };
  try {
    const assetData = await tronWeb.trx.getTokenByID(tokenId);
    assets[platform][tokenId].name = assetData.name;
    assets[platform][tokenId].symbol = assetData.abbr;
    assets[platform][tokenId].decimals = parseInt(assetData.precision);
    assets[platform][tokenId].description = assetData.description;
  } catch (e) {}
  if (!(assets[platform][tokenId].decimals > 0))
    assets[platform][tokenId].decimals = 0;

  return assets[platform][tokenId];
}

// get trc20 token data (with caching)
async function getTokenData(data) {
  const platform = data.platform;
  const address = data.address;
  const tronWeb = getProvider(platform);
  console.log('getTokenData', address);
  let contract;
  try {
    contract = await tronWeb.contract().at(address);
  } catch (error) {
    console.error('Contract initiating failed', error);
    return { success: false };
  }

  if (!tokens[platform]) {
    tokens[platform] = {};
  }
  if (tokens[platform][address]) {
    return tokens[platform][address];
  }
  tokens[platform][address] = {
    address,
    type: 'trc20',
  };

  try {
    tokens[platform][address].name = await contract.name().call();
  } catch (e) {}
  try {
    tokens[platform][address].symbol = await contract.symbol().call();
  } catch (e) {}
  try {
    tokens[platform][address].decimals = await contract.decimals().call();
    tokens[platform][address].decimals = parseInt(
      tokens[platform][address].decimals
    );
  } catch (e) {}
  if (!(tokens[platform][address].decimals > 0))
    tokens[platform][address].decimals = 0;

  return tokens[platform][address];
}

// action on application restart
exports.onRestart = async (data) => {
  // const platform = data.platform;
  // get all user's addresses from data base
  // await getAddresses({ platform });
  // const emitter = data.emitter;
  // read data from blocks missed when application was down (tokens discovering) in the background
  // await getMissedBlocks({
  //   platform,
  //   emitter,
  // });
};

// action on client connection
exports.onConnect = async (data) => {
  const platform = data.platform;
  const tronWeb = getProvider(platform);
  const address = tronWeb.address.toHex(data.address);
  const lowerAddress = `0x${address.toLowerCase().slice(2)}`;
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

// scheduled action
exports.cron = async (data) => {
  const platform = data.platform;
  const tronWeb = getProvider(platform);
  let currentBlockNumber;
  let lastBlockNumberLocal = processedBlockNumber[platform];
  if (!lastBlockNumberLocal) lastBlockNumberLocal = lastBlockNumber[platform];

  try {
    const currentBlock = await tronWeb.trx.getBlock('latest');
    currentBlockNumber = parseInt(currentBlock.block_header.raw_data.number);
    if (!(currentBlockNumber > 0)) return;
    if (!(lastBlockNumberLocal > 0))
      lastBlockNumberLocal = currentBlockNumber - 1;
    if (!(currentBlockNumber > lastBlockNumberLocal)) return;
    const blockRange = await tronWeb.trx.getBlockRange(
      lastBlockNumberLocal,
      currentBlockNumber
    );
    for (let i = 0; i < blockRange.length; i++) {
      await readBlock({
        blockData: blockRange[i],
        emitter: data.emitter,
        platform,
      });
    }
  } catch (e) {
    console.error('blockNumber record error', e);
  }
};

// assets transfer
exports.transfer = async (data) => {
  const privateData = data.privateData;
  const tokenData = data.tokenData;
  const receiverAddress = data.receiverAddress;
  const platform = data.platform;
  const address = data.address;
  let value = Number(data.value);
  if (!(value > 0))
    return { success: false, errors: ['Value should be greater than zero'] };

  let privateKey;
  if (privateData.type === 'mnemonic') {
    const seed = bip39.mnemonicToSeedSync(privateData.data);
    const rootNode = bip32.fromSeed(seed);
    let path;
    switch (platform) {
      case 'tron':
        path = "m/44'/195'/0'/0/0";
        break;
      case 'tron-testnet':
        path = "m/44'/1'/0'/0/0";
        break;
    }
    const node = rootNode.derivePath(path);
    privateKey = node.privateKey.toString('hex');
  } else {
    privateKey = privateData.data;
  }
  let result;
  const tronWeb = getProvider(platform, privateKey);
  if (!tokenData) {
    const balanceData = await exports.getBalance(data);
    if (!(balanceData.balance >= value)) {
      return {
        success: false,
        errors: [
          `Not enough balance at address ${address} platform ${platform}`,
        ],
      };
    }
    value = Math.floor(value * 1e6);
    result = await tronWeb.trx.sendTransaction(receiverAddress, value);
  } else if (tokenData.tokenId) {
    const balanceData = await exports.getTokenBalance.trc10(data);
    if (!(balanceData.balance >= value)) {
      return {
        success: false,
        errors: [
          `Not enough balance at address ${address} platform ${platform} tokenId ${tokenData.tokenId}`,
        ],
      };
    }
    value = ethers.utils.parseUnits(
      value.toString(),
      tokenData.decimals.toString()
    );
    result = await tronWeb.trx.sendToken(
      receiverAddress,
      Number(value),
      tokenData.tokenId
    );
  } else if (tokenData.tokenAddress) {
    const balanceData = await exports.getTokenBalance.trc20(data);
    if (!(balanceData.balance >= value)) {
      return {
        success: false,
        errors: [
          `Not enough balance at address ${address} platform ${platform} contract address ${tokenData.tokenAddress}`,
        ],
      };
    }
    value = ethers.utils.parseUnits(
      value.toString(),
      tokenData.decimals.toString()
    );
    const contract = await tronWeb.contract().at(tokenData.tokenAddress);
    result = await contract.transfer(receiverAddress, Number(value)).send({
      feeLimit: 100000000,
      callValue: 0,
      shouldPollResponse: true,
    });
  }

  return { success: true, result };
};

// getting all users addresses to memory
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
//     const tronWeb = getProvider(data.platform);
//     const address = tronWeb.address.toHex(item.address);
//     const lowerAddress = `0x${address.toLowerCase().slice(2)}`;
//     if (!addresses[data.platform]) addresses[data.platform] = {};
//     if (!addresses[data.platform][lowerAddress])
//       addresses[data.platform][lowerAddress] = {};
//     delete item._id;
//     delete item.__v;
//     addresses[data.platform][lowerAddress][item.userId] = item;
//   });
// }

// review all blocks missed when app was down
// async function getMissedBlocks(data) {
//   if (process.env.APP_ENV === 'local') {
//     console.log('getMissedBlocks. Skipped for local environment');
//     return { success: true };
//   }
//
//   const platform = data.platform;
//   const tronWeb = getProvider(platform);
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
//     lastBlockNumber[platform] = lastBlockNumberLocal;
//     const currentBlock = await tronWeb.trx.getBlock('latest');
//     const currentBlockNumber = currentBlock.block_header.raw_data.number;
//     if (!(currentBlockNumber > lastBlockNumberLocal)) return;
//     if (lastBlockNumberLocal < currentBlockNumber - 99) {
//       for (
//         let blockNumber = lastBlockNumberLocal;
//         blockNumber <= currentBlockNumber;
//         blockNumber++
//       ) {
//         try {
//           const blockData = await tronWeb.trx.getBlock(blockNumber);
//           await readBlock({
//             blockData,
//             emitter: data.emitter,
//             platform,
//           });
//         } catch (error) {
//           console.error('getMissedBlocks break', blockNumber, error);
//           break;
//         }
//       }
//     } else {
//       const blockRange = await tronWeb.trx.getBlockRange(
//         lastBlockNumberLocal,
//         currentBlockNumber
//       );
//       for (let i = 0; i < blockRange.length; i++) {
//         await readBlock({
//           blockData: blockRange[i],
//           emitter: data.emitter,
//           platform,
//         });
//       }
//     }
//     return { success: true };
//   } catch (e) {
//     console.error('blockNumber record error', e);
//     return { success: false };
//   }
// }

// read block data in order to discover transfers to or from users addresses
async function readBlock(data) {
  const platform = data.platform;
  const emitter = data.emitter;
  const blockData = data.blockData;
  let blockNumber;
  try {
    blockNumber = parseInt(blockData.block_header.raw_data.number);
  } catch (error) {
    console.error(error);
  }
  if (!(blockNumber > 0)) return;
  if (processedBlockNumber[platform] >= blockNumber) return;
  processedBlockNumber[platform] = blockNumber;
  if (!blockData.transactions || !Array.isArray(blockData.transactions)) {
    return;
  }
  for (let i = 0; i < blockData.transactions.length; i++) {
    const txRawData = blockData.transactions[i].raw_data;
    const txId = blockData.transactions[i].txID;
    try {
      let detected = false;
      let tokenId, contractAddress;
      if (
        !txRawData ||
        !txRawData.contract ||
        !Array.isArray(txRawData.contract) ||
        !txRawData.contract.length
      )
        continue;
      if (txRawData.contract.length > 1) {
        console.error(
          'Tron read block, unexpected data',
          JSON.stringify(txRawData, null, 2)
        );
      }
      const txData = txRawData.contract[0].parameter.value;

      if (!txData.owner_address || !txData.to_address) continue;
      let to;
      let from = `0x${txData.owner_address.slice(2)}`;
      const emitData = {
        type: 'coin',
        platform,
      };

      if (txData.asset_name) {
        tokenId = Buffer.from(txData.asset_name, 'hex').toString('utf8');
        to = `0x${txData.to_address.slice(2)}`;
        emitData.type = 'token';
      } else if (txData.contract_address) {
        if (txData.data.slice(0, 32) === 'a9059cbb000000000000000000000000') {
          to = `0x${txData.data.slice(32, 72)}`;
        } else if (
          txData.data.slice(0, 32) === '23b872dd000000000000000000000000'
        ) {
          from = `0x${txData.data.slice(32, 72)}`;
          to = `0x${txData.data.slice(96, 136)}`;
        }
        contractAddress = `0x${txData.contract_address.slice(2)}`;
        emitData.type = 'token';
      } else {
        to = `0x${txData.to_address.slice(2)}`;
      }

      if (addresses[platform] && addresses[platform][to]) {
        detected = true;
        for (const userId in addresses[platform][to]) {
          emitData.address = addresses[platform][to][userId].address;
          emitData.clientId = addresses[platform][to][userId].clientId;
          emitData.walletId = addresses[platform][to][userId].walletId;
        }
      }
      if (addresses[platform] && addresses[platform][from]) {
        detected = true;
        for (const userId in addresses[platform][from]) {
          emitData.address = addresses[platform][from][userId].address;
          emitData.clientId = addresses[platform][from][userId].clientId;
          emitData.walletId = addresses[platform][from][userId].walletId;
        }
      }
      if (detected) {
        if (tokenId) {
          emitData.tokenData = await getAssetData({
            platform,
            tokenId,
          });
        } else if (contractAddress) {
          emitData.tokenData = await getTokenData({
            platform,
            address: contractAddress,
          });
        }
        await pause(60);
        emitter.emit('update', emitData);
      }
    } catch (error) {
      console.error('Read block catch', error);
    }
  }
}

async function pause(sec) {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, sec * 1000);
  });
  return true;
}

// get suitable for current platform provider safely
function getProvider(platform, privateKey) {
  privateKey = privateKey || config.trongrid.privateKey;
  let provider = providers[platform];
  if (!provider) {
    try {
      const fullNode = new HttpProvider(config.trongrid.baseUrls[platform]);
      const solidityNode = new HttpProvider(config.trongrid.baseUrls[platform]);
      const eventServer = new HttpProvider(config.trongrid.baseUrls[platform]);
      provider = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
      provider.setHeader({ 'TRON-PRO-API-KEY': config.trongrid.apiKey });
    } catch (error) {
      console.error('TronWeb initiation failed', error);
    }
  }
  return provider;
}

exports.checkWalletValid = async (data) => {
  const { address } = data;

  return validateAddress(address, 'tron');
};
