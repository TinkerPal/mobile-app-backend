const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const port = process.env.CONFIG_PORT;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const controllers = require(`${__dirname}/modules/controllers`);

app.get('/images/:platformId/contract/:contractAddress/:size/icon.png', (req, res) => {
    controllers.tokensController.getIcon(req.params)
    .then(result => {
        if (result.path) {
            var s = fs.createReadStream(result.path);
            s.on('open', function () {
                res.set('Content-Type', 'image/png');
                s.pipe(res);
            });
            s.on('error', function (error) {
                console.log(error)
            });
        } else {
            console.error(req.params, result.errors);
            res.status(404).send('Not found');
        }
    })
    .catch(error => {
        console.error(error);
        res.status(404).send('Not found');
    });
});

app.get('/images/:platformId/currency/:size/icon.png', (req, res) => {
    controllers.platformsController.getIcon(req.params)
    .then(result => {
        if (result.path) {
            var s = fs.createReadStream(result.path);
            s.on('open', function () {
                res.set('Content-Type', 'image/png');
                s.pipe(res);
            });
            s.on('error', function (error) {
                console.log(error)
            });
        } else {
            console.error(req.params, result.errors);
            res.status(404).send('Not found');
        }
    })
    .catch(error => {
        console.error(error);
        res.status(404).send('Not found');
    });
});

app.get('/images/:coinId/:size/icon.png', (req, res) => {
    controllers.coinsController.getIcon(req.params)
    .then(result => {
        if (result.path) {
            var s = fs.createReadStream(result.path);
            s.on('open', function () {
                res.set('Content-Type', 'image/png');
                s.pipe(res);
            });
            s.on('error', function (error) {
                console.log(error)
            });
        } else {
            console.error(req.params, result.errors);
            res.status(404).send('Not found');
        }
    })
    .catch(error => {
        console.error(error);
        res.status(404).send('Not found');
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

