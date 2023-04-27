const axios = require('axios');

exports.default = async (data) => {
  try {
    const response = await axios.post('http://localhost:8508', {
      method: 'read',
      params: {
        model: 'wallet',
        id: data.userId,
      }
    });
    if (!response || !response.data) {
      console.log('Read request to crud api failed', response);
      return {success: false, errors: ['An error occurred']};
    }
    if (!response.data.success) {
      console.log('Read request to crud api failed', response);
      return {success: false, errors: ['Wallets record is not found']};
    }
    return {success: true, data: response.data.data};
  } catch (error) {
    console.log('Read request to crud api failed', error);
    return {success: false, errors: ['An error occurred']};
  }
}