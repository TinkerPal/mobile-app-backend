const config = require(`${__dirname}/../config.js`).default;
const {
  getSymbolByPlatform,
  validateAddress,
} = require(`${__dirname}/../utils.js`);
const { ethers, BigNumber } = require('ethers');
const axios = require('axios');
const providers = {};

// all users addresses (if user is connected it contains clientId for update sending via ws)
const addresses = {};
// token data caching
const tokens = {};

const lastBlockNumber = {};
const blockGapLimit = 50;
const abiERC20 = [
  {
    inputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'supply', type: 'uint256' },
      { internalType: 'uint8', name: 'decimals', type: 'uint8' },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'subtractedValue', type: 'uint256' },
    ],
    name: 'decreaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'addedValue', type: 'uint256' },
    ],
    name: 'increaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
const abiERC721 = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_operator',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: '_approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: '_to', type: 'address' },
      {
        indexed: true,
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: '_approved', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '_name', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_from', type: 'address' },
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_from', type: 'address' },
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_operator', type: 'address' },
      { internalType: 'bool', name: '_approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: '_interfaceID', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '_symbol', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_from', type: 'address' },
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

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
      'Ethereum. Get balance. RPC url missed'
    );
    const balance = await provider.getBalance(address);
    result.success = true;
    result.balance = ethers.utils.formatUnits(balance, '18');
  } catch (error) {
    console.error('Ethers.js request failed', platform, error);
  }
  const end = performance.now();
  console.log(`Get balance, ${platform} , execution time ${end - start} ms`, result);
  return result;
};

exports.getTokenBalance = {
  erc20: async (data) => {
    const { performance } = require('perf_hooks');
    const start = performance.now();
    const address = data.address;
    const tokenData = data.tokenData;
    const tokenAddress = tokenData.tokenAddress;
    const platform = data.platform;
    const walletId = data.walletId;
    const result = {
      success: false,
      type: 'token',
      walletId,
      address,
      platform,
      tokenData,
    };
    let decimals = parseInt(tokenData.decimals);
    if (!(decimals > 0)) decimals = 0;
    try {
      const provider = getProvider(platform, 'Ethereum. ERC20. RPC url missed');
      if (!tokens[platform]) tokens[platform] = {};
      tokens[platform][tokenAddress] = data.tokenData;
      const contract = new ethers.Contract(tokenAddress, abiERC20, provider);
      const balance = await contract.balanceOf(address);
      result.success = true;
      result.balance = Number(
        ethers.utils.formatUnits(balance, decimals.toString())
      );
      if (!(result.balance > 0)) result.balance = 0;
    } catch (error) {
      console.error('Ethers.js request failed', platform, error);
    }
    const end = performance.now();
    console.log(
      `Get token balance, ${platform} , execution time ${end - start} ms`
    );
    return result;
  },
  erc721: async (data) => {
    const { performance } = require('perf_hooks');
    const start = performance.now();
    const address = data.address;
    const tokenData = data.tokenData;
    const tokenAddress = tokenData.tokenAddress;
    const platform = data.platform;
    const walletId = data.walletId;
    const tokenId = tokenData.tokenId;
    const result = {
      success: false,
      type: 'token',
      walletId,
      address,
      platform,
      tokenData,
    };
    try {
      const provider = getProvider(
        platform,
        'Ethereum. ERC721. RPC url missed'
      );
      if (!tokens[platform]) tokens[platform] = {};
      tokens[platform][`${tokenAddress}_${tokenId}`] = tokenData;
      const contract = new ethers.Contract(tokenAddress, abiERC721, provider);
      const balance = await contract.balanceOf(address);
      result.success = true;
      result.balance = Number(balance);
      result.owner = false;
      try {
        const ownerAddress = await contract.ownerOf(tokenId);
        if (ownerAddress.toLowerCase() === address.toLowerCase()) {
          result.owner = true;
        }
      } catch (e) {}
    } catch (error) {
      console.error('Ethers.js request failed', platform, error);
    }
    const end = performance.now();
    console.log(
      `Get token balance, ${platform} , execution time ${end - start} ms`
    );
    return result;
  },
};

