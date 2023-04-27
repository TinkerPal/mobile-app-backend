const config = require(`${__dirname}/../config.js`).default;
const {
  getSymbolByPlatform,
  validateAddress,
} = require(`${__dirname}/../utils.js`);
const axios = require('axios');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const bip32 = require('bip32');
const token = config.blockcypher.token;
const { DateTime } = require('luxon');
const BigNumber = require('bignumber.js');
const {performance} = require("perf_hooks");

const transfer = async () => {
  const privateData = {
    type: 'mnemonic',
    data: 'account hazard access chief credit despair warm sun angry jungle law quantum',
  };
  const receiverAddress = 'muZvLo6swWDB5JL4KcEWQcR3jVRV6QcFtY';
  const address = 'mhJ8LUHHRcXv2Sz79RqtPwEg3ZQPDpLfhB';
  const platform = 'bitcoin-testnet';
  value = 10000;

  let node;
  let network;
  if (privateData.type === 'mnemonic') {
    const seed = bip39.mnemonicToSeedSync(privateData.data);
    const rootNode = bip32.fromSeed(seed);
    let path;
    switch (platform) {
      case 'bitcoin':
        path = "m/44'/0'/0'/0/0";
        network = {
          baseNetwork: 'bitcoin',
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'bc',
          bip32: {
            public: 0x0295b43f,
            private: 0x0295b005,
          },
          pubKeyHash: 0x00,
          scriptHash: 0x05,
          wif: 0x80,
        };
        break;
      case 'litecoin':
        path = "m/44'/2'/0'/0/0";
        network = {
          baseNetwork: 'litecoin',
          messagePrefix: '\x19Litecoin Signed Message:\n',
          bech32: 'ltc',
          bip32: {
            public: 0x04b24746,
            private: 0x04b2430c,
          },
          pubKeyHash: 0x30,
          scriptHash: 0x32,
          wif: 0xb0,
        };
        break;
      case 'bitcoin-testnet':
        path = "m/44'/1'/0'/0/0";
        network = {
          baseNetwork: 'testnet',
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'tb',
          bip32: {
            public: 0x024289ef,
            private: 0x024285b5,
          },
          pubKeyHash: 0x6f,
          scriptHash: 0xc4,
          wif: 0xef,
        };
        break;
    }
    node = rootNode.derivePath(path);
  } else {
    node = bitcoin.ECPair.fromWIF(privateData.data);
  }

  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) {
    console.error('Transfer. Base url missed', platform);
    return { success: false, errors: [config.errorMessages.transfer] };
  }
  let tmpTx;
  try {
    const url = `${baseUrl}/txs/new?token=${token}`;
    const newTx = {
      inputs: [{ addresses: [address] }],
      outputs: [{ addresses: [receiverAddress], value }],
    };
    const response = await axios.post(url, newTx);
    tmpTx = response.data;
  } catch (error) {
    console.error(error);
    return { success: false, errors: [config.errorMessages.transfer] };
  }

  console.log('prepared tx', tmpTx);

  tmpTx.pubkeys = [];
  tmpTx.signatures = tmpTx.tosign.map((tosign, n) => {
    tmpTx.pubkeys.push(node.publicKey.toString('hex'));
    return bitcoin.script.signature
      .encode(node.sign(Buffer.from(tosign, 'hex')), 0x01)
      .toString('hex')
      .slice(0, -2);
  });

  console.log('signed tx', tmpTx)

  let result;
  try {
    const url = `${baseUrl}/txs/send?token=${token}`;
    const response = await axios.post(url, tmpTx);
    if (!response || !response.data || !response.data.tx) {
      console.error('Broadcast request. Empty response', response);
    }
    result = response.data;
  } catch (error) {
    console.error('Broadcast request failed', error);
    return { success: false, errors: [config.errorMessages.transfer] };
  }

  console.log('result', result)

  return { success: true, result };
};

transfer()
  .catch(console.error);