const express = require("express");
const toolingController = require("../controllers/toolingController");

const router = express.Router();

router.get("/:resource", toolingController.list);
router.post("/:resource", toolingController.create);
router.put("/:resource/:id", toolingController.update);
router.delete("/:resource/:id", toolingController.remove);

module.exports = router;
