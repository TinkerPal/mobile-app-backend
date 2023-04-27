const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const fs = require('fs');

const port = process.env.CONFIG_PORT;

const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
const uri = 'mongodb+srv://admin:rywG2SbihuDCMbZo@cluster0.ef4ab.mongodb.net/etna?retryWrites=true&w=majority';
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});

app. use(function(req, res, next) {
  res. header("Access-Control-Allow-Origin", "*");
  res. header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

const methods = {
  create: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.data) errors.push(`data field is required`);
    if (!params.id) errors.push(`id field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const already = await Model.findOne({id: params.id});
    if (already) return {success: false, errors: ['Record with this id already exists']};
    const instance = new Model({id: params.id, data: params.data});
    const result = await instance.save();
    return {success: true};
  },
  read: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.id) errors.push(`id field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const record = await Model.findOne({id: params.id});
    if (!record) return {success: false, errors: ['No record found']};
    return {success: true, data: record.data};
  },
  update: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.id) errors.push(`id field is required`);
    if (!params.data) errors.push(`data field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const result = await Model.updateOne(
      {
        id: params.id,
      },
      {
        id: params.id,
        data: params.data,
      },
    );
    if (!result) return {success: false};
    if (result.ok === 1 && result.n === 1) return {success: true};
    return {success: false};
  },
  updateOrCreate: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.id) errors.push(`id field is required`);
    if (!params.data) errors.push(`data field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const result = await Model.updateOne(
      {
        id: params.id,
      },
      {
        id: params.id,
        data: params.data,
      },
      {
        upsert: true,
      }
    );
    if (!result) return {success: false};
    if (result.ok === 1 && result.n === 1) return {success: true};
    return {success: false};
  },
  delete: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.id) errors.push(`id field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const result = await Model.deleteOne({
      id: params.id
    });
    if (!result) return {success: false};
    if (result.ok === 1 && result.deletedCount === 1) return {success: true};
    return {success: false};
  },
  find: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.search) errors.push(`search field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const records = await Model.find(params.search);
    return {success: true, data: records};
  },
  findMax: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.max) errors.push(`max field is required`);
    if (!params.search) params.search = {};
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const sort = {};
    sort[params.max] = -1;
    const records = await Model.findOne(params.search).sort(sort).limit(1);
    return {success: true, data: records};
  },
  createCustom: async (params) => {
    let errors = [];
    if (!params.model) errors.push(`model field is required`);
    const path = `${__dirname}/models/${params.model}.js`;
    if (!fs.existsSync(path)) errors.push(`Unknown model ${params.model}`);
    if (!params.data) errors.push(`data field is required`);
    if (errors.length) return {success: false, errors: errors};
    const Model = require(path);
    const already = await Model.findOne(params.data);
    if (already) return {success: false, errors: ['This record already exists']};
    const instance = new Model(params.data);
    const result = await instance.save();
    return {success: true};
  },
}

app.post("/", async (req, res) => {
  if (!(req.body.method in methods)) return res.send({success: false, errors: ['unknown method']});
  methods[req.body.method](req.body.params)
    .then(response => {
      res.send(response)
    })
    .catch(error => {
      console.error(error);
      res.send({success: false, errors: ['Unknown error']});
    })
});

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
