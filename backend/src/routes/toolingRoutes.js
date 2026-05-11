const express = require("express");
const toolingController = require("../controllers/toolingController");
const { requireToolingAccess } = require("../middlewares/requireToolingAccess");

const router = express.Router();

router.use(requireToolingAccess("user"));
router.get("/dashboard", toolingController.dashboard);
router.get("/items/search", toolingController.searchItems);
router.get("/items/qr/:qrCode", toolingController.findItemByQrCode);
router.post("/stock-in", requireToolingAccess("admin"), toolingController.stockIn);
router.post("/stock-out", requireToolingAccess("admin"), toolingController.stockOut);
router.get("/:resource", toolingController.list);
router.post("/:resource", requireToolingAccess("admin"), toolingController.create);
router.get("/:resource/:id", toolingController.getById);
router.put("/:resource/:id", requireToolingAccess("admin"), toolingController.update);
router.delete("/:resource/:id", requireToolingAccess("admin"), toolingController.remove);

module.exports = router;
