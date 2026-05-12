const assert = require("node:assert/strict");
const test = require("node:test");

const { attachEmployeeImagePath } = require("../src/middlewares/employeeImageUpload");

test("attachEmployeeImagePath stores public backend image path on request body", () => {
  const req = {
    body: {},
    file: {
      filename: "employee.png"
    }
  };

  attachEmployeeImagePath(req, {}, () => {});

  assert.equal(req.body.image_path, "/images/admin/employees/employee.png");
});

test("attachEmployeeImagePath leaves body unchanged when no file is uploaded", () => {
  const req = {
    body: {
      emp_id: "MM-001"
    }
  };

  attachEmployeeImagePath(req, {}, () => {});

  assert.deepEqual(req.body, { emp_id: "MM-001" });
});
