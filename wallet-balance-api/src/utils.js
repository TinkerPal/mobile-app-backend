const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const bip32 = require('bip32');
const Buffer = require('safe-buffer').Buffer;
const bech32 = require('bech32');
const createHash = require('create-hash');
const basex = require('base-x');
const ethUtil = require('ethereumjs-util');
const { ethers } = require('ethers');
const WAValidator = require(`trezor-address-validator`);
const axios = require('axios');

const config = require(`${__dirname}/config.js`).default;

// helper for platforms cron() method run
exports.platformsCron = async (platforms, emitter) => {
  const promises = [];

  for (const platform in platforms) {
    if (typeof platforms[platform].cron === 'function') {
      promises.push(
        platforms[platform].cron({
          platform,
          emitter,
        })
      );
    }
  }

  Promise.allSettled(promises);
};

exports.formatBalanceResponse = (data) => {
  const result = [];
  for (const walletId in data) {
    const wallet = {
      id: walletId,
      name: data[walletId].name,
    };
    const blockchains = [];
    for (const platform in data[walletId].platforms) {
      const platformData = data[walletId].platforms[platform];
      const blockchain = {
        address: platformData.coin.address,
        id: platform,
        weight: config.weights[platform],
      };
      let referenceId = platform;
      let assetReferenceId = platform;
      if (referenceId.slice(-8) === '-testnet') {
        referenceId = platform.slice(0, -8);
        assetReferenceId = referenceId;
      }
      if (referenceId === 'binance-smart-chain') referenceId = 'binancecoin';
      blockchain.coin = {
        balance: platformData.coin.balance,
        id: platform,
        referenceId,
      };
      if (platformData.tokens) {
        blockchain.tokens = [];
        for (const tokenAddress in platformData.tokens) {
          const token = {
            tokenAddress,
            balance: platformData.tokens[tokenAddress].balance,
            type: platformData.tokens[tokenAddress].tokenData.type,
            id: platform,
            referenceId: assetReferenceId,
          };
          const tokenData = platformData.tokens[tokenAddress].tokenData;
          if (tokenData.name) {
            token.name = tokenData.name;
          }
          if (tokenData.symbol) {
            token.symbol = tokenData.symbol;
          }
          if ('tokenId' in tokenData) {
            token.tokenId = tokenData.tokenId;
          }
          if (tokenData.tokenURI) {
            token.tokenURI = tokenData.tokenURI;
          }
          if ('decimals' in tokenData) {
            token.decimals = tokenData.decimals;
          }
          if ('owner' in platformData.tokens[tokenAddress]) {
            token.owner = platformData.tokens[tokenAddress].owner;
          }
          blockchain.tokens.push(token);
        }
      }
      blockchains.push(blockchain);
    }
    blockchains.sort(function (a, b) {
      return a.weight - b.weight;
    });
    wallet.blockchains = blockchains;
    result.push(wallet);
  }
  return result;
};

exports.getSymbolByPlatform = (platform) => {
  const platformInfo = config.platforms.find((item) => item.id === platform);

  if (!platformInfo) return;

  return platformInfo.symbol;
};

exports.validateAddress = (address, platform) => {
  const platformConfig = config.platforms.find((pl) => pl.id === platform);
  const symbol = platformConfig.symbol;
  const isTestNet = platformConfig.mainNet ? 'prod' : 'testnet';

  return WAValidator.validate(address, symbol, isTestNet);
};

const cosmosBufferToAddress = (pubKey, hrp = 'cosmos') => {
  const pubKeyBuffer = Buffer.from(pubKey, 'hex');

  const sha256_ed = createHash('sha256').update(pubKeyBuffer).digest();
  const ripemd160_ed = createHash('rmd160').update(sha256_ed).digest();

  return bech32.encode(hrp, bech32.toWords(ripemd160_ed));
};

const convertRippleAdrr = (address) => {
  return basex(
    'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
  ).encode(
    basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').decode(
      address
    )
  );
};

const convertBitcoinPubkeyToAdrr = (publicKey, network) =>
  bitcoin.payments.p2pkh({
    pubkey: Buffer.from(publicKey, 'hex'),
    network,
  }).address;

