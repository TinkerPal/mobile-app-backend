const axios = require('axios');

exports.default = async (data) => {
  const userId = data.userId;
  const wallets = data.wallets;
  const walletId = data.walletId;
  try {
    const response = await axios.post('http://localhost:8508', {
      method: 'updateOrCreate',
      params: {
        model: 'wallet',
        id: userId,
        data: wallets,
      }
    });
    if (!response || !response.data || !response.data.success) {
      console.log('updateOrCreate request to crud api failed', response);
      return {success: false, errors: ['An error occurred']};
    }
  } catch (e) {
    console.log('updateOrCreate request to crud api failed', e);
    return {success: false, errors: ['An error occurred']};
  }

  for (let platform in wallets[walletId].platforms) {
    try {
      await axios.post('http://localhost:8508', {
        method: 'createCustom',
        params: {
          model: 'address',
          data: {
            userId: userId,
            platform: platform,
            walletId: walletId,
            address: wallets[walletId].platforms[platform].address,
          }
        }
      });
    } catch (e) {
      console.log('updateCustom request to crud api failed', e);
    }
  }
  return {success: true};
}