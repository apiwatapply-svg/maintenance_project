const express = require("express");
const preventiveController = require("../controllers/preventiveController");

const router = express.Router();

router.get("/bootstrap", preventiveController.bootstrap);
router.get("/history", preventiveController.history);

router.post("/types", preventiveController.createType);
router.put("/types/:id", preventiveController.updateType);
router.delete("/types/:id", preventiveController.removeType);

router.post("/types/:pmTypeId/checklist", preventiveController.createChecklist);
router.put("/checklist/:itemId", preventiveController.updateChecklist);
router.delete("/checklist/:itemId", preventiveController.removeChecklist);

router.post("/plans", preventiveController.createPlanRecord);
router.post("/inspections/:planId/submit", preventiveController.submitInspection);

module.exports = router;
