const { sql, getPool } = require("../config/database");

let schemaReady = false;

const allowedStatuses = [
  "WAIT_MM",
  "MM_REPAIR",
  "WAIT_QC",
  "QC_INSPECTION",
  "WAIT_PROD_CONFIRM",
  "PROD_CONFIRMING",
  "COMPLETED",
  "CANCELLED"
];

const priorityRank = {
  Urgent: 1,
  High: 2,
  Medium: 3,
  Low: 4
};

function getSchemaStatements() {
  return [
    `
    IF OBJECT_ID('dbo.tb_job_request', 'U') IS NULL
    CREATE TABLE dbo.tb_job_request (
      id INT IDENTITY(1,1) PRIMARY KEY,
      job_no NVARCHAR(80) NOT NULL UNIQUE,
      requested_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      status NVARCHAR(40) NOT NULL DEFAULT 'WAIT_MM',
      area NVARCHAR(120) NOT NULL,
      machine_type NVARCHAR(120) NOT NULL,
      machine_name NVARCHAR(200) NOT NULL,
      machine_code NVARCHAR(80) NOT NULL,
      production_line NVARCHAR(120) NOT NULL,
      machine_no NVARCHAR(120) NOT NULL,
      problem NVARCHAR(MAX) NOT NULL,
      priority NVARCHAR(20) NOT NULL DEFAULT 'Medium',
      request_by NVARCHAR(150) NOT NULL,
      owner NVARCHAR(150) NULL,
      repair_detail NVARCHAR(MAX) NULL,
      maintenance_pic NVARCHAR(150) NULL,
      accept_by NVARCHAR(150) NULL,
      accept_at DATETIME2 NULL,
      qc_status NVARCHAR(80) NULL,
      qc_by NVARCHAR(150) NULL,
      prod_progress NVARCHAR(80) NOT NULL DEFAULT 'Done',
      mm_progress NVARCHAR(80) NOT NULL DEFAULT 'WAIT_MM',
      qc_progress NVARCHAR(80) NOT NULL DEFAULT '-',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_job_request_history', 'U') IS NULL
    CREATE TABLE dbo.tb_job_request_history (
      id INT IDENTITY(1,1) PRIMARY KEY,
      job_no NVARCHAR(80) NOT NULL,
      action_time DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      action_name NVARCHAR(80) NOT NULL,
      from_status NVARCHAR(40) NULL,
      to_status NVARCHAR(40) NULL,
      action_by NVARCHAR(150) NOT NULL,
      remark NVARCHAR(MAX) NULL,
      attachment_urls NVARCHAR(MAX) NULL
    );
    `,
    `
    IF OBJECT_ID(N'dbo.tb_job_request_history', N'U') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.tb_job_request_history')
          AND name = N'attachment_urls'
      )
    BEGIN
      EXEC(N'ALTER TABLE dbo.tb_job_request_history ADD attachment_urls NVARCHAR(MAX) NULL');
    END;
    `,
    `
    IF OBJECT_ID('dbo.tb_job_request_spare_part_usage', 'U') IS NULL
    CREATE TABLE dbo.tb_job_request_spare_part_usage (
      id INT IDENTITY(1,1) PRIMARY KEY,
      job_no NVARCHAR(80) NOT NULL,
      issue_no NVARCHAR(80) NOT NULL,
      item_code NVARCHAR(80) NOT NULL,
      item_name NVARCHAR(200) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_code NVARCHAR(50) NOT NULL DEFAULT 'PCS',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_job_request_option', 'U') IS NULL
    CREATE TABLE dbo.tbm_job_request_option (
      id INT IDENTITY(1,1) PRIMARY KEY,
      option_group NVARCHAR(80) NOT NULL,
      option_value NVARCHAR(200) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_job_request_handover', 'U') IS NULL
    CREATE TABLE dbo.tb_job_request_handover (
      id INT IDENTITY(1,1) PRIMARY KEY,
      job_no NVARCHAR(80) NOT NULL,
      current_owner NVARCHAR(150) NOT NULL,
      handover_from NVARCHAR(150) NOT NULL,
      handover_to NVARCHAR(150) NOT NULL,
      reason NVARCHAR(300) NOT NULL,
      shift_name NVARCHAR(80) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `
  ];
}

