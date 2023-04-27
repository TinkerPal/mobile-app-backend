const cors = require('cors');
const { join } = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const {
  getAddressByPublicKey,
  getTokenHoldingByAddress,
  formatBalanceResponse,
  platformsCron,
} = require('./utils');
const axios = require('axios');
const eventHandlers = require(`${__dirname}/modules/eventHandlers`);

const config = require(`${__dirname}/config.js`).default;
const platforms = require(`${__dirname}/platforms`);
const emitter = new EventEmitter();
const port = process.env.CONFIG_PORT;
const wsPort = process.env.CONFIG_PORT_WS;

const app = express();
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Web sockets Connected clients
const clients = {};
// connected addresses for blockcypher hooks endpoint
const addresses = {};
// blockcypher hooks endpoint
app.post('/blockcypher/:platform/:address', (req, res) => {
  const platform = req.params.platform;
  const address = req.params.address;
  if (addresses[platform] && addresses[platform][address]) {
    const clientIds = addresses[platform][address].clientIds;
    const walletId = addresses[platform][address].walletId;
    platforms[platform]
      .getBalance({
        address,
        platform,
        walletId,
      })
      .then((result) => {
        for (const clientId in clientIds) {
          const client = clients[clientId];
          if (
            !client ||
            !client.ws ||
            !platforms[platform] ||
            typeof platforms[platform].getBalance !== 'function'
          )
            continue;
          if (result.success) client.ws.emit('update', result.result);
        }
      })
      .catch((error) => {
        console.error(
          `Blockcypher incoming request. Get balance. An error occurred. ${error}`
        );
      });
  }
  res.send({ status: 'OK' });
});

app.get('/wallet/coins', (req, res) => {
  res.send(config.coins);
});

app.get('/wallet/platforms', (req, res) => {
  res.send(config.platforms);
});

app.get('/test-local', (req, res) => {
  res.sendFile(join(__dirname, '..', 'test-local.html'));
});

