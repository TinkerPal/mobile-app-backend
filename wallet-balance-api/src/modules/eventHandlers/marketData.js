const axios = require('axios');
const config = require(`${__dirname}/../../config.js`).default;
const { DateTime } = require('luxon');
const BigNumber = require('bignumber.js');

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

  try {
    const response = await axios(url);
    const data = response.data;
    const groups = [];
    let rows = [];
    const marketCapRank = parseInt(data.market_cap_rank);
    if (marketCapRank > 0) {
      rows.push({
        title: 'Market cap rank',
        value: {
          type: 'integer',
          value: marketCapRank,
        },
      });
    }
    const marketCap = parseFloat(data.market_data.market_cap[currency]);
    if (marketCap > 0) {
      const bn = new BigNumber(marketCap);
      rows.push({
        title: 'Market cap',
        value: {
          type: 'price',
          value: {
            amount: bn,
            currency,
            precision: 0,
          },
        },
      });
    }
    const totalVolume = parseFloat(data.market_data.total_volume[currency]);
    if (totalVolume > 0) {
      const bn = new BigNumber(totalVolume);
      rows.push({
        title: 'Trading volume',
        value: {
          type: 'price',
          value: {
            amount: bn,
            currency,
            precision: 0,
          },
        },
      });
    }
    groups.push({ title: '', rows });

    rows = [];
    const high24 = parseFloat(data.market_data.high_24h[currency]);
    if (high24 > 0) {
      const bn = new BigNumber(high24);
      rows.push({
        title: '24h High',
        value: {
          type: 'price',
          value: {
            amount: bn,
            currency,
            precision: 2,
          },
        },
      });
    }
    const low24 = parseFloat(data.market_data.low_24h[currency]);
    if (low24 > 0) {
      const bn = new BigNumber(low24);
      rows.push({
        title: '24h Low',
        value: {
          type: 'price',
          value: {
            amount: bn,
            currency,
            precision: 2,
          },
        },
      });
    }
    const ath = parseFloat(data.market_data.ath[currency]);
    if (ath > 0) {
      const bn = new BigNumber(ath);
      rows.push({
        title: 'All-time high',
        value: {
          type: 'price',
          value: {
            amount: bn,
            currency,
            precision: 2,
          },
        },
      });
    }
    const athDate = data.market_data.ath_date[currency];
    const dt = DateTime.fromISO(athDate);
    if (!dt.invalid) {
      rows.push({
        title: 'All-time high date',
        value: {
          type: 'date',
          value: dt.valueOf(),
        },
      });
    }
    groups.push({ title: '', rows });

    rows = [];
    const availableSupply = parseFloat(data.market_data.circulating_supply);
    if (availableSupply > 0) {
      const bn = new BigNumber(availableSupply);
      rows.push({
        title: 'Available supply',
        value: {
          type: 'pretty',
          value: bn,
        },
      });
    }

    const totalSupply = parseFloat(data.market_data.total_supply);
    if (totalSupply > 0) {
      const bn = new BigNumber(totalSupply);
      rows.push({
        title: 'Total supply',
        value: {
          type: 'pretty',
          value: bn,
        },
      });
    }
    groups.push({ title: '', rows });

    if (typeof callback === 'function') {
      callback({
        success: true,
        result: {
          groups,
        },
      });
    }
  } catch (error) {
    console.error('Market data request failed', error);
    if (typeof callback === 'function') {
      callback({ success: false, errors: ['Market data request failed'] });
    }
  }
};
