const platforms = require(`${__dirname}/../../platforms`);
const { getAddressByPublicKey } = require(`${__dirname}/../../utils`);

exports.default = async (params, callback) => {
  const errors = [];
  const { platform, publicKey } = params;
  let address = params.address;

  if (!platform) errors.push('platformId field is required');
  else if (!platforms[platform]) errors.push(`Unknown platform ${platform}`);
  else if (typeof platforms[platform].checkWalletValid !== 'function')
    errors.push(
      `Check wallet valid for platform ${platform} is not implemented yet`
    );
  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  if (!address || typeof address !== 'string') {
    if (publicKey) {
      address = getAddressByPublicKey(publicKey, platform);
      if (!address) {
        errors.push('publicKey value is invalid');
      }
    } else {
      errors.push('address field is required');
    }
  }
  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  const result = await platforms[platform].checkWalletValid({
    platform,
    address,
  });

  callback({ result });
};
