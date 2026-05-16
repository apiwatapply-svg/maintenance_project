const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const resultDir = path.join(rootDir, "docs", "test_results");
const logDir = path.join(resultDir, "logs");
const screenshotDir = path.join(resultDir, "screenshots");
const API = process.env.E2E_API_URL || "http://localhost:5000/api";
const WEB = process.env.E2E_WEB_URL || "http://localhost:3000";
const runId = `E2E${Date.now().toString().slice(-8)}`;

fs.mkdirSync(logDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const results = [];
const cleanupTasks = [];

function today(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function short(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.length > 220 ? `${value.slice(0, 220)}...` : value;
  return JSON.stringify(value).slice(0, 220);
}

async function api(method, route, body, expected = [200, 201]) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(response.status)) {
    throw new Error(`${method} ${route} expected ${expectedList.join("/")} got ${response.status}: ${text}`);
  }
  return json;
}

async function maybeDelete(route) {
  try {
    await api("DELETE", route, undefined, [200, 204, 404]);
  } catch {
    // Cleanup is best-effort; the test result should reflect the feature step, not cleanup noise.
  }
}

async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    results.push({ name, status: "PASS", ms: Date.now() - startedAt, details: short(details) });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", ms: Date.now() - startedAt, details: error.stack || error.message });
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
  }
}

async function runCleanup() {
  for (const cleanup of cleanupTasks.reverse()) {
    await cleanup();
  }
}

async function authMatrix() {
  const cases = [
    ["admin", "admin", "admin", 200],
    ["mmadmin", "admin", "pm", 200],
    ["prodadmin", "admin", "job", 200],
    ["qcadmin", "admin", "job", 200],
    ["tooladmin", "admin", "store", 200],
    ["qcadmin", "admin", "admin", 403]
  ];

  const summaries = [];
  for (const [username, password, feature, expected] of cases) {
    const response = await api("POST", "/auth/login", { username, password, feature }, expected);
    summaries.push(`${username}/${feature}:${expected === 200 ? response.user?.adminScope || "ok" : response.message || "blocked"}`);
  }
  return summaries.join(", ");
}

async function adminCrud() {
  const dep = await api("POST", "/admin/departments", {
    department_code: `${runId}-DEP`,
    department_name: `${runId} Department`,
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/departments/${dep.id}`));

  const area = await api("POST", "/admin/areas", {
    area_code: `${runId}-AREA`,
    area_name: `${runId} Area`,
    department_code: dep.department_code,
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/areas/${area.id}`));

  const type = await api("POST", "/admin/machine-types", {
    machine_type_code: `${runId}-MT`,
    machine_type_name: `${runId} Type`,
    area_code: area.area_code,
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/machine-types/${type.id}`));

  const machine = await api("POST", "/admin/machine-nos", {
    machine_no: `${runId}-MC`,
    machine_name: `${runId} Machine`,
    machine_type_code: type.machine_type_code,
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/machine-nos/${machine.id}`));

  const emp = await api("POST", "/admin/employees", {
    emp_id: `${runId}-EMP`,
    emp_name: `${runId} Employee`,
    department_code: dep.department_code,
    department_name: dep.department_name,
    section: "E2E",
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/employees/${emp.id}`));

  const user = await api("POST", "/admin/users", {
    emp_id: emp.emp_id,
    emp_name: emp.emp_name,
    department_code: dep.department_code,
    department_name: dep.department_name,
    username: `${runId.toLowerCase()}user`,
    password: "admin",
    role: "admin",
    admin_scope: "all",
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/admin/users/${user.id}`));

  const updated = await api("PUT", `/admin/machine-nos/${machine.id}`, {
    machine_no: machine.machine_no,
    machine_name: `${runId} Machine Updated`,
    machine_type_code: type.machine_type_code,
    status: "active"
  });
  const listed = await api("GET", `/admin/machine-nos?search=${encodeURIComponent(runId)}&pageSize=20`);
  assert.equal(updated.machine_name.includes("Updated"), true);
  assert.ok(listed.data.some((item) => item.machine_no === machine.machine_no));
  return `${dep.department_code}, ${area.area_code}, ${type.machine_type_code}, ${machine.machine_no}, ${emp.emp_id}, ${user.username}`;
}

