const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "images", "admin", "employees");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  }
});

const employeeImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG, and WEBP images are allowed.");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  }
});

function attachEmployeeImagePath(req, _res, next) {
  if (req.file) {
    req.body.image_path = `/images/admin/employees/${req.file.filename}`;
  }

  return next();
}

module.exports = {
  employeeImageUpload,
  attachEmployeeImagePath
};
