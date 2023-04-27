const baseUrl = require('path').resolve(__dirname, '../../..');
const sharp = require('sharp');
const fs = require('fs');

exports.getIcon = async (params) => {
  const result = {errors: []};

  if (!params.platformId) result.errors.push('platformId parameter is required, expected url /images/:platformId/:size/icon.png');
  const size = Number(params.size);
  if (!(size > 0)) result.errors.push('size parameter should be greater than zero, expected url /images/:platformId/:size/icon.png');
  if (result.errors.length) return result;

  let baseImage = `${baseUrl}/images/${params.platformId}/currency/svg/icon.svg`;

  const density = Math.ceil(72 * size / 16);
  let sharpInstance = sharp(baseImage, {density: density});
  
  if (!fs.existsSync(baseImage)) {
    baseImage = `${baseUrl}/images/${params.platformId}/svg/icon.svg`;
    sharpInstance = sharp(baseImage, {density: density});
  }

  if (!fs.existsSync(baseImage)) {
    baseImage = `${baseUrl}/images/${params.platformId}/png/icon.png`;
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
    return {errors: ['Icon is unavailable']};
  }
}

function getPath (params) {
  const size = params.size;
  let path = `${baseUrl}/images/${params.platformId}/currency`;
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