const { sql, getPool } = require("../config/database");
const {
  getPreventiveSchemaStatements,
  getPreventiveSeedStatements,
  normalizePreventivePagination,
  statusCases
} = require("../config/preventiveResources");

let schemaReady = false;

async function ensurePreventiveSchema(pool) {
  if (schemaReady) {
    return;
  }

  for (const statement of getPreventiveSchemaStatements()) {
    await pool.request().query(statement);
  }
  for (const statement of getPreventiveSeedStatements()) {
    await pool.request().query(statement);
  }

  schemaReady = true;
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString().slice(0, 10);
}

function toTime(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
}

function minutesBetween(start, end) {
  if (!start || !end) {
    return 0;
  }
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function mapPmType(row, checklist = []) {
  return {
    id: row.id,
    code: row.pm_type_code,
    name: row.pm_type_name,
    description: row.description || "",
    frequencyDays: row.default_frequency_days,
    advanceDays: row.advance_notify_days,
    status: row.status,
    itemCount: row.item_count || checklist.length || 0,
    checklist
  };
}

function mapChecklist(row) {
  return {
    id: row.id,
    topic: row.item_name,
    inputType: row.input_type,
    required: Boolean(row.is_required),
    min: row.min_value,
    max: row.max_value,
    unit: row.unit || "",
    options: row.dropdown_options || "",
    criteria: row.criteria || "",
    sortOrder: row.sort_order,
    status: row.status
  };
}

function mapPlan(row) {
  const status = row.status_key || row.status;
  return {
    id: row.id,
    machineCode: row.machine_code,
    machineName: row.machine_name,
    area: row.area,
    type: row.machine_type,
    pmType: row.pm_type_name,
    frequencyDays: row.frequency_days,
    lastDate: toDateOnly(row.last_date),
    nextDate: toDateOnly(row.due_date || row.next_date),
    assignee: row.assigned_to || "",
    status
  };
}

function mapInspection(row) {
  return {
    id: `plan-${row.id}-inspection-${row.inspection_id || "pending"}`,
    planId: row.id,
    pmNo: row.pm_no,
    machineCode: row.machine_code,
    machineName: row.machine_name,
    area: row.area,
    pmType: row.pm_type_name,
    dueDate: toDateOnly(row.due_date),
    inspector: row.inspector || row.assigned_to || "",
    checker: row.checker || "-",
    status: row.status_key || row.status,
    result: row.overall_result || (row.inspection_status === "Draft" ? "Draft" : "Waiting")
  };
}

function mapHistory(row) {
  return {
    id: row.inspection_id,
    date: toDateOnly(row.completed_at || row.started_at || row.due_date),
    startTime: toTime(row.started_at),
    endTime: toTime(row.completed_at),
    durationMin: minutesBetween(row.started_at, row.completed_at),
    pmNo: row.pm_no,
    machineCode: row.machine_code,
    machineName: row.machine_name,
    area: row.area,
    pmType: row.pm_type_name,
    inspector: row.inspector || "",
    checker: row.checker || "-",
    result: row.overall_result || "-",
    status: String(row.overall_result || "").toLowerCase() === "ng" ? "ng" : "completed",
    remark: row.remark || ""
  };
}

function bindString(request, name, value, fallback = "") {
  request.input(name, sql.NVarChar(sql.MAX), value ?? fallback);
}

function bindInt(request, name, value, fallback = 0) {
  request.input(name, sql.Int, Number(value ?? fallback));
}

async function getBaseRows(pool) {
  const result = await pool.request().query(`
    SELECT
      p.id,
      p.pm_no,
      p.due_date,
      p.last_date,
      p.assigned_to,
      p.status,
      ${statusCases} AS status_key,
      mt.frequency_days,
      mt.next_date,
      m.machine_code,
      m.machine_name,
      m.area,
      m.machine_type,
      t.pm_type_name
    FROM dbo.tb_pm_plan p
    JOIN dbo.tb_pm_machine_mapping_type mt ON mt.id = p.mapping_type_id
    JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id
    JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id
    ORDER BY p.due_date ASC, p.id ASC;
  `);

  return result.recordset;
}

async function listBootstrap() {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);

  const [typesResult, checklistResult, mappingsResult, mappingTypesResult, planRows, inspectionResult, historyResult] = await Promise.all([
    pool.request().query(`
      SELECT t.*, COUNT(c.id) AS item_count
      FROM dbo.tbm_pm_type t
      LEFT JOIN dbo.tbm_pm_checklist_item c ON c.pm_type_id = t.id
      GROUP BY t.id, t.pm_type_code, t.pm_type_name, t.description, t.default_frequency_days, t.advance_notify_days, t.status, t.created_at, t.updated_at
      ORDER BY t.id;
    `),
    pool.request().query("SELECT * FROM dbo.tbm_pm_checklist_item ORDER BY pm_type_id, sort_order, id;"),
    pool.request().query("SELECT * FROM dbo.tb_pm_machine_mapping ORDER BY area, machine_code;"),
    pool.request().query(`
      SELECT mt.*, t.pm_type_name
      FROM dbo.tb_pm_machine_mapping_type mt
      JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id
      ORDER BY mt.mapping_id, mt.id;
    `),
    getBaseRows(pool),
    pool.request().query(`
      SELECT i.id AS inspection_id, i.inspector, i.checker, i.overall_result, i.status AS inspection_status, p.*, ${statusCases} AS status_key,
        mt.frequency_days, m.machine_code, m.machine_name, m.area, m.machine_type, t.pm_type_name
      FROM dbo.tb_pm_plan p
      JOIN dbo.tb_pm_machine_mapping_type mt ON mt.id = p.mapping_type_id
      JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id
      JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id
      LEFT JOIN dbo.tb_pm_inspection i ON i.pm_plan_id = p.id
      WHERE p.status IN ('dueToday', 'overdue', 'inProgress', 'planned')
      ORDER BY p.due_date ASC, p.id ASC;
    `),
    pool.request().query(`
      SELECT i.id AS inspection_id, i.started_at, i.completed_at, i.inspector, i.checker, i.overall_result, i.remark,
        p.pm_no, p.due_date, m.machine_code, m.machine_name, m.area, t.pm_type_name
      FROM dbo.tb_pm_inspection i
      JOIN dbo.tb_pm_plan p ON p.id = i.pm_plan_id
      JOIN dbo.tb_pm_machine_mapping_type mt ON mt.id = p.mapping_type_id
      JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id
      JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id
      WHERE i.completed_at IS NOT NULL OR i.overall_result IS NOT NULL
      ORDER BY COALESCE(i.completed_at, i.started_at) DESC;
    `)
  ]);

  const checklistByType = checklistResult.recordset.reduce((acc, row) => {
    acc[row.pm_type_id] = acc[row.pm_type_id] || [];
    acc[row.pm_type_id].push(mapChecklist(row));
    return acc;
  }, {});
  const types = typesResult.recordset.map((row) => mapPmType(row, checklistByType[row.id] || []));

  const mappingTypesByMachine = mappingTypesResult.recordset.reduce((acc, row) => {
    acc[row.mapping_id] = acc[row.mapping_id] || [];
    acc[row.mapping_id].push({
      id: row.id,
      pmTypeId: row.pm_type_id,
      name: row.pm_type_name,
      frequencyDays: row.frequency_days,
      nextDate: toDateOnly(row.next_date),
      status: row.status
    });
    return acc;
  }, {});

  const machines = mappingsResult.recordset.map((row) => {
    const plan = planRows.find((item) => item.machine_code === row.machine_code);
    return {
      id: row.id,
      code: row.machine_code,
      name: row.machine_name,
      area: row.area,
      line: row.area,
      type: row.machine_type,
      status: plan?.status_key || (mappingTypesByMachine[row.id]?.length ? "planned" : "noPlan")
    };
  });

  const mappings = mappingsResult.recordset.map((row) => ({
    id: row.id,
    machineCode: row.machine_code,
    machineName: row.machine_name,
    area: row.area,
    type: row.machine_type,
    pmTypes: mappingTypesByMachine[row.id] || []
  }));

  const plans = planRows.map(mapPlan);
  const areas = [...new Set(machines.map((item) => item.area))];
  const machineTypes = [...new Set(machines.map((item) => item.type))];
  const inspections = inspectionResult.recordset.map(mapInspection);
  const history = historyResult.recordset.map(mapHistory);

  return {
    areas,
    machineTypes,
    machines,
    mappings,
    types,
    plans,
    inspections,
    history,
    dashboardTrend: buildDashboardTrend(plans),
    statusPie: buildStatusPie(plans),
    employees: ["MM-001 Somchai", "MM-002 Kanda", "MM-003 Anan", "MM-004 Narin", "MM-005 Apiwat"]
  };
}

