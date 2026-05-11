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

async function migrateDatabase() {
  const migrationsPath = path.join(__dirname, "..", "database", "migrations");
  const files = fs.readdirSync(migrationsPath).filter((file) => file.endsWith(".sql")).sort();
  const pool = await sql.connect(dbConfig);

  for (const file of files) {
    const sqlText = fs.readFileSync(path.join(migrationsPath, file), "utf8");
    await pool.request().batch(sqlText);
    console.log(`Applied migration: ${file}`);
  }

  await pool.close();
  console.log(`Database migrations completed for ${dbConfig.database}`);
}

migrateDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
