const express = require("express");
const jobRequestController = require("../controllers/jobRequestController");

const router = express.Router();

router.get("/", jobRequestController.list);
router.post("/", jobRequestController.create);
router.get("/dashboard", jobRequestController.dashboard);
router.get("/handovers", jobRequestController.handovers);
router.get("/options", jobRequestController.options);
router.get("/:jobNo/history", jobRequestController.history);
router.get("/:jobNo/issued-spare-parts", jobRequestController.issuedSpareParts);
router.post("/:jobNo/actions", jobRequestController.action);

module.exports = router;
