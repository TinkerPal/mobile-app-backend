const axios = require('axios');

exports.default = async (data) => {
  let headers = {
    'Authorization': data.token,
  };
  let response;
  try {
    response = await axios.get('https://login-wallet.etna.network/userinfo', {
      headers: headers,
    });
    if (response && response.data) return {success: true, data: response.data};
    return {success: false};
  } catch (e) {
    console.log('Request to https://login-wallet.etna.network/userinfo failed', e);
    return {success: false};
  }
}