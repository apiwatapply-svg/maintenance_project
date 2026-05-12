const express = require("express");
const adminController = require("../controllers/adminController");
const { attachEmployeeImagePath, employeeImageUpload } = require("../middlewares/employeeImageUpload");

const router = express.Router();
const employeeImageMiddleware = [employeeImageUpload.single("image_file"), attachEmployeeImagePath];

router.get("/:resource", adminController.list);
router.post("/employees", employeeImageMiddleware, adminController.create);
router.put("/employees/:id", employeeImageMiddleware, adminController.update);
router.post("/:resource", adminController.create);
router.put("/:resource/:id", adminController.update);
router.delete("/:resource/:id", adminController.remove);

module.exports = router;
