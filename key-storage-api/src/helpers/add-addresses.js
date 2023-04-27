// add addresses to address model from existed wallets
const singlePlatform = ''; // if not empty execute for single platform only

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
    const walletData = item.data;
    for (let walletId in walletData) {
      for (let platform in walletData[walletId].platforms) {
        if (singlePlatform && platform !== singlePlatform) continue;
        const address = walletData[walletId].platforms[platform].address;
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
    }
  };
}

// init()
// .catch(console.error);