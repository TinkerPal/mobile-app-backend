const baseUrl = require('path').resolve(__dirname, '../../..');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');

exports.getIcon = async (params) => {
  const result = {errors: []};

  if (!params.platformId) result.errors.push('platformId parameter is required, expected url /images/:platformId/contract/:contractAddress/:size/icon.png');
  if (!params.contractAddress) result.errors.push('contractAddress parameter is required, expected url /images/:platformId/contract/:contractAddress/:size/icon.png');
  const size = Number(params.size);
  if (!(size > 0)) result.errors.push('size parameter should be greater than zero, expected url /images/:platformId/contract/:contractAddress/:size/icon.png');
  if (result.errors.length) return result;

  const density = Math.ceil(72 * size / 16);
  let sharpInstance;
  let baseImage = `${baseUrl}/images/${params.platformId}/contract/${params.contractAddress}/svg/icon.svg`;
  if (fs.existsSync(baseImage)) {
    sharpInstance = sharp(baseImage, {density: density});
  } else {
    baseImage = `${baseUrl}/images/${params.platformId}/contract/${params.contractAddress}/png/icon.png`;
    sharpInstance = sharp(baseImage);
  }

  if (fs.existsSync(baseImage)) {
    let path = getPath(params);
    await sharpInstance
      .resize(size, size)
      .png()
      .toFile(path);
    return {path: path};
  } else {
    let response;
    try {
      response = await axios.get(`https://api.coingecko.com/api/v3/coins/${params.platformId}/contract/${params.contractAddress}`);
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
      const jdenticon = require("jdenticon");
      let path = getPath(params);
      const value = `${params.platformId}-${params.contractAddress}`;
      const png = jdenticon.toPng(value, 512);
      fs.writeFileSync(baseImage, png);

      await sharp(png)
        .resize(size, size)
        .png()
        .toFile(path);

      return {path: path};
    }
  }
}

function getPath(params) {
  const size = params.size;
  let path = `${baseUrl}/images/${params.platformId}`;
  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }
  path += `/contract`;
  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }
  path += `/${params.contractAddress}`;
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