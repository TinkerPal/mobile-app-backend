const axios = require('axios');
const config = require(`${__dirname}/../../config.js`).default;
const { DateTime } = require('luxon');

exports.default = async (params, callback) => {
  const platform = params.platform;
  const currency = params.currency;
  const currencyData = config.currencies[currency];
  const errors = [];
  if (!currency) errors.push('currency field is required');
  else if (!currencyData) errors.push(`Unknown currency ${params.currency}`);
  if (!platform) errors.push('platform field is required');

  if (errors.length) {
    if (typeof callback === 'function') {
      callback({ success: false, errors });
    }
    return;
  }
  let url = `https://api.coingecko.com/api/v3/coins/${platform}`;
  if (params.contractAddress) {
    url += `/contract/${params.contractAddress}`;
  }
  url += `/market_chart?vs_currency=${currency}`;

  try {
    const results = await Promise.all([
      axios(`${url}&days=30`),
      axios(`${url}&days=365`),
    ]);
    const data30 = results[0].data.prices;
    data30.reverse();
    const data365 = results[1].data.prices;
    data365.reverse();
    const result = {
      day: {
        points: [],
      },
      week: {
        points: [],
      },
      month: {
        points: [],
      },
      year: {
        points: [],
      },
    };
    const now = DateTime.now();

    for (let i = 0; i < data30.length; i++) {
      const data = data30[i];
      const time = DateTime.fromMillis(data[0]);
      const value = data[1];
      const diff = now.diff(time, ['hours']);
      if (diff.hours <= 24) {
        if (!result.day.endValue) result.day.endValue = value;
        result.day.startValue = value;
        result.day.points.push({
          timestamp: data[0],
          // label: `${time.toFormat('dd/LL HH:mm')} ${new Intl.NumberFormat('en-Us', {style: 'currency', currency: currency}).format(value)}`,
          value,
        });
      }

      if (diff.hours <= 24 * 7 && i % 8 === 0) {
        if (!result.week.endValue) result.week.endValue = value;
        result.week.startValue = value;
        result.week.points.push({
          timestamp: data[0],
          // label: `${time.toFormat('dd/LL HH:mm')} ${new Intl.NumberFormat('en-Us', {style: 'currency', currency: currency}).format(value)}`,
          value,
        });
      }

      if (diff.hours <= 24 * 30 && i % 24 === 0) {
        if (!result.month.endValue) result.month.endValue = value;
        result.month.startValue = value;
        result.month.points.push({
          timestamp: data[0],
          // label: `${time.toFormat('yyyy-LL-dd')} ${new Intl.NumberFormat('en-Us', {style: 'currency', currency: currency}).format(value)}`,
          value,
        });
      }
    }
    for (let i = 0; i < data365.length; i++) {
      const data = data365[i];
      const time = DateTime.fromMillis(data[0]);
      const value = data[1];
      if (i % 12 === 0) {
        result.year.startValue = value;
        result.year.points.push({
          timestamp: data[0],
          // label: `${time.toFormat('yyyy-LL-dd')} ${new Intl.NumberFormat('en-Us', {style: 'currency', currency: currency}).format(value)}`,
          value,
        });
      }
    }
    result.year.endValue = result.day.endValue;
    result.year.points[0] = result.day.points[0];

    let sign = result.day.endValue < result.day.startValue ? -1 : 1;
    result.day.percent =
      Math.abs(
        (result.day.endValue - result.day.startValue) / result.day.startValue
      ) *
      100 *
      sign;
    sign = result.week.endValue < result.week.startValue ? -1 : 1;
    result.week.percent =
      Math.abs(
        (result.week.endValue - result.week.startValue) / result.week.startValue
      ) *
      100 *
      sign;
    sign = result.month.endValue < result.month.startValue ? -1 : 1;
    result.month.percent =
      Math.abs(
        (result.month.endValue - result.month.startValue) /
          result.month.startValue
      ) *
      100 *
      sign;
    sign = result.year.endValue < result.year.startValue ? -1 : 1;
    result.year.percent =
      Math.abs(
        (result.year.endValue - result.year.startValue) / result.year.startValue
      ) *
      100 *
      sign;
    result.day.points.reverse();
    result.week.points.reverse();
    result.month.points.reverse();
    result.year.points.reverse();

    if (typeof callback === 'function') {
      callback({
        success: true,
        result,
      });
    }
  } catch (error) {
    console.error('Market chart request failed', error);
    if (typeof callback === 'function') {
      callback({ success: false, errors: ['Market chart request failed'] });
    }
  }
};
