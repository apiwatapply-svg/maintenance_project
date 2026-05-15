const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { sql, getPool } = require("../src/config/database");
const { ensureJobRequestSchema } = require("../src/repositories/jobRequestRepository");
const { ensurePreventiveSchema } = require("../src/repositories/preventiveRepository");
const { ensureToolingSchema } = require("../src/repositories/toolingRepository");
const { ensureMmsReportSchema, listMmsReport } = require("../src/repositories/mmsRepository");
const { buildE2eSeedData } = require("./e2e_seed_data");

async function runStatement(pool, statement) {
  await pool.request().query(statement);
}

async function ensureAdminSchema(pool) {
  const statements = [
    `
    IF OBJECT_ID('dbo.tbm_department', 'U') IS NULL
    CREATE TABLE dbo.tbm_department (
      id INT IDENTITY(1,1) PRIMARY KEY,
      department_code NVARCHAR(50) NOT NULL UNIQUE,
      department_name NVARCHAR(150) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_area', 'U') IS NULL
    CREATE TABLE dbo.tbm_area (
      id INT IDENTITY(1,1) PRIMARY KEY,
      area_code NVARCHAR(50) NOT NULL UNIQUE,
      area_name NVARCHAR(150) NOT NULL,
      department_code NVARCHAR(50) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_machine_type', 'U') IS NULL
    CREATE TABLE dbo.tbm_machine_type (
      id INT IDENTITY(1,1) PRIMARY KEY,
      machine_type_code NVARCHAR(50) NOT NULL UNIQUE,
      machine_type_name NVARCHAR(150) NOT NULL,
      area_code NVARCHAR(50) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_machine_no', 'U') IS NULL
    CREATE TABLE dbo.tbm_machine_no (
      id INT IDENTITY(1,1) PRIMARY KEY,
      machine_no NVARCHAR(80) NOT NULL UNIQUE,
      machine_name NVARCHAR(150) NOT NULL,
      machine_type_code NVARCHAR(50) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_employee', 'U') IS NULL
    CREATE TABLE dbo.tbm_employee (
      id INT IDENTITY(1,1) PRIMARY KEY,
      emp_id NVARCHAR(50) NOT NULL UNIQUE,
      emp_name NVARCHAR(150) NOT NULL,
      department_code NVARCHAR(50) NOT NULL,
      department_name NVARCHAR(150) NOT NULL,
      section NVARCHAR(120) NULL,
      image_path NVARCHAR(500) NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_user', 'U') IS NULL
    CREATE TABLE dbo.tbm_user (
      id INT IDENTITY(1,1) PRIMARY KEY,
      emp_id NVARCHAR(50) NOT NULL,
      emp_name NVARCHAR(150) NOT NULL,
      department_code NVARCHAR(50) NOT NULL,
      department_name NVARCHAR(150) NOT NULL,
      username NVARCHAR(80) NOT NULL UNIQUE,
      password NVARCHAR(150) NOT NULL,
      role NVARCHAR(50) NOT NULL DEFAULT 'user',
      admin_scope NVARCHAR(80) NOT NULL DEFAULT 'none',
      status NVARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_mms_working_shift', 'U') IS NULL
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
    `
  ];

  for (const statement of statements) {
    await runStatement(pool, statement);
  }
}

async function upsert(pool, table, keyColumn, row, columnTypes = {}) {
  const columns = Object.keys(row);
  const request = pool.request();

  columns.forEach((column) => {
    const value = row[column];
    const type = columnTypes[column] || sql.NVarChar(sql.MAX);
    request.input(column, type, value);
  });

  const updateColumns = columns.filter((column) => column !== keyColumn);

  await request.query(`
    MERGE dbo.${table} AS target
    USING (SELECT @${keyColumn} AS ${keyColumn}) AS source
      ON target.${keyColumn} = source.${keyColumn}
    WHEN MATCHED THEN
      UPDATE SET ${updateColumns.map((column) => `${column} = @${column}`).join(", ")}, updated_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (${columns.join(", ")})
      VALUES (${columns.map((column) => `@${column}`).join(", ")});
  `);
}

