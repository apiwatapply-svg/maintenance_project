const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const allowedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const maxImageBytes = 5 * 1024 * 1024;

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function sanitizeBaseName(fileName) {
  const parsed = path.parse(String(fileName || "item-image"));
  const safeName = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "item-image";
}

function decodeBase64Image(data) {
  const text = String(data || "");
  const base64 = text.includes(",") ? text.split(",").pop() : text;

  if (!base64) {
    throw createBadRequest("Image data is required");
  }

  return Buffer.from(base64, "base64");
}

async function saveToolingItemImage(payload) {
  const extension = allowedImageTypes[payload?.mimeType];

  if (!extension) {
    throw createBadRequest("Only jpg, png, and webp images are allowed");
  }

  const imageBuffer = decodeBase64Image(payload.data);

  if (!imageBuffer.length) {
    throw createBadRequest("Image data is required");
  }

  if (imageBuffer.length > maxImageBytes) {
    throw createBadRequest("Image must be 5 MB or smaller");
  }

  const fileName = `${sanitizeBaseName(payload.fileName)}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
  const relativeUrl = `/images/tooling/items/${fileName}`;
  const targetDirectory = path.join(__dirname, "..", "..", "images", "tooling", "items");
  const targetPath = path.join(targetDirectory, fileName);

  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.writeFile(targetPath, imageBuffer);

  return {
    imageUrl: relativeUrl,
    size: imageBuffer.length,
    mimeType: payload.mimeType
  };
}

module.exports = {
  saveToolingItemImage
};
