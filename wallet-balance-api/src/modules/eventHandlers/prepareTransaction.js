const platforms = require(`${__dirname}/../../platforms`);

exports.default = async (params, callback) => {
  const platform = params.platform;

  const errors = [];

  if (!platform) errors.push('platform field is required');
  if (!platforms[platform]) errors.push(`Unknown platform ${platform}`);
  else if (typeof platforms[platform].prepareTransaction !== 'function')
    errors.push(
      `Preparing transaction for platform ${platform} is not implemented yet`
    );

  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }

  const result = await platforms[platform].prepareTransaction(params);
  callback(result);
};