async function upsertAdmin(pool, admin) {
  const shifts = [
    { shift_code: "A", shift_name: "Shift A", start_time_local: "07:00", end_time_local: "15:00", sort_order: 1, status: "active" },
    { shift_code: "B", shift_name: "Shift B", start_time_local: "15:00", end_time_local: "23:00", sort_order: 2, status: "active" },
    { shift_code: "C", shift_name: "Shift C", start_time_local: "23:00", end_time_local: "07:00", sort_order: 3, status: "active" }
  ];

  for (const row of admin.departments) await upsert(pool, "tbm_department", "department_code", row);
  for (const row of admin.areas) await upsert(pool, "tbm_area", "area_code", row);
  for (const row of admin.machineTypes) await upsert(pool, "tbm_machine_type", "machine_type_code", row);
  for (const row of admin.machines) await upsert(pool, "tbm_machine_no", "machine_no", row);
  for (const row of admin.employees) await upsert(pool, "tbm_employee", "emp_id", row);
  for (const row of admin.users) await upsert(pool, "tbm_user", "username", row);
  for (const row of shifts) {
    await upsert(pool, "tbm_mms_working_shift", "shift_code", row, {
      end_time_local: sql.VarChar(8),
      sort_order: sql.Int,
      start_time_local: sql.VarChar(8)
    });
  }
}

async function upsertTooling(pool, tooling) {
  const balanceByItem = new Map(tooling.stockBalance.map((row) => [row.item_code, row]));

  for (const row of tooling.categories) await upsert(pool, "tbm_tooling_category", "category_code", row);
  for (const row of tooling.locations) await upsert(pool, "tbm_tooling_location", "location_code", row);
  for (const row of tooling.units) await upsert(pool, "tbm_tooling_unit", "unit_code", row);
  for (const row of tooling.tools) await upsert(pool, "tb_tooling_tool", "tool_code", row, { minimum_stock: sql.Int });
  for (const row of tooling.stockItems) {
    const balance = balanceByItem.get(row.item_code) || {};
    await upsert(pool, "tb_tooling_stock_item", "item_code", {
      ...row,
      current_stock: balance.current_stock || 0,
      status: "active"
    }, { current_stock: sql.Int, maximum_stock: sql.Int, minimum_stock: sql.Int });
  }
  for (const row of tooling.stockIn) await upsert(pool, "tb_tooling_stock_in", "receive_no", row, { quantity: sql.Int, receive_date: sql.Date });
  for (const row of tooling.stockOut) await upsert(pool, "tb_tooling_stock_out", "issue_no", row, { issue_date: sql.Date, quantity: sql.Int });
  for (const row of tooling.stockBalance) await upsert(pool, "tb_tooling_stock_balance", "item_code", row, { current_stock: sql.Int, maximum_stock: sql.Int, minimum_stock: sql.Int });
  for (const row of tooling.movementHistory) await upsert(pool, "tb_tooling_movement_history", "reference_no", row, { movement_date: sql.Date, quantity: sql.Int });
  for (const row of tooling.calibration) await upsert(pool, "tb_tooling_calibration", "tool_code", row, { calibration_interval_days: sql.Int, last_calibration_date: sql.Date, next_calibration_date: sql.Date });
  for (const row of tooling.borrowIssue) await upsert(pool, "tb_tooling_borrow_transaction", "issue_no", row, { due_date: sql.Date, issue_date: sql.Date });
  for (const row of tooling.returnTool) await upsert(pool, "tb_tooling_return_transaction", "return_no", row, { return_date: sql.Date });
  for (const row of tooling.overdueBorrow) await upsert(pool, "tb_tooling_overdue_borrow", "borrow_no", row, { due_date: sql.Date, overdue_days: sql.Int });
  for (const row of tooling.reports) await upsert(pool, "tb_tooling_report", "report_name", row, { last_generated_date: sql.Date, row_count: sql.Int });
}

