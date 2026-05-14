const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { sql, getPool } = require("../src/config/database");

const department = {
  department_code: "PRD",
  department_name: "Production",
  status: "active"
};

const areas = [
  { area_code: "LINE_A", area_name: "Line A", department_code: "PRD", status: "active" },
  { area_code: "LINE_B", area_name: "Line B", department_code: "PRD", status: "active" },
  { area_code: "PACKING", area_name: "Packing", department_code: "PRD", status: "active" },
  { area_code: "UTILITY", area_name: "Utility", department_code: "PRD", status: "active" }
];

const machineTypePlans = [
  { area_code: "LINE_A", machine_type_code: "CNV_A", machine_type_name: "Conveyor", prefix: "CNV-A", count: 10 },
  { area_code: "LINE_A", machine_type_code: "FIL_A", machine_type_name: "Filling", prefix: "FIL-A", count: 8 },
  { area_code: "LINE_A", machine_type_code: "PNL_A", machine_type_name: "Control Panel", prefix: "PNL-A", count: 6 },
  { area_code: "LINE_A", machine_type_code: "RBT_A", machine_type_name: "Robot Arm", prefix: "RBT-A", count: 6 },
  { area_code: "LINE_B", machine_type_code: "PMP_B", machine_type_name: "Pump", prefix: "PMP-B", count: 8 },
  { area_code: "LINE_B", machine_type_code: "MIX_B", machine_type_name: "Mixer", prefix: "MIX-B", count: 8 },
  { area_code: "LINE_B", machine_type_code: "PKG_B", machine_type_name: "Packing Machine", prefix: "PKG-B", count: 7 },
  { area_code: "LINE_B", machine_type_code: "LBL_B", machine_type_name: "Labeler", prefix: "LBL-B", count: 7 },
  { area_code: "PACKING", machine_type_code: "SEA_P", machine_type_name: "Sealer", prefix: "SEA-P", count: 8 },
  { area_code: "PACKING", machine_type_code: "CAR_P", machine_type_name: "Cartoner", prefix: "CAR-P", count: 6 },
  { area_code: "PACKING", machine_type_code: "WGH_P", machine_type_name: "Weigher", prefix: "WGH-P", count: 6 },
  { area_code: "UTILITY", machine_type_code: "CMP_U", machine_type_name: "Compressor", prefix: "CMP-U", count: 7 },
  { area_code: "UTILITY", machine_type_code: "CHL_U", machine_type_name: "Chiller", prefix: "CHL-U", count: 7 },
  { area_code: "UTILITY", machine_type_code: "BLR_U", machine_type_name: "Boiler", prefix: "BLR-U", count: 6 }
];

const workingShifts = [
  { shift_code: "A", shift_name: "Shift A", start_time_local: "07:00", end_time_local: "15:00", sort_order: 1, status: "active" },
  { shift_code: "B", shift_name: "Shift B", start_time_local: "15:00", end_time_local: "23:00", sort_order: 2, status: "active" },
  { shift_code: "C", shift_name: "Shift C", start_time_local: "23:00", end_time_local: "07:00", sort_order: 3, status: "active" }
];

function buildMmsMachineSeedData() {
  const machineTypes = machineTypePlans.map(({ prefix: _prefix, count: _count, ...machineType }) => ({
    ...machineType,
    status: "active"
  }));
  const machines = machineTypePlans.flatMap((plan) => Array.from({ length: plan.count }, (_item, index) => {
    const sequence = String(index + 1).padStart(3, "0");

    return {
      machine_no: `${plan.prefix}-${sequence}`,
      machine_name: `${plan.machine_type_name} ${sequence}`,
      machine_type_code: plan.machine_type_code,
      status: "active"
    };
  }));

  return {
    department,
    areas,
    machineTypes,
    machines,
    workingShifts
  };
}

