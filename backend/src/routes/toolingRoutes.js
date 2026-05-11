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
router.get("/requests", toolingController.listRequests);
router.post("/requests", toolingController.createRequest);
router.get("/requests/:id", toolingController.getRequestById);
router.put("/requests/:id/approve", requireToolingAccess("admin"), toolingController.approveRequest);
router.put("/requests/:id/reject", requireToolingAccess("admin"), toolingController.rejectRequest);
router.put("/requests/:id/issue", requireToolingAccess("admin"), toolingController.issueRequest);
router.get("/:resource", toolingController.list);
router.post("/:resource", requireToolingAccess("admin"), toolingController.create);
router.get("/:resource/:id", toolingController.getById);
router.put("/:resource/:id", requireToolingAccess("admin"), toolingController.update);
router.delete("/:resource/:id", requireToolingAccess("admin"), toolingController.remove);

module.exports = router;
