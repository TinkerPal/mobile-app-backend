const axios = require('axios');

exports.default = async (req, res) => {
  try {
    const token = req.headers['authorization'];
    let headers = {
      'Authorization': token,
    };
    let response = await axios.get('https://login-wallet.etna.network/userinfo', {
      headers: headers,
    });
    const user = response.data;

    const post = {
      "client_id": "mIJGSRbP42svDJ85PlJb1kbgAWMaNMWQ",
      "client_secret": "VFUXSYah0KCUjue0zvllhtmFGprHs0Y4R8fMxe_4PNw1J4dYOYkqDJ1MtKDJwCTG",
      "audience": "https://login-wallet.us.auth0.com/api/v2/",
      "grant_type": "client_credentials"
    }
    headers = {
      'Content-Type': 'application/json'
    };

    response = await axios.post('https://login-wallet.us.auth0.com/oauth/token', post, {
      headers: headers
    });

    const accessToken = response.data;

    headers = {
      'Authorization': `${accessToken.token_type} ${accessToken.access_token}`,
    };

    response = await axios.get(`https://login-wallet.us.auth0.com/api/v2/users/${user.sub}/roles`, {
      headers: headers,
    });
    const roles = response.data;
    let restricted = true;
    if (Array.isArray(roles)) {
      roles.forEach(role => {
        if (role.name === 'admin') restricted = false;
      })
    }
    if (restricted) {
      res.status(401).send({error: 'Not authorized'});
      return;
    }

    res.send(accessToken);
  } catch (e) {
    console.error(e);
    res.status(500).send({error: 'Unknown error'});
  }
}