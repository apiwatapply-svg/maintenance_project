const statusCases = `
  CASE
    WHEN p.status = 'completed' THEN 'completed'
    WHEN p.status = 'ng' THEN 'ng'
    WHEN p.status = 'inProgress' THEN 'inProgress'
    WHEN CAST(p.due_date AS DATE) < CAST(SYSUTCDATETIME() AS DATE) THEN 'overdue'
    WHEN CAST(p.due_date AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN 'dueToday'
    ELSE 'planned'
  END
`;

function getPreventiveSchemaStatements() {
  return [
    `
      IF OBJECT_ID('dbo.tbm_pm_type', 'U') IS NULL
      CREATE TABLE dbo.tbm_pm_type (
        id INT IDENTITY(1,1) PRIMARY KEY,
        pm_type_code NVARCHAR(50) NOT NULL UNIQUE,
        pm_type_name NVARCHAR(150) NOT NULL,
        description NVARCHAR(500) NULL,
        default_frequency_days INT NOT NULL DEFAULT 1,
        advance_notify_days INT NOT NULL DEFAULT 0,
        status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `,
    `
      IF OBJECT_ID('dbo.tbm_pm_checklist_item', 'U') IS NULL
      CREATE TABLE dbo.tbm_pm_checklist_item (
        id INT IDENTITY(1,1) PRIMARY KEY,
        pm_type_id INT NOT NULL,
        item_name NVARCHAR(200) NOT NULL,
        input_type NVARCHAR(30) NOT NULL,
        is_required BIT NOT NULL DEFAULT 1,
        min_value DECIMAL(18,2) NULL,
        max_value DECIMAL(18,2) NULL,
        unit NVARCHAR(30) NULL,
        dropdown_options NVARCHAR(500) NULL,
        criteria NVARCHAR(500) NULL,
        sort_order INT NOT NULL DEFAULT 1,
        status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tbm_pm_checklist_item_type FOREIGN KEY (pm_type_id) REFERENCES dbo.tbm_pm_type(id)
      );
    `,
    `
      IF OBJECT_ID('dbo.tb_pm_machine_mapping', 'U') IS NULL
      CREATE TABLE dbo.tb_pm_machine_mapping (
        id INT IDENTITY(1,1) PRIMARY KEY,
        machine_code NVARCHAR(80) NOT NULL UNIQUE,
        machine_name NVARCHAR(200) NOT NULL,
        area NVARCHAR(100) NOT NULL,
        machine_type NVARCHAR(100) NOT NULL,
        assigned_to NVARCHAR(150) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `,
    `
      IF OBJECT_ID('dbo.tb_pm_machine_mapping_type', 'U') IS NULL
      CREATE TABLE dbo.tb_pm_machine_mapping_type (
        id INT IDENTITY(1,1) PRIMARY KEY,
        mapping_id INT NOT NULL,
        pm_type_id INT NOT NULL,
        frequency_days INT NOT NULL DEFAULT 1,
        advance_notify_days INT NOT NULL DEFAULT 0,
        start_date DATE NOT NULL,
        next_date DATE NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tb_pm_mapping_type_mapping FOREIGN KEY (mapping_id) REFERENCES dbo.tb_pm_machine_mapping(id),
        CONSTRAINT FK_tb_pm_mapping_type_type FOREIGN KEY (pm_type_id) REFERENCES dbo.tbm_pm_type(id)
      );
    `,
    `
      IF OBJECT_ID('dbo.tb_pm_plan', 'U') IS NULL
      CREATE TABLE dbo.tb_pm_plan (
        id INT IDENTITY(1,1) PRIMARY KEY,
        pm_no NVARCHAR(50) NOT NULL UNIQUE,
        mapping_type_id INT NOT NULL,
        due_date DATE NOT NULL,
        last_date DATE NULL,
        assigned_to NVARCHAR(150) NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'planned',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tb_pm_plan_mapping_type FOREIGN KEY (mapping_type_id) REFERENCES dbo.tb_pm_machine_mapping_type(id)
      );
    `,
    `
      IF OBJECT_ID('dbo.tb_pm_inspection', 'U') IS NULL
      CREATE TABLE dbo.tb_pm_inspection (
        id INT IDENTITY(1,1) PRIMARY KEY,
        pm_plan_id INT NOT NULL,
        inspector NVARCHAR(150) NULL,
        checker NVARCHAR(150) NULL,
        started_at DATETIME2 NULL,
        completed_at DATETIME2 NULL,
        overall_result NVARCHAR(20) NULL,
        remark NVARCHAR(1000) NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'Draft',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tb_pm_inspection_plan FOREIGN KEY (pm_plan_id) REFERENCES dbo.tb_pm_plan(id)
      );
    `,
    `
      IF OBJECT_ID('dbo.tb_pm_inspection_result', 'U') IS NULL
      CREATE TABLE dbo.tb_pm_inspection_result (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inspection_id INT NOT NULL,
        checklist_item_id INT NULL,
        item_name_snapshot NVARCHAR(200) NOT NULL,
        input_type_snapshot NVARCHAR(30) NOT NULL,
        value_text NVARCHAR(500) NULL,
        value_number DECIMAL(18,2) NULL,
        value_dropdown NVARCHAR(200) NULL,
        value_ok_ng NVARCHAR(20) NULL,
        result_status NVARCHAR(20) NULL,
        remark NVARCHAR(500) NULL,
        image_url NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tb_pm_inspection_result_inspection FOREIGN KEY (inspection_id) REFERENCES dbo.tb_pm_inspection(id)
      );
    `
  ];
}

