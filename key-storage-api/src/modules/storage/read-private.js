const axios = require('axios');

exports.default = async (data) => {
  try {
    const response = await axios.post('http://localhost:8508', {
      method: 'read',
      params: {
        model: 'private',
        id: data.userId,
      }
    });
    if (!response || !response.data || !response.data.success) {
      console.log('Read request to crud api failed', response);
      return {success: false, errors: ['An error occurred']};
    }
    return {success: true, data: response.data.data};
  } catch (error) {
    console.log('Read request to crud api failed', error);
    return {success: false, errors: ['An error occurred']};
  }
}