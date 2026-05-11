const express = require("express");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.post("/login", adminController.login);
router.get("/:resource", adminController.list);
router.post("/:resource", adminController.create);
router.get("/:resource/:id", adminController.getById);
router.put("/:resource/:id", adminController.update);
router.delete("/:resource/:id", adminController.remove);

module.exports = router;