function getPreventiveSeedStatements() {
  return [
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tbm_pm_type)
      BEGIN
        INSERT INTO dbo.tbm_pm_type (pm_type_code, pm_type_name, description, default_frequency_days, advance_notify_days, status)
        VALUES
          ('PM-DAY', 'Daily Machine Check', 'Daily basic condition check before production.', 1, 0, 'Active'),
          ('PM-WEEK', 'Weekly Lubrication', 'Lubrication and moving part condition.', 7, 1, 'Active'),
          ('PM-MON', 'Monthly Safety Check', 'Safety device and electrical check.', 30, 5, 'Active');
      END
    `,
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tbm_pm_checklist_item)
      BEGIN
        INSERT INTO dbo.tbm_pm_checklist_item (pm_type_id, item_name, input_type, is_required, min_value, max_value, unit, dropdown_options, criteria, sort_order)
        SELECT id, 'Guard and cover condition', 'OK / NG', 1, NULL, NULL, NULL, NULL, 'All covers locked', 1 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-DAY'
        UNION ALL SELECT id, 'Air pressure', 'Number', 1, 5, 7, 'bar', NULL, 'Normal pressure range', 2 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-DAY'
        UNION ALL SELECT id, 'Machine sound', 'Dropdown', 1, NULL, NULL, NULL, 'Normal, Abnormal, Other', 'Listen during idle run', 3 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-DAY'
        UNION ALL SELECT id, 'Cleaning condition', 'OK / NG', 1, NULL, NULL, NULL, NULL, 'No dust or oil stain', 4 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-DAY'
        UNION ALL SELECT id, 'Before PM image', 'Image', 0, NULL, NULL, NULL, NULL, 'Attach if abnormal', 5 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-DAY'
        UNION ALL SELECT id, 'Bearing temperature', 'Number', 1, 20, 70, 'C', NULL, 'Check bearing housing', 1 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-WEEK'
        UNION ALL SELECT id, 'Grease condition', 'Dropdown', 1, NULL, NULL, NULL, 'Good, Low, Dirty, Other', 'Grease must not be dry', 2 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-WEEK'
        UNION ALL SELECT id, 'Chain tension', 'OK / NG', 1, NULL, NULL, NULL, NULL, 'No slack', 3 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-WEEK'
        UNION ALL SELECT id, 'Action remark', 'Text', 0, NULL, NULL, NULL, NULL, 'Record action if adjusted', 4 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-WEEK'
        UNION ALL SELECT id, 'Emergency stop test', 'OK / NG', 1, NULL, NULL, NULL, NULL, 'Stop command works', 1 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-MON'
        UNION ALL SELECT id, 'Sensor response', 'OK / NG', 1, NULL, NULL, NULL, NULL, 'Sensor response passed', 2 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-MON'
        UNION ALL SELECT id, 'Panel temperature', 'Number', 1, 20, 45, 'C', NULL, 'Panel temperature limit', 3 FROM dbo.tbm_pm_type WHERE pm_type_code = 'PM-MON';
      END
    `,
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tb_pm_machine_mapping)
      BEGIN
        INSERT INTO dbo.tb_pm_machine_mapping (machine_code, machine_name, area, machine_type, assigned_to, status)
        VALUES
          ('CNV-A-001', 'Main Conveyor A1', 'Line A', 'Conveyor', 'MM-001 Somchai', 'Active'),
          ('FIL-A-002', 'Filling Machine A2', 'Line A', 'Filling', 'MM-004 Narin', 'Active'),
          ('SEA-P-004', 'Auto Sealer P4', 'Packing', 'Sealer', 'MM-002 Kanda', 'Active'),
          ('PMP-U-011', 'Cooling Pump U11', 'Utility', 'Pump', 'MM-003 Anan', 'Active'),
          ('CMP-U-003', 'Air Compressor U3', 'Utility', 'Compressor', 'MM-001 Somchai', 'Active'),
          ('PAN-B-007', 'Control Panel B7', 'Line B', 'Control Panel', NULL, 'Active'),
          ('CNV-B-002', 'Return Conveyor B2', 'Line B', 'Conveyor', 'MM-002 Kanda', 'Active'),
          ('FIL-B-005', 'Filling Machine B5', 'Line B', 'Filling', 'MM-004 Narin', 'Active');
      END
    `,
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tb_pm_machine_mapping_type)
      BEGIN
        INSERT INTO dbo.tb_pm_machine_mapping_type (mapping_id, pm_type_id, frequency_days, advance_notify_days, start_date, next_date, status)
        SELECT m.id, t.id, 1, 0, '2026-05-13', '2026-05-13', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'CNV-A-001' AND t.pm_type_code = 'PM-DAY'
        UNION ALL SELECT m.id, t.id, 7, 1, '2026-05-13', '2026-05-17', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'CNV-A-001' AND t.pm_type_code = 'PM-WEEK'
        UNION ALL SELECT m.id, t.id, 30, 5, '2026-05-13', '2026-06-01', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'CNV-A-001' AND t.pm_type_code = 'PM-MON'
        UNION ALL SELECT m.id, t.id, 1, 0, '2026-05-13', '2026-05-13', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'FIL-A-002' AND t.pm_type_code = 'PM-DAY'
        UNION ALL SELECT m.id, t.id, 7, 1, '2026-05-03', '2026-05-10', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'FIL-A-002' AND t.pm_type_code = 'PM-WEEK'
        UNION ALL SELECT m.id, t.id, 30, 5, '2026-04-20', '2026-05-20', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'SEA-P-004' AND t.pm_type_code = 'PM-MON'
        UNION ALL SELECT m.id, t.id, 7, 1, '2026-05-13', '2026-05-20', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'PMP-U-011' AND t.pm_type_code = 'PM-WEEK'
        UNION ALL SELECT m.id, t.id, 30, 5, '2026-05-13', '2026-06-12', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'CMP-U-003' AND t.pm_type_code = 'PM-MON'
        UNION ALL SELECT m.id, t.id, 1, 0, '2026-05-12', '2026-05-13', 'Active' FROM dbo.tb_pm_machine_mapping m CROSS JOIN dbo.tbm_pm_type t WHERE m.machine_code = 'FIL-B-005' AND t.pm_type_code = 'PM-DAY';
      END
    `,
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tb_pm_plan)
      BEGIN
        INSERT INTO dbo.tb_pm_plan (pm_no, mapping_type_id, due_date, last_date, assigned_to, status)
        SELECT 'PM-20260513-001', mt.id, '2026-05-13', '2026-05-12', 'MM-001 Somchai', 'dueToday' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'CNV-A-001' AND t.pm_type_code = 'PM-DAY'
        UNION ALL SELECT 'PM-20260510-002', mt.id, '2026-05-10', '2026-05-03', 'MM-004 Narin', 'overdue' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'FIL-A-002' AND t.pm_type_code = 'PM-WEEK'
        UNION ALL SELECT 'PM-20260520-003', mt.id, '2026-05-20', '2026-04-20', 'MM-002 Kanda', 'planned' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'SEA-P-004' AND t.pm_type_code = 'PM-MON'
        UNION ALL SELECT 'PM-20260513-004', mt.id, '2026-05-13', '2026-04-13', 'MM-001 Somchai', 'ng' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'CMP-U-003' AND t.pm_type_code = 'PM-MON'
        UNION ALL SELECT 'PM-20260513-005', mt.id, '2026-05-13', '2026-05-06', 'MM-003 Anan', 'completed' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'PMP-U-011' AND t.pm_type_code = 'PM-WEEK'
        UNION ALL SELECT 'PM-20260513-006', mt.id, '2026-05-13', '2026-05-12', 'MM-004 Narin', 'inProgress' FROM dbo.tb_pm_machine_mapping_type mt JOIN dbo.tb_pm_machine_mapping m ON m.id = mt.mapping_id JOIN dbo.tbm_pm_type t ON t.id = mt.pm_type_id WHERE m.machine_code = 'FIL-B-005' AND t.pm_type_code = 'PM-DAY';
      END
    `,
    `
      IF NOT EXISTS (SELECT 1 FROM dbo.tb_pm_inspection)
      BEGIN
        INSERT INTO dbo.tb_pm_inspection (pm_plan_id, inspector, checker, started_at, completed_at, overall_result, remark, status)
        SELECT id, 'MM-003 Anan', 'MM-005 Apiwat', '2026-05-13T08:15:00', '2026-05-13T08:42:00', 'OK', 'Pump condition normal.', 'Completed' FROM dbo.tb_pm_plan WHERE pm_no = 'PM-20260513-005'
        UNION ALL SELECT id, 'MM-001 Somchai', 'MM-005 Apiwat', '2026-05-13T09:05:00', '2026-05-13T09:48:00', 'NG', 'Panel temperature exceeded limit.', 'Completed' FROM dbo.tb_pm_plan WHERE pm_no = 'PM-20260513-004'
        UNION ALL SELECT id, 'MM-004 Narin', NULL, SYSUTCDATETIME(), NULL, NULL, NULL, 'Draft' FROM dbo.tb_pm_plan WHERE pm_no = 'PM-20260513-006';
      END
    `
  ];
}

function normalizePreventivePagination(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = {
  getPreventiveSchemaStatements,
  getPreventiveSeedStatements,
  normalizePreventivePagination,
  statusCases
};