async function ensureAdminMasterTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.tbm_department', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tbm_department (
        id INT IDENTITY(1,1) PRIMARY KEY,
        department_code NVARCHAR(50) NOT NULL UNIQUE,
        department_name NVARCHAR(150) NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('dbo.tbm_area', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tbm_area (
        id INT IDENTITY(1,1) PRIMARY KEY,
        area_code NVARCHAR(50) NOT NULL UNIQUE,
        area_name NVARCHAR(150) NOT NULL,
        department_code NVARCHAR(50) NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('dbo.tbm_machine_type', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tbm_machine_type (
        id INT IDENTITY(1,1) PRIMARY KEY,
        machine_type_code NVARCHAR(50) NOT NULL UNIQUE,
        machine_type_name NVARCHAR(150) NOT NULL,
        area_code NVARCHAR(50) NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('dbo.tbm_machine_no', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tbm_machine_no (
        id INT IDENTITY(1,1) PRIMARY KEY,
        machine_no NVARCHAR(80) NOT NULL UNIQUE,
        machine_name NVARCHAR(150) NOT NULL,
        machine_type_code NVARCHAR(50) NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('dbo.tbm_mms_working_shift', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.tbm_mms_working_shift (
        id INT IDENTITY(1,1) PRIMARY KEY,
        shift_code NVARCHAR(20) NOT NULL UNIQUE,
        shift_name NVARCHAR(80) NOT NULL,
        start_time_local TIME NOT NULL,
        end_time_local TIME NOT NULL,
        sort_order INT NOT NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;
  `);
}

async function upsertDepartment(pool, row) {
  await pool.request()
    .input("department_code", sql.NVarChar(50), row.department_code)
    .input("department_name", sql.NVarChar(150), row.department_name)
    .input("status", sql.NVarChar(30), row.status)
    .query(`
      MERGE dbo.tbm_department AS target
      USING (SELECT @department_code AS department_code) AS source
      ON target.department_code = source.department_code
      WHEN MATCHED THEN
        UPDATE SET department_name = @department_name, status = @status, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (department_code, department_name, status)
        VALUES (@department_code, @department_name, @status);
    `);
}

async function upsertArea(pool, row) {
  await pool.request()
    .input("area_code", sql.NVarChar(50), row.area_code)
    .input("area_name", sql.NVarChar(150), row.area_name)
    .input("department_code", sql.NVarChar(50), row.department_code)
    .input("status", sql.NVarChar(30), row.status)
    .query(`
      MERGE dbo.tbm_area AS target
      USING (SELECT @area_code AS area_code) AS source
      ON target.area_code = source.area_code
      WHEN MATCHED THEN
        UPDATE SET area_name = @area_name, department_code = @department_code, status = @status, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (area_code, area_name, department_code, status)
        VALUES (@area_code, @area_name, @department_code, @status);
    `);
}

async function upsertMachineType(pool, row) {
  await pool.request()
    .input("machine_type_code", sql.NVarChar(50), row.machine_type_code)
    .input("machine_type_name", sql.NVarChar(150), row.machine_type_name)
    .input("area_code", sql.NVarChar(50), row.area_code)
    .input("status", sql.NVarChar(30), row.status)
    .query(`
      MERGE dbo.tbm_machine_type AS target
      USING (SELECT @machine_type_code AS machine_type_code) AS source
      ON target.machine_type_code = source.machine_type_code
      WHEN MATCHED THEN
        UPDATE SET machine_type_name = @machine_type_name, area_code = @area_code, status = @status, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (machine_type_code, machine_type_name, area_code, status)
        VALUES (@machine_type_code, @machine_type_name, @area_code, @status);
    `);
}

async function upsertMachine(pool, row) {
  await pool.request()
    .input("machine_no", sql.NVarChar(80), row.machine_no)
    .input("machine_name", sql.NVarChar(150), row.machine_name)
    .input("machine_type_code", sql.NVarChar(50), row.machine_type_code)
    .input("status", sql.NVarChar(30), row.status)
    .query(`
      MERGE dbo.tbm_machine_no AS target
      USING (SELECT @machine_no AS machine_no) AS source
      ON target.machine_no = source.machine_no
      WHEN MATCHED THEN
        UPDATE SET machine_name = @machine_name, machine_type_code = @machine_type_code, status = @status, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (machine_no, machine_name, machine_type_code, status)
        VALUES (@machine_no, @machine_name, @machine_type_code, @status);
    `);
}

async function upsertWorkingShift(pool, row) {
  await pool.request()
    .input("shift_code", sql.NVarChar(20), row.shift_code)
    .input("shift_name", sql.NVarChar(80), row.shift_name)
    .input("start_time_local", sql.VarChar(8), row.start_time_local)
    .input("end_time_local", sql.VarChar(8), row.end_time_local)
    .input("sort_order", sql.Int, row.sort_order)
    .input("status", sql.NVarChar(30), row.status)
    .query(`
      MERGE dbo.tbm_mms_working_shift AS target
      USING (SELECT @shift_code AS shift_code) AS source
      ON target.shift_code = source.shift_code
      WHEN MATCHED THEN
        UPDATE SET shift_name = @shift_name, start_time_local = CONVERT(time, @start_time_local), end_time_local = CONVERT(time, @end_time_local), sort_order = @sort_order, status = @status, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (shift_code, shift_name, start_time_local, end_time_local, sort_order, status)
        VALUES (@shift_code, @shift_name, CONVERT(time, @start_time_local), CONVERT(time, @end_time_local), @sort_order, @status);
    `);
}

async function seedMmsMachines() {
  const pool = await getPool();
  const seed = buildMmsMachineSeedData();

  await ensureAdminMasterTables(pool);
  await upsertDepartment(pool, seed.department);

  for (const area of seed.areas) {
    await upsertArea(pool, area);
  }

  for (const machineType of seed.machineTypes) {
    await upsertMachineType(pool, machineType);
  }

  for (const machine of seed.machines) {
    await upsertMachine(pool, machine);
  }

  for (const shift of seed.workingShifts) {
    await upsertWorkingShift(pool, shift);
  }

  return {
    areas: seed.areas.length,
    machineTypes: seed.machineTypes.length,
    machines: seed.machines.length,
    shifts: seed.workingShifts.length
  };
}

if (require.main === module) {
  seedMmsMachines()
    .then((result) => {
      console.log(`Seeded MMS machines: ${result.areas} areas, ${result.machineTypes} types, ${result.machines} machines, ${result.shifts} shifts.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  buildMmsMachineSeedData,
  seedMmsMachines
};
