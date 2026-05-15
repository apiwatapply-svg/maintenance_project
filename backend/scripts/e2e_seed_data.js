const mmsMachineTypePlans = [
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

const mmsStatuses = ["RUN", "WAIT_PART", "BRAKE_TIME", "PLAN_STOP", "WARM_UP", "MM_REPAIR", "MM_PREVENTIVE", "QC", "CLEANING", "ALARM", "STOP"];
const shiftHours = [
  ["A", "07:00"], ["A", "08:00"], ["A", "09:00"], ["A", "10:00"], ["A", "11:00"], ["A", "12:00"], ["A", "13:00"], ["A", "14:00"],
  ["B", "15:00"], ["B", "16:00"], ["B", "17:00"], ["B", "18:00"], ["B", "19:00"], ["B", "20:00"], ["B", "21:00"], ["B", "22:00"],
  ["C", "23:00"], ["C", "00:00"], ["C", "01:00"], ["C", "02:00"], ["C", "03:00"], ["C", "04:00"], ["C", "05:00"], ["C", "06:00"]
];

function toBangkokDateText(now = new Date()) {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function dateCompact(dateText) {
  return String(dateText).replaceAll("-", "");
}

function seededNumber(seedText) {
  let hash = 2166136261;
  for (const character of String(seedText)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function calculateStockStatus(currentStock, minimumStock, maximumStock) {
  if (currentStock < minimumStock) return "Low Stock";
  if (maximumStock > 0 && currentStock > maximumStock) return "Over Stock";
  return "Normal";
}

function calculateCalibrationStatus(nextCalibrationDate, todayText) {
  const diffDays = Math.ceil((new Date(`${nextCalibrationDate}T00:00:00.000Z`).getTime() - new Date(`${todayText}T00:00:00.000Z`).getTime()) / 86400000);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Due Soon";
  return "Normal";
}

function calculateMmsMetrics(row) {
  const totalOutput = row.output_ok + row.output_ng;
  const availability = row.planned_seconds > 0 ? row.run_seconds / row.planned_seconds : 0;
  const performance = row.target_output > 0 ? totalOutput / row.target_output : 0;
  const quality = totalOutput > 0 ? row.output_ok / totalOutput : 0;
  return {
    availability: Number((availability * 100).toFixed(1)),
    performance: Number((performance * 100).toFixed(1)),
    quality: Number((quality * 100).toFixed(1)),
    oee: Number((availability * performance * quality * 100).toFixed(1))
  };
}

function buildAdminSeedData() {
  const departments = [
    { department_code: "ADM", department_name: "Administration", status: "active" },
    { department_code: "PRD", department_name: "Production", status: "active" },
    { department_code: "MM", department_name: "Maintenance", status: "active" },
    { department_code: "QC", department_name: "Quality Control", status: "active" },
    { department_code: "STORE", department_name: "Tooling Store", status: "active" }
  ];
  const areas = [
    { area_code: "LINE_A", area_name: "Line A", department_code: "PRD", status: "active" },
    { area_code: "LINE_B", area_name: "Line B", department_code: "PRD", status: "active" },
    { area_code: "PACKING", area_name: "Packing", department_code: "PRD", status: "active" },
    { area_code: "UTILITY", area_name: "Utility", department_code: "MM", status: "active" }
  ];
  const machineTypes = mmsMachineTypePlans.map(({ prefix: _prefix, count: _count, ...machineType }) => ({ ...machineType, status: "active" }));
  const machines = mmsMachineTypePlans.flatMap((plan) => Array.from({ length: plan.count }, (_item, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    return {
      machine_no: `${plan.prefix}-${sequence}`,
      machine_name: `${plan.machine_type_name} ${sequence}`,
      machine_type_code: plan.machine_type_code,
      status: "active"
    };
  }));
  const employees = [
    { emp_id: "ADM-001", emp_name: "Apiwat Admin", department_code: "ADM", department_name: "Administration", section: "System", status: "active" },
    { emp_id: "PRD-014", emp_name: "Somchai W.", department_code: "PRD", department_name: "Production", section: "Line A", status: "active" },
    { emp_id: "PRD-022", emp_name: "Kanda P.", department_code: "PRD", department_name: "Production", section: "Packing", status: "active" },
    { emp_id: "PRD-031", emp_name: "Malee R.", department_code: "PRD", department_name: "Production", section: "Line B", status: "active" },
    { emp_id: "MM-006", emp_name: "Anan S.", department_code: "MM", department_name: "Maintenance", section: "Repair", status: "active" },
    { emp_id: "MM-011", emp_name: "Prasert K.", department_code: "MM", department_name: "Maintenance", section: "Repair", status: "active" },
    { emp_id: "MM-018", emp_name: "Suda M.", department_code: "MM", department_name: "Maintenance", section: "PM", status: "active" },
    { emp_id: "QC-003", emp_name: "Narin T.", department_code: "QC", department_name: "Quality Control", section: "Inspection", status: "active" },
    { emp_id: "STORE-001", emp_name: "Tooling Clerk", department_code: "STORE", department_name: "Tooling Store", section: "Store", status: "active" }
  ];
  const users = [
    { emp_id: "ADM-001", emp_name: "Apiwat Admin", department_code: "ADM", department_name: "Administration", username: "admin", password: "admin", role: "super_admin", admin_scope: "all", status: "active" },
    { emp_id: "MM-006", emp_name: "Anan S.", department_code: "MM", department_name: "Maintenance", username: "mmadmin", password: "admin", role: "admin", admin_scope: "maintenance", status: "active" },
    { emp_id: "QC-003", emp_name: "Narin T.", department_code: "QC", department_name: "Quality Control", username: "qcadmin", password: "admin", role: "admin", admin_scope: "qc", status: "active" },
    { emp_id: "PRD-014", emp_name: "Somchai W.", department_code: "PRD", department_name: "Production", username: "prodadmin", password: "admin", role: "admin", admin_scope: "production", status: "active" },
    { emp_id: "STORE-001", emp_name: "Tooling Clerk", department_code: "STORE", department_name: "Tooling Store", username: "tooladmin", password: "admin", role: "admin", admin_scope: "tooling_store", status: "active" }
  ];

  return { areas, departments, employees, machineTypes, machines, users };
}

function buildToolingSeedData(todayText = toBangkokDateText()) {
  const categories = [
    { category_code: "MEASURE", category_name: "Measuring Tool", status: "active" },
    { category_code: "HAND", category_name: "Hand Tool", status: "active" },
    { category_code: "CONSUME", category_name: "Consumable", status: "active" },
    { category_code: "ELECTRIC", category_name: "Electrical Spare", status: "active" },
    { category_code: "MECHANIC", category_name: "Mechanical Spare", status: "active" }
  ];
  const locations = [
    { location_code: "STORE-A", location_name: "Main Store", status: "active" },
    { location_code: "CAB-01", location_name: "Cabinet 01", status: "active" },
    { location_code: "SHELF-B2", location_name: "Shelf B2", status: "active" },
    { location_code: "QC-ROOM", location_name: "QC Tool Room", status: "active" }
  ];
  const units = [
    { unit_code: "PCS", unit_name: "Piece", status: "active" },
    { unit_code: "SET", unit_name: "Set", status: "active" },
    { unit_code: "BOX", unit_name: "Box", status: "active" },
    { unit_code: "L", unit_name: "Liter", status: "active" }
  ];
  const tools = [
    { tool_code: "TL-TQ-001", tool_name: "Torque Wrench", category_code: "MEASURE", brand: "Tohnichi", model: "QL100N", serial_number: "TQ-1001", location_code: "STORE-A", status: "Available", minimum_stock: 0, unit_code: "PCS", image_path: "/tooling-images/torque-wrench.svg", remark: "Torque check tool" },
    { tool_code: "TL-CV-002", tool_name: "Caliper Vernier", category_code: "MEASURE", brand: "Mitutoyo", model: "530-312", serial_number: "CV-2002", location_code: "CAB-01", status: "Borrowed", minimum_stock: 0, unit_code: "PCS", image_path: "/tooling-images/caliper.svg", remark: "Measurement tool" },
    { tool_code: "TL-DG-004", tool_name: "Dial Gauge", category_code: "MEASURE", brand: "Mitutoyo", model: "2046S", serial_number: "DG-0004", location_code: "QC-ROOM", status: "Repair", minimum_stock: 0, unit_code: "PCS", image_path: "/tooling-images/dial-gauge.svg", remark: "Inspection tool" },
    { tool_code: "TL-SP-008", tool_name: "Socket Wrench Set", category_code: "HAND", brand: "Koken", model: "RS4400M", serial_number: "SP-0008", location_code: "STORE-A", status: "Available", minimum_stock: 0, unit_code: "SET", image_path: null, remark: "Repair kit" }
  ];
  const stockItems = [
    { item_code: "ST-BRG-6204", item_name: "Bearing 6204 ZZ", category_code: "MECHANIC", location_code: "STORE-A", unit_code: "PCS", minimum_stock: 8, maximum_stock: 60, image_path: "/tooling-images/bearing.svg", remark: "Common bearing" },
    { item_code: "ST-TAPE-001", item_name: "Insulation Tape", category_code: "ELECTRIC", location_code: "CAB-01", unit_code: "PCS", minimum_stock: 10, maximum_stock: 80, image_path: "/tooling-images/insulation-tape.svg", remark: "Electrical tape" },
    { item_code: "ST-GRS-001", item_name: "Grease Cartridge", category_code: "CONSUME", location_code: "STORE-A", unit_code: "PCS", minimum_stock: 6, maximum_stock: 30, image_path: "/tooling-images/grease.svg", remark: "Lubrication stock" },
    { item_code: "ST-SEN-PRX", item_name: "Proximity Sensor M12", category_code: "ELECTRIC", location_code: "SHELF-B2", unit_code: "PCS", minimum_stock: 4, maximum_stock: 25, image_path: null, remark: "Sensor spare" }
  ];
  const stockIn = [
    { receive_no: `SIN-${dateCompact(addDays(todayText, -3))}-001`, item_code: "ST-BRG-6204", item_name: "Bearing 6204 ZZ", quantity: 36, unit_code: "PCS", location_code: "STORE-A", reference_no: "PO-6204", receive_date: addDays(todayText, -3), image_path: "/tooling-images/bearing.svg", remark: "Supplier lot" },
    { receive_no: `SIN-${dateCompact(addDays(todayText, -3))}-002`, item_code: "ST-TAPE-001", item_name: "Insulation Tape", quantity: 12, unit_code: "PCS", location_code: "CAB-01", reference_no: "PO-TAPE", receive_date: addDays(todayText, -3), image_path: "/tooling-images/insulation-tape.svg", remark: "Electrical stock" },
    { receive_no: `SIN-${dateCompact(addDays(todayText, -2))}-001`, item_code: "ST-GRS-001", item_name: "Grease Cartridge", quantity: 8, unit_code: "PCS", location_code: "STORE-A", reference_no: "PO-GRS", receive_date: addDays(todayText, -2), image_path: "/tooling-images/grease.svg", remark: "Lubrication stock" },
    { receive_no: `SIN-${dateCompact(addDays(todayText, -2))}-002`, item_code: "ST-SEN-PRX", item_name: "Proximity Sensor M12", quantity: 10, unit_code: "PCS", location_code: "SHELF-B2", reference_no: "PO-SEN", receive_date: addDays(todayText, -2), image_path: null, remark: "Line sensor spare" }
  ];
  const stockOut = [
    { issue_no: `SOUT-${dateCompact(addDays(todayText, -1))}-001`, item_code: "ST-BRG-6204", item_name: "Bearing 6204 ZZ", quantity: 9, unit_code: "PCS", reference_type: "PM", reference_no: `PM-${dateCompact(todayText)}-002`, issue_date: addDays(todayText, -1), image_path: "/tooling-images/bearing.svg", remark: "Weekly PM usage" },
    { issue_no: `SOUT-${dateCompact(addDays(todayText, -1))}-002`, item_code: "ST-TAPE-001", item_name: "Insulation Tape", quantity: 8, unit_code: "PCS", reference_type: "Job Request", reference_no: `JOB-${dateCompact(todayText)}-003`, issue_date: addDays(todayText, -1), image_path: "/tooling-images/insulation-tape.svg", remark: "Repair usage" },
    { issue_no: `SOUT-${dateCompact(todayText)}-001`, item_code: "ST-GRS-001", item_name: "Grease Cartridge", quantity: 4, unit_code: "PCS", reference_type: "PM", reference_no: `PM-${dateCompact(todayText)}-004`, issue_date: todayText, image_path: "/tooling-images/grease.svg", remark: "Lubrication PM" },
    { issue_no: `SOUT-${dateCompact(todayText)}-002`, item_code: "ST-SEN-PRX", item_name: "Proximity Sensor M12", quantity: 3, unit_code: "PCS", reference_type: "Job Request", reference_no: `JOB-${dateCompact(todayText)}-004`, issue_date: todayText, image_path: null, remark: "Sensor replacement" }
  ];
  const stockBalance = stockItems.map((item) => {
    const received = stockIn.filter((row) => row.item_code === item.item_code).reduce((sum, row) => sum + row.quantity, 0);
    const issued = stockOut.filter((row) => row.item_code === item.item_code).reduce((sum, row) => sum + row.quantity, 0);
    const current_stock = received - issued;
    return {
      item_code: item.item_code,
      item_name: item.item_name,
      current_stock,
      minimum_stock: item.minimum_stock,
      maximum_stock: item.maximum_stock,
      unit_code: item.unit_code,
      location_code: item.location_code,
      status: calculateStockStatus(current_stock, item.minimum_stock, item.maximum_stock),
      image_path: item.image_path
    };
  });
  const movementHistory = [
    ...stockIn.map((row) => ({ movement_date: row.receive_date, movement_type: "Stock In", item_code: row.item_code, item_name: row.item_name, quantity: row.quantity, reference_no: row.receive_no, created_by: "tooladmin", image_path: row.image_path })),
    ...stockOut.map((row) => ({ movement_date: row.issue_date, movement_type: "Stock Out", item_code: row.item_code, item_name: row.item_name, quantity: -row.quantity, reference_no: row.issue_no, created_by: "tooladmin", image_path: row.image_path }))
  ];
  const calibrationBase = [
    { tool_code: "TL-TQ-001", tool_name: "Torque Wrench", serial_number: "TQ-1001", lastOffset: -170, interval: 180, owner: "Tooling Store", image_path: "/tooling-images/torque-wrench.svg", remark: "Schedule calibration" },
    { tool_code: "TL-DG-004", tool_name: "Dial Gauge", serial_number: "DG-0004", lastOffset: -160, interval: 180, owner: "QC Room", image_path: "/tooling-images/dial-gauge.svg", remark: "Schedule calibration" },
    { tool_code: "TL-CV-002", tool_name: "Caliper Vernier", serial_number: "CV-2002", lastOffset: -190, interval: 180, owner: "Tooling Store", image_path: "/tooling-images/caliper.svg", remark: "Block before use" }
  ];
  const calibration = calibrationBase.map((row) => {
    const last_calibration_date = addDays(todayText, row.lastOffset);
    const next_calibration_date = addDays(last_calibration_date, row.interval);
    return {
      tool_code: row.tool_code,
      tool_name: row.tool_name,
      serial_number: row.serial_number,
      last_calibration_date,
      calibration_interval_days: row.interval,
      next_calibration_date,
      status: calculateCalibrationStatus(next_calibration_date, todayText),
      owner: row.owner,
      image_path: row.image_path,
      remark: row.remark
    };
  });
  const borrowIssue = [
    { issue_no: `ISS-${dateCompact(addDays(todayText, -2))}-001`, request_no: `BRQ-${dateCompact(addDays(todayText, -2))}-001`, tool_code: "TL-CV-002", tool_name: "Caliper Vernier", borrower: "Narin T.", issue_date: addDays(todayText, -2), due_date: addDays(todayText, 5), status: "Issued", image_path: "/tooling-images/caliper.svg", remark: "Tool condition checked before issue" },
    { issue_no: `ISS-${dateCompact(addDays(todayText, -6))}-001`, request_no: `BRQ-${dateCompact(addDays(todayText, -6))}-001`, tool_code: "TL-DG-004", tool_name: "Dial Gauge", borrower: "Kanda P.", issue_date: addDays(todayText, -6), due_date: addDays(todayText, -1), status: "Issued", image_path: "/tooling-images/dial-gauge.svg", remark: "Issued for inspection job" }
  ];
  const returnTool = [
    { return_no: `RTN-${dateCompact(addDays(todayText, -1))}-001`, issue_no: borrowIssue[0].issue_no, tool_code: "TL-CV-002", tool_name: "Caliper Vernier", return_by: "Narin T.", return_date: addDays(todayText, -1), condition_status: "Good", image_path: "/tooling-images/caliper.svg", remark: "Returned in good condition" },
    { return_no: `RTN-${dateCompact(todayText)}-001`, issue_no: borrowIssue[1].issue_no, tool_code: "TL-DG-004", tool_name: "Dial Gauge", return_by: "Kanda P.", return_date: todayText, condition_status: "Need Check", image_path: "/tooling-images/dial-gauge.svg", remark: "Need visual inspection" }
  ];
  const overdueBorrow = borrowIssue
    .filter((row) => row.due_date < todayText)
    .map((row) => ({
      borrow_no: row.issue_no.replace("ISS", "BR"),
      tool_code: row.tool_code,
      tool_name: row.tool_name,
      borrower: row.borrower,
      department: "Production",
      due_date: row.due_date,
      overdue_days: Math.ceil((new Date(`${todayText}T00:00:00.000Z`) - new Date(`${row.due_date}T00:00:00.000Z`)) / 86400000),
      status: "Overdue",
      image_path: row.image_path
    }));
  const reports = [
    { report_name: "Tool List", description: "Current registered tools and status.", last_generated_date: todayText, row_count: tools.length, report_type: "Master", export_type: "Excel" },
    { report_name: "Spare Part List", description: "Consumable master and current balance.", last_generated_date: todayText, row_count: stockItems.length, report_type: "Master", export_type: "Excel" },
    { report_name: "Low Stock", description: "Items below minimum stock.", last_generated_date: todayText, row_count: stockBalance.filter((row) => row.status === "Low Stock").length, report_type: "Stock", export_type: "Excel" },
    { report_name: "Movement History", description: "Stock and tool movement log.", last_generated_date: todayText, row_count: movementHistory.length, report_type: "Movement", export_type: "Excel" }
  ];

  return { borrowIssue, calibration, categories, locations, movementHistory, overdueBorrow, reports, returnTool, stockBalance, stockIn, stockItems, stockOut, tools, units };
}

function buildPreventiveSeedData(todayText = toBangkokDateText()) {
  const types = [
    { pm_type_code: "PM-DAY", pm_type_name: "Daily Machine Check", description: "Daily basic condition check before production.", default_frequency_days: 1, advance_notify_days: 0, status: "Active" },
    { pm_type_code: "PM-WEEK", pm_type_name: "Weekly Lubrication", description: "Lubrication and moving part condition.", default_frequency_days: 7, advance_notify_days: 1, status: "Active" },
    { pm_type_code: "PM-MON", pm_type_name: "Monthly Safety Check", description: "Safety device and electrical check.", default_frequency_days: 30, advance_notify_days: 5, status: "Active" }
  ];
  const mappings = [
    { machine_code: "CNV-A-001", machine_name: "Conveyor 001", area: "Line A", machine_type: "Conveyor", assigned_to: "MM-006 Anan S.", status: "Active" },
    { machine_code: "FIL-A-002", machine_name: "Filling 002", area: "Line A", machine_type: "Filling", assigned_to: "MM-011 Prasert K.", status: "Active" },
    { machine_code: "SEA-P-004", machine_name: "Sealer 004", area: "Packing", machine_type: "Sealer", assigned_to: "MM-018 Suda M.", status: "Active" },
    { machine_code: "CMP-U-003", machine_name: "Compressor 003", area: "Utility", machine_type: "Compressor", assigned_to: "MM-006 Anan S.", status: "Active" },
    { machine_code: "PKG-B-002", machine_name: "Packing Machine 002", area: "Line B", machine_type: "Packing Machine", assigned_to: "MM-011 Prasert K.", status: "Active" }
  ];
  const mappingTypes = [
    { machine_code: "CNV-A-001", pm_type_code: "PM-DAY", frequency_days: 1, advance_notify_days: 0, start_date: addDays(todayText, -5), next_date: todayText, status: "Active" },
    { machine_code: "FIL-A-002", pm_type_code: "PM-WEEK", frequency_days: 7, advance_notify_days: 1, start_date: addDays(todayText, -14), next_date: addDays(todayText, -1), status: "Active" },
    { machine_code: "SEA-P-004", pm_type_code: "PM-MON", frequency_days: 30, advance_notify_days: 5, start_date: addDays(todayText, -30), next_date: addDays(todayText, 5), status: "Active" },
    { machine_code: "CMP-U-003", pm_type_code: "PM-MON", frequency_days: 30, advance_notify_days: 5, start_date: addDays(todayText, -60), next_date: todayText, status: "Active" },
    { machine_code: "PKG-B-002", pm_type_code: "PM-WEEK", frequency_days: 7, advance_notify_days: 1, start_date: addDays(todayText, -7), next_date: addDays(todayText, 7), status: "Active" }
  ];
  const plans = [
    { pm_no: `PM-${dateCompact(todayText)}-001`, machine_code: "CNV-A-001", pm_type_code: "PM-DAY", due_date: todayText, last_date: addDays(todayText, -1), assigned_to: "MM-006 Anan S.", status: "dueToday" },
    { pm_no: `PM-${dateCompact(todayText)}-002`, machine_code: "FIL-A-002", pm_type_code: "PM-WEEK", due_date: addDays(todayText, -1), last_date: addDays(todayText, -8), assigned_to: "MM-011 Prasert K.", status: "overdue" },
    { pm_no: `PM-${dateCompact(todayText)}-003`, machine_code: "SEA-P-004", pm_type_code: "PM-MON", due_date: addDays(todayText, 5), last_date: addDays(todayText, -25), assigned_to: "MM-018 Suda M.", status: "planned" },
    { pm_no: `PM-${dateCompact(todayText)}-004`, machine_code: "CMP-U-003", pm_type_code: "PM-MON", due_date: todayText, last_date: addDays(todayText, -30), assigned_to: "MM-006 Anan S.", status: "ng" },
    { pm_no: `PM-${dateCompact(todayText)}-005`, machine_code: "PKG-B-002", pm_type_code: "PM-WEEK", due_date: addDays(todayText, -2), last_date: addDays(todayText, -9), assigned_to: "MM-011 Prasert K.", status: "completed" }
  ];
  const inspections = [
    { pm_no: plans[3].pm_no, inspector: "MM-006 Anan S.", checker: "MM-018 Suda M.", started_at: `${todayText}T02:05:00`, completed_at: `${todayText}T02:45:00`, overall_result: "NG", remark: "Panel temperature exceeded limit.", status: "Completed" },
    { pm_no: plans[4].pm_no, inspector: "MM-011 Prasert K.", checker: "MM-018 Suda M.", started_at: `${addDays(todayText, -2)}T01:30:00`, completed_at: `${addDays(todayText, -2)}T02:02:00`, overall_result: "OK", remark: "Machine condition normal.", status: "Completed" }
  ];

  return { inspections, mappingTypes, mappings, plans, types };
}

function buildJobRequestSeedData(todayText = toBangkokDateText()) {
  const dateId = dateCompact(todayText);
  const jobs = [
    { job_no: `JOB-${dateId}-001`, requested_at: `${todayText}T00:40:00`, status: "WAIT_MM", area: "Line A", machine_type: "Conveyor", machine_name: "Conveyor 001", machine_code: "CNV-A", production_line: "Line A", machine_no: "CNV-A-001", problem: "Abnormal noise, belt shaking", priority: "High", request_by: "PRD-014 Somchai W.", owner: "Maintenance", repair_detail: "", maintenance_pic: "", accept_by: "", accept_at: null, qc_status: "", qc_by: "", prod_progress: "Done", mm_progress: "WAIT_MM", qc_progress: "-" },
    { job_no: `JOB-${dateId}-002`, requested_at: `${todayText}T00:25:00`, status: "MM_REPAIR", area: "Packing", machine_type: "Sealer", machine_name: "Sealer 004", machine_code: "SEA-P", production_line: "Packing", machine_no: "SEA-P-004", problem: "Temperature unstable", priority: "Urgent", request_by: "PRD-022 Kanda P.", owner: "MM-006 Anan S.", repair_detail: "Heater terminal found loose. Tightened wiring and checking temperature trend.", maintenance_pic: "MM-006 Anan S.", accept_by: "MM-006 Anan S.", accept_at: `${todayText}T00:40:00`, qc_status: "", qc_by: "", prod_progress: "Done", mm_progress: "MM_REPAIR", qc_progress: "Reject (MM[1])" },
    { job_no: `JOB-${dateId}-003`, requested_at: `${todayText}T00:10:00`, status: "QC_INSPECTION", area: "Line B", machine_type: "Packing Machine", machine_name: "Packing Machine 002", machine_code: "PKG-B", production_line: "Line B", machine_no: "PKG-B-002", problem: "Sensor false trigger", priority: "Medium", request_by: "PRD-031 Malee R.", owner: "QC-003 Narin T.", repair_detail: "Adjusted sensor bracket and tested dry run for 15 minutes.", maintenance_pic: "MM-011 Prasert K.", accept_by: "MM-011 Prasert K.", accept_at: `${todayText}T00:25:00`, qc_status: "Inspecting", qc_by: "QC-003 Narin T.", prod_progress: "Done", mm_progress: "Done", qc_progress: "QC_INSPECTION" },
    { job_no: `JOB-${dateId}-004`, requested_at: `${addDays(todayText, -1)}T23:40:00`, status: "WAIT_PROD_CONFIRM", area: "Utility", machine_type: "Compressor", machine_name: "Compressor 003", machine_code: "CMP-U", production_line: "Utility", machine_no: "CMP-U-003", problem: "Air pressure low", priority: "High", request_by: "PRD-014 Somchai W.", owner: "Production", repair_detail: "Replaced leaking fitting and verified pressure hold.", maintenance_pic: "MM-018 Suda M.", accept_by: "MM-018 Suda M.", accept_at: `${todayText}T00:05:00`, qc_status: "PASS", qc_by: "QC-003 Narin T.", prod_progress: "WAIT_PROD_CONFIRM", mm_progress: "Done", qc_progress: "Done" },
    { job_no: `JOB-${dateId}-005`, requested_at: `${addDays(todayText, -1)}T22:20:00`, status: "COMPLETED", area: "Line A", machine_type: "Filling", machine_name: "Filling 002", machine_code: "FIL-A", production_line: "Line A", machine_no: "FIL-A-002", problem: "Nozzle leakage", priority: "Low", request_by: "PRD-014 Somchai W.", owner: "Production", repair_detail: "Changed O-ring and confirmed trial run.", maintenance_pic: "MM-011 Prasert K.", accept_by: "MM-011 Prasert K.", accept_at: `${addDays(todayText, -1)}T22:35:00`, qc_status: "PASS", qc_by: "QC-003 Narin T.", prod_progress: "Done", mm_progress: "Done", qc_progress: "Done" }
  ];
  const history = jobs.flatMap((job) => {
    const rows = [{ job_no: job.job_no, action_time: job.requested_at, action_name: "CREATE_JOB", from_status: "-", to_status: "WAIT_MM", action_by: job.request_by, remark: job.problem, attachment_urls: null }];
    if (job.accept_at) rows.push({ job_no: job.job_no, action_time: job.accept_at, action_name: "ACCEPT_JOB", from_status: "WAIT_MM", to_status: "MM_REPAIR", action_by: job.accept_by, remark: "Maintenance accepted job.", attachment_urls: null });
    if (["QC_INSPECTION", "WAIT_PROD_CONFIRM", "COMPLETED"].includes(job.status)) rows.push({ job_no: job.job_no, action_time: `${todayText}T01:15:00`, action_name: "SEND_TO_QC", from_status: "MM_REPAIR", to_status: "WAIT_QC", action_by: job.maintenance_pic || "Maintenance", remark: job.repair_detail, attachment_urls: null });
    if (["WAIT_PROD_CONFIRM", "COMPLETED"].includes(job.status)) rows.push({ job_no: job.job_no, action_time: `${todayText}T01:35:00`, action_name: "QC_PASS", from_status: "QC_INSPECTION", to_status: "WAIT_PROD_CONFIRM", action_by: job.qc_by || "QC", remark: "QC result pass.", attachment_urls: null });
    if (job.status === "COMPLETED") rows.push({ job_no: job.job_no, action_time: `${todayText}T01:55:00`, action_name: "PROD_CONFIRM", from_status: "WAIT_PROD_CONFIRM", to_status: "COMPLETED", action_by: job.request_by, remark: "Production confirmed stable run.", attachment_urls: null });
    return rows;
  });
  const options = [
    ["area", "Line A"], ["area", "Line B"], ["area", "Packing"], ["area", "Utility"],
    ["machineType", "Conveyor"], ["machineType", "Filling"], ["machineType", "Packing Machine"], ["machineType", "Sealer"], ["machineType", "Compressor"],
    ["machineNo", "CNV-A-001"], ["machineNo", "FIL-A-002"], ["machineNo", "PKG-B-002"], ["machineNo", "SEA-P-004"], ["machineNo", "CMP-U-003"],
    ["priority", "Urgent"], ["priority", "High"], ["priority", "Medium"], ["priority", "Low"],
    ["problem", "Abnormal noise"], ["problem", "Sensor false trigger"], ["problem", "Temperature unstable"], ["problem", "Air pressure low"], ["problem", "Nozzle leakage"],
    ["maintenancePic", "MM-006 - Anan S."], ["maintenancePic", "MM-011 - Prasert K."], ["maintenancePic", "MM-018 - Suda M."],
    ["qcResult", "Pass and send Production"], ["qcResult", "Pass and complete"], ["qcResult", "Reject to Maintenance"],
    ["confirmResult", "Confirm completed"], ["confirmResult", "Reject to QC"],
    ["handoverPendingItem", "Repair continues"], ["handoverPendingItem", "Waiting spare part"], ["handoverPendingItem", "Waiting machine trial"]
  ].map(([option_group, option_value], index) => ({ option_group, option_value, sort_order: index + 1, is_active: 1 }));
  const handovers = [
    { job_no: jobs[1].job_no, current_owner: "MM-006 Anan S.", handover_from: "MM-006 Anan S.", handover_to: "MM-011 Prasert K.", reason: "End of shift, repair not finished", shift_name: "Shift C", created_at: `${todayText}T06:50:00` }
  ];

  return { handovers, history, jobs, options };
}

function buildMmsHourlyRows(todayText = toBangkokDateText(), machines = buildAdminSeedData().machines) {
  return machines.flatMap((machine, machineIndex) => shiftHours.map(([shift_code, hour_label], hourIndex) => {
    const seed = seededNumber(`${todayText}:${machine.machine_no}:${hour_label}`);
    const status = hourIndex % 9 === machineIndex % 9
      ? ["WAIT_PART", "BRAKE_TIME", "PLAN_STOP", "MM_REPAIR", "MM_PREVENTIVE", "QC", "CLEANING", "ALARM", "STOP"][machineIndex % 9]
      : "RUN";
    const cycle_time_sec = 2 + (seed % 5);
    const planned_seconds = 3600;
    const stopSecondsByStatus = {
      ALARM: 1500,
      BRAKE_TIME: 900,
      CLEANING: 1200,
      MM_PREVENTIVE: 2100,
      MM_REPAIR: 2400,
      PLAN_STOP: 1800,
      QC: 1500,
      RUN: 120 + (seed % 240),
      STOP: 3600,
      WAIT_PART: 1500,
      WARM_UP: 600
    };
    const stop_seconds = stopSecondsByStatus[status] || 0;
    const alarm_seconds = status === "ALARM" ? Math.min(900, stop_seconds) : 0;
    const run_seconds = Math.max(0, planned_seconds - stop_seconds);
    const target_output = Math.floor(planned_seconds / cycle_time_sec);
    const performanceFactor = 0.82 + ((seed % 14) / 100);
    const totalOutput = Math.min(target_output, Math.floor((run_seconds / cycle_time_sec) * performanceFactor));
    const rejectRate = 0.004 + ((seed % 9) / 1000);
    const output_ng = Math.floor(totalOutput * rejectRate);
    const output_ok = Math.max(0, totalOutput - output_ng);

    return {
      alarm_seconds,
      cycle_time_sec,
      hour_label,
      machine_no: machine.machine_no,
      output_ng,
      output_ok,
      planned_seconds,
      run_seconds,
      shift_code,
      status,
      stop_seconds,
      target_output,
      work_date: todayText
    };
  }));
}

function buildE2eSeedData(now = new Date()) {
  const todayText = toBangkokDateText(now);
  const admin = buildAdminSeedData();
  return {
    admin,
    jobRequest: buildJobRequestSeedData(todayText),
    mmsHourly: buildMmsHourlyRows(todayText, admin.machines),
    preventive: buildPreventiveSeedData(todayText),
    todayText,
    tooling: buildToolingSeedData(todayText)
  };
}

module.exports = {
  addDays,
  buildAdminSeedData,
  buildE2eSeedData,
  buildJobRequestSeedData,
  buildMmsHourlyRows,
  buildPreventiveSeedData,
  buildToolingSeedData,
  calculateCalibrationStatus,
  calculateMmsMetrics,
  calculateStockStatus,
  dateCompact,
  mmsStatuses,
  toBangkokDateText
};