async function toolingWorkflow() {
  const category = await api("POST", "/tooling/categories", { category_code: `${runId}-CAT`, category_name: "E2E Category", status: "active" });
  cleanupTasks.push(() => maybeDelete(`/tooling/categories/${category.id}`));
  const location = await api("POST", "/tooling/locations", { location_code: `${runId}-LOC`, location_name: "E2E Location", status: "active" });
  cleanupTasks.push(() => maybeDelete(`/tooling/locations/${location.id}`));
  const unit = await api("POST", "/tooling/units", { unit_code: `${runId}-U`, unit_name: "E2E Unit", status: "active" });
  cleanupTasks.push(() => maybeDelete(`/tooling/units/${unit.id}`));

  const tool = await api("POST", "/tooling/tools", {
    tool_code: `${runId}-TL`,
    tool_name: "E2E Torque Tool",
    category_code: category.category_code,
    location_code: location.location_code,
    unit_code: unit.unit_code,
    status: "Available",
    minimum_stock: 1
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/tools/${tool.id}`));

  const item = await api("POST", "/tooling/stock-items", {
    item_code: `${runId}-SP`,
    item_name: "E2E Spare Part",
    category_code: category.category_code,
    location_code: location.location_code,
    unit_code: unit.unit_code,
    current_stock: 0,
    minimum_stock: 2,
    maximum_stock: 50,
    status: "active"
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/stock-items/${item.id}`));

  const stockIn = await api("POST", "/tooling/stock-in", {
    item_code: item.item_code,
    item_name: item.item_name,
    quantity: 10,
    unit_code: unit.unit_code,
    location_code: location.location_code,
    reference_no: `${runId}-PO`,
    receive_date: today()
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/stock-in/${stockIn.id}`));

  const stockOut = await api("POST", "/tooling/stock-out", {
    item_code: item.item_code,
    item_name: item.item_name,
    quantity: 3,
    unit_code: unit.unit_code,
    reference_type: "Job Request",
    reference_no: `${runId}-JOB`,
    issue_date: today()
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/stock-out/${stockOut.id}`));

  const balance = await api("GET", `/tooling/stock-balance?search=${encodeURIComponent(item.item_code)}&pageSize=5`);
  assert.equal(Number(balance.data[0]?.current_stock), 7);
  cleanupTasks.push(() => balance.data[0]?.id ? maybeDelete(`/tooling/stock-balance/${balance.data[0].id}`) : Promise.resolve());

  const issue = await api("POST", "/tooling/borrow-issue", {
    request_no: `${runId}-BRQ`,
    tool_code: tool.tool_code,
    tool_name: tool.tool_name,
    borrower: "E2E User",
    issue_date: today(),
    due_date: today(1),
    status: "Issued"
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/borrow-issue/${issue.id}`));

  const borrowedTool = await api("GET", `/tooling/tools?search=${encodeURIComponent(tool.tool_code)}&pageSize=5`);
  assert.equal(borrowedTool.data[0]?.status, "Borrowed");

  const returnTool = await api("POST", "/tooling/return-tool", {
    issue_no: issue.issue_no,
    tool_code: tool.tool_code,
    tool_name: tool.tool_name,
    return_by: "E2E User",
    return_date: today(),
    condition_status: "Good"
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/return-tool/${returnTool.id}`));

  const calibration = await api("POST", "/tooling/calibration-list", {
    tool_code: tool.tool_code,
    tool_name: tool.tool_name,
    serial_number: `${runId}-SN`,
    last_calibration_date: today(-200),
    calibration_interval_days: 180,
    owner: "Tooling Store"
  });
  cleanupTasks.push(() => maybeDelete(`/tooling/calibration-list/${calibration.id}`));
  assert.equal(calibration.status, "Expired");

  return `${tool.tool_code} stock balance 7, borrow/return ok, calibration ${calibration.status}`;
}

