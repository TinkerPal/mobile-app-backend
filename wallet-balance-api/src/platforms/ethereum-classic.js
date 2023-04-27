const { validateAddress } = require(`${__dirname}/../utils.js`);

exports.getBalance = async (data) => {
  return {success: false};
  const { performance } = require('perf_hooks');
  const start = performance.now();
  const config = require(`${__dirname}/../config.js`).default;
  const axios = require('axios');
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
  const baseUrl = config.blockscout.baseUrl;
  if (!baseUrl) {
    console.error('Get balance. Base url missed', address, platform);
    return result;
  }
  const url = `${baseUrl}?module=account&action=eth_get_balance&address=${address}`;
  try {
    const response = await axios.get(url);
    if ('data' in response && 'result' in response.data) {
      result.success = true;
      result.balance = parseInt(response.data.result, 16) / 1e18;
    } else {
      console.error(
        'Get balance. Request to the balance provider failed.',
        address,
        platform,
        response.data
      );
    }
  } catch (error) {
    if (
      'response' in error &&
      'data' in error.response &&
      'error' in error.response.data &&
      error.response.data.error === 'Balance not found'
    ) {
      result.success = true;
      result.balance = '0';
    } else {
      console.error(
        'Get balance. Request to the balance provider failed.',
        address,
        platform,
        error
      );
    }
  }
  const end = performance.now();
  console.log(`Get balance, ${platform} , execution time ${end - start} ms`);
  return result;
};

exports.checkWalletValid = async (data) => {
  const { platform, address } = data;

  return validateAddress(address, platform);
};