// get token data (with caching)
exports.getTokenData = async (data) => {
  const platform = data.platform;
  const tokenAddress = data.tokenAddress;
  const tokenId = data.tokenId;
  const tokenIndex = tokenId ? `${tokenAddress}_${tokenId}` : tokenAddress;
  const provider = getProvider(
    platform,
    'Ethereum. Get token data. RPC url missed'
  );
  const contract = {};
  contract.erc20 = new ethers.Contract(tokenAddress, abiERC20, provider);
  contract.erc721 = new ethers.Contract(tokenAddress, abiERC721, provider);
  let type = 'erc20';
  let owner;
  try {
    owner = await contract.erc721.ownerOf(tokenId);
    type = 'erc721';
  } catch (e) {}

  if (!tokens[platform]) {
    tokens[platform] = {};
  }
  if (tokens[platform][tokenIndex]) {
    return tokens[platform][tokenIndex];
  }
  let name;
  try {
    name = await contract[type].name();
  } catch (e) {}
  if (!name) return { success: false };

  tokens[platform][tokenIndex] = {
    tokenAddress: contract[type].address,
    name,
    type,
  };
  if (owner) {
    tokens[platform][tokenIndex].owner = owner;
  }
  try {
    tokens[platform][tokenIndex].symbol = await contract[type].symbol();
  } catch (e) {}
  if (type === 'erc20') {
    try {
      tokens[platform][tokenIndex].decimals = await contract.erc20.decimals();
    } catch (e) {}
  }
  if (type === 'erc721') {
    tokens[platform][tokenIndex].tokenId = tokenId;
    try {
      tokens[platform][tokenIndex].tokenURI = await contract.erc721.tokenURI(
        tokenId
      );
    } catch (e) {}
  }
  return tokens[platform][tokenIndex];
};