async function jobRequestWorkflow() {
  const created = await api("POST", "/job-requests", {
    area: "Line A",
    machineType: "Control Panel",
    machineName: "PNL-A-001",
    machineCode: "PNL-A-001",
    machineNo: "PNL-A-001",
    productionLine: "Line A",
    problem: "E2E abnormal signal",
    priority: "High",
    requestBy: "prodadmin",
    description: `${runId} full workflow`
  }, 201);
  assert.ok(created.jobNo);

  const transitions = [
    ["MM_ACCEPT", "MM_REPAIR", { actionBy: "mmadmin", owner: "Maintenance" }],
    ["MM_SEND_TO_QC", "WAIT_QC", { actionBy: "mmadmin", repairDetail: "Repair completed by E2E" }],
    ["QC_ACCEPT", "QC_INSPECTION", { actionBy: "qcadmin", qcBy: "qcadmin" }],
    ["QC_PASS", "WAIT_PROD_CONFIRM", { actionBy: "qcadmin", qcStatus: "PASS", qcBy: "qcadmin" }],
    ["PROD_CONFIRM", "COMPLETED", { actionBy: "prodadmin", progressDetail: "Machine accepted" }]
  ];

  let latest = created;
  for (const [actionName, toStatus, extra] of transitions) {
    latest = await api("POST", `/job-requests/${created.jobNo}/actions`, {
      actionName,
      toStatus,
      ...extra
    });
  }
  assert.equal(latest.status, "COMPLETED");
  const history = await api("GET", `/job-requests/${created.jobNo}/history`);
  assert.ok((history.data || []).length >= transitions.length);
  const dashboard = await api("GET", "/job-requests/dashboard");
  assert.ok(dashboard.data || dashboard.summary || dashboard);
  return `${created.jobNo} completed with ${(history.data || []).length} history rows`;
}

async function preventiveWorkflow() {
  const type = await api("POST", "/preventive/types", {
    code: `${runId}-PM`,
    name: "E2E PM Type",
    description: "Full E2E PM type",
    frequencyDays: 7,
    advanceDays: 1,
    status: "Active"
  }, 201);
  cleanupTasks.push(() => api("DELETE", `/preventive/types/${type.id}`, undefined, [200, 204, 404]));

  const checklist = await api("POST", `/preventive/types/${type.id}/checklist`, {
    topic: "E2E Check Item",
    inputType: "OK / NG",
    required: true,
    criteria: "Must be OK",
    sortOrder: 1
  }, 201);
  cleanupTasks.push(() => api("DELETE", `/preventive/checklist/${checklist.id}`, undefined, [200, 204, 404]));

  const updatedChecklist = await api("PUT", `/preventive/checklist/${checklist.id}`, {
    topic: "E2E Check Item Updated",
    inputType: "OK / NG",
    required: true,
    criteria: "Updated criteria"
  });
  assert.equal(updatedChecklist.topic.includes("Updated"), true);

  const plan = await api("POST", "/preventive/plans", {
    nextDate: today(1),
    assignee: "MM-001 Somchai"
  }, 201);
  const inspection = await api("POST", `/preventive/inspections/${plan.id}/submit`, {
    inspector: "MM-001 Somchai",
    checker: "MM-002 Kanda",
    result: "OK",
    remark: `${runId} inspection`
  }, 201);
  assert.ok(inspection.id);
  const bootstrap = await api("GET", "/preventive/bootstrap");
  const history = await api("GET", "/preventive/history?page=1&pageSize=10");
  assert.ok(Array.isArray(bootstrap.types));
  assert.ok(Array.isArray(history.data));
  return `${type.code} checklist ${checklist.id}, plan ${plan.pm_no || plan.id}, inspection ${inspection.id}`;
}

async function mmsRealtimeWorkflow() {
  const { io } = require(path.join(rootDir, "frontend", "node_modules", "socket.io-client"));
  const socket = io("http://localhost:5000", {
    transports: ["websocket"],
    reconnection: false,
    timeout: 5000
  });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });

  const payload = {
    machineNo: "PNL-A-001",
    area: "Line A",
    machineType: "Control Panel",
    plcStatus: "RUN",
    effectiveStatus: "RUN",
    outputOk: 987654,
    outputNg: 321,
    cycleTime: 2.4,
    model: "MODEL-E2E",
    jobStatus: "E2E_REALTIME"
  };

  socket.emit("realtime:join", { feature: "mms", scope: "all" });
  const received = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for MMS output realtime event")), 6000);
    socket.on("mms:machine-output-changed", (message) => {
      if (message.machineNo === payload.machineNo && Number(message.outputOk) === payload.outputOk) {
        clearTimeout(timer);
        resolve(message);
      }
    });
    socket.emit("mms:machine-output-changed", payload);
  });
  socket.disconnect();
  assert.equal(received.outputNg, payload.outputNg);
  assert.equal(received.cycleTime, payload.cycleTime);
  assert.equal(received.model, payload.model);
  return `${received.machineNo} ${received.outputOk}/${received.outputNg} CT ${received.cycleTime} ${received.model}`;
}