app.get('/test-ssl', (req, res) => {
  res.sendFile(join(__dirname, '..', 'test-ssl.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(join(__dirname, '..', 'test.html'));
});

// availability check endpoint

app.get('/check', (req, res) => {
  res.send({ status: 'OK' });
});

if (!port) throw 'Empty port const';
app.listen(port, (err) => {
  if (err) {
    return console.error('App listen fail', err);
  }
  console.log(`server is listening on ${port}`);
});

async function init() {
  // run onRestart() method (if exists) for every platform
  const promises = [];
  for (const platform in platforms) {
    if (
      platforms[platform] &&
      typeof platforms[platform].onRestart === 'function'
    ) {
      promises.push(
        platforms[platform].onRestart({
          platform,
          emitter,
        })
      );
    }
    await Promise.allSettled(promises);
  }
  // run cron() method (if exists) for every platform
  platformsCron(platforms, emitter);
  setInterval(() => {
    platformsCron(platforms, emitter).catch(console.error);
  }, 10000);

  console.log('App is ready for ws connections');
  // web sockets initialization

  if (!wsPort) throw 'Empty wsPort const';

  const cors = {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  };

  const io = require('socket.io')(wsPort, {
    ...cors,
  });

  io.on('connection', function (ws) {
    const clientId = ws.id;

    console.log(`Соединение открыто ${clientId}`);

    clients[clientId] = {
      ws,
      runtimeData: {},
    };

    // client sends login event with auth0 access token
    ws.on('login', (params, callback) => {
      if (!params.token) {
        if (typeof callback === 'function') {
          callback({ success: false, errors: ['Token missed'] });
        }

        return;
      }

      const run = async (params, callback) => {
        let response;

        try {
          // get data from key storage api (user wallets)
          response = await axios.post(
            'http://localhost:8506/login',
            {},
            {
              headers: {
                Authorization: `Bearer ${params.token}`,
              },
            }
          );
        } catch (error) {
          console.error('Auth request failed', error);

          callback({ success: false, errors: ['Auth request failed'] });
          return;
        }

        const data = response.data;

        if (!data.userId) {
          if (typeof callback === 'function') {
            callback({ success: false, errors: ['User not found'] });
          }
          return;
        }

        clients[clientId].userId = data.userId;

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      };

      run(params, callback).catch((error) => {
        console.error(error);

        if (typeof callback === 'function') {
          callback({ success: false, errors: ['An error occurred'] });
        }
      });
    });

    ws.on('balance', async (params, callback) => {
      if (!clients[clientId].userId) {
        if (typeof callback === 'function') {
          callback({ success: false, errors: ['Not authorized'] });
        }
        return;
      }

      // wallets must be present in the client (it is added when login event is sent) record when balance event is sent

      if (!params.wallets || params.wallets.length === 0) {
        if (typeof callback === 'function') {
          callback({ success: false, errors: ['wallets is required'] });
        }
        return;
      }

      const wallets = {};

      params.wallets.forEach((wallet) => {
        const walletBlockchains = wallet.blockchains || [];

        const platforms = walletBlockchains.reduce(
          (previousValue, currentValue) => {
            return {
              ...previousValue,
              [currentValue.id]: {
                address:
                  currentValue.address ||
                  getAddressByPublicKey(
                    currentValue.publicKey,
                    currentValue.id
                  ),
                tokens: currentValue.tokens,
              },
            };
          },
          {}
        );

        wallets[wallet.id] = {
          name: wallet.name,
          platforms,
        };
      });

      activateAddresses({
        clientId,
        wallets,
        method: 'onConnect',
      }).catch(console.error);

      // Collect promises for balance fetching for all user wallets addresses
      const updateAll = [];

      for (const walletId in wallets) {
        const wallet = wallets[walletId];
        for (const platform in wallet.platforms) {
          if (!platforms[platform]) continue;
          if (!addresses[platform]) {
            addresses[platform] = {};
          }

          const address = wallet.platforms[platform].address;
          if (!addresses[platform][address]) {
            addresses[platform][address] = {
              clientIds: {},
              walletId,
            };
          }

          addresses[platform][address].clientIds[clientId] = true;

          if (
            platforms[platform] &&
            typeof platforms[platform].getBalance === 'function'
          ) {
            updateAll.push(
              platforms[platform].getBalance({
                address,
                platform,
                walletId,
                walletName: wallet.name,
              })
            );
          }

          const tokenHoldingByAddress = await getTokenHoldingByAddress(
            address,
            platform
          );

          if (tokenHoldingByAddress && tokenHoldingByAddress.length > 0) {
            if (!wallet.platforms[platform].tokens) {
              wallet.platforms[platform].tokens = [];
            }

            const uniqueTokenHoldingByAddress = tokenHoldingByAddress.filter(
              (token) =>
                !wallet.platforms[platform].tokens.find(
                  (walletToken) =>
                    walletToken.tokenAddress === token.tokenAddress
                )
            );

            wallet.platforms[platform].tokens = [
              ...uniqueTokenHoldingByAddress,
              ...wallet.platforms[platform].tokens,
            ];
          }

          if (
            wallet.platforms[platform].tokens &&
            wallet.platforms[platform].tokens.length > 0
          ) {
            for (const tokenData of wallet.platforms[platform].tokens) {
              if (!tokenData.tokenAddress) continue;

              if (
                platforms[platform] &&
                platforms[platform].getTokenBalance &&
                typeof platforms[platform].getTokenBalance[tokenData.type] ===
                  'function'
              ) {
                const params = {
                  address,
                  tokenData,
                  platform,
                  walletId,
                  walletName: wallet.name,
                };

                updateAll.push(
                  platforms[platform].getTokenBalance[tokenData.type](params)
                );
              }
            }
          }
        }
      }

      // after all promises completed balance object will be sent to ws client

      Promise.all(updateAll)
        .then((results) => {
          const data = {};
          results.forEach((result) => {
            if (!result.walletId) return;
            if (!data[result.walletId]) {
              data[result.walletId] = {
                platforms: {},
              };
            }
            if (!data[result.walletId].platforms[result.platform]) {
              data[result.walletId].platforms[result.platform] = {};
            }
            if (result.type === 'coin') {
              data[result.walletId].platforms[result.platform].coin = result;
              if (!data[result.walletId].name && result.name)
                data[result.walletId].name = result.name;
            } else if (result.type === 'token') {
              if (!data[result.walletId].platforms[result.platform].tokens) {
                data[result.walletId].platforms[result.platform].tokens = {};
              }
              data[result.walletId].platforms[result.platform].tokens[
                result.tokenData.tokenAddress
              ] = result;
            }
          });
          const result = formatBalanceResponse(data);
          if (typeof callback === 'function') {
            callback(result);
          }
        })
        .catch((error) => {
          console.error('Balance request failed', error);
          if (typeof callback === 'function') {
            callback({ success: false, errors: ['An error occurred'] });
          }
        });
    });

    ws.on('transfer', (params, callback) => {
      const errors = [];
      if (!params.token) errors.push('Token missed');
      if (!params.platform) errors.push('platform is not specified');
      else if (!platforms[params.platform])
        errors.push(`Unknown platform ${params.platform}`);
      else if (typeof platforms[params.platform].transfer !== 'function')
        errors.push(
          `Transfer method for platform ${params.platform} is not supported`
        );
      if (!params.walletId) errors.push('walletId is not specified');
      else if (!clients[clientId].wallets[params.walletId])
        errors.push(`Wallet with walletId ${params.walletId} does not exist`);
      if (!params.receiverAddress) errors.push('Receiver address missed');
      if (Number(params.value) < 0 && !params.tokenAddress)
        errors.push(`value should be greater than zero`);
      else if (
        params.tokenAddress &&
        Number(params.value) < 0 &&
        !params.tokenId
      )
        errors.push(`For a token transfer value or tokenId required`);
      if (errors.length) {
        if (typeof callback === 'function') {
          callback({ success: false, errors });
        }
        return;
      }

      const token = params.token;
      delete params.token;
      axios
        .post(
          'http://localhost:8506/transfer',
          {
            userId: clients[clientId].userId,
            params,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => {
          if (!response || !response.data || !response.data.success) {
            const result = { success: false };
            if (response.data && response.data.errors)
              result.errors = response.data.errors;
            return Promise.resolve(result);
          }
          params.privateData = response.data.privateData;
          const wallet = response.data.wallet;
          if (!wallet.platforms || !wallet.platforms[params.platform]) {
            return Promise.resolve({
              success: false,
              errors: [
                `Wallet with walletId ${params.walletId} does not contain platform ${params.platform}`,
              ],
            });
          }
          params.address = wallet.platforms[params.platform].address;
          return platforms[params.platform].transfer(params);
        })
        .then((result) => {
          if (typeof callback === 'function') {
            callback(result);
          }
        })
        .catch((error) => {
          console.error('Transfer request fail', error);
          if (typeof callback === 'function') {
            callback({ success: false, errors: ['An error occurred'] });
          }
        });
    });

    const events = [
      'marketData',
      'marketChart',
      'txsHistory',
      'txDetails',
      'checkWalletValid',
      'getTokenData',
      'prepareTransaction',
      'sendTransaction',
    ];
    events.forEach((eventItem) => {
      ws.on(eventItem, (params, callback) => {
        eventHandlers[eventItem](params, callback)
          .catch((error) => {
            console.error(error);
            if (typeof callback === 'function') {
              callback({ success: false, errors: ['An error occurred'] });
            }
          });
      });
    });

    ws.on('disconnect', function () {
      const run = async () => {
        // run onDisconnect() method (if exists) for every platform
        for (const platform in clients[clientId].runtimeData) {
          for (const walletId in clients[clientId].runtimeData[platform]) {
            if (
              platforms[platform] &&
              typeof platforms[platform].onDisconnect === 'function'
            ) {
              await platforms[platform].onDisconnect({
                platform,
                runtimeData: clients[clientId].runtimeData[platform][walletId],
              });
            }
          }
        }
      };
      run()
        .catch(console.error)
        .finally(() => {
          console.log(`Соединение закрыто ${clientId}`);
          delete clients[clientId];
        });
    });
  });
}

async function activateAddresses(data) {
  const clientId = data.clientId;
  const method = data.method || 'onConnect';
  const wallets = data.wallets;
  for (const walletId in wallets) {
    const wallet = wallets[walletId];
    for (const platform in wallet.platforms) {
      if (!clients[clientId].runtimeData[platform]) {
        clients[clientId].runtimeData[platform] = {};
      }
      if (clients[clientId].runtimeData[platform][walletId]) continue;
      // run onConnect() method (if exists) for every platform
      if (
        platforms[platform] &&
        typeof platforms[platform][method] === 'function'
      ) {
        const params = {
          address: wallet.platforms[platform].address,
          platform,
          clientId,
          walletId,
          userId: clients[clientId].userId,
        };
        const result = await platforms[platform][method](params);
        // save runtime data which will be used on disconnect (blockcypher hooks management, etc.)
        if (result && result.success && clients[clientId]) {
          clients[clientId].runtimeData[platform][walletId] = result;
        }
      }
    }
  }
}

// get update info (balance changes, tokens discovering) for ethereum like platforms
emitter.on('update', (data) => {
  const address = data.address;
  const clientId = data.clientId;
  const client = clients[clientId];
  if (!platforms[data.platform]) return;
  if (data.type === 'coin' && client) {
    platforms[data.platform]
      .getBalance({
        address,
        platform: data.platform,
        walletId: data.walletId,
      })
      .then((result) => {
        if (result.success) client.ws.emit('update', result);
      })
      .catch((error) => {
        console.error(`Ethereum update. An error occurred. ${error}`);
      });
  } else if (data.type === 'token') {
    if (!client) return;
    const platform = data.platform;
    const tokenData = data.tokenData;
    const params = {
      address,
      tokenData,
      platform,
      walletId: data.walletId,
    };
    if (
      !(
        platforms[platform] &&
        platforms[platform].getTokenBalance &&
        typeof platforms[platform].getTokenBalance[tokenData.type] ===
          'function'
      )
    )
      return;
    platforms[platform].getTokenBalance[tokenData.type](params)
      .then((result) => {
        if (result && result.success && client)
          client.ws.emit('update', result);
      })
      .catch((error) => {
        console.error(`Ethereum update. An error occurred. ${error}`);
      });
  }
});

init().catch(console.error);
