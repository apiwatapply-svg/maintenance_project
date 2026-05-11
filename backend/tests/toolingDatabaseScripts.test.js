const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("tooling database scripts", () => {
  test("foundation migration creates required prefixed tooling tables", () => {
    const sql = readProjectFile("database/migrations/20260511_create_tooling_foundation.sql");

    [
      "dbo.tbm_tooling_category",
      "dbo.tbm_tooling_location",
      "dbo.tbm_tooling_supplier",
      "dbo.tbm_tooling_item",
      "dbo.tb_tooling_stock_balance",
      "dbo.tb_tooling_stock_transaction",
      "dbo.tb_tooling_request",
      "dbo.tb_tooling_request_item",
      "dbo.tb_tooling_adjustment",
      "dbo.tb_tooling_planning_snapshot"
    ].forEach((tableName) => {
      expect(sql).toContain(tableName);
    });
  });

  test("tooling inventory seed includes usable scan and stock data", () => {
    const migrationSql = readProjectFile("database/migrations/20260513_seed_tooling_inventory.sql");
    const schemaSql = readProjectFile("database/schema.sql");

    [
      "SP-BRG-6204",
      "QR-SP-BRG-6204",
      "Ball_bearing.jpg",
      "Pneumatic_cylinder_2172.jpg",
      "ST-A01",
      "SUP-MRO",
      "dbo.tb_tooling_stock_balance"
    ].forEach((requiredSeed) => {
      expect(migrationSql).toContain(requiredSeed);
      expect(schemaSql).toContain(requiredSeed);
    });
  });

  test("tooling item image migration adds imageUrl and updates seeded items", () => {
    const migrationSql = readProjectFile("database/migrations/20260514_add_tooling_item_images.sql");

    expect(migrationSql).toContain("ALTER TABLE dbo.tbm_tooling_item");
    expect(migrationSql).toContain("imageUrl NVARCHAR(500)");
    expect(migrationSql).toContain("SP-SEN-PROX");
    expect(migrationSql).toContain("Inductive%20Proximity%20Switch.jpg");
    expect(migrationSql).toContain("SP-REL-24V");
    expect(migrationSql).toContain("2019-08-04_Relay.jpg");
  });

  test("database check script verifies tooling tables after migration", () => {
    const checkScript = readProjectFile("scripts/checkDatabase.js");

    [
      "tbm_tooling_category",
      "tbm_tooling_location",
      "tbm_tooling_supplier",
      "tbm_tooling_item",
      "tb_tooling_stock_balance"
    ].forEach((tableName) => {
      expect(checkScript).toContain(tableName);
    });
  });
});
