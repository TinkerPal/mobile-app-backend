const { networks } = require('bitcoinjs-lib');

exports.default = {
  trongrid: {
    apiKey: 'd8417ca2-654b-4508-881f-bb45d4cea419',
    privateKey:
      'f44f47cd3f319e0c1ed23349c8bdc9940724e984b137775bc581686fdad788c2',
    baseUrls: {
      tron: 'https://api.trongrid.io',
      'tron-testnet': 'https://api.shasta.trongrid.io',
    },
  },
  blockcypher: {
    token: '7d10642592d942cfacac0427421ef967',
    baseUrls: {
      bitcoin: 'https://api.blockcypher.com/v1/btc/main',
      'bitcoin-testnet': 'https://api.blockcypher.com/v1/btc/test3',
      dogecoin: 'https://api.blockcypher.com/v1/doge/main',
      litecoin: 'https://api.blockcypher.com/v1/ltc/main',
    },
  },
  errorMessages: {
    balance: 'Request to the balance provider failed.',
    transfer: 'Request to the transfer provider failed.',
  },
  ethereum: {
    providers: {
      ethereum: {
        rpc: `https://mainnet.infura.io/v3/${
          process.env.CONFIG_INFURA_KEY || 'a8192b3af98c4fa7b02136e60c754897'
        }`,
        wss: `wss://mainnet.infura.io/ws/v3/${
          process.env.CONFIG_INFURA_KEY || 'a8192b3af98c4fa7b02136e60c754897'
        }`,
        api: 'api.etherscan.io',
        apiToken: 'MXSIWQCFRDWS7PIUMX499V5B7W9CM3V2ZQ',
      },
      'ethereum-testnet': {
        rpc: `https://kovan.infura.io/v3/${
          process.env.CONFIG_INFURA_KEY || 'a8192b3af98c4fa7b02136e60c754897'
        }`,
        wss: `wss://kovan.infura.io/ws/v3/${
          process.env.CONFIG_INFURA_KEY || 'a8192b3af98c4fa7b02136e60c754897'
        }`,
        api: 'api-kovan.etherscan.io',
        apiToken: '7Q6E3R8NT54NC6D1P6PQHFXB28MNQY7TYM',
      },
      'binance-smart-chain': {
        rpc: 'https://proud-patient-forest.bsc.quiknode.pro/8fffb4d84f42ec02686c35631b566c819138e876/',
        wss: 'wss://proud-patient-forest.bsc.quiknode.pro/8fffb4d84f42ec02686c35631b566c819138e876/',
        api: 'api.bscscan.com',
        apiToken: 'PSTZJXKDW33PZI8N6FJDWVYZ5CD2AK7362',
      },
      'binance-smart-chain-testnet': {
        rpc: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
        wss: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
        api: 'api-testnet.bscscan.com',
        apiToken: 'PSTZJXKDW33PZI8N6FJDWVYZ5CD2AK7362',
      },
      'matic-network': {
        rpc: 'https://polygon-mainnet.infura.io/v3/be027e0e934d47afb2f332cf6a8d8d8c',
        // wss: 'https://polygon-mainnet.infura.io/v3/be027e0e934d47afb2f332cf6a8d8d8c',
        api: 'api.polygonscan.com',
        apiToken: 'F1PQ752FZMGWKUW6YG1M73ZNG4RZAVHW1T',
      },
      'matic-network-testnet': {
        rpc: 'https://rpc-mumbai.maticvigil.com/v1/32385c1e67e34d639ee02cc1b491ff9c8220c47b',
        // wss: 'wss://rpc-mumbai.maticvigil.com/ws/v1/32385c1e67e34d639ee02cc1b491ff9c8220c47b',
        api: 'api-testnet.polygonscan.com',
        apiToken: 'F1PQ752FZMGWKUW6YG1M73ZNG4RZAVHW1T',
      },
    },
  },
  fullstack: {
    baseUrl: 'https://api.fullstack.cash/v4',
  },
  blockscout: {
    baseUrl: 'https://blockscout.com/etc/mainnet/api',
  },
  weights: {
    bitcoin: 0,
    'bitcoin-testnet': 1,
    litecoin: 7,
    dogecoin: 16,
    'bitcoin-cash': 8,
    cosmos: 12,
    ripple: 13,
    tron: 10,
    'tron-testnet': 11,
    ethereum: 3,
    binancecoin: 2,
    'binance-smart-chain': 5,
    'matic-network': 14,
    'matic-network-testnet': 15,
    'ethereum-testnet': 4,
    'binance-smart-chain-testnet': 6,
    'ethereum-classic': 9,
  },
  platformsNetwork: {
    bitcoin: networks.bitcoin,
    'bitcoin-testnet': networks.testnet,
    litecoin: {
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
    },
    dogecoin: {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bip32: {
        public: 0x02facafd,
        private: 0x02fac398,
      },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e,
    },
    ripple: {
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
    },
  },
  chainIds: {
    ethereum: 1,
    'ethereum-testnet': 42,
    'binance-smart-chain': 56,
    'binance-smart-chain-testnet': 97,
    'matic-network': 137,
    'matic-network-testnet': 80001,
  },
  platforms: [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      weight: 0,
      mainNet: true,
      hdWalletPath: "m / 44' / 0' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'bitcoin-testnet',
      name: 'Bitcoin testnet',
      symbol: 'BTC',
      weight: 1,
      mainNet: false,
      hdWalletPath: "m / 44' / 1' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'binancecoin',
      name: 'Binance Coin',
      symbol: 'BNB',
      weight: 2,
      mainNet: true,
      hdWalletPath: "m / 44' / 714' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      weight: 2,
      mainNet: true,
      hdWalletPath: "m / 44' / 60' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 1,
    },
    {
      id: 'ethereum-testnet',
      name: 'Ethereum testnet',
      symbol: 'ETH',
      weight: 3,
      mainNet: false,
      hdWalletPath: "m / 44' / 1' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 42,
    },
    {
      id: 'binance-smart-chain',
      name: 'Binance Smart Chain',
      symbol: 'BNB',
      weight: 4,
      mainNet: true,
      hdWalletPath: "m / 44' / 60' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 56,
    },
    {
      id: 'binance-smart-chain-testnet',
      name: 'Binance Smart Chain testnet',
      symbol: 'BNB',
      weight: 5,
      mainNet: false,
      hdWalletPath: "m / 44' / 1' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 97,
    },
    {
      id: 'litecoin',
      name: 'Litecoin',
      symbol: 'LTC',
      weight: 6,
      mainNet: true,
      hdWalletPath: "m / 44' / 2' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'bitcoin-cash',
      name: 'Bitcoin Cash',
      symbol: 'BCH',
      weight: 7,
      mainNet: true,
      hdWalletPath: "m / 44' / 145' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'ethereum-classic',
      name: 'Ethereum Classic',
      symbol: 'ETC',
      weight: 8,
      mainNet: true,
      hdWalletPath: "m / 44' / 61' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'tron',
      name: 'Tron',
      symbol: 'TRX',
      weight: 9,
      mainNet: true,
      hdWalletPath: "m / 44' / 195' / 0' / 0 / 0",
      supportedTokens: ['erc10', 'erc20'],
    },
    {
      id: 'tron-testnet',
      name: 'Tron testnet',
      symbol: 'TRX',
      weight: 9,
      mainNet: false,
      hdWalletPath: "m / 44' / 1' / 0' / 0 / 0",
      supportedTokens: ['erc10', 'erc20'],
    },
    {
      id: 'cosmos',
      name: 'Cosmos',
      symbol: 'Atom',
      weight: 10,
      mainNet: true,
      hdWalletPath: "m / 44' / 118' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'ripple',
      name: 'Ripple',
      symbol: 'XRP',
      weight: 11,
      mainNet: true,
      hdWalletPath: "m / 44' / 144' / 0' / 0 / 0",
      supportedTokens: [],
    },
    {
      id: 'matic-network',
      name: 'Matic',
      symbol: 'MATIC',
      weight: 12,
      mainNet: true,
      hdWalletPath: "m / 44' / 60' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 137,
    },
    {
      id: 'matic-network-testnet',
      name: 'Matic testnet',
      symbol: 'MATIC',
      weight: 13,
      mainNet: false,
      hdWalletPath: "m / 44' / 1' / 0' / 0 / 0",
      supportedTokens: ['erc20', 'erc721'],
      chainId: 80001,
    },
    {
      id: 'dogecoin',
      name: 'Dogecoin',
      symbol: 'Doge',
      weight: 14,
      mainNet: true,
      hdWalletPath: "m / 44' / 3' / 0' / 0 / 0",
      supportedTokens: [],
    },
  ],
  coins: [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      weight: 0,
    },
    {
      id: 'binancecoin',
      name: 'Binance Coin',
      symbol: 'BNB',
      weight: 2,
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      weight: 2,
    },
    {
      id: 'litecoin',
      name: 'Litecoin',
      symbol: 'LTC',
      weight: 6,
    },
    {
      id: 'bitcoin-cash',
      name: 'Bitcoin Cash',
      symbol: 'BCH',
      weight: 7,
    },
    {
      id: 'ethereum-classic',
      name: 'Ethereum Classic',
      symbol: 'ETC',
      weight: 8,
    },
    {
      id: 'tron',
      name: 'Tron',
      symbol: 'TRX',
      weight: 9,
    },
    {
      id: 'cosmos',
      name: 'Cosmos',
      symbol: 'Atom',
      weight: 10,
    },
    {
      id: 'ripple',
      name: 'Ripple',
      symbol: 'XRP',
      weight: 11,
    },
    {
      id: 'matic-network',
      name: 'Matic',
      symbol: 'MATIC',
      weight: 12,
    },
    {
      id: 'dogecoin',
      name: 'Dogecoin',
      symbol: 'Doge',
      weight: 14,
    },
  ],
  currencies: {
    usd: {
      prefix: '$',
      suffix: '',
    },
    eur: {
      prefix: '€',
      suffix: '',
    },
  },
};