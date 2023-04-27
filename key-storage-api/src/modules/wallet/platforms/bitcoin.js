const bitcoin = require('bitcoinjs-lib');
const crypto = require("crypto");

exports.importFlat = async (data) => {
  let node;
  try {
    if (data.privateKey) {
      node = bitcoin.ECPair.fromWIF(
        data.privateKey,
      );
    } else {
      return {isResponseObject: true, status: 200, response: {success: false, errors: [`Please provide with a private key in WIF format for ${data.platform} platform`]}};
    }

    const walletId = crypto.createHash("sha256")
      .update(`${data.privateKey}-${data.platform}`)
      .digest("hex");
    if (data.wallets[walletId]) {
      return {isResponseObject: true, status: 200, response: {success: false, errors: [`Wallet with this private key for a platform ${data.platform} already exists`]}};
    }

    let network;
    switch (data.platform) {
      case 'bitcoin':
        network = {
          baseNetwork: "bitcoin",
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'bc',
          bip32: {
            public: 0x0295b43f,
            private: 0x0295b005
          },
          pubKeyHash: 0x00,
          scriptHash: 0x05,
          wif: 0x80
        };
        break;
      case 'litecoin':
        network = {
          baseNetwork: "litecoin",
          messagePrefix: '\x19Litecoin Signed Message:\n',
          bech32: 'ltc',
          bip32: {
            public: 0x04b24746,
            private: 0x04b2430c
          },
          pubKeyHash: 0x30,
          scriptHash: 0x32,
          wif: 0xb0
        };
        break;
      case 'bitcoin-testnet':
        network = {
          baseNetwork: "testnet",
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'tb',
          bip32: {
            public: 0x024289ef,
            private: 0x024285b5
          },
          pubKeyHash: 0x6f,
          scriptHash: 0xc4,
          wif: 0xef
        };
        break;
    }

    const platforms = {};
    platforms[data.platform] = {
      address: bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address,
    };

    return {
      success: true,
      walletId: walletId,
      data: {
        privateKey: data.privateKey,
        platforms: platforms,
      }
    }
  } catch (e) {
    console.log('import bitcoin.js try-catch', e);
    return {isResponseObject: true, status: 200, response: {success: false, errors: [`Private key is not valid`]}};
  }
}