async function upsertJobRequests(pool, jobRequest) {
  for (const row of jobRequest.jobs) await upsert(pool, "tb_job_request", "job_no", row, { accept_at: sql.DateTime2, requested_at: sql.DateTime2 });
  for (const row of jobRequest.options) {
    await pool.request()
      .input("option_group", sql.NVarChar(80), row.option_group)
      .input("option_value", sql.NVarChar(200), row.option_value)
      .input("sort_order", sql.Int, row.sort_order)
      .input("is_active", sql.Bit, row.is_active)
      .query(`
        MERGE dbo.tbm_job_request_option AS target
        USING (SELECT @option_group AS option_group, @option_value AS option_value) AS source
          ON target.option_group = source.option_group AND target.option_value = source.option_value
        WHEN MATCHED THEN UPDATE SET sort_order = @sort_order, is_active = @is_active
        WHEN NOT MATCHED THEN INSERT (option_group, option_value, sort_order, is_active) VALUES (@option_group, @option_value, @sort_order, @is_active);
      `);
  }
  for (const row of jobRequest.history) {
    await pool.request()
      .input("job_no", sql.NVarChar(80), row.job_no)
      .input("action_name", sql.NVarChar(80), row.action_name)
      .input("action_time", sql.DateTime2, row.action_time)
      .input("from_status", sql.NVarChar(40), row.from_status)
      .input("to_status", sql.NVarChar(40), row.to_status)
      .input("action_by", sql.NVarChar(150), row.action_by)
      .input("remark", sql.NVarChar(sql.MAX), row.remark)
      .input("attachment_urls", sql.NVarChar(sql.MAX), row.attachment_urls)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM dbo.tb_job_request_history
          WHERE job_no = @job_no AND action_name = @action_name AND action_time = @action_time
        )
        INSERT INTO dbo.tb_job_request_history (job_no, action_time, action_name, from_status, to_status, action_by, remark, attachment_urls)
        VALUES (@job_no, @action_time, @action_name, @from_status, @to_status, @action_by, @remark, @attachment_urls);
      `);
  }
  for (const row of jobRequest.handovers) {
    await pool.request()
      .input("job_no", sql.NVarChar(80), row.job_no)
      .input("current_owner", sql.NVarChar(150), row.current_owner)
      .input("handover_from", sql.NVarChar(150), row.handover_from)
      .input("handover_to", sql.NVarChar(150), row.handover_to)
      .input("reason", sql.NVarChar(300), row.reason)
      .input("shift_name", sql.NVarChar(80), row.shift_name)
      .input("created_at", sql.DateTime2, row.created_at)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM dbo.tb_job_request_handover
          WHERE job_no = @job_no AND handover_from = @handover_from AND handover_to = @handover_to AND created_at = @created_at
        )
        INSERT INTO dbo.tb_job_request_handover (job_no, current_owner, handover_from, handover_to, reason, shift_name, created_at)
        VALUES (@job_no, @current_owner, @handover_from, @handover_to, @reason, @shift_name, @created_at);
      `);
  }
}

