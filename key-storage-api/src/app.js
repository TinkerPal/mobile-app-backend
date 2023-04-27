const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const port = process.env.CONFIG_PORT;

app. use(function(req, res, next) {
  res. header("Access-Control-Allow-Origin", "*");
  res. header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

const authorization = require(`${__dirname}/modules/authorization.js`).default;
const wallet = require(`${__dirname}/modules/wallet`);
const storage = require(`${__dirname}/modules/storage`);

app.post("/login", (req, res) => {
  const token = req.headers['authorization'];
  authorization({
    token: token,
  })
  .then(result => {
    if (!result.success || !result.data || !result.data.sub) {
      return Promise.reject({
        status: 401,
        response: {success: false, errors: ['Not authorized']},
        isResponseObject: true,
      });
    }
    const user = result.data;
    const userId = user.sub;
    res.send({
      success: true,
      userId: userId,
    });
  })
  .catch(error => {
    if (error.isResponseObject ) {
      return res.status(error.status).send(error.response);
    }
    console.error('Login endpoint error', error);
    return res.status(500).send({success: false, errors: ['An error occurred']});
  });
});

// app.post("/import", (req, res) => {
//   const params = req.body.params;
//   const token = req.headers['authorization'];
//   authorization({
//     token: token,
//   })
//   .then(result => {
//     if (!result.success || !result.data || !result.data.sub) {
//       return Promise.reject({
//         status: 401,
//         response: {success: false, errors: ['Not authorized']},
//         isResponseObject: true,
//       });
//     }
//     const user = result.data;
//     const userId = user.sub;
//     params.userId = userId;
//     return wallet.import(params);
//   })
//   .then(result => {
//     if (result.isResponseObject) {
//       return res.status(result.status).send(result.response);
//     } else {
//       console.log('import-wallet module fail', result);
//       return res.status(500).send('An error occurred');
//     }
//   })
//   .catch(error => {
//     if (error.isResponseObject ) {
//       return res.status(error.status).send(error.response);
//     }
//     console.error('Login endpoint error', error);
//     return res.status(500).send({error: 'An error occurred'});
//   });
// });
//
// app.post("/transfer", (req, res) => {
//   const params = req.body.params;
//   const token = req.headers['authorization'];
//   authorization({
//     token: token,
//   })
//   .then(result => {
//     if (!result.success || !result.data || !result.data.sub) {
//       return Promise.reject({
//         status: 401,
//         response: {success: false, errors: ['Not authorized']},
//         isResponseObject: true,
//       });
//     }
//     const user = result.data;
//     const userId = user.sub;
//     return Promise.all([
//       storage.readPrivate({userId: userId}),
//       storage.readWallet({userId: userId})
//     ]);
//   })
//   .then(results => {
//     if (!results[0] || !results[1] || !results[0].success || !results[1].success) {
//       console.error('Transfer request. Read data fail', results[0], results[1]);
//       return res.status(500).send({success: false, errors: ['An error occurred']});
//     }
//     res.send({
//       success: true,
//       privateData: results[0].data[params.walletId],
//       wallet: results[1].data[params.walletId],
//     });
//   })
//   .catch(error => {
//     if (error.isResponseObject ) {
//       return res.status(error.status).send(error.response);
//     }
//     console.error('Login endpoint error', error);
//     return res.status(500).send({error: 'An error occurred'});
//   });
// });

app.get('/check', (req, res) => {
  res.send({ status: 'OK' });
});
if (!port) throw('Empty port const');
app.listen(port, (err) => {
  if (err) {
    return console.error('App listen fail', err);
  }
  console.log(`server is listening on ${port}`);
});