async function mmsApiWorkflow() {
  const machines = await api("GET", "/mms/simulation/machines?pageSize=5");
  assert.ok(Array.isArray(machines.data));
  assert.ok(machines.data.length > 0);
  const machineNo = machines.data[0].machineNo || machines.data[0].machine_no || "PNL-A-001";
  const report = await api("GET", `/mms/reports/history?machineNo=${encodeURIComponent(machineNo)}&date=${today()}`);
  assert.ok(report.data);
  return `${machines.data.length} machine rows from ${machines.meta?.source || "api"}; report loaded for ${machineNo}`;
}

async function frontendRouteWorkflow() {
  const { chromium } = require(path.join(rootDir, "frontend", "node_modules", "playwright"));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const sessions = {
    adminSession: { user: { username: "admin", adminScope: "all", role: "admin" } },
    pmSession: { user: { username: "mmadmin", adminScope: "maintenance", role: "admin" } },
    toolingStoreSession: { user: { username: "tooladmin", adminScope: "tooling", role: "admin" } },
    jobRequestSession: { user: { username: "admin", adminScope: "all", role: "admin" } }
  };
  await page.addInitScript((values) => {
    Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  }, sessions);

  const routes = [
    ["/admin", "Admin"],
    ["/tooling-store", "Tooling"],
    ["/job-request/production", "Production"],
    ["/job-request/maintenance", "Maintenance"],
    ["/job-request/qc", "QC"],
    ["/preventive-maintenance", "Preventive"],
    ["/mms-dashboard", "MMS Dashboard"],
    ["/mms-dashboard/mms-simulation", "MMS Simulation"]
  ];
  const loaded = [];
  for (const [route, label] of routes) {
    await page.goto(`${WEB}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText({ timeout: 10000 });
    assert.equal(bodyText.includes("Cannot connect") || bodyText.includes("Application error"), false, `${route} rendered an error`);
    assert.ok(bodyText.length > 200, `${route} body is too short`);
    loaded.push(label);
  }

  await page.screenshot({ path: path.join(screenshotDir, "full-e2e-last-route.png"), fullPage: false });
  await browser.close();
  return loaded.join(", ");
}

function writeReports() {
  const passed = results.filter((item) => item.status === "PASS").length;
  const failed = results.length - passed;
  const jsonPath = path.join(logDir, "full-e2e-results.json");
  const mdPath = path.join(resultDir, "full_e2e_report.md");
  fs.writeFileSync(jsonPath, JSON.stringify({ runId, api: API, web: WEB, results }, null, 2));
  fs.writeFileSync(mdPath, [
    "# Full E2E Test Report",
    "",
    `- Run ID: ${runId}`,
    `- API: ${API}`,
    `- Web: ${WEB}`,
    `- Result: ${passed}/${results.length} passed, ${failed} failed`,
    `- Timestamp: ${new Date().toISOString()}`,
    "",
    "| Topic | Status | Time | Detail |",
    "| --- | --- | ---: | --- |",
    ...results.map((item) => `| ${item.name} | ${item.status} | ${item.ms} ms | ${String(item.details || "").replaceAll("\n", "<br>").replaceAll("|", "\\|")} |`)
  ].join("\n"));
  console.log(`REPORT ${mdPath}`);
}

(async () => {
  await step("Backend health", async () => api("GET", "/health"));
  await step("Auth role matrix", authMatrix);
  await step("MMS API from MSSQL", mmsApiWorkflow);
  await step("Admin master CRUD", adminCrud);
  await step("Tooling CRUD and stock/borrow/calibration workflow", toolingWorkflow);
  await step("Job Request production-maintenance-QC-production workflow", jobRequestWorkflow);
  await step("Preventive PM type/checklist/plan/inspection workflow", preventiveWorkflow);
  await step("MMS realtime Socket.IO all machine values", mmsRealtimeWorkflow);
  await step("Frontend protected routes and MMS pages", frontendRouteWorkflow);
  await runCleanup();
  writeReports();

  if (results.some((item) => item.status === "FAIL")) {
    process.exitCode = 1;
  }
})();
