const config = require(`${__dirname}/../config.js`).default;
const {
  getSymbolByPlatform,
  validateAddress,
} = require(`${__dirname}/../utils.js`);
const { ethers } = require('ethers');
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

(async () => {
  const address = '0xEBfb288d442809f1BA8aa8106fcf2DdE5d82C02C';
  const receiverAddress = '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9';
  const tokenAddress = '0x576b026afee8d41497ccbcff6e381747a737d260';
  const platform = 'ethereum-testnet';
  let value = Number(0.1);
  if (!(value > 0)) value = 0;
  const to = tokenAddress ? tokenAddress : receiverAddress;
  let tokenId = 0;
  const provider = getProvider(platform, 'Ethereum. Transfer. RPC url missed');

  const nonce = await provider.getTransactionCount(address);
  const gasPrice = await provider.getGasPrice();
  const chainId = 42;
  const tx = {
    to,
    from: address,
    data: '0x',
    gasLimit: 21000,
    nonce,
    value,
    gasPrice,
    chainId
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
    } else {
      return {success: false, errors: ['Unknown token', tokenData]};
    }
  } else {
    if (!(value > 0)) {
      return {
        success: false,
        errors: ['Value should be greater than zero'],
      };
    }
  }

  console.log(tx);
})().catch(console.error);


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

