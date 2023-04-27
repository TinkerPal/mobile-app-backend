const crypto = require("crypto");
const wallet = require(`${__dirname}/../wallet`);
const storage = require(`${__dirname}/../storage`);

exports.default = async (data) => {
  const userId = data.userId;
  let result = await storage.readWallet({
    userId: userId,
  });
  if (!result.success) {
    const status = result.status || 500;
    return {isResponseObject: true, status: status, response: result};
  }

  const wallets = result.data;
  if (Object.keys(wallets).length >= 5) {
    return {isResponseObject: true, status: 200, response: {success: false, errors: ['Wallets limit (up to 5 wallets) exceeded']}};
  }
  let walletId;
  let walletData;
  let type;
  if (data.mnemonic) {
    walletId = crypto.createHash("sha256")
      .update(data.mnemonic)
      .digest("hex");
    if (wallets[walletId]) {
      return {isResponseObject: true, status: 200, response: {success: false, errors: ['Wallet with this mnemonic already exists']}};
    }
    const result = await wallet.derive(data.mnemonic);
    if (result.isResponseObject) return result;
    type = 'mnemonic';
    walletData = result.data;
  } else if (data.platform) {
    const platforms = require(`${__dirname}/platforms`);
    if (!platforms[data.platform] || typeof platforms[data.platform].importFlat !== 'function') {
      return {isResponseObject: true, status: 200, response: {success: false, errors: [`Platform ${data.platform} is not supported for a flat wallet import`]}};
    }
    data.wallets = wallets;
    const result = await platforms[data.platform].importFlat(data);
    if (result.isResponseObject) return result;
    type = 'privateKey';
    walletData = result.data;
    walletId = result.walletId;
  } else {
    return {isResponseObject: true, status: 200, response: {success: false, errors: ['Neither mnemonic nor private key with platform specified']}};
  }

  if (!walletData || !walletId) {
    return {isResponseObject: true, status: 500, response: {error: 'An error occurred'}};
  }

  wallets[walletId] = {
    name: data.name,
    platforms: walletData.platforms,
  };

  result = await storage.readPrivate({
    userId: userId,
  });
  if (!result.success) {
    const status = result.status || 500;
    return {isResponseObject: true, status: status, response: result};
  }
  const privateData = result.data;

  privateData[walletId] = {
    type: type,
    data: walletData[type],
  };

  result = await storage.updatePrivate({
    userId: userId,
    data: privateData,
  });
  if (!result.success) {
    const status = result.status || 500;
    return {isResponseObject: true, status: status, response: result};
  }

  result = await storage.saveWallet({
    userId: userId,
    wallets: wallets,
    walletId: walletId,
  });
  if (!result.success) {
    const status = result.status || 500;
    return {isResponseObject: true, status: status, response: result};
  }

  return {
    isResponseObject: true,
    status: 200,
    response: {
      success: true,
      data: wallets,
    },
  };
}