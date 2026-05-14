const assert = require("node:assert/strict");
const test = require("node:test");

test("database config resets cached pool after a failed connection", async (t) => {
  const databasePath = require.resolve("../src/config/database");
  const mssqlPath = require.resolve("mssql");
  const originalMssql = require.cache[mssqlPath];
  let attempts = 0;

  delete require.cache[databasePath];
  require.cache[mssqlPath] = {
    id: mssqlPath,
    filename: mssqlPath,
    loaded: true,
    exports: {
      connect: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("temporary connection error"))
          : Promise.resolve({ connected: true });
      }
    }
  };

  t.after(() => {
    delete require.cache[databasePath];
    if (originalMssql) {
      require.cache[mssqlPath] = originalMssql;
    } else {
      delete require.cache[mssqlPath];
    }
  });

  const { getPool } = require("../src/config/database");

  await assert.rejects(() => getPool(), /temporary connection error/);
  const pool = await getPool();

  assert.deepEqual(pool, { connected: true });
  assert.equal(attempts, 2);
});