const convertEthPubkeyToAdrr = (publicKey) => {
  if (publicKey.startsWith('0x')) {
    publicKey = publicKey.substring(2);
  }

  const ethPubkey = ethUtil.importPublic(Buffer.from(publicKey, 'hex'));
  const addressBuffer = ethUtil.publicToAddress(ethPubkey);
  let address = ethUtil.bufferToHex(addressBuffer);
  address = ethers.utils.getAddress(address);
  return address;
};

const convertTRXPubkeyToAdrr = (publicKey, addressTypes) => {
  const ethPubkey = ethUtil.importPublic(Buffer.from(publicKey, 'hex'));
  const addressBuffer = ethUtil.publicToAddress(ethPubkey);

  return bitcoin.address.toBase58Check(addressBuffer, addressTypes);
};

exports.getTokenHoldingByAddress = async (address, platform) => {
  if (!address || !platform) {
    return [];
  }

  const platformProvider = config.ethereum.providers[platform];
  if (!platformProvider) {
    return [];
  }

  const baseUrl = platformProvider.api;
  const baseToken = platformProvider.apiToken;

  if (!baseUrl || !baseToken) {
    return [];
  }

  const url = `https://${baseUrl}/api?module=account&action=tokentx&address=${address}&sort=desc&apikey=${baseToken}`;

  try {
    const response = await axios(url);
    if (!response || !response.data) {
      console.error('TxsList request.', response);
      return {
        success: false,
        errors: ['TxsList request failed, unknow error'],
      };
    }

    const { result, status } = response.data;

    if (result.length === 0) {
      return [];
    }

    if (status === '0') {
      return [];
    }

    const uniqueContracts = [
      ...new Set(result.map((tx) => tx.contractAddress)),
    ];

    const tokens = uniqueContracts.map((contractAddress) => {
      const token = result.find((tx) => tx.contractAddress === contractAddress);
      return {
        tokenAddress: token.contractAddress,
        type: 'erc20',
        name: token.tokenName,
        symbol: token.tokenSymbol,
        decimals: Number(token.tokenDecimal),
      };
    });

    return tokens;
  } catch (error) {
    return [];
  }
};

const ADDRESS_BY_PUBLIC_KEY = {
  bitcoin: {
    get: (publicKey) =>
      convertBitcoinPubkeyToAdrr(publicKey, config.platformsNetwork.bitcoin),
  },
  'bitcoin-testnet': {
    get: (publicKey) =>
      convertBitcoinPubkeyToAdrr(
        publicKey,
        config.platformsNetwork['bitcoin-testnet']
      ),
  },
  litecoin: {
    get: (publicKey) =>
      convertBitcoinPubkeyToAdrr(publicKey, config.platformsNetwork.litecoin),
  },
  dogecoin: {
    get: (publicKey) =>
      convertBitcoinPubkeyToAdrr(publicKey, config.platformsNetwork.dogecoin),
  },
  'bitcoin-cash': {
    get: (publicKey) =>
      convertBitcoinPubkeyToAdrr(publicKey, config.platformsNetwork.bitcoin),
  },
  cosmos: {
    get: (publicKey) => cosmosBufferToAddress(publicKey),
  },
  ripple: {
    get: (publicKey) =>
      convertRippleAdrr(
        convertBitcoinPubkeyToAdrr(publicKey, config.platformsNetwork.ripple)
      ),
  },
  tron: {
    get: (publicKey) => convertTRXPubkeyToAdrr(publicKey, 0x41),
  },
  'tron-testnet': {
    get: (publicKey) => convertTRXPubkeyToAdrr(publicKey, 0x41),
  },
  ethereum: {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'binance-smart-chain': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  binancecoin: {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'matic-network': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'ethereum-testnet': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'binance-smart-chain-testnet': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'matic-network-testnet': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
  'ethereum-classic': {
    get: (publicKey) => convertEthPubkeyToAdrr(publicKey),
  },
};

exports.getAddressByPublicKey = (publicKey, platform) => {
  try {
    return ADDRESS_BY_PUBLIC_KEY[platform].get(publicKey);
  } catch (e) {
    return '';
  }
};