function buildDashboardTrend(plans) {
  const rows = {};
  plans.forEach((plan) => {
    const day = String(plan.nextDate || "").slice(-2);
    if (!day) {
      return;
    }
    rows[day] = rows[day] || { day, planned: 0, completed: 0, overdue: 0, ng: 0 };
    rows[day].planned += 1;
    if (plan.status === "completed") rows[day].completed += 1;
    if (plan.status === "overdue") rows[day].overdue += 1;
    if (plan.status === "ng") rows[day].ng += 1;
  });
  return Object.values(rows).sort((a, b) => a.day.localeCompare(b.day));
}

function buildStatusPie(plans) {
  const config = [
    ["Completed", "completed", "#10b981"],
    ["Due Today", "dueToday", "#f59e0b"],
    ["Overdue", "overdue", "#ef4444"],
    ["NG", "ng", "#7c3aed"]
  ];
  return config.map(([name, status, color]) => ({
    name,
    value: plans.filter((item) => item.status === status).length,
    color
  }));
}

async function createPmType(payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const result = await pool.request()
    .input("code", sql.NVarChar(50), payload.code || payload.pmTypeCode || "PM-NEW")
    .input("name", sql.NVarChar(150), payload.name || payload.pmTypeName || "New PM Type")
    .input("description", sql.NVarChar(500), payload.description || "")
    .input("frequencyDays", sql.Int, Number(payload.frequencyDays || 1))
    .input("advanceDays", sql.Int, Number(payload.advanceDays || 0))
    .input("status", sql.NVarChar(20), payload.status || "Active")
    .query(`
      INSERT INTO dbo.tbm_pm_type (pm_type_code, pm_type_name, description, default_frequency_days, advance_notify_days, status)
      OUTPUT INSERTED.*
      VALUES (@code, @name, @description, @frequencyDays, @advanceDays, @status);
    `);
  return mapPmType(result.recordset[0], []);
}