async function upsertPreventive(pool, preventive) {
  for (const row of preventive.types) {
    await upsert(pool, "tbm_pm_type", "pm_type_code", row, { advance_notify_days: sql.Int, default_frequency_days: sql.Int });
  }

  for (const row of preventive.mappings) await upsert(pool, "tb_pm_machine_mapping", "machine_code", row);

  for (const row of preventive.mappingTypes) {
    await pool.request()
      .input("machine_code", sql.NVarChar(80), row.machine_code)
      .input("pm_type_code", sql.NVarChar(50), row.pm_type_code)
      .input("frequency_days", sql.Int, row.frequency_days)
      .input("advance_notify_days", sql.Int, row.advance_notify_days)
      .input("start_date", sql.Date, row.start_date)
      .input("next_date", sql.Date, row.next_date)
      .input("status", sql.NVarChar(20), row.status)
      .query(`
        MERGE dbo.tb_pm_machine_mapping_type AS target
        USING (
          SELECT m.id AS mapping_id, t.id AS pm_type_id
          FROM dbo.tb_pm_machine_mapping m
          CROSS JOIN dbo.tbm_pm_type t
          WHERE m.machine_code = @machine_code AND t.pm_type_code = @pm_type_code
        ) AS source
          ON target.mapping_id = source.mapping_id AND target.pm_type_id = source.pm_type_id
        WHEN MATCHED THEN
          UPDATE SET frequency_days = @frequency_days, advance_notify_days = @advance_notify_days, start_date = @start_date, next_date = @next_date, status = @status, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (mapping_id, pm_type_id, frequency_days, advance_notify_days, start_date, next_date, status)
          VALUES (source.mapping_id, source.pm_type_id, @frequency_days, @advance_notify_days, @start_date, @next_date, @status);
      `);
  }

  for (const row of preventive.plans) {
    await pool.request()
      .input("pm_no", sql.NVarChar(50), row.pm_no)
      .input("machine_code", sql.NVarChar(80), row.machine_code)
      .input("pm_type_code", sql.NVarChar(50), row.pm_type_code)
      .input("due_date", sql.Date, row.due_date)
      .input("last_date", sql.Date, row.last_date)
      .input("assigned_to", sql.NVarChar(150), row.assigned_to)
      .input("status", sql.NVarChar(30), row.status)
      .query(`
        MERGE dbo.tb_pm_plan AS target
        USING (
          SELECT mt.id AS mapping_type_id
          FROM dbo.tb_pm_machine_mapping_type mt
          JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id
          JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id
          WHERE m.machine_code = @machine_code AND t.pm_type_code = @pm_type_code
        ) AS source
          ON target.pm_no = @pm_no
        WHEN MATCHED THEN
          UPDATE SET mapping_type_id = source.mapping_type_id, due_date = @due_date, last_date = @last_date, assigned_to = @assigned_to, status = @status, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (pm_no, mapping_type_id, due_date, last_date, assigned_to, status)
          VALUES (@pm_no, source.mapping_type_id, @due_date, @last_date, @assigned_to, @status);
      `);
  }

  for (const row of preventive.inspections) {
    await pool.request()
      .input("pm_no", sql.NVarChar(50), row.pm_no)
      .input("inspector", sql.NVarChar(150), row.inspector)
      .input("checker", sql.NVarChar(150), row.checker)
      .input("started_at", sql.DateTime2, row.started_at)
      .input("completed_at", sql.DateTime2, row.completed_at)
      .input("overall_result", sql.NVarChar(20), row.overall_result)
      .input("remark", sql.NVarChar(1000), row.remark)
      .input("status", sql.NVarChar(30), row.status)
      .query(`
        MERGE dbo.tb_pm_inspection AS target
        USING (SELECT id AS pm_plan_id FROM dbo.tb_pm_plan WHERE pm_no = @pm_no) AS source
          ON target.pm_plan_id = source.pm_plan_id AND target.started_at = @started_at
        WHEN MATCHED THEN
          UPDATE SET inspector = @inspector, checker = @checker, completed_at = @completed_at, overall_result = @overall_result, remark = @remark, status = @status, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (pm_plan_id, inspector, checker, started_at, completed_at, overall_result, remark, status)
          VALUES (source.pm_plan_id, @inspector, @checker, @started_at, @completed_at, @overall_result, @remark, @status);
      `);
  }
}

async function upsertMmsHourly(pool, rows) {
  for (const row of rows) {
    await pool.request()
      .input("work_date", sql.Date, row.work_date)
      .input("shift_code", sql.NVarChar(20), row.shift_code)
      .input("hour_label", sql.NVarChar(20), row.hour_label)
      .input("machine_no", sql.NVarChar(80), row.machine_no)
      .input("status", sql.NVarChar(40), row.status)
      .input("planned_seconds", sql.Int, row.planned_seconds)
      .input("run_seconds", sql.Int, row.run_seconds)
      .input("stop_seconds", sql.Int, row.stop_seconds)
      .input("alarm_seconds", sql.Int, row.alarm_seconds)
      .input("target_output", sql.Int, row.target_output)
      .input("output_ok", sql.Int, row.output_ok)
      .input("output_ng", sql.Int, row.output_ng)
      .input("cycle_time_sec", sql.Decimal(10, 2), row.cycle_time_sec)
      .query(`
        MERGE dbo.tb_mms_machine_hourly AS target
        USING (SELECT @work_date AS work_date, @hour_label AS hour_label, @machine_no AS machine_no) AS source
          ON target.work_date = source.work_date AND target.hour_label = source.hour_label AND target.machine_no = source.machine_no
        WHEN MATCHED THEN
          UPDATE SET shift_code = @shift_code, status = @status, planned_seconds = @planned_seconds, run_seconds = @run_seconds,
            stop_seconds = @stop_seconds, alarm_seconds = @alarm_seconds, target_output = @target_output, output_ok = @output_ok,
            output_ng = @output_ng, cycle_time_sec = @cycle_time_sec, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (work_date, shift_code, hour_label, machine_no, status, planned_seconds, run_seconds, stop_seconds, alarm_seconds, target_output, output_ok, output_ng, cycle_time_sec)
          VALUES (@work_date, @shift_code, @hour_label, @machine_no, @status, @planned_seconds, @run_seconds, @stop_seconds, @alarm_seconds, @target_output, @output_ok, @output_ng, @cycle_time_sec);
      `);
  }
}

