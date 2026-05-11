require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false"
  }
};

async function checkDatabase() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query(`
    SELECT 'tbm_department' AS tableName, COUNT(1) AS total FROM dbo.tbm_department
    UNION ALL SELECT 'tbm_area', COUNT(1) FROM dbo.tbm_area
    UNION ALL SELECT 'tbm_machine_type', COUNT(1) FROM dbo.tbm_machine_type
    UNION ALL SELECT 'tbm_machine_number', COUNT(1) FROM dbo.tbm_machine_number
    UNION ALL SELECT 'tbm_user', COUNT(1) FROM dbo.tbm_user
  `);

  console.table(result.recordset);
  await pool.close();
}

checkDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
