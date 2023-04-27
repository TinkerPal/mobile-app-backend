const axios = require("axios");
const mimeTypes = require("mime-types");

const getUserByToken = async (token) => {
  const GET_OPTIONS = {
    headers: {
      Authorization: token,
    },
  };
  try {
    const res = await axios.get(
      "https://login-wallet.etna.network/userinfo",
      GET_OPTIONS
    );
    return res.data;
  } catch (e) {
    console.log("User request failed: ", e);
  }
};

exports.getFileFormatByMimeType = (mimeType) => {
  return mimeTypes.extension(mimeType);
};

const getOAuthToken = async () => {
  const POST_BODY = {
    "client_id": "mIJGSRbP42svDJ85PlJb1kbgAWMaNMWQ",
    "client_secret": "VFUXSYah0KCUjue0zvllhtmFGprHs0Y4R8fMxe_4PNw1J4dYOYkqDJ1MtKDJwCTG",
    "audience": "https://login-wallet.us.auth0.com/api/v2/",
    "grant_type": "client_credentials"
  };

  const POST_OPTIONS = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const res = await axios.post(
      "https://login-wallet.us.auth0.com/oauth/token",
      POST_BODY,
      POST_OPTIONS
    );

    return res.data;
  } catch (e) {
    console.log("Auth request failed: ", e);
  }
};

const getRoles = async (token, user) => {
  try {
    const res = await axios.get(
      `https://login-wallet.us.auth0.com/api/v2/users/${user.sub}/roles`,
      {
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      }
    );

    return res.data;
  } catch (e) {
    console.log("Roles request failed: ", e);
  }
};

exports.getAdminAuth = async (req) => {
  const token = req.headers["authorization"];

  const user = await getUserByToken(token);

  if (!user) return { success: false, message: "User request failed" };

  const accessToken = await getOAuthToken();

  if (!accessToken) return { success: false, message: "Auth request failed" };

  const roles = await getRoles(accessToken, user);

  if (!roles) return { success: false, message: "Roles request failed" };

  const hasAdminRole = roles.some((role) => role.name === "admin");

  return { success: hasAdminRole };
};