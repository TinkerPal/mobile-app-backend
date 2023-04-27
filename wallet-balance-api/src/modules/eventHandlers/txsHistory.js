const platforms = require(`${__dirname}/../../platforms`);

exports.default = async (params, callback) => {
  const platform = params.platform;
  const address = params.address;
  const errors = [];
  if (!platform) errors.push('platform field is required');
  if (!address) errors.push('address field is required');
  else if (!platforms[platform]) errors.push(`Unknown platform ${platform}`);
  else if (typeof platforms[platform].txsHistory !== 'function')
    errors.push(
      `Transactions history for platform ${platform} is not implemented yet`
    );

  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  const result = await platforms[platform].txsHistory({
    platform,
    address,
    tokenAddress: params.tokenAddress,
  });

  callback(result);
};
