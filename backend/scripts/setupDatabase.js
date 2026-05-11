require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
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

async function setupDatabase() {
  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const pool = await sql.connect(dbConfig);

  await pool.request().batch(schemaSql);
  await pool.close();

  console.log(`Database setup completed for ${dbConfig.database}`);
}

setupDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