async function cleanupLegacySeedRows(pool) {
  const statements = [
    "DELETE FROM dbo.tb_job_request_handover WHERE job_no LIKE 'JOB-20260512-%';",
    "DELETE FROM dbo.tb_job_request_history WHERE job_no LIKE 'JOB-20260512-%';",
    "DELETE FROM dbo.tb_job_request_spare_part_usage WHERE job_no LIKE 'JOB-20260512-%';",
    "DELETE FROM dbo.tb_job_request WHERE job_no LIKE 'JOB-20260512-%';",
    `
    DELETE r
    FROM dbo.tb_pm_inspection_result r
    JOIN dbo.tb_pm_inspection i ON i.id = r.inspection_id
    JOIN dbo.tb_pm_plan p ON p.id = i.pm_plan_id
    WHERE p.pm_no IN ('PM-20260513-001', 'PM-20260510-002', 'PM-20260520-003', 'PM-20260513-004', 'PM-20260513-005', 'PM-20260513-006');
    `,
    `
    DELETE i
    FROM dbo.tb_pm_inspection i
    JOIN dbo.tb_pm_plan p ON p.id = i.pm_plan_id
    WHERE p.pm_no IN ('PM-20260513-001', 'PM-20260510-002', 'PM-20260520-003', 'PM-20260513-004', 'PM-20260513-005', 'PM-20260513-006');
    `,
    "DELETE FROM dbo.tb_pm_plan WHERE pm_no IN ('PM-20260513-001', 'PM-20260510-002', 'PM-20260520-003', 'PM-20260513-004', 'PM-20260513-005', 'PM-20260513-006');",
    `
    DELETE mt
    FROM dbo.tb_pm_machine_mapping_type mt
    JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id
    WHERE m.machine_code IN ('PMP-U-011', 'PAN-B-007', 'CNV-B-002', 'FIL-B-005');
    `,
    "DELETE FROM dbo.tb_pm_machine_mapping WHERE machine_code IN ('PMP-U-011', 'PAN-B-007', 'CNV-B-002', 'FIL-B-005');"
  ];

  for (const statement of statements) {
    await pool.request().query(statement);
  }
}

async function seedE2eData(now = new Date()) {
  const pool = await getPool();
  const seed = buildE2eSeedData(now);

  await ensureAdminSchema(pool);
  await ensureToolingSchema(pool);
  await ensureJobRequestSchema(pool);
  await ensurePreventiveSchema(pool);
  await ensureMmsReportSchema(pool);

  await cleanupLegacySeedRows(pool);
  await upsertAdmin(pool, seed.admin);
  await upsertTooling(pool, seed.tooling);
  await upsertJobRequests(pool, seed.jobRequest);
  await upsertPreventive(pool, seed.preventive);
  await upsertMmsHourly(pool, seed.mmsHourly);

  const mmsReport = await listMmsReport({ period: "daily", date: seed.todayText });

  return {
    admin: {
      areas: seed.admin.areas.length,
      employees: seed.admin.employees.length,
      machines: seed.admin.machines.length,
      users: seed.admin.users.length
    },
    jobRequests: seed.jobRequest.jobs.length,
    mmsHourlyRows: seed.mmsHourly.length,
    mmsOee: mmsReport.summary.oee,
    preventivePlans: seed.preventive.plans.length,
    todayText: seed.todayText,
    toolingStockItems: seed.tooling.stockBalance.length
  };
}

if (require.main === module) {
  seedE2eData()
    .then((result) => {
      console.log(`Seeded e2e data for ${result.todayText}.`);
      console.log(`Admin: ${result.admin.users} users, ${result.admin.employees} employees, ${result.admin.machines} machines.`);
      console.log(`Tooling: ${result.toolingStockItems} stock items. Job Request: ${result.jobRequests} jobs. PM: ${result.preventivePlans} plans.`);
      console.log(`MMS: ${result.mmsHourlyRows} hourly rows, OEE ${result.mmsOee}%.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  seedE2eData
};
