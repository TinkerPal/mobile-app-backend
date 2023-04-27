const fs = require("fs");
const multer = require("multer");
const sizeOf = require("image-size");
const { randomBytes } = require("crypto");
const { getAdminAuth, getFileFormatByMimeType } = require(`${__dirname}/../../utils`);
const {
  AVAILABLE_PLATFORMS,
  AVAILABLE_MIME_TYPES,
  AVAILABLE_MIME_TYPES_WITH_DIRECTIONS,
} = require(`${__dirname}/../../constants`);

exports.default = async (req, res) => {
  const TEMP_PATH = `${__dirname}/../../../../images/tmp`;
  let originalPath = null;
  let draftFileName = null;
  let originalFileName = null;

  const getAdminRole = await getAdminAuth(req);

  const fileFilter = (req, file, cb) => {
    const platformId = req.body.platformId;

    if (!platformId || platformId === "") {
      return cb(new Error("Field platformId is required"));
    }

    if (!AVAILABLE_PLATFORMS.includes(platformId)) {
      return cb(
        new Error(
          `This platform is not allowed. Only are allowed - ${AVAILABLE_PLATFORMS.join(
            ", "
          )}.`
        )
      );
    }

    if (!AVAILABLE_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `This file format is not allowed. Only are allowed - ${AVAILABLE_MIME_TYPES.join(
            ", "
          )}.`
        )
      );
    }

    cb(null, true);
  };

  if (getAdminRole.success) {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const platformId = req.body.platformId;

        const tokenAddress = req.body.tokenAddress;

        const fileFormat = getFileFormatByMimeType(file.mimetype);

        originalPath = `${__dirname}/../../../../images/${platformId}${
          tokenAddress ? `/contract/${tokenAddress}` : ""
        }/${fileFormat}`;

        if (!fs.existsSync(TEMP_PATH)) {
          try {
            fs.mkdirSync(TEMP_PATH, { recursive: true });
          } catch (err) {
            new Error(`Can not create folder by path - ${TEMP_PATH}`);
          }
        }

        cb(null, TEMP_PATH);
      },
      filename: (req, file, cb) => {
        const fileFormat = getFileFormatByMimeType(file.mimetype);
        const randomString = randomBytes(20).toString("hex");

        originalFileName = `icon.${fileFormat}`;
        draftFileName = `icon${randomString}.${fileFormat}`;
        cb(null, draftFileName);
      },
    });

    const upload = await multer({
      storage: storage,
      fileFilter,
    }).single("file");

    upload(req, res, (err) => {
      if (err) {
        const message = err.message ? err.message : err;
        return res.status(404).send({ success: false, message: message });
      } else {
        const draftFilePath = `${TEMP_PATH}/${draftFileName}`;
        const originalFilePath = `${originalPath}/${originalFileName}`;

        if (!draftFileName) {
          return res
            .status(404)
            .send({ success: false, message: "File is required." });
        }

        if (AVAILABLE_MIME_TYPES_WITH_DIRECTIONS.includes(req.file.mimetype)) {
          const dimensions = sizeOf(draftFilePath);

          if (dimensions.width < 512 || dimensions.height < 512) {
            try {
              fs.unlinkSync(draftFilePath);
            } catch (err) {
              console.log(`Can not remove draft file - ${err}`);
            }

            return res.status(404).send({
              success: false,
              message: `Incorrect image dimensions. Current dimensions ${dimensions.width}x${dimensions.height}, expected not less then 512x512.`,
            });
          }
        }

        if (!fs.existsSync(originalPath)) {
          try {
            fs.mkdirSync(originalPath, { recursive: true });
          } catch (err) {
            return res.status(404).send({
              success: false,
              message: `Can not create folder by path - ${originalPath}`,
            });
          }
        }

        try {
          fs.renameSync(draftFilePath, originalFilePath);
        } catch (err) {
          try {
            fs.unlinkSync(draftFilePath);
          } catch (error) {
            console.log(
              `Can not remove draft file after copy with error - ${error}`
            );
          }

          return res.status(404).send({
            success: false,
            message: `Can not copy file from ${draftFilePath} to ${originalFilePath}, ${err}`,
          });
        }

        return res.status(200).send({ success: true });
      }
    });
  } else {
    return res.status(401).send(getAdminRole);
  }
};