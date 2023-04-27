const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const port = process.env.CONFIG_PORT;

const app = express();
app.use(cors());
app.use(bodyParser.json());

app. use(function(req, res, next) {
  res. header("Access-Control-Allow-Origin", "*");
  res. header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

const controllers = require(`${__dirname}/modules/controllers`);

app.get('/admin/get-token', (req, res) => {
    controllers.accessTokenController.default(req, res)
    .catch(error => {
        console.error(error);
        res.status(500).send('An error occurred');
    });
});

app.post('/admin/upload', (req, res) => {
    controllers.uploadController.default(req, res)
    .catch(error => {
        console.error(error);
        res.status(500).send('An error occurred');
    });
});

app.post('/admin/subscribe', (req, res) => {
    controllers.subscribeController.default(req, res)
    .catch(error => {
        console.error(error);
        res.status(500).send('An error occurred');
    });
});

const server = require('http').createServer(app);

if (!port) throw('Empty port const');
server.listen(port, (err) => {
    if (err) {
        return console.error('App listen fail', err);
    }
    console.log(`server is listening on ${port}`)
});