function getSeedStatements() {
  return [
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_job_request)
    INSERT INTO dbo.tb_job_request (
      job_no, requested_at, status, area, machine_type, machine_name, machine_code, production_line, machine_no,
      problem, priority, request_by, owner, repair_detail, maintenance_pic, accept_by, accept_at, qc_status, qc_by,
      prod_progress, mm_progress, qc_progress
    )
    VALUES
      ('JOB-20260512-001', '2026-05-12T01:00:00', 'WAIT_MM', 'Line A', 'Conveyor', 'Main Conveyor A', 'CNV-A', 'Line A', 'CNV-A-001', 'Abnormal noise, belt shaking', 'High', 'PRD-014 Somchai W.', 'Maintenance', '', '', '', NULL, '', '', 'Done', 'WAIT_MM', '-'),
      ('JOB-20260512-002', '2026-05-12T00:50:00', 'MM_REPAIR', 'Packing', 'Sealer', 'Auto Sealer P', 'SEA-P', 'Packing', 'SEA-P-004', 'Temperature unstable', 'Urgent', 'PRD-022 Kanda P.', 'MM-006 Anan S.', 'Heater terminal found loose. Tightened wiring and checking temperature trend.', 'MM-006 Anan S.', 'MM-006 Anan S.', '2026-05-12T01:10:00', '', '', 'Done', 'MM_REPAIR', 'Reject (MM[1])'),
      ('JOB-20260512-003', '2026-05-12T00:35:00', 'QC_INSPECTION', 'Line B', 'Filling', 'Bottle Filler B', 'FIL-B', 'Line B', 'FIL-B-002', 'Sensor false trigger', 'Medium', 'PRD-017 Narin T.', 'QC-003 Narin T.', 'Adjusted sensor bracket and tested dry run for 15 minutes.', 'MM-011 Prasert K.', 'MM-011 Prasert K.', '2026-05-12T00:50:00', 'Inspecting', 'QC-003 Narin T.', 'Done', 'Done', 'QC_INSPECTION'),
      ('JOB-20260512-004', '2026-05-12T00:20:00', 'WAIT_PROD_CONFIRM', 'Line C', 'Robot Arm', 'Robot Arm C', 'RBT-C', 'Line C', 'RBT-C-003', 'Gripper pressure low', 'High', 'PRD-031 Malee R.', 'Production', 'Replaced leaking air fitting and verified pressure hold.', 'MM-018 Suda M.', 'MM-018 Suda M.', '2026-05-12T00:45:00', 'PASS', 'QC-003 Narin T.', 'WAIT_PROD_CONFIRM', 'Done', 'Done'),
      ('JOB-20260512-005', '2026-05-12T00:18:00', 'PROD_CONFIRMING', 'Line A', 'Conveyor', 'Main Conveyor A', 'CNV-A', 'Line A', 'CNV-A-001', 'Belt tracking unstable', 'High', 'PRD-014 Somchai W.', 'PRD-022 Kanda P.', 'Adjusted roller alignment and tested conveyor under load.', 'MM-011 Prasert K.', 'MM-011 Prasert K.', '2026-05-12T00:35:00', 'PASS', 'QC-003 Narin T.', 'PROD_CONFIRMING', 'Done', 'Done'),
      ('JOB-20260512-006', '2026-05-12T00:10:00', 'WAIT_QC', 'Packing', 'Sealer', 'Auto Sealer P', 'SEA-P', 'Packing', 'SEA-P-002', 'Seal mark NG after repair', 'Medium', 'PRD-022 Kanda P.', 'QC', 'Production rejected seal quality after trial run. Waiting QC to inspect the rejected condition.', 'MM-018 Suda M.', 'MM-018 Suda M.', '2026-05-12T00:20:00', 'PASS', 'QC-009 Suda M.', 'Reject (QC[1])', 'Done', 'WAIT_QC');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_job_request_history)
    INSERT INTO dbo.tb_job_request_history (job_no, action_time, action_name, from_status, to_status, action_by, remark, attachment_urls)
    VALUES
      ('JOB-20260512-001', '2026-05-12T01:00:00', 'CREATE_JOB', '-', 'WAIT_MM', 'Production', 'Abnormal noise, belt shaking', NULL),
      ('JOB-20260512-002', '2026-05-12T00:50:00', 'CREATE_JOB', '-', 'WAIT_MM', 'Production', 'Temperature unstable', NULL),
      ('JOB-20260512-002', '2026-05-12T01:10:00', 'ACCEPT_JOB', 'WAIT_MM', 'MM_REPAIR', 'Maintenance', 'MM-006 accepted job', NULL),
      ('JOB-20260512-002', '2026-05-12T02:05:00', 'SEND_TO_QC', 'MM_REPAIR', 'WAIT_QC', 'Maintenance', 'Repair detail recorded', NULL),
      ('JOB-20260512-002', '2026-05-12T02:30:00', 'QC_REJECT', 'WAIT_QC', 'MM_REPAIR', 'QC', 'Temperature still unstable', NULL),
      ('JOB-20260512-003', '2026-05-12T00:35:00', 'CREATE_JOB', '-', 'WAIT_MM', 'Production', 'Sensor false trigger', NULL),
      ('JOB-20260512-003', '2026-05-12T00:50:00', 'ACCEPT_JOB', 'WAIT_MM', 'MM_REPAIR', 'Maintenance', 'MM-011 accepted job', NULL),
      ('JOB-20260512-003', '2026-05-12T01:55:00', 'SEND_TO_QC', 'MM_REPAIR', 'WAIT_QC', 'Maintenance', 'Sensor bracket adjusted', NULL),
      ('JOB-20260512-003', '2026-05-12T02:02:00', 'QC_ACCEPT', 'WAIT_QC', 'QC_INSPECTION', 'QC', 'QC-003 starts inspection', NULL);
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tbm_job_request_option)
    INSERT INTO dbo.tbm_job_request_option (option_group, option_value, sort_order)
    VALUES
      ('empId', 'PRD-014 - Somchai W.', 1), ('empId', 'PRD-022 - Kanda P.', 2), ('empId', 'MM-006 - Anan S.', 3),
      ('empId', 'MM-011 - Prasert K.', 4), ('empId', 'MM-018 - Suda M.', 5), ('empId', 'QC-003 - Narin T.', 6),
      ('empId', 'QC-009 - Suda M.', 7),
      ('area', 'Line A', 1), ('area', 'Line B', 2), ('area', 'Line C', 3), ('area', 'Packing', 4), ('area', 'Utility', 5),
      ('machineType', 'Conveyor', 1), ('machineType', 'Filling', 2), ('machineType', 'Robot Arm', 3), ('machineType', 'Sealer', 4), ('machineType', 'Compressor', 5),
      ('machineNo', 'CNV-A-001', 1), ('machineNo', 'FIL-B-002', 2), ('machineNo', 'RBT-C-003', 3), ('machineNo', 'SEA-P-004', 4), ('machineNo', 'CMP-U-001', 5),
      ('problem', 'Abnormal noise', 1), ('problem', 'Sensor false trigger', 2), ('problem', 'Temperature unstable', 3), ('problem', 'Pressure low', 4), ('problem', 'Oil leakage', 5),
      ('problemOther', 'Other problem', 1),
      ('priority', 'Urgent', 1), ('priority', 'High', 2), ('priority', 'Medium', 3), ('priority', 'Low', 4),
      ('maintenancePic', 'MM-006 - Anan S.', 1), ('maintenancePic', 'MM-011 - Prasert K.', 2), ('maintenancePic', 'MM-018 - Suda M.', 3),
      ('repairCause', 'Bearing wear', 1), ('repairCause', 'Sensor misalignment', 2), ('repairCause', 'Loose terminal', 3), ('repairCause', 'Air leak', 4), ('repairCause', 'Program setting', 5),
      ('repairAction', 'Replace bearing', 1), ('repairAction', 'Adjust sensor', 2), ('repairAction', 'Tighten wiring', 3), ('repairAction', 'Replace fitting', 4), ('repairAction', 'Reset parameter', 5),
      ('qcResult', 'Pass and send Production', 1), ('qcResult', 'Pass and complete', 2), ('qcResult', 'Reject to Maintenance', 3),
      ('qcFinding', 'Noise OK', 1), ('qcFinding', 'Vibration OK', 2), ('qcFinding', 'Safety guard OK', 3), ('qcFinding', 'Product quality OK', 4), ('qcFinding', 'Other finding', 5),
      ('qcRejectReason', 'Symptom still found', 1), ('qcRejectReason', 'Safety condition NG', 2), ('qcRejectReason', 'Quality trial NG', 3), ('qcRejectReason', 'Machine setting unstable', 4), ('qcRejectReason', 'Other QC reject reason', 5),
      ('confirmResult', 'Confirm completed', 1), ('confirmResult', 'Reject to QC', 2),
      ('confirmCheck', 'Trial run OK', 1), ('confirmCheck', 'Product quality OK', 2), ('confirmCheck', 'Operator safety OK', 3), ('confirmCheck', 'Output stable', 4), ('confirmCheck', 'Other confirm check', 5),
      ('productionRejectReason', 'Same symptom remains', 1), ('productionRejectReason', 'Quality result NG', 2), ('productionRejectReason', 'Machine cannot run stable', 3), ('productionRejectReason', 'Need QC confirmation', 4), ('productionRejectReason', 'Other production reject reason', 5),
      ('handoverPendingItem', 'Repair continues', 1), ('handoverPendingItem', 'Waiting spare part', 2), ('handoverPendingItem', 'Waiting machine trial', 3), ('handoverPendingItem', 'Waiting QC inspection', 4), ('handoverPendingItem', 'Waiting Production confirm', 5), ('handoverPendingItem', 'Other pending item', 6);
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_job_request_handover)
    INSERT INTO dbo.tb_job_request_handover (job_no, current_owner, handover_from, handover_to, reason, shift_name, created_at)
    VALUES
      ('JOB-20260512-002', 'MM-006 Anan S.', 'MM-006 Anan S.', 'MM-011 Prasert K.', 'End of shift, repair not finished', 'Night Shift', '2026-05-12T12:50:00'),
      ('JOB-20260512-005', 'PRD-022 Kanda P.', 'PRD-022 Kanda P.', 'PRD-031 Malee R.', 'Production confirm continues next shift', 'Day Shift', '2026-05-12T13:05:00');
    `
  ];
}

async function ensureJobRequestSchema(pool) {
  if (schemaReady) {
    return;
  }

  for (const statement of getSchemaStatements()) {
    await pool.request().query(statement);
  }

  for (const statement of getSeedStatements()) {
    await pool.request().query(statement);
  }

  schemaReady = true;
}

function normalizeRow(row) {
  return {
    id: row.id,
    jobNo: row.job_no,
    requestedAt: row.requested_at,
    status: row.status,
    area: row.area,
    machineType: row.machine_type,
    machineName: row.machine_name,
    machineCode: row.machine_code,
    productionLine: row.production_line,
    machineNo: row.machine_no,
    problem: row.problem,
    priority: row.priority,
    requestBy: row.request_by,
    owner: row.owner,
    repairDetail: row.repair_detail || "",
    maintenancePic: row.maintenance_pic || "",
    acceptBy: row.accept_by || "",
    acceptAt: row.accept_at || "",
    qcStatus: row.qc_status || "",
    qcBy: row.qc_by || "",
    progress: {
      prod: row.prod_progress || "-",
      mm: row.mm_progress || "-",
      qc: row.qc_progress || "-"
    }
  };
}

function sortRows(rows) {
  return [...rows].sort((first, second) => {
    const rankDiff = (priorityRank[first.priority] || 99) - (priorityRank[second.priority] || 99);
    if (rankDiff) return rankDiff;
    return new Date(first.requestedAt).getTime() - new Date(second.requestedAt).getTime();
  });
}

function buildJobNoPrefix(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `JOB-${year}${month}${day}`;
}

function normalizeRequiredText(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeAttachmentUrls(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
  } catch {
    // Existing rows may store comma-separated URLs instead of JSON.
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyAttachmentUrls(payload = {}) {
  const attachments = payload.attachmentUrls || payload.attachments || payload.imageUrls || payload.imageUrl || payload.attachmentUrl;
  const urls = normalizeAttachmentUrls(attachments);
  return urls.length ? JSON.stringify(urls) : null;
}

async function getNextJobNo(pool) {
  const prefix = buildJobNoPrefix();
  const result = await pool.request()
    .input("prefix", sql.NVarChar(20), `${prefix}-%`)
    .query(`
      SELECT COUNT(1) AS running
      FROM dbo.tb_job_request
      WHERE job_no LIKE @prefix;
    `);
  const nextRunning = Number(result.recordset[0]?.running || 0) + 1;
  return `${prefix}-${String(nextRunning).padStart(3, "0")}`;
}

function buildCreateJobPayload(payload = {}, jobNo = "") {
  const area = normalizeRequiredText(payload.area, "Line A");
  const machineType = normalizeRequiredText(payload.machineType || payload.machine_type, "Conveyor");
  const machineNo = normalizeRequiredText(payload.machineNo || payload.machine_no, "CNV-A-001");
  const selectedProblems = Array.isArray(payload.problems) ? payload.problems.filter(Boolean) : [];
  const problem = Array.isArray(payload.problems)
    ? selectedProblems.length ? selectedProblems.join(", ") : "Other problem"
    : normalizeRequiredText(payload.problem || payload.problems, "Other problem");

  return {
    jobNo,
    area,
    machineType,
    machineName: normalizeRequiredText(payload.machineName || payload.machine_name, `${machineType} ${machineNo}`),
    machineCode: normalizeRequiredText(payload.machineCode || payload.machine_code, machineNo.split("-").slice(0, 2).join("-") || machineNo),
    productionLine: normalizeRequiredText(payload.productionLine || payload.production_line, area),
    machineNo,
    problem,
    priority: normalizeRequiredText(payload.priority, "Medium"),
    requestBy: normalizeRequiredText(payload.requestBy || payload.request_by, "Production"),
    owner: "Maintenance",
    remark: normalizeRequiredText(payload.description || payload.remark, problem)
  };
}

async function createJobRequest(payload = {}) {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const jobNo = await getNextJobNo(pool);
  const data = buildCreateJobPayload(payload, jobNo);

  await pool.request()
    .input("jobNo", sql.NVarChar(80), data.jobNo)
    .input("area", sql.NVarChar(120), data.area)
    .input("machineType", sql.NVarChar(120), data.machineType)
    .input("machineName", sql.NVarChar(200), data.machineName)
    .input("machineCode", sql.NVarChar(80), data.machineCode)
    .input("productionLine", sql.NVarChar(120), data.productionLine)
    .input("machineNo", sql.NVarChar(120), data.machineNo)
    .input("problem", sql.NVarChar(sql.MAX), data.problem)
    .input("priority", sql.NVarChar(20), data.priority)
    .input("requestBy", sql.NVarChar(150), data.requestBy)
    .input("owner", sql.NVarChar(150), data.owner)
    .query(`
      INSERT INTO dbo.tb_job_request (
        job_no, status, area, machine_type, machine_name, machine_code, production_line, machine_no,
        problem, priority, request_by, owner, prod_progress, mm_progress, qc_progress
      )
      VALUES (
        @jobNo, 'WAIT_MM', @area, @machineType, @machineName, @machineCode, @productionLine, @machineNo,
        @problem, @priority, @requestBy, @owner, 'Done', 'WAIT_MM', '-'
      );
    `);

  await pool.request()
    .input("jobNo", sql.NVarChar(80), data.jobNo)
    .input("actionBy", sql.NVarChar(150), data.requestBy)
    .input("remark", sql.NVarChar(sql.MAX), data.remark)
    .input("attachmentUrls", sql.NVarChar(sql.MAX), stringifyAttachmentUrls(payload))
    .query(`
      INSERT INTO dbo.tb_job_request_history (job_no, action_name, from_status, to_status, action_by, remark, attachment_urls)
      VALUES (@jobNo, 'CREATE_JOB', '-', 'WAIT_MM', @actionBy, @remark, @attachmentUrls);
    `);

  const created = await pool.request()
    .input("jobNo", sql.NVarChar(80), data.jobNo)
    .query("SELECT TOP 1 * FROM dbo.tb_job_request WHERE job_no = @jobNo;");

  return normalizeRow(created.recordset[0]);
}

async function listJobRequests(query = {}) {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const request = pool.request();
  const clauses = [];

  ["area", "machine_type", "machine_no", "priority", "status"].forEach((column) => {
    const queryKey = column.replace("_", "");
    const value = query[column] || query[queryKey];
    if (value && value !== "All") {
      request.input(column, sql.NVarChar(150), value);
      clauses.push(`${column} = @${column}`);
    }
  });

  const result = await request.query(`
    SELECT *
    FROM dbo.tb_job_request
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
  `);

  return sortRows(result.recordset.map(normalizeRow));
}

async function listJobRequestHistory(jobNo) {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const result = await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .query(`
      SELECT *
      FROM dbo.tb_job_request_history
      WHERE job_no = @jobNo
      ORDER BY action_time ASC, id ASC;
    `);

  return result.recordset.map((row) => ({
    jobNo: row.job_no,
    time: new Date(row.action_time).toISOString(),
    action: row.action_name,
    from: row.from_status || "-",
    to: row.to_status || "-",
    by: row.action_by,
    remark: row.remark || "",
    attachments: normalizeAttachmentUrls(row.attachment_urls)
  }));
}

async function listIssuedSpareParts(jobNo) {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const result = await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .query(`
      IF OBJECT_ID('dbo.tb_tooling_stock_out', 'U') IS NOT NULL
      BEGIN
        SELECT issue_no, item_code, item_name, quantity, unit_code, 'Tooling Store' AS issued_by
        FROM dbo.tb_tooling_stock_out
        WHERE reference_no = @jobNo OR reference_no = REPLACE(@jobNo, 'JOB-20260512', 'JOB-2026')
        ORDER BY issue_date ASC, id ASC;
      END
      ELSE
      BEGIN
        SELECT TOP 0
          CAST(NULL AS NVARCHAR(80)) AS issue_no,
          CAST(NULL AS NVARCHAR(80)) AS item_code,
          CAST(NULL AS NVARCHAR(200)) AS item_name,
          CAST(NULL AS INT) AS quantity,
          CAST(NULL AS NVARCHAR(50)) AS unit_code,
          CAST(NULL AS NVARCHAR(120)) AS issued_by;
      END
    `);

  return result.recordset.map((row) => ({
    issueNo: row.issue_no,
    itemCode: row.item_code,
    itemName: row.item_name,
    quantity: row.quantity,
    unitCode: row.unit_code,
    issuedBy: row.issued_by
  }));
}

async function listJobRequestOptions() {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const result = await pool.request().query(`
    SELECT option_group, option_value
    FROM dbo.tbm_job_request_option
    WHERE is_active = 1
    ORDER BY option_group ASC, sort_order ASC, option_value ASC;
  `);

  return result.recordset.reduce((groups, row) => {
    const key = row.option_group;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(row.option_value);
    return groups;
  }, {});
}

async function listJobRequestHandovers() {
  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const result = await pool.request().query(`
    SELECT h.*, j.status
    FROM dbo.tb_job_request_handover h
    LEFT JOIN dbo.tb_job_request j ON j.job_no = h.job_no
    ORDER BY h.created_at DESC, h.id DESC;
  `);

  return result.recordset.map((row) => ({
    id: row.id,
    jobNo: row.job_no,
    status: row.status || "-",
    currentOwner: row.current_owner,
    handoverFrom: row.handover_from,
    handoverTo: row.handover_to,
    reason: row.reason,
    shift: row.shift_name,
    createdAt: row.created_at
  }));
}

function splitProblems(problemText = "") {
  return String(problemText)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function summarizeProblemItems(jobs, groupKey) {
  const statusKeyMap = {
    WAIT_MM: "waitMm",
    MM_REPAIR: "mmRepair",
    WAIT_QC: "waitQc",
    QC_INSPECTION: "qcInspection",
    WAIT_PROD_CONFIRM: "waitProd",
    PROD_CONFIRMING: "prodConfirming",
    COMPLETED: "completed"
  };
  const groups = new Map();

  jobs.forEach((job) => {
    const name = job[groupKey] || "-";
    if (!groups.has(name)) {
      groups.set(name, { name, request: 0, waitMm: 0, mmRepair: 0, waitQc: 0, qcInspection: 0, waitProd: 0, prodConfirming: 0, completed: 0 });
    }
    const target = groups.get(name);
    target.request += 1;
    const statusKey = statusKeyMap[job.status];
    if (statusKey) {
      target[statusKey] += 1;
    }
  });

  return Array.from(groups.values()).sort((first, second) => second.request - first.request);
}

function summarizeTopProblems(jobs) {
  const counts = new Map();
  jobs.forEach((job) => {
    splitProblems(job.problem).forEach((problem) => {
      counts.set(problem, (counts.get(problem) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function summarizePerformanceItems(jobs, groupKey, avgFactor = 1, maxFactor = 1.8) {
  return summarizeProblemItems(jobs, groupKey).map((item) => ({
    ...item,
    avgHours: Number((item.request * avgFactor).toFixed(1)),
    maxHours: Number((item.request * maxFactor).toFixed(1))
  }));
}

async function getJobRequestDashboard(query = {}) {
  const jobs = await listJobRequests(query);
  const openJobs = jobs.filter((job) => !["COMPLETED", "CANCELLED"].includes(job.status));
  const areaItems = summarizeProblemItems(jobs, "area");
  const topProblems = summarizeTopProblems(jobs);
  const mostProblemArea = areaItems[0];
  const topProblem = topProblems[0];

  return {
    signals: [
      { label: "Most Problem Area", value: mostProblemArea?.name || "-", detail: `${mostProblemArea?.request || 0} requests` },
      { label: "Top Problem", value: topProblem?.name || "-", detail: `${topProblem?.count || 0} times` },
      { label: "Slowest Step", value: "MM Repair Time", detail: `${jobs.filter((job) => job.status === "MM_REPAIR").length} active jobs` },
      { label: "Over SLA", value: String(openJobs.length), detail: "open jobs" }
    ],
    problem: {
      layer: "area",
      title: "Area Problem Analyze",
      items: areaItems,
      topProblems
    },
    drilldown: {
      area: areaItems.reduce((groups, item) => {
        const scopedJobs = jobs.filter((job) => job.area === item.name);
        groups[item.name] = {
          layer: "machineType",
          title: `${item.name} Machine Type Problem Analyze`,
          items: summarizeProblemItems(scopedJobs, "machineType"),
          topProblems: summarizeTopProblems(scopedJobs)
        };
        return groups;
      }, {}),
      machineType: summarizeProblemItems(jobs, "machineType").reduce((groups, item) => {
        const scopedJobs = jobs.filter((job) => job.machineType === item.name);
        groups[item.name] = {
          layer: "machineNo",
          title: `${item.name} Machine No Problem Analyze`,
          items: summarizeProblemItems(scopedJobs, "machineNo"),
          topProblems: summarizeTopProblems(scopedJobs)
        };
        return groups;
      }, {})
    },
    performance: {
      area: summarizePerformanceItems(jobs, "area", 1.2, 2.1),
      machineType: summarizePerformanceItems(jobs, "machineType", 1.1, 2),
      machineNo: summarizePerformanceItems(jobs, "machineNo", 1, 1.8),
      drilldown: {
        area: areaItems.reduce((groups, item) => {
          const scopedJobs = jobs.filter((job) => job.area === item.name);
          groups[item.name] = {
            layer: "machineType",
            title: `${item.name} Machine Type Performance`,
            items: summarizePerformanceItems(scopedJobs, "machineType", 1.1, 2)
          };
          return groups;
        }, {}),
        machineType: summarizeProblemItems(jobs, "machineType").reduce((groups, item) => {
          const scopedJobs = jobs.filter((job) => job.machineType === item.name);
          groups[item.name] = {
            layer: "machineNo",
            title: `${item.name} Machine No Performance`,
            items: summarizePerformanceItems(scopedJobs, "machineNo", 1, 1.8)
          };
          return groups;
        }, {})
      }
    }
  };
}

async function transitionJob(jobNo, payload = {}) {
  if (!allowedStatuses.includes(payload.toStatus)) {
    const error = new Error("Invalid target status.");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  await ensureJobRequestSchema(pool);
  const current = await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .query("SELECT TOP 1 * FROM dbo.tb_job_request WHERE job_no = @jobNo;");
  const job = current.recordset[0];

  if (!job) {
    const error = new Error("Job request not found.");
    error.statusCode = 404;
    throw error;
  }

  await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .input("toStatus", sql.NVarChar(40), payload.toStatus)
    .input("owner", sql.NVarChar(150), payload.owner || job.owner || "")
    .input("repairDetail", sql.NVarChar(sql.MAX), payload.repairDetail || job.repair_detail || "")
    .input("maintenancePic", sql.NVarChar(150), payload.maintenancePic || job.maintenance_pic || "")
    .input("acceptBy", sql.NVarChar(150), payload.acceptBy || (payload.actionName === "ACCEPT_JOB" ? payload.actionBy : job.accept_by) || "")
    .input("qcStatus", sql.NVarChar(80), payload.qcStatus || (payload.actionName === "QC_ACCEPT" ? "Inspecting" : job.qc_status) || "")
    .input("qcBy", sql.NVarChar(150), payload.qcBy || (payload.actionName === "QC_ACCEPT" ? payload.actionBy : job.qc_by) || "")
    .input("prodProgress", sql.NVarChar(80), payload.prodProgress || job.prod_progress)
    .input("mmProgress", sql.NVarChar(80), payload.mmProgress || job.mm_progress)
    .input("qcProgress", sql.NVarChar(80), payload.qcProgress || job.qc_progress)
    .query(`
      UPDATE dbo.tb_job_request
      SET status = @toStatus,
          owner = @owner,
          repair_detail = @repairDetail,
          maintenance_pic = @maintenancePic,
          accept_by = @acceptBy,
          accept_at = CASE WHEN @acceptBy <> '' AND accept_at IS NULL THEN SYSUTCDATETIME() ELSE accept_at END,
          qc_status = @qcStatus,
          qc_by = @qcBy,
          prod_progress = @prodProgress,
          mm_progress = @mmProgress,
          qc_progress = @qcProgress,
          updated_at = SYSUTCDATETIME()
      WHERE job_no = @jobNo;
    `);

  if (payload.actionName === "HANDOVER_JOB") {
    await pool.request()
      .input("jobNo", sql.NVarChar(80), jobNo)
      .input("currentOwner", sql.NVarChar(150), job.owner || "")
      .input("handoverFrom", sql.NVarChar(150), payload.actionBy || job.owner || "")
      .input("handoverTo", sql.NVarChar(150), payload.handoverTo || payload.owner || "Next shift owner")
      .input("reason", sql.NVarChar(300), payload.reason || "Shift handover")
      .input("shiftName", sql.NVarChar(80), payload.shift || "Next Shift")
      .query(`
        INSERT INTO dbo.tb_job_request_handover (job_no, current_owner, handover_from, handover_to, reason, shift_name)
        VALUES (@jobNo, @currentOwner, @handoverFrom, @handoverTo, @reason, @shiftName);
      `);
  }

  await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .input("actionName", sql.NVarChar(80), payload.actionName || "UPDATE_JOB")
    .input("fromStatus", sql.NVarChar(40), job.status)
    .input("toStatus", sql.NVarChar(40), payload.toStatus)
    .input("actionBy", sql.NVarChar(150), payload.actionBy || "System")
    .input("remark", sql.NVarChar(sql.MAX), payload.remark || "")
    .input("attachmentUrls", sql.NVarChar(sql.MAX), stringifyAttachmentUrls(payload))
    .query(`
      INSERT INTO dbo.tb_job_request_history (job_no, action_name, from_status, to_status, action_by, remark, attachment_urls)
      VALUES (@jobNo, @actionName, @fromStatus, @toStatus, @actionBy, @remark, @attachmentUrls);
    `);

  const updated = await pool.request()
    .input("jobNo", sql.NVarChar(80), jobNo)
    .query("SELECT TOP 1 * FROM dbo.tb_job_request WHERE job_no = @jobNo;");

  return normalizeRow(updated.recordset[0]);
}

module.exports = {
  allowedStatuses,
  buildCreateJobPayload,
  buildJobNoPrefix,
  createJobRequest,
  ensureJobRequestSchema,
  getSchemaStatements,
  getJobRequestDashboard,
  listJobRequestHandovers,
  listJobRequestOptions,
  listIssuedSpareParts,
  listJobRequestHistory,
  listJobRequests,
  sortRows,
  splitProblems,
  summarizePerformanceItems,
  summarizeProblemItems,
  summarizeTopProblems,
  transitionJob
};
