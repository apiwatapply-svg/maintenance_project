const sql = require("mssql");

const dbConfig = {
  user: process.env.local.DB_USER,
  password: process.env.local.DB_PASSWORD,
  server: process.env.local.DB_SERVER || "localhost",
  database: process.env.local.DB_DATABASE,
  port: Number(process.env.local.DB_PORT || 1433),
  options: {
    encrypt: process.env.local.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.local.DB_TRUST_SERVER_CERTIFICATE !== "false"
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }

  return poolPromise;
}

module.exports = {
  sql,
  getPool
};
