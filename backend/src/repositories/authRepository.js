const { sql, getPool } = require("../config/database");

async function findActiveUserByUsername(username) {
  const pool = await getPool();
  const result = await pool.request()
    .input("username", sql.NVarChar(80), username)
    .query(`
      SELECT TOP 1
        id,
        emp_id AS empId,
        emp_name AS empName,
        department_code AS departmentCode,
        department_name AS departmentName,
        username,
        password,
        role,
        admin_scope AS adminScope,
        status
      FROM dbo.tbm_user
      WHERE username = @username
        AND status = 'active';
    `);

  return result.recordset[0] || null;
}

module.exports = {
  findActiveUserByUsername
};
