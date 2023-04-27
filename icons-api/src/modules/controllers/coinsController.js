const baseUrl = require('path').resolve(__dirname, '../../..');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');

exports.getIcon = async (params) => {
  const result = {errors: []};

  if (!params.coinId) result.errors.push('coinId parameter is required, expected url /images/:coinId/:size/icon.png');
  const size = Number(params.size);
  if (!(size > 0)) result.errors.push('size parameter should be greater than zero, expected url /images/:coinId/:size/icon.png');
  if (result.errors.length) return result;

  const density = Math.ceil(72 * size / 16);
  let sharpInstance;
  let baseImage = `${baseUrl}/images/${params.coinId}/svg/icon.svg`;
  if (fs.existsSync(baseImage)) {
    sharpInstance = sharp(baseImage, {density: density});
  } else {
    baseImage = `${baseUrl}/images/${params.coinId}/png/icon.png`;
    sharpInstance = sharp(baseImage);
  }

  if (fs.existsSync(baseImage)){
    let path = getPath(params);
    await sharpInstance
      .resize(size, size)
      .png()
      .toFile(path);
    return {path: path};
  } else {
    let response;
    try {
      response = await axios.get(`https://api.coingecko.com/api/v3/coins/${params.coinId}`);
    } catch (e) {}
    if (response && response.data && response.data.image) {
      const image = response.data.image.large;
      const imageResponse = await axios({url: image, responseType: "arraybuffer"});
      const buffer = Buffer.from(imageResponse.data, 'binary');
      let path = getPath(params);
      await new Promise((resolve) => {
        fs.writeFile(baseImage, buffer, function (err) {
          if (err) console.log(err);
          resolve();
        });
      });

      await sharp(buffer)
        .resize(size, size)
        .png()
        .toFile(path);

      return {path: path};
    } else {
      return {errors: ['Icon is unavailable']};
    }
  }
}

function getPath (params) {
  const size = params.size;
  let path = `${baseUrl}/images/${params.coinId}`;
  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }
  if (!fs.existsSync(`${path}/png`)){
    fs.mkdirSync(`${path}/png`);
  }
  if (!fs.existsSync(`${path}/svg`)){
    fs.mkdirSync(`${path}/svg`);
  }
  path += `/${size}`;
  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }
  path += `/icon.png`;
  return path;
}