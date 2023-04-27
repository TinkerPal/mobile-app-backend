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
  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) {
    console.error('Get balance. Base url missed', platform);
    return result;
  }
  const url = `${baseUrl}/addrs/${address}/balance?token=${token}`;
  try {
    const response = await axios.get(url);
    if ('data' in response && 'balance' in response.data) {
      result.success = true;
      result.balance = new BigNumber(response.data.balance / 1e8);
    } else {
      console.error(
        'Get balance. Request to the balance provider failed.',
        address,
        platform,
        response
      );
    }
  } catch (e) {
    console.error(
      'Get balance. Request to the balance provider failed.',
      address,
      platform,
      e
    );
  }
  const end = performance.now();
  console.log(`Get balance, ${platform} , execution time ${end - start} ms`);
  return result;
};

exports.onRestart = async (data) => {
  if (process.env.APP_ENV === 'local') {
    console.log('On restart. Skipped for local environment');
    return { success: true };
  }
  const platform = data.platform;

  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) return { success: false };
  let url = `${baseUrl}/hooks?token=${token}`;
  try {
    const response = await axios.get(url);
    for (let i = 0; i < response.data.length; i++) {
      const item = response.data[i];
      url = `${baseUrl}/hooks/${item.id}?token=${token}`;
      try {
        await axios.delete(url);
      } catch (e) {
        console.error(`Delete request to ${url} failed`, e);
        return { success: false };
      }
    }
  } catch (e) {
    console.error(`Request to ${url} failed`, e);
  }

  return { success: true };
};

exports.onConnect = async (data) => {
  if (process.env.APP_ENV === 'local') {
    console.log('On connect. Skipped for local environment');
    return { success: true };
  }
  const address = data.address;
  const platform = data.platform;
  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) return { success: false };
  const url = `${baseUrl}/hooks?token=${token}`;
  const post = {
    event: 'confirmed-tx',
    address,
    url: `https://wlt-api.etna.network/blockcypher/${platform}/${address}`,
  };
  try {
    const response = await axios.post(url, post);
    if (response.data.id) {
      return {
        success: true,
        hookId: response.data.id,
      };
    }
    console.error(`Request to ${url} failed, no id provided`, response.data);
    return { success: false };
  } catch (e) {
    console.error(`Request to ${url} failed`, e);
    return { success: false };
  }
};

exports.onImport = async (data) => {
  return await exports.onConnect(data);
};

exports.onDisconnect = async (data) => {
  if (process.env.APP_ENV === 'local') {
    console.log('On disconnect. Skipped for local environment');
    return { success: true };
  }
  const platform = data.platform;
  const runtimeData = data.runtimeData;
  if (!runtimeData.hookId) return { success: false };
  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) return { success: false };
  const url = `${baseUrl}/hooks/${runtimeData.hookId}?token=${token}`;
  try {
    await axios.delete(url);
  } catch (e) {
    console.error(`Delete hook request to ${url} failed`, e);
    return { success: false };
  }
  return { success: true };
};

exports.transfer = async (data) => {
  const privateData = data.privateData;
  const receiverAddress = data.receiverAddress;
  const address = data.address;
  const platform = data.platform;
  let value = Number(data.value);
  if (!(value > 0))
    return { success: false, errors: ['Value should be greater than zero'] };
  value = Math.floor(value * 1e8);

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

  tmpTx.pubkeys = [];
  tmpTx.signatures = tmpTx.tosign.map((tosign, n) => {
    tmpTx.pubkeys.push(node.publicKey.toString('hex'));
    return bitcoin.script.signature
      .encode(node.sign(Buffer.from(tosign, 'hex')), 0x01)
      .toString('hex')
      .slice(0, -2);
  });

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

  return { success: true, result };
};

exports.prepareTransaction = async (data) => {
  const receiverAddress = data.receiverAddress;
  const address = data.address;
  const platform = data.platform;
  let value = Number(data.value);
  if (!(value > 0))
    return { success: false, errors: ['Value should be greater than zero'] };
  value = Math.floor(value * 1e8);

  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) {
    console.error('Transfer. Base url missed', platform);
    return { success: false, errors: [config.errorMessages.transfer] };
  }
  let txPrepared;
  try {
    const url = `${baseUrl}/txs/new?token=${token}`;
    const newTx = {
      inputs: [{ addresses: [address] }],
      outputs: [{ addresses: [receiverAddress], value }],
    };
    const response = await axios.post(url, newTx);
    txPrepared = response.data;
    if (txPrepared.tosign) return { success: true, tx: txPrepared.tx, tosign: txPrepared.tosign};
    else return { success: false, errors: ['Transaction prepare request failed'] };
  } catch (error) {
    console.error(error);
    return { success: false, errors: [config.errorMessages.transfer] };
  }
};

