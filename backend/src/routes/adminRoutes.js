const express = require("express");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/:resource", adminController.list);
router.post("/:resource", adminController.create);
router.put("/:resource/:id", adminController.update);
router.delete("/:resource/:id", adminController.remove);

module.exports = router;
