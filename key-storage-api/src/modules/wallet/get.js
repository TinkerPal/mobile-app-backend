const crypto = require("crypto");
const storage = require(`${__dirname}/../storage`);
const wallet = require(`${__dirname}/../wallet`);

exports.default = async (data) => {
  const userId = data.userId;
  const result = await storage.readWallet({
    userId: userId,
  });
  let wallets;
  if (result.success) {
    wallets = result.data;
  } else {
    let result = wallet.derive();
    if (!result.success) {
      return {isResponseObject: true, status: 500, response: {
        errors: ['An error occurred'],
      }};
    }
    const walletData = result.data;
    const walletId = crypto.createHash("sha256")
    .update(walletData.mnemonic)
    .digest("hex");

    wallets = {};
    wallets[walletId] = {
      name: 'Initial',
      platforms: walletData.platforms,
    };
    const privateData = {};
    privateData[walletId] = {
      type: 'mnemonic',
      data: walletData.mnemonic,
    };

    result = await storage.createPrivate({
      userId: userId,
      data: privateData,
    });
    if (!result.success) return result;

    result = await storage.saveWallet({
      userId: userId,
      wallets: wallets,
      walletId: walletId,
    });
    if (!result.success) return result;
  }
  return {isResponseObject: true, status: 200, response: {
    wallets: wallets,
    userId: userId,
  }};
}