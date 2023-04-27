const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const bip32 = require('bip32');
const Buffer = require('safe-buffer').Buffer;
const {bech32} = require('bech32');
const createHash = require('create-hash');
const basex = require('base-x');
const ethUtil = require('ethereumjs-util');
const {ethers} = require("ethers");

exports.default = (mnemonic) => {
  if (mnemonic && !bip39.validateMnemonic(mnemonic)) {
    return {
      isResponseObject: true,
      status: 200,
      response: {
        success: false,
        errors: ['Mnemonic phrase is not valid'],
      }
    };
  }
  if (!mnemonic) mnemonic = bip39.generateMnemonic();

  const platforms = {};
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);
  const BIP32RootKey = root.toBase58();
  let node, network, address, privateKey, publicKey;

  node = root.derivePath("m/44'/0'/0'/0/0");
// privateKey = node.toWIF();
// publicKey = node.publicKey.toString('hex');
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
  platforms['bitcoin'] = {
    address: bitcoin.payments.p2pkh({pubkey: node.publicKey}).address,
  };

  node = root.derivePath("m/44'/1'/0'/0/0");
// privateKey = node.toWIF();
// publicKey = node.publicKey.toString('hex');
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
  platforms['bitcoin-testnet'] = {
    address: bitcoin.payments.p2pkh({pubkey: node.publicKey, network}).address,
  };

  node = root.derivePath("m/44'/2'/0'/0/0");
// privateKey = node.toWIF();
// publicKey = node.publicKey.toString('hex');
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
  platforms['litecoin'] = {
    address: bitcoin.payments.p2pkh({pubkey: node.publicKey, network}).address,
  };

  node = root.derivePath("m/44'/3'/0'/0/0");
// privateKey = node.toWIF();
// publicKey = node.publicKey.toString('hex');
  network = {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bip32: {
      public: 0x02facafd,
      private: 0x02fac398
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e
  };
  platforms['dogecoin'] = {
    address: bitcoin.payments.p2pkh({pubkey: node.publicKey, network}).address,
  };

  node = root.derivePath("m/44'/145'/0'/0/0");
// privateKey = node.toWIF();
// publicKey = node.publicKey.toString('hex');
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

// npm install bchaddrjs for not legacy formats

  platforms['bitcoin-cash'] = {
    address: bitcoin.payments.p2pkh({pubkey: node.publicKey}).address,
  };

  node = root.derivePath("m/44'/118'/0'/0/0");
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

  function CosmosBufferToPublic(pubBuf, hrp = "cosmos") {
    const AminoSecp256k1PubkeyPrefix = Buffer.from("EB5AE987", "hex");
    const AminoSecp256k1PubkeyLength = Buffer.from("21", "hex");
    pubBuf = Buffer.concat([AminoSecp256k1PubkeyPrefix, AminoSecp256k1PubkeyLength, pubBuf]);
    return bech32.encode(`${hrp}pub`, bech32.toWords(pubBuf));
  }

  function CosmosBufferToAddress(pubBuf, hrp = "cosmos") {
    const sha256_ed = createHash("sha256").update(pubBuf).digest();
    const ripemd160_ed = createHash("rmd160").update(sha256_ed).digest();
    return bech32.encode(hrp, bech32.toWords(ripemd160_ed));
  }

// privateKey = node.privateKey.toString("base64");
// publicKey = CosmosBufferToPublic(node.publicKey);
  platforms['cosmos'] = {
    address: CosmosBufferToAddress(node.publicKey),
  };

  node = root.derivePath("m/44'/144'/0'/0/0");
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

  function convertRippleAdrr(address) {
    return basex('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz').encode(
      basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').decode(address)
    )
  }

  function convertRipplePriv(priv) {
    return basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').decode(priv).toString("hex").slice(2, 66)
  }

// publicKey = node.publicKey.toString('hex');
// privateKey = convertRipplePriv(node.toWIF());
  address = convertRippleAdrr(bitcoin.payments.p2pkh({pubkey: node.publicKey, network}).address);
  platforms['ripple'] = {
    address: address,
  };

  node = root.derivePath("m/44'/195'/0'/0/0");
// publicKey = node.publicKey.toString('hex');
// privateKey = node.privateKey.toString('hex');
  let ethPubkey = ethUtil.importPublic(node.publicKey);
  let addressBuffer = ethUtil.publicToAddress(ethPubkey);
  address = bitcoin.address.toBase58Check(addressBuffer, 0x41);
  platforms['tron'] = {
    address: address,
  };

  node = root.derivePath("m/44'/1'/0'/0/0");
// publicKey = node.publicKey.toString('hex');
// privateKey = node.privateKey.toString('hex');
  ethPubkey = ethUtil.importPublic(node.publicKey);
  addressBuffer = ethUtil.publicToAddress(ethPubkey);
  address = bitcoin.address.toBase58Check(addressBuffer, 0x41);
  platforms['tron-testnet'] = {
    address: address,
  };

  const rootEth = ethers.utils.HDNode.fromMnemonic(mnemonic);

  node = rootEth.derivePath("m/44'/60'/0'/0/0");
// publicKey = node.publicKey;
// privateKey = node.privateKey;
  platforms['ethereum'] = {
    address: node.address,
  };
  platforms['binance-smart-chain'] = {
    address: node.address,
  };
  platforms['matic-network'] = {
    address: node.address,
  };

  node = rootEth.derivePath("m/44'/1'/0'/0/0");
// publicKey = node.publicKey;
// privateKey = node.privateKey;
  platforms['ethereum-testnet'] = {
    address: node.address,
  };
  platforms['binance-smart-chain-testnet'] = {
    address: node.address,
  };
  platforms['matic-network-testnet'] = {
    address: node.address,
  };

  node = rootEth.derivePath("m/44'/61'/0'/0/0");
// publicKey = node.publicKey;
// privateKey = node.privateKey;
  platforms['ethereum-classic'] = {
    address: node.address,
  };

  return {
    success: true,
    data: {
      mnemonic: mnemonic,
      platforms: platforms,
    }
  }
}