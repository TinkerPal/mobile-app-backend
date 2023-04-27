const platforms = require(`${__dirname}/../../platforms`);

exports.default = async (params, callback) => {
  const platform = params.platform;
  const txId = params.txId;
  const address = params.address;

  const errors = [];

  if (!platform) errors.push('platform field is required');
  if (!txId) errors.push('txId field is required');
  else if (!platforms[platform]) errors.push(`Unknown platform ${platform}`);
  else if (typeof platforms[platform].txDetails !== 'function')
    errors.push(
      `Transaction details for platform ${platform} is not implemented yet`
    );

  if (!address) {
    errors.push('address field is required');
  }

  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  const result = await platforms[platform].txDetails({
    platform,
    txId,
    address,
    tokenAddress: params.tokenAddress,
  });
  callback(result);
};
