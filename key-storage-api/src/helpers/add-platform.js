// Add platform to existed wallets and address model
const platform = 'tron-testnet';

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
const { ethers } = require("ethers");
const axios = require('axios');

const init = async () => {
  const response = await axios.post('http://localhost:8508', {
    method: 'find',
    params: {
      model: 'wallet',
      search: {},
    }
  });
  if (!response || !response.data || !response.data.success || !response.data.data) {
    console.log('Find request to crud api failed', response);
    return;
  }

  for (let i = 0; i < response.data.data.length; i ++) {
    const item = response.data.data[i];
    // if (item.id !== 'auth0|60f2b6ade382ae00689800ff') continue;
    const result = await axios.post('http://localhost:8508', {
      method: 'read',
      params: {
        model: 'private',
        id: item.id,
      }
    });
    if (!result || !result.data || !result.data.success || !result.data.data) {
      console.error('An error occurred', item.id, result);
      continue;
    }
    const privateData = result.data.data;
    const walletData = item.data;
    for (let walletId in walletData) {
      if (privateData[walletId].type !== 'mnemonic') continue;
      const mnemonic = privateData[walletId].data;
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = bip32.fromSeed(seed);
      let node, address, privateKey, publicKey;
      node = root.derivePath("m/44'/1'/0'/0/0");
      // publicKey = node.publicKey.toString('hex');
      // privateKey = node.privateKey.toString('hex');
      const ethPubkey = ethUtil.importPublic(node.publicKey);
      const addressBuffer = ethUtil.publicToAddress(ethPubkey);
      address = bitcoin.address.toBase58Check(addressBuffer, 0x41);
      walletData[walletId].platforms[platform] = {
        address: address,
      }

      await axios.post('http://localhost:8508', {
        method: 'update',
        params: {
          model: 'wallet',
          id: item.id,
          data: walletData,
        }
      });
      await axios.post('http://localhost:8508', {
        method: 'createCustom',
        params: {
          model: 'address',
          data: {
            userId: item.id,
            platform: platform,
            walletId: walletId,
            address: address,
          },
        }
      });
    }
  };
}

// init()
// .catch(console.error);