async function updatePmType(id, payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const result = await pool.request()
    .input("id", sql.Int, Number(id))
    .input("code", sql.NVarChar(50), payload.code || payload.pmTypeCode || "PM-NEW")
    .input("name", sql.NVarChar(150), payload.name || payload.pmTypeName || "New PM Type")
    .input("description", sql.NVarChar(500), payload.description || "")
    .input("frequencyDays", sql.Int, Number(payload.frequencyDays || 1))
    .input("advanceDays", sql.Int, Number(payload.advanceDays || 0))
    .input("status", sql.NVarChar(20), payload.status || "Active")
    .query(`
      UPDATE dbo.tbm_pm_type
      SET pm_type_code = @code, pm_type_name = @name, description = @description,
        default_frequency_days = @frequencyDays, advance_notify_days = @advanceDays,
        status = @status, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id;
    `);
  return mapPmType(result.recordset[0], []);
}

async function deletePmType(id) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  await pool.request().input("id", sql.Int, Number(id)).query("UPDATE dbo.tbm_pm_type SET status = 'Inactive', updated_at = SYSUTCDATETIME() WHERE id = @id;");
  return { success: true };
}

async function createChecklistItem(pmTypeId, payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const request = pool.request()
    .input("pmTypeId", sql.Int, Number(pmTypeId))
    .input("itemName", sql.NVarChar(200), payload.topic || payload.itemName || "New checklist item")
    .input("inputType", sql.NVarChar(30), payload.inputType || "OK / NG")
    .input("isRequired", sql.Bit, payload.required === false || payload.required === "No" ? 0 : 1)
    .input("minValue", sql.Decimal(18, 2), payload.min === "" || payload.min === undefined ? null : Number(payload.min))
    .input("maxValue", sql.Decimal(18, 2), payload.max === "" || payload.max === undefined ? null : Number(payload.max))
    .input("unit", sql.NVarChar(30), payload.unit || null)
    .input("options", sql.NVarChar(500), payload.options || null)
    .input("criteria", sql.NVarChar(500), payload.criteria || null)
    .input("sortOrder", sql.Int, Number(payload.sortOrder || 1));
  const result = await request.query(`
    INSERT INTO dbo.tbm_pm_checklist_item (pm_type_id, item_name, input_type, is_required, min_value, max_value, unit, dropdown_options, criteria, sort_order)
    OUTPUT INSERTED.*
    VALUES (@pmTypeId, @itemName, @inputType, @isRequired, @minValue, @maxValue, @unit, @options, @criteria, @sortOrder);
  `);
  return mapChecklist(result.recordset[0]);
}

