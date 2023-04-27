const BigNumber = require('bignumber.js');
const { validateAddress } = require(`${__dirname}/../utils.js`);
const config = require(`${__dirname}/../config.js`).default;
const axios = require('axios');

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
  const baseUrl = config.fullstack.baseUrl;
  if (!baseUrl) {
    console.error('Get balance. Base url missed', address, platform);
    return result;
  }

  const url = `${baseUrl}/electrumx/balance/${address}`;

  try {
    const response = await axios.get(url);
    if (
      'data' in response &&
      'balance' in response.data &&
      'confirmed' in response.data.balance
    ) {
      result.success = true;
      result.balance = new BigNumber(
        Number(response.data.balance.confirmed) / 1e8
      );
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

exports.checkWalletValid = async (data) => {
  const { address } = data;

  return validateAddress(address, 'bitcoin');
};
