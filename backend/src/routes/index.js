const express = require("express");
const adminRoutes = require("./adminRoutes");
const authRoutes = require("./authRoutes");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);

module.exports = router;
