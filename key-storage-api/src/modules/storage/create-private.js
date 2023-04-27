const axios = require('axios');

exports.default = async (data) => {
  try {
    const response = await axios.post('http://localhost:8508', {
      method: 'create',
      params: {
        model: 'private',
        id: data.userId,
        data: data.data,
      }
    });
    if (!response || !response.data || !response.data.success) {
      console.log('update request to crud api failed', response);
      return {isResponseObject: true, status: 500, response: {success: false, errors: ['An error occurred']}};
    }
    return {success: true};
  } catch (error) {
    console.log('update request to crud api failed', error);
    return {isResponseObject: true, status: 500, response: {success: false, errors: ['An error occurred']}};
  }
}