// action on application restart
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
  const tokenAddress = data.tokenAddress;
  const receiverAddress = data.receiverAddress;
  const address = data.address;
  const platform = data.platform;
  let value = Number(data.value);
  if (!(value > 0)) value = 0;
  let tokenId = parseInt(data.tokenId);
  if (!(tokenId > 0)) tokenId = 0;
  const provider = getProvider(platform, 'Ethereum. Transfer. RPC url missed');
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

  if (tokenAddress) {
    const tokenData = await exports.getTokenData({
      tokenAddress: tokenAddress,
      tokenId,
      platform,
    });
    if (tokenData.type === 'erc20' || tokenData.type === 'bep20') {
      if (value < 0)
        return {
          success: false,
          errors: ['Value should be greater than zero'],
        };
      const contract = new ethers.Contract(tokenAddress, abiERC20, wallet);
      const balance = await contract.balanceOf(address);
      value = ethers.utils.parseUnits(
        value.toString(),
        tokenData.decimals.toString()
      );
      if (!balance.gte(value)) {
        return {
          success: false,
          errors: [
            `Not enough balance at address ${address} platform ${platform} contract address ${tokenAddress}`,
          ],
        };
      }
      const result = await contract.transfer(receiverAddress, value);
      return { success: true, result };
    } else if (tokenData.type === 'erc721') {
      if (tokenId < 0)
        return { success: false, errors: ['tokenId missed for NFT token'] };
      const contract = new ethers.Contract(tokenAddress, abiERC721, wallet);
      let owner;
      try {
        owner = await contract.ownerOf(data.tokenId);
      } catch (e) {}
      if (owner.toLowerCase() !== address.toLowerCase()) {
        return {
          success: false,
          errors: [`Address ${address} doesnt own this NFT token`, tokenData],
        };
      }
      const result = await contract[
        'safeTransferFrom(address,address,uint256)'
      ](address, receiverAddress, tokenId);
      return { success: true, result };
    }
    return { success: false, errors: ['Unknown token', tokenData] };
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

// assets transfer
exports.prepareTransaction = async (data) => {
  console.log(data);
  const tokenAddress = data.tokenAddress;
  const receiverAddress = data.receiverAddress;
  const to = tokenAddress ? tokenAddress : receiverAddress;
  const address = data.address;
  const platform = data.platform;
  let value = Number(data.value);
  if (!(value > 0)) value = 0;
  let tokenId = parseInt(data.tokenId);
  if (!(tokenId > 0)) tokenId = 0;
  const provider = getProvider(platform, 'Ethereum. Transfer. RPC url missed');
  if (!tokenAddress) {
    const balance = await provider.getBalance(address);
    value = ethers.utils.parseUnits(value.toFixed(18));
    if (!balance.gte(value)) {
      return {
        success: false,
        errors: [`Not enough balance at address ${address} platform ${platform}`],
      };
    }
  }

  const nonce = await provider.getTransactionCount(address);
  const gasPrice = await provider.getGasPrice();
  const tx = {
    to,
    data: '0x',
    gasLimit: 21000,
    nonce,
    value,
    gasPrice,
    chainId: config.chainIds[platform],
  };

  if (tokenAddress) {
    const tokenData = await exports.getTokenData({
      tokenAddress: tokenAddress,
      tokenId,
      platform,
    });
    if (tokenData.type === 'erc20' || tokenData.type === 'bep20') {
      if (!(value > 0)) {
        return {
          success: false,
          errors: ['Value should be greater than zero'],
        };
      }
      const contract = new ethers.Contract(tokenAddress, abiERC20, provider);
      const balance = await contract.balanceOf(address);
      value = ethers.utils.parseUnits(
        value.toString(),
        tokenData.decimals.toString()
      );
      if (!balance.gte(value)) {
        return {
          success: false,
          errors: [
            `Not enough balance at address ${address} platform ${platform} contract address ${tokenAddress}`,
          ],
        };
      }
      const txData = await contract.populateTransaction.transfer(receiverAddress, value);
      tx.data = txData.data;
      tx.gasLimit = 250000;
      tx.value = 0;
    } else if (tokenData.type === 'erc721') {
      if (!(tokenId > 0)) {
        return {success: false, errors: ['tokenId missed for NFT token']};
      }
      const contract = new ethers.Contract(tokenAddress, abiERC721, provider);
      let owner;
      try {
        owner = await contract.ownerOf(data.tokenId);
      } catch (e) {}
      if (owner.toLowerCase() !== address.toLowerCase()) {
        return {
          success: false,
          errors: [`Address ${address} doesnt own this NFT token`, tokenData],
        };
      }
      const txData = await contract.populateTransaction[
        'safeTransferFrom(address,address,uint256)'
        ](address, receiverAddress, tokenId);
      tx.data = txData.data;
      tx.gasLimit = 450000;
      tx.value = 0;
    } else {
      return {success: false, errors: ['Unknown token', tokenData]};
    }
  }

  const serializedTx = ethers.utils.serializeTransaction(tx);
  // const hash = ethers.utils.keccak256(serializedTx);
  // const message = ethers.utils.toUtf8Bytes("\x19Ethereum Signed Message:\n32" + hash);
  const tosign = ethers.utils.keccak256(serializedTx);
  return { success: true, tx, tosign: [ tosign ] };
};

// assets transfer
exports.sendTransaction = async (data) => {
  const tx = data.tx;
  let BN = BigNumber.from(tx.value);
  tx.value = BN.toHexString();
  BN = BigNumber.from(tx.gasPrice);
  tx.gasPrice = BN.toHexString();
  let signature = data.signatures[0];
  signature.r = `0x${signature.r}`;
  signature.s = `0x${signature.s}`;
  signature.recoveryParam = 0;
  let addressFrom = ethers.utils.computeAddress(`0x${data.pubkeys[0]}`);
  let pubKey = ethers.utils.recoverPublicKey(data.tosign[0], signature);
  if (addressFrom !== ethers.utils.computeAddress(pubKey)) {
    signature.recoveryParam = 1;
    pubKey = ethers.utils.recoverPublicKey(data.tosign[0], signature);
    if (addressFrom !== ethers.utils.computeAddress(pubKey)) {
      return {
        success: false,
        errors: [`Signature is not valid`],
      };
    }
  }

  const serializedTx = ethers.utils.serializeTransaction(tx, signature);
  const platform = data.platform;
  const provider = getProvider(platform, 'Ethereum. Transfer. RPC url missed');
  const result = await provider.sendTransaction(serializedTx);
  return { success: true, result };
};

// transactions history
exports.txsHistory = async (data) => {
  const address = data.address;
  const platform = data.platform;
  const tokenAddress = data.tokenAddress;

  const platformProvider = config.ethereum.providers[platform];
  const baseUrl = platformProvider.api;
  const baseToken = platformProvider.apiToken;

  if (!baseUrl) {
    console.error('Get txs history. Base url missed', platform);
    return { success: false, errors: ['An error occurred'] };
  }

  if (!baseToken) {
    console.error('Get txs history. Base api key missed', platform);
    return { success: false, errors: ['An error occurred'] };
  }

  const url = `https://${baseUrl}/api?module=account&action=${
    tokenAddress ? 'tokentx' : 'txlist'
  }&address=${address}&startblock=1&endblock=99999999&sort=desc&apikey=${baseToken}`;

  try {
    const response = await axios(url);

    if (!response || !response.data) {
      console.error('TxsHistory request.', response);
      return {
        success: false,
        errors: ['TxsHistory request failed, unknow error'],
      };
    }

    const { result, status, message } = response.data;

    if (status === '1') {
      const symbol = getSymbolByPlatform(platform);
      const txs = [];

      result.forEach((tx) => {
        if (tx.confirmations <= 6 || parseInt(tx.value, 10) === 0) {
          return;
        }

        const success = tx.isError !== '1';

        const value = tokenAddress
          ? ethers.utils.formatUnits(tx.value, tx.tokenDecimals)
          : ethers.utils.formatUnits(tx.value, '18');

        const txData = {
          from: tx.from,
          to: tx.to,
          currency: tokenAddress ? tx.tokenSymbol : symbol,
          currencyType: tokenAddress ? 'token' : 'coin',
          timestamp: tx.timeStamp,
          success,
          txhash: tx.hash,
          value,
        };

        if (tokenAddress) {
          txData.tokenAddress = tx.tokenAddress;
        }

        if (tx.from.toLowerCase() === address.toLowerCase()) {
          txData.type = 'Send';
        } else {
          txData.type = 'Receive';
        }

        txs.push(txData);
      });

      return { success: true, result: { txs } };
    }
    if (result.length === 0) {
      return { success: true, result };
    }
    return { success: false, errors: [result] };
  } catch (error) {
    console.error(error);
    return { success: false, errors: ['An error occurred'] };
  }
};

// transactions history
exports.txDetails = async (data) => {
  const address = data.address;
  const platform = data.platform;
  const tokenAddress = data.tokenAddress;
  const txhash = data.txId;

  const platformProvider = config.ethereum.providers[platform];
  const baseUrl = platformProvider.api;
  const baseToken = platformProvider.apiToken;

  if (!baseUrl) {
    console.error('Get txs history. Base url missed', platform);
    return { success: false, errors: ['An error occurred'] };
  }

  if (!baseToken) {
    console.error('Get txs history. Base api key missed', platform);
    return { success: false, errors: ['An error occurred'] };
  }

  const url = `https://${baseUrl}/api?module=account&action=${
    tokenAddress ? 'tokentx' : 'txlist'
  }&address=${address}&startblock=1&endblock=99999999&sort=desc&apikey=${baseToken}`;

  try {
    const response = await axios(url);

    if (!response || !response.data) {
      console.error('TxsList request.', response);
      return {
        success: false,
        errors: ['TxsList request failed, unknow error'],
      };
    }

    const { result, status, message } = response.data;

    if (status === '1') {
      const symbol = getSymbolByPlatform(platform);

      const tx = result.find((tx) => tx.hash === txhash);

      if (tx) {
        const success = tx.isError !== '1';

        const value = tokenAddress
          ? ethers.utils.formatUnits(tx.value, tx.tokenDecimals)
          : ethers.utils.formatUnits(tx.value, '18');

        const txDetails = {
          title: 'Transaction Details',
          rows: [
            {
              title: 'Currency',
              value: {
                value: tokenAddress ? tx.tokenSymbol : symbol,
                type: 'string',
              },
            },
            {
              title: 'Currency Type',
              value: { value: tokenAddress ? 'Token' : 'Coin', type: 'string' },
            },
            {
              title: 'From',
              value: { value: tx.from, type: 'string' },
            },
            {
              title: 'To',
              value: { value: tx.to, type: 'string' },
            },
            {
              title: 'Value',
              value: { value, type: 'string' },
            },
            {
              title: 'Timestamp',
              value: { value: parseInt(tx.timeStamp, 10), type: 'date' },
            },
            {
              title: 'Success',
              value: {
                value: success,
                type: 'success',
              },
            },
            {
              title: 'Transaction Hash',
              value: {
                value: tx.hash,
                type: 'string',
              },
            },
            {
              title: 'Transaction Type',
              value: {
                value:
                  tx.from.toLowerCase() === address.toLowerCase()
                    ? 'Send'
                    : 'Receive',
                type: 'string',
              },
            },
          ],
        };

        if (tokenAddress) {
          txDetails.rows.push({
            title: 'Contract Address',
            value: {
              value: tx.tokenAddress,
              type: 'string',
            },
          });
        }
        return { success: true, result: { groups: [txDetails] } };
      }
      return { success: false, errors: [`Tx by hash ${txhash} not founded`] };
    }
    return { success: false, errors: [message] };
  } catch (error) {
    console.error(error);
    return { success: false, errors: ['An error occurred'] };
  }
};

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
      let to = tx.to.toLowerCase();
      let from = tx.from.toLowerCase();

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
      let topic = '';
      let tokenId = '';
      if (
        tx.data.length >= 138 &&
        tx.data.slice(0, 34) === '0xa9059cbb000000000000000000000000'
      ) {
        topic = 'transfer';
        to = `0x${tx.data.slice(34, 74)}`;
      } else if (
        tx.data.length >= 202 &&
        tx.data.slice(0, 34) === '0x23b872dd000000000000000000000000'
      ) {
        topic = 'transferFrom';
        from = `0x${tx.data.slice(34, 74)}`;
        to = `0x${tx.data.slice(98, 138)}`;
        tokenId = `0x${tx.data.slice(138, 202)}`;
      } else if (
        tx.data.length >= 138 &&
        tx.data.slice(0, 34) === '0xd3fc9864000000000000000000000000'
      ) {
        topic = 'mint';
        from = '0x0000000000000000000000000000000000000000';
        to = `0x${tx.data.slice(34, 74)}`;
        tokenId = `0x${tx.data.slice(74, 138)}`;
      } else if (
        tx.data.length >= 202 &&
        tx.data.slice(0, 34) === '0x42842e0e000000000000000000000000'
      ) {
        topic = 'safeTransferFrom';
        from = `0x${tx.data.slice(34, 74)}`;
        to = `0x${tx.data.slice(98, 138)}`;
        tokenId = `0x${tx.data.slice(138, 202)}`;
      } else if (
        tx.data.length >= 286 &&
        tx.data.slice(0, 34) === '0xb88d4fde000000000000000000000000'
      ) {
        topic = 'safeTransferFrom(data)';
        from = `0x${tx.data.slice(34, 74)}`;
        to = `0x${tx.data.slice(98, 138)}`;
        tokenId = `0x${tx.data.slice(138, 202)}`;
      }
      if (topic) {
        let tokenData;
        to = to.toLowerCase();
        from = from.toLowerCase();
        if (addresses[platform][from]) {
          tokenData = await exports.getTokenData({
            platform,
            tokenAddress: tx.to,
            tokenId: parseInt(tokenId, 16),
          });
          if (!tokenData.type) continue;
          for (const userId in addresses[platform][from]) {
            emitter.emit('update', {
              type: 'token',
              platform,
              address: addresses[platform][from][userId].address,
              clientId: addresses[platform][from][userId].clientId,
              walletId: addresses[platform][from][userId].walletId,
              tokenData,
              userId: addresses[platform][from][userId].userId,
            });
          }
          // Token transfer from tx.from, contract address tx.to
        }
        if (addresses[platform][to]) {
          tokenData = await exports.getTokenData({
            platform,
            tokenAddress: tx.to,
            tokenId: parseInt(tokenId, 16),
          });
          if (!tokenData.type) continue;
          for (const userId in addresses[platform][to]) {
            emitter.emit('update', {
              type: 'token',
              platform,
              address: addresses[platform][to][userId].address,
              clientId: addresses[platform][to][userId].clientId,
              walletId: addresses[platform][to][userId].walletId,
              tokenData,
              userId: addresses[platform][to][userId].userId,
            });
          }
        }
      }
    }
  } catch (e) {}
}

// get suitable for current platform provider safely
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
  const isBSC =
    platform === 'binance-smart-chain' ||
    platform === 'binance-smart-chain-testnet';
  return validateAddress(address, isBSC ? 'ethereum' : platform);
};