exports.sendTransaction = async (data) => {
  const signedTx = {
    tx: data.tx,
    tosign: data.tosign,
    signatures: data.signatures,
    pubkeys: data.pubkeys,
  }

  const platform = data.platform;

  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) {
    console.error('Transfer. Base url missed', platform);
    return { success: false, errors: [config.errorMessages.transfer] };
  }

  let result;
  try {
    const url = `${baseUrl}/txs/send?token=${token}`;
    const response = await axios.post(url, signedTx);
    if (!response || !response.data || !response.data.tx) {
      console.error('Broadcast request. Empty response', response);
    }
    result = response.data;
  } catch (error) {
    console.error('Broadcast request failed', error);
    return { success: false, errors: [config.errorMessages.transfer] };
  }

  return { success: true, result };
};

// transactions history
exports.txsHistory = async (data) => {
  const platform = data.platform;
  const address = data.address;
  const baseUrl = config.blockcypher.baseUrls[platform];
  if (!baseUrl) {
    console.error('Get txs history. Base url missed', platform);
    return { success: false, errors: ['An error occurred'] };
  }
  const url = `${baseUrl}/addrs/${address}/full?limit=50&token=${token}&confirmations=7`;
  let result;
  try {
    const response = await axios(url);
    result = response.data;
  } catch (error) {
    console.log(error);
    return { success: false, errors: ['An error occurred'] };
  }

  const symbol = getSymbolByPlatform(platform);

  const txs = [];
  result.txs.forEach((tx) => {
    const dt = DateTime.fromISO(tx.received);
    const txData = {
      currency: symbol,
      timestamp: dt.valueOf(),
      success: true,
      txhash: tx.hash,
    };

    const input = tx.inputs.find((input) => input.addresses.includes(address));

    if (input) {
      txData.type = 'Send';
      txData.value = new BigNumber(input.output_value / 1e8);
      txs.push(txData);
    } else {
      const output = tx.outputs.find((output) =>
        output.addresses.includes(address)
      );

      if (output) {
        txData.type = 'Receive';
        txData.value = new BigNumber(output.value / 1e8);
        txs.push(txData);
      }
    }
  });
  result = {
    txs,
  };
  return { success: true, result };
};

// transactions history
exports.txDetails = async (data) => {
  const address = data.address;
  const platform = data.platform;
  const tokenAddress = data.tokenAddress;
  const txhash = data.txId;

  const baseUrl = config.blockcypher.baseUrls[data.platform];
  if (!baseUrl) {
    console.error('Get tx details. Base url missed', data.platform);
    return { success: false, errors: ['An error occurred'] };
  }
  const url = `${baseUrl}/txs/${data.txId}?token=${token}`;

  let tx;
  try {
    const response = await axios(url);
    tx = response.data;
  } catch (error) {
    console.log(error);
    return { success: false, errors: ['An error occurred'] };
  }

  if (tx.error) {
    return { success: false, errors: [tx.error] };
  }

  const input = tx.inputs.find((input) => input.addresses.includes(address));
  const output = tx.outputs.find((output) =>
    output.addresses.includes(address)
  );

  let type, value;
  if (input && output) {
    type = 'Send';
    value = new BigNumber(tx.total / 1e8);
    // value = new BigNumber((input.output_value - output.value) / 1e8);
  } else if (input) {
    type = 'Send';
    value = new BigNumber(tx.total / 1e8);
    // value = new BigNumber(input.output_value / 1e8);
  } else if (output) {
    type = 'Receive';
    value = new BigNumber(tx.total / 1e8);
    // value = new BigNumber(output.value / 1e8);
  }

  let from = [];
  tx.inputs.forEach((input) => {
    from = [...from, ...input.addresses];
  });

  let to = [];
  tx.outputs.forEach((output) => {
    to = [...to, ...output.addresses];
  });

  const txDetails = {
    title: 'Transaction Details',
    rows: [
      {
        title: 'Currency',
        value: { value: getSymbolByPlatform(platform), type: 'string' },
      },
      {
        title: 'Currency Type',
        value: { value: 'Coin', type: 'string' },
      },
      {
        title: 'From',
        value: { value: from, type: 'array' },
      },
      {
        title: 'To',
        value: { value: to, type: 'array' },
      },
      {
        title: 'Value',
        value: { value, type: 'string' },
      },
      {
        title: 'Timestamp',
        value: { value: DateTime.fromISO(tx.received).valueOf(), type: 'date' },
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
          value: type,
          type: 'string',
        },
      },
    ],
  };
  return { success: true, result: { groups: [txDetails] } };
};

exports.checkWalletValid = async (data) => {
  const { platform, address } = data;

  return validateAddress(address, platform);
};
