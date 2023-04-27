const platforms = require(`${__dirname}/../../platforms`);

exports.default = async (params, callback) => {
  const errors = [];
  const { platform, tokenAddress, tokenId } = params;

  if (!platform) errors.push('platformId field is required');
  else if (!platforms[platform]) errors.push(`Unknown platform ${platform}`);
  else if (typeof platforms[platform].getTokenData !== 'function')
    errors.push(
      `Can not get token data for platform ${platform}`
    );
  if (!tokenAddress || typeof tokenAddress !== 'string') {
    errors.push('tokenAddress field is required');
  }
  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  const tokenData = await platforms[platform].getTokenData({
    platform,
    tokenAddress,
    tokenId,
  });

  const result = {};
  if (tokenData.type) {
    result.tokenData = tokenData;
    result.success = true;
  } else {
    result.success = false;
    result.errors = ['Unknown token'];
  }

  callback({ result });
};
