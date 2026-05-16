const express = require("express");
const adminController = require("../controllers/adminController");
const { attachEmployeeImagePath, employeeImageUpload } = require("../middlewares/employeeImageUpload");

const router = express.Router();
const employeeImageMiddleware = [employeeImageUpload.single("image_file"), attachEmployeeImagePath];

function setAdminResource(resource) {
  return (req, _res, next) => {
    req.params.resource = resource;
    next();
  };
}

router.get("/:resource", adminController.list);
router.post("/employees", setAdminResource("employees"), employeeImageMiddleware, adminController.create);
router.put("/employees/:id", setAdminResource("employees"), employeeImageMiddleware, adminController.update);
router.post("/:resource", adminController.create);
router.put("/:resource/:id", adminController.update);
router.delete("/:resource/:id", adminController.remove);

module.exports = router;
module.exports.setAdminResource = setAdminResource;
