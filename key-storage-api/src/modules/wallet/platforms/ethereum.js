const { ethers } = require("ethers");
const crypto = require("crypto");

exports.importFlat = async (data) => {
  let wallet;
  try {
    if (data.privateKey) {
      wallet = new ethers.Wallet(data.privateKey);
    } else if (data.json && data.password) {
      wallet = ethers.Wallet.fromEncryptedJson(data.json, data.password);
    } else {
      return {isResponseObject: true, status: 200, response: {success: false, errors: [`Please provide with a private key (privateKey field) or encrypted private key in json format (json and password fields) for ${data.platform} platform`]}};
    }
    const privateKey = wallet.privateKey;
    const walletId = crypto.createHash("sha256")
      .update(`${privateKey}-${data.platform}`)
      .digest("hex");
    if (data.wallets[walletId]) {
      return {isResponseObject: true, status: 200, response: {success: false, errors: [`Wallet with this private key for a platform ${data.platform} already exists`]}};
    }

    const platforms = {};
    platforms[data.platform] = {
      address: wallet.address,
    };

    return {
      success: true,
      walletId: walletId,
      data: {
        privateKey: privateKey,
        platforms: platforms,
      }
    }
  } catch (e) {
    console.log('import ethereum.js try-catch', e);
    return {isResponseObject: true, status: 200, response: {success: false, errors: [`Private key is not valid`]}};
  }
}