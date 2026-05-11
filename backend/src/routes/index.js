const express = require("express");
const adminRoutes = require("./adminRoutes");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/health", healthRoutes);

module.exports = router;
