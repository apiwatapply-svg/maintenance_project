const toolingResources = {
  categories: {
    table: "tbm_tooling_category",
    idColumn: "id",
    searchable: ["category_code", "category_name"],
    filters: ["status"],
    columns: ["category_code", "category_name", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  locations: {
    table: "tbm_tooling_location",
    idColumn: "id",
    searchable: ["location_code", "location_name"],
    filters: ["status"],
    columns: ["location_code", "location_name", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  units: {
    table: "tbm_tooling_unit",
    idColumn: "id",
    searchable: ["unit_code", "unit_name"],
    filters: ["status"],
    columns: ["unit_code", "unit_name", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  tools: {
    table: "tb_tooling_tool",
    idColumn: "id",
    searchable: ["tool_code", "tool_name", "category_code", "brand", "model", "serial_number", "location_code"],
    filters: ["status", "category_code", "location_code"],
    columns: [
      "tool_code",
      "tool_name",
      "category_code",
      "brand",
      "model",
      "serial_number",
      "location_code",
      "status",
      "minimum_stock",
      "unit_code",
      "image_path",
      "remark"
    ],
    defaults: { status: "Available", minimum_stock: 0 },
    sort: "id"
  },
  "stock-items": {
    table: "tb_tooling_stock_item",
    idColumn: "id",
    searchable: ["item_code", "item_name", "category_code", "location_code"],
    filters: ["status", "category_code", "location_code"],
    columns: [
      "item_code",
      "item_name",
      "category_code",
      "location_code",
      "unit_code",
      "current_stock",
      "minimum_stock",
      "maximum_stock",
      "status",
      "image_path",
      "remark"
    ],
    defaults: { status: "active", current_stock: 0, minimum_stock: 0, maximum_stock: 0 },
    sort: "id"
  },
  "borrow-issue": {
    table: "tb_tooling_borrow_transaction",
    idColumn: "id",
    autoNumber: { column: "issue_no", prefix: "ISS" },
    searchable: ["issue_no", "request_no", "tool_code", "tool_name", "borrower", "status"],
    filters: ["status"],
    columns: ["issue_no", "request_no", "tool_code", "tool_name", "borrower", "issue_date", "due_date", "status", "image_path", "remark"],
    defaults: { status: "Issued" },
    sort: "id"
  },
  "return-tool": {
    table: "tb_tooling_return_transaction",
    idColumn: "id",
    autoNumber: { column: "return_no", prefix: "RTN" },
    searchable: ["return_no", "issue_no", "tool_code", "tool_name", "return_by", "condition_status"],
    filters: ["condition_status"],
    columns: ["return_no", "issue_no", "tool_code", "tool_name", "return_by", "return_date", "condition_status", "image_path", "remark"],
    defaults: { condition_status: "Good" },
    sort: "id"
  },
  "overdue-borrow": {
    table: "tb_tooling_overdue_borrow",
    idColumn: "id",
    searchable: ["borrow_no", "tool_code", "tool_name", "borrower", "department", "status"],
    filters: ["status"],
    columns: ["borrow_no", "tool_code", "tool_name", "borrower", "department", "due_date", "overdue_days", "status", "image_path"],
    defaults: { status: "Overdue" },
    sort: "id"
  },
  "stock-in": {
    table: "tb_tooling_stock_in",
    idColumn: "id",
    autoNumber: { column: "receive_no", prefix: "SIN" },
    searchable: ["receive_no", "item_code", "item_name", "location_code", "reference_no"],
    filters: ["location_code"],
    columns: ["receive_no", "item_code", "item_name", "quantity", "unit_code", "location_code", "reference_no", "receive_date", "image_path", "remark"],
    defaults: { quantity: 1, unit_code: "PCS" },
    sort: "id"
  },
  "stock-out": {
    table: "tb_tooling_stock_out",
    idColumn: "id",
    autoNumber: { column: "issue_no", prefix: "SOUT" },
    searchable: ["issue_no", "item_code", "item_name", "reference_type", "reference_no"],
    filters: ["reference_type"],
    columns: ["issue_no", "item_code", "item_name", "quantity", "unit_code", "reference_type", "reference_no", "issue_date", "image_path", "remark"],
    defaults: { quantity: 1, unit_code: "PCS" },
    sort: "id"
  },
  "stock-balance": {
    table: "tb_tooling_stock_balance",
    idColumn: "id",
    searchable: ["item_code", "item_name", "location_code", "status"],
    filters: ["status", "location_code"],
    columns: ["item_code", "item_name", "current_stock", "minimum_stock", "maximum_stock", "unit_code", "location_code", "status", "image_path"],
    defaults: { status: "Normal", current_stock: 0, minimum_stock: 0, maximum_stock: 0, unit_code: "PCS" },
    sort: "id"
  },
  "movement-history": {
    table: "tb_tooling_movement_history",
    idColumn: "id",
    searchable: ["movement_type", "item_code", "item_name", "reference_no", "created_by"],
    filters: ["movement_type"],
    columns: ["movement_date", "movement_type", "item_code", "item_name", "quantity", "reference_no", "created_by", "image_path"],
    defaults: { quantity: 1 },
    sort: "id"
  },
  "calibration-list": {
    table: "tb_tooling_calibration",
    idColumn: "id",
    searchable: ["tool_code", "tool_name", "serial_number", "status", "owner"],
    filters: ["status"],
    columns: ["tool_code", "tool_name", "serial_number", "last_calibration_date", "calibration_interval_days", "next_calibration_date", "status", "owner", "image_path", "remark"],
    defaults: { status: "Normal", calibration_interval_days: 180 },
    sort: "id"
  },
  "calibration-due-soon": {
    table: "tb_tooling_calibration",
    idColumn: "id",
    searchable: ["tool_code", "tool_name", "serial_number", "owner"],
    filters: ["owner"],
    fixedFilters: { status: "Due Soon" },
    columns: ["tool_code", "tool_name", "serial_number", "last_calibration_date", "calibration_interval_days", "next_calibration_date", "status", "owner", "image_path", "remark"],
    defaults: { status: "Due Soon", calibration_interval_days: 180 },
    sort: "id"
  },
  "calibration-expired": {
    table: "tb_tooling_calibration",
    idColumn: "id",
    searchable: ["tool_code", "tool_name", "serial_number", "owner"],
    filters: ["owner"],
    fixedFilters: { status: "Expired" },
    columns: ["tool_code", "tool_name", "serial_number", "last_calibration_date", "calibration_interval_days", "next_calibration_date", "status", "owner", "image_path", "remark"],
    defaults: { status: "Expired", calibration_interval_days: 180 },
    sort: "id"
  },
  reports: {
    table: "tb_tooling_report",
    idColumn: "id",
    searchable: ["report_name", "description", "report_type"],
    filters: ["report_type"],
    columns: ["report_name", "description", "last_generated_date", "row_count", "report_type", "export_type"],
    defaults: { export_type: "Excel" },
    sort: "id"
  }
};

function getToolingResource(key) {
  return toolingResources[key] || null;
}

function normalizeToolingPagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

function getToolingSchemaStatements() {
  return [
    `
    IF OBJECT_ID('dbo.tbm_tooling_category', 'U') IS NULL
    CREATE TABLE dbo.tbm_tooling_category (
      id INT IDENTITY(1,1) PRIMARY KEY,
      category_code NVARCHAR(50) NOT NULL UNIQUE,
      category_name NVARCHAR(150) NOT NULL,
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_tooling_location', 'U') IS NULL
    CREATE TABLE dbo.tbm_tooling_location (
      id INT IDENTITY(1,1) PRIMARY KEY,
      location_code NVARCHAR(50) NOT NULL UNIQUE,
      location_name NVARCHAR(150) NOT NULL,
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tbm_tooling_unit', 'U') IS NULL
    CREATE TABLE dbo.tbm_tooling_unit (
      id INT IDENTITY(1,1) PRIMARY KEY,
      unit_code NVARCHAR(50) NOT NULL UNIQUE,
      unit_name NVARCHAR(150) NOT NULL,
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_tool', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_tool (
      id INT IDENTITY(1,1) PRIMARY KEY,
      tool_code NVARCHAR(80) NOT NULL UNIQUE,
      tool_name NVARCHAR(200) NOT NULL,
      category_code NVARCHAR(50) NOT NULL,
      brand NVARCHAR(100) NULL,
      model NVARCHAR(100) NULL,
      serial_number NVARCHAR(100) NULL,
      location_code NVARCHAR(50) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'Available',
      minimum_stock INT NOT NULL DEFAULT 0,
      unit_code NVARCHAR(50) NULL,
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_stock_item', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_stock_item (
      id INT IDENTITY(1,1) PRIMARY KEY,
      item_code NVARCHAR(80) NOT NULL UNIQUE,
      item_name NVARCHAR(200) NOT NULL,
      category_code NVARCHAR(50) NOT NULL,
      location_code NVARCHAR(50) NOT NULL,
      unit_code NVARCHAR(50) NOT NULL,
      current_stock INT NOT NULL DEFAULT 0,
      minimum_stock INT NOT NULL DEFAULT 0,
      maximum_stock INT NOT NULL DEFAULT 0,
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_borrow_transaction', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_borrow_transaction (
      id INT IDENTITY(1,1) PRIMARY KEY,
      issue_no NVARCHAR(80) NOT NULL UNIQUE,
      request_no NVARCHAR(80) NULL,
      tool_code NVARCHAR(80) NOT NULL,
      tool_name NVARCHAR(200) NOT NULL,
      borrower NVARCHAR(150) NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'Issued',
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_return_transaction', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_return_transaction (
      id INT IDENTITY(1,1) PRIMARY KEY,
      return_no NVARCHAR(80) NOT NULL UNIQUE,
      issue_no NVARCHAR(80) NOT NULL,
      tool_code NVARCHAR(80) NOT NULL,
      tool_name NVARCHAR(200) NOT NULL,
      return_by NVARCHAR(150) NOT NULL,
      return_date DATE NOT NULL,
      condition_status NVARCHAR(30) NOT NULL DEFAULT 'Good',
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_overdue_borrow', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_overdue_borrow (
      id INT IDENTITY(1,1) PRIMARY KEY,
      borrow_no NVARCHAR(80) NOT NULL UNIQUE,
      tool_code NVARCHAR(80) NOT NULL,
      tool_name NVARCHAR(200) NOT NULL,
      borrower NVARCHAR(150) NOT NULL,
      department NVARCHAR(120) NOT NULL,
      due_date DATE NOT NULL,
      overdue_days INT NOT NULL DEFAULT 0,
      status NVARCHAR(30) NOT NULL DEFAULT 'Overdue',
      image_path NVARCHAR(500) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_stock_in', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_stock_in (
      id INT IDENTITY(1,1) PRIMARY KEY,
      receive_no NVARCHAR(80) NOT NULL UNIQUE,
      item_code NVARCHAR(80) NOT NULL,
      item_name NVARCHAR(200) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_code NVARCHAR(50) NOT NULL DEFAULT 'PCS',
      location_code NVARCHAR(50) NOT NULL,
      reference_no NVARCHAR(120) NULL,
      receive_date DATE NOT NULL,
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_stock_out', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_stock_out (
      id INT IDENTITY(1,1) PRIMARY KEY,
      issue_no NVARCHAR(80) NOT NULL UNIQUE,
      item_code NVARCHAR(80) NOT NULL,
      item_name NVARCHAR(200) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_code NVARCHAR(50) NOT NULL DEFAULT 'PCS',
      reference_type NVARCHAR(50) NOT NULL,
      reference_no NVARCHAR(120) NULL,
      issue_date DATE NOT NULL,
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_stock_balance', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_stock_balance (
      id INT IDENTITY(1,1) PRIMARY KEY,
      item_code NVARCHAR(80) NOT NULL UNIQUE,
      item_name NVARCHAR(200) NOT NULL,
      current_stock INT NOT NULL DEFAULT 0,
      minimum_stock INT NOT NULL DEFAULT 0,
      maximum_stock INT NOT NULL DEFAULT 0,
      unit_code NVARCHAR(50) NOT NULL DEFAULT 'PCS',
      location_code NVARCHAR(50) NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'Normal',
      image_path NVARCHAR(500) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_movement_history', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_movement_history (
      id INT IDENTITY(1,1) PRIMARY KEY,
      movement_date DATE NOT NULL,
      movement_type NVARCHAR(50) NOT NULL,
      item_code NVARCHAR(80) NOT NULL,
      item_name NVARCHAR(200) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      reference_no NVARCHAR(120) NULL,
      created_by NVARCHAR(120) NULL,
      image_path NVARCHAR(500) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_calibration', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_calibration (
      id INT IDENTITY(1,1) PRIMARY KEY,
      tool_code NVARCHAR(80) NOT NULL,
      tool_name NVARCHAR(200) NOT NULL,
      serial_number NVARCHAR(100) NULL,
      last_calibration_date DATE NULL,
      calibration_interval_days INT NOT NULL DEFAULT 180,
      next_calibration_date DATE NOT NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'Normal',
      owner NVARCHAR(120) NULL,
      image_path NVARCHAR(500) NULL,
      remark NVARCHAR(MAX) NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF COL_LENGTH('dbo.tb_tooling_calibration', 'calibration_interval_days') IS NULL
    ALTER TABLE dbo.tb_tooling_calibration ADD calibration_interval_days INT NOT NULL CONSTRAINT DF_tb_tooling_calibration_interval DEFAULT 180;
    `,
    `
    IF OBJECT_ID('dbo.tb_tooling_report', 'U') IS NULL
    CREATE TABLE dbo.tb_tooling_report (
      id INT IDENTITY(1,1) PRIMARY KEY,
      report_name NVARCHAR(150) NOT NULL,
      description NVARCHAR(500) NULL,
      last_generated_date DATE NULL,
      row_count INT NOT NULL DEFAULT 0,
      report_type NVARCHAR(80) NOT NULL,
      export_type NVARCHAR(50) NOT NULL DEFAULT 'Excel',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    `
  ];
}

function getToolingSeedStatements() {
  return [
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_category)
    INSERT INTO dbo.tbm_tooling_category (category_code, category_name, status)
    VALUES ('MEASURE', 'Measuring Tool', 'active'), ('HAND', 'Hand Tool', 'active'), ('CONSUME', 'Consumable', 'active');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_location)
    INSERT INTO dbo.tbm_tooling_location (location_code, location_name, status)
    VALUES ('STORE-A', 'Main Store', 'active'), ('CAB-01', 'Cabinet 01', 'active'), ('SHELF-B2', 'Shelf B2', 'active');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_unit)
    INSERT INTO dbo.tbm_tooling_unit (unit_code, unit_name, status)
    VALUES ('PCS', 'Piece', 'active'), ('SET', 'Set', 'active'), ('BOX', 'Box', 'active');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_tool)
    INSERT INTO dbo.tb_tooling_tool (tool_code, tool_name, category_code, brand, model, serial_number, location_code, status, minimum_stock, unit_code, image_path, remark)
    VALUES
      ('TL-TQ-001', 'Torque Wrench', 'MEASURE', 'Tohnichi', 'QL100N', 'TQ-1001', 'STORE-A', 'Available', 0, 'PCS', '/tooling-images/torque-wrench.svg', 'Torque check tool'),
      ('TL-CV-002', 'Caliper Vernier', 'MEASURE', 'Mitutoyo', '530-312', 'CV-2002', 'CAB-01', 'Available', 0, 'PCS', '/tooling-images/caliper.svg', 'Measurement tool'),
      ('TL-DG-004', 'Dial Gauge', 'MEASURE', 'Mitutoyo', '2046S', 'DG-0004', 'CAB-01', 'Borrowed', 0, 'PCS', '/tooling-images/dial-gauge.svg', 'Inspection tool');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_stock_item)
    INSERT INTO dbo.tb_tooling_stock_item (item_code, item_name, category_code, location_code, unit_code, current_stock, minimum_stock, maximum_stock, status, image_path, remark)
    VALUES
      ('ST-BRG-6204', 'Bearing 6204 ZZ', 'CONSUME', 'STORE-A', 'PCS', 27, 8, 60, 'active', '/tooling-images/bearing.svg', 'Common bearing'),
      ('ST-TAPE-001', 'Insulation Tape', 'CONSUME', 'CAB-01', 'PCS', 5, 10, 80, 'active', '/tooling-images/insulation-tape.svg', 'Electrical tape'),
      ('ST-GRS-001', 'Grease Cartridge', 'CONSUME', 'STORE-A', 'PCS', 2, 6, 30, 'active', '/tooling-images/grease.svg', 'Lubrication stock');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_borrow_transaction)
    INSERT INTO dbo.tb_tooling_borrow_transaction (issue_no, request_no, tool_code, tool_name, borrower, issue_date, due_date, status, image_path, remark)
    VALUES
      ('ISS-2026-001', 'BRQ-2026-002', 'TL-CV-002', 'Caliper Vernier', 'Narin', '2026-05-12', '2026-05-20', 'Issued', '/tooling-images/caliper.svg', 'Tool condition checked before issue'),
      ('ISS-2026-002', 'BRQ-2026-004', 'TL-DG-004', 'Dial Gauge', 'Kanda', '2026-05-12', '2026-05-19', 'Issued', '/tooling-images/dial-gauge.svg', 'Issued for inspection job');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_return_transaction)
    INSERT INTO dbo.tb_tooling_return_transaction (return_no, issue_no, tool_code, tool_name, return_by, return_date, condition_status, image_path, remark)
    VALUES
      ('RTN-2026-001', 'ISS-2026-001', 'TL-CV-002', 'Caliper Vernier', 'Narin', '2026-05-13', 'Good', '/tooling-images/caliper.svg', 'Returned in good condition'),
      ('RTN-2026-002', 'ISS-2026-002', 'TL-DG-004', 'Dial Gauge', 'Kanda', '2026-05-14', 'Need Check', '/tooling-images/dial-gauge.svg', 'Need visual inspection');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_overdue_borrow)
    INSERT INTO dbo.tb_tooling_overdue_borrow (borrow_no, tool_code, tool_name, borrower, department, due_date, overdue_days, status, image_path)
    VALUES
      ('BR-2026-001', 'TL-TQ-001', 'Torque Wrench', 'Somchai', 'Maintenance', '2026-05-09', 3, 'Overdue', '/tooling-images/torque-wrench.svg'),
      ('BR-2026-002', 'TL-DG-004', 'Dial Gauge', 'Anan', 'Production', '2026-05-08', 4, 'Overdue', '/tooling-images/dial-gauge.svg');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_stock_in)
    INSERT INTO dbo.tb_tooling_stock_in (receive_no, item_code, item_name, quantity, unit_code, location_code, reference_no, receive_date, image_path, remark)
    VALUES
      ('SIN-2026-001', 'ST-BRG-6204', 'Bearing 6204 ZZ', 24, 'PCS', 'STORE-A', 'PO-2026-0512', '2026-05-12', '/tooling-images/bearing.svg', 'Received from supplier'),
      ('SIN-2026-002', 'ST-TAPE-001', 'Insulation Tape', 10, 'PCS', 'CAB-01', 'PO-2026-0513', '2026-05-12', '/tooling-images/insulation-tape.svg', 'Electrical stock');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_stock_out)
    INSERT INTO dbo.tb_tooling_stock_out (issue_no, item_code, item_name, quantity, unit_code, reference_type, reference_no, issue_date, image_path, remark)
    VALUES
      ('SOUT-2026-001', 'ST-BRG-6204', 'Bearing 6204 ZZ', 4, 'PCS', 'PM', 'PM-2026-018', '2026-05-12', '/tooling-images/bearing.svg', 'PM usage'),
      ('SOUT-2026-002', 'ST-TAPE-001', 'Insulation Tape', 2, 'PCS', 'Job Request', 'JOB-2026-043', '2026-05-12', '/tooling-images/insulation-tape.svg', 'Repair usage');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_stock_balance)
    INSERT INTO dbo.tb_tooling_stock_balance (item_code, item_name, current_stock, minimum_stock, maximum_stock, unit_code, location_code, status, image_path)
    VALUES
      ('ST-BRG-6204', 'Bearing 6204 ZZ', 27, 8, 60, 'PCS', 'STORE-A', 'Normal', '/tooling-images/bearing.svg'),
      ('ST-TAPE-001', 'Insulation Tape', 5, 10, 80, 'PCS', 'CAB-01', 'Low Stock', '/tooling-images/insulation-tape.svg'),
      ('ST-GRS-001', 'Grease Cartridge', 2, 6, 30, 'PCS', 'STORE-A', 'Low Stock', '/tooling-images/grease.svg');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_movement_history)
    INSERT INTO dbo.tb_tooling_movement_history (movement_date, movement_type, item_code, item_name, quantity, reference_no, created_by, image_path)
    VALUES
      ('2026-05-12', 'Stock In', 'ST-BRG-6204', 'Bearing 6204 ZZ', 24, 'SIN-2026-001', 'tooladmin', '/tooling-images/bearing.svg'),
      ('2026-05-12', 'Stock Out', 'ST-TAPE-001', 'Insulation Tape', -2, 'JOB-2026-043', 'tooladmin', '/tooling-images/insulation-tape.svg'),
      ('2026-05-13', 'Borrow', 'TL-CV-002', 'Caliper Vernier', 1, 'ISS-2026-001', 'tooladmin', '/tooling-images/caliper.svg');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_calibration)
    INSERT INTO dbo.tb_tooling_calibration (tool_code, tool_name, serial_number, last_calibration_date, calibration_interval_days, next_calibration_date, status, owner, image_path, remark)
    VALUES
      ('TL-TQ-001', 'Torque Wrench', 'TQ-1001', '2025-11-20', 180, '2026-05-20', 'Due Soon', 'Tooling Store', '/tooling-images/torque-wrench.svg', 'Schedule calibration'),
      ('TL-DG-004', 'Dial Gauge', 'DG-0004', '2025-11-26', 180, '2026-05-26', 'Due Soon', 'QC Room', '/tooling-images/dial-gauge.svg', 'Schedule calibration'),
      ('TL-CV-002', 'Caliper Vernier', 'CV-2002', '2025-10-30', 180, '2026-04-30', 'Expired', 'Tooling Store', '/tooling-images/caliper.svg', 'Block before use');
    `,
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.tb_tooling_report)
    INSERT INTO dbo.tb_tooling_report (report_name, description, last_generated_date, row_count, report_type, export_type)
    VALUES
      ('Tool List', 'Current registered tools and status.', '2026-05-12', 18, 'Master', 'Excel'),
      ('Spare Part List', 'Consumable master and current balance.', '2026-05-12', 24, 'Master', 'Excel'),
      ('Low Stock', 'Items below minimum stock.', '2026-05-12', 3, 'Stock', 'Excel'),
      ('Movement History', 'Stock and tool movement log.', '2026-05-12', 148, 'Movement', 'Excel');
    `
  ];
}

module.exports = {
  toolingResources,
  getToolingSchemaStatements,
  getToolingSeedStatements,
  getToolingResource,
  normalizeToolingPagination
};