async function updateChecklistItem(itemId, payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const result = await pool.request()
    .input("itemId", sql.Int, Number(itemId))
    .input("itemName", sql.NVarChar(200), payload.topic || payload.itemName || "Checklist item")
    .input("inputType", sql.NVarChar(30), payload.inputType || "OK / NG")
    .input("isRequired", sql.Bit, payload.required === false || payload.required === "No" ? 0 : 1)
    .input("criteria", sql.NVarChar(500), payload.criteria || null)
    .input("options", sql.NVarChar(500), payload.options || null)
    .query(`
      UPDATE dbo.tbm_pm_checklist_item
      SET item_name = @itemName, input_type = @inputType, is_required = @isRequired,
        criteria = @criteria, dropdown_options = @options, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @itemId;
    `);
  return mapChecklist(result.recordset[0]);
}

async function deleteChecklistItem(itemId) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  await pool.request().input("itemId", sql.Int, Number(itemId)).query("UPDATE dbo.tbm_pm_checklist_item SET status = 'Inactive', updated_at = SYSUTCDATETIME() WHERE id = @itemId;");
  return { success: true };
}

async function createPlan(payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const mappingTypeResult = await pool.request().query("SELECT TOP 1 id FROM dbo.tb_pm_machine_mapping_type ORDER BY id;");
  const mappingTypeId = Number(payload.mappingTypeId || mappingTypeResult.recordset[0]?.id);
  const pmNo = payload.pmNo || await getNextPmNo(pool);
  const result = await pool.request()
    .input("pmNo", sql.NVarChar(50), pmNo)
    .input("mappingTypeId", sql.Int, mappingTypeId)
    .input("dueDate", sql.Date, payload.nextDate || payload.dueDate || new Date())
    .input("lastDate", sql.Date, payload.lastDate || null)
    .input("assignedTo", sql.NVarChar(150), payload.assignee || payload.assignedTo || "MM-001 Somchai")
    .query(`
      INSERT INTO dbo.tb_pm_plan (pm_no, mapping_type_id, due_date, last_date, assigned_to, status)
      OUTPUT INSERTED.*
      VALUES (@pmNo, @mappingTypeId, @dueDate, @lastDate, @assignedTo, 'planned');
    `);
  return result.recordset[0];
}

async function createInspection(planId, payload = {}) {
  const pool = await getPool();
  await ensurePreventiveSchema(pool);
  const result = await pool.request()
    .input("planId", sql.Int, Number(planId))
    .input("inspector", sql.NVarChar(150), payload.inspector || "MM-001 Somchai")
    .input("checker", sql.NVarChar(150), payload.checker || null)
    .input("result", sql.NVarChar(20), payload.result || "OK")
    .input("remark", sql.NVarChar(1000), payload.remark || "")
    .query(`
      INSERT INTO dbo.tb_pm_inspection (pm_plan_id, inspector, checker, started_at, completed_at, overall_result, remark, status)
      OUTPUT INSERTED.*
      VALUES (@planId, @inspector, @checker, SYSUTCDATETIME(), SYSUTCDATETIME(), @result, @remark, 'Completed');

      UPDATE dbo.tb_pm_plan
      SET status = CASE WHEN @result = 'NG' THEN 'ng' ELSE 'completed' END, updated_at = SYSUTCDATETIME()
      WHERE id = @planId;
    `);
  return result.recordset[0];
}

async function getNextPmNo(pool) {
  const prefix = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const result = await pool.request()
    .input("prefix", sql.NVarChar(30), `PM-${prefix}-%`)
    .query("SELECT COUNT(*) + 1 AS nextNo FROM dbo.tb_pm_plan WHERE pm_no LIKE @prefix;");
  return `PM-${prefix}-${String(result.recordset[0].nextNo).padStart(3, "0")}`;
}

async function listHistory(query = {}) {
  const pagination = normalizePreventivePagination(query);
  const bootstrap = await listBootstrap();
  return {
    data: bootstrap.history.slice(pagination.offset, pagination.offset + pagination.pageSize),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: bootstrap.history.length
    }
  };
}

module.exports = {
  createChecklistItem,
  createInspection,
  createPlan,
  createPmType,
  deleteChecklistItem,
  deletePmType,
  ensurePreventiveSchema,
  getPreventiveSchemaStatements,
  listBootstrap,
  listHistory,
  updateChecklistItem,
  updatePmType
};
