const express = require("express");
const toolingController = require("../controllers/toolingController");
const { requireToolingAccess } = require("../middlewares/requireToolingAccess");

const router = express.Router();

router.use(requireToolingAccess("user"));
router.get("/dashboard", toolingController.dashboard);
router.get("/:resource", toolingController.list);

module.exports = router;
