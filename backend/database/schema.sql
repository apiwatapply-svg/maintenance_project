IF OBJECT_ID('dbo.tb_tooling_planning_snapshot', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_planning_snapshot;
IF OBJECT_ID('dbo.tb_tooling_adjustment', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_adjustment;
IF OBJECT_ID('dbo.tb_tooling_request_item', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_request_item;
IF OBJECT_ID('dbo.tb_tooling_request', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_request;
IF OBJECT_ID('dbo.tb_tooling_stock_transaction', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_stock_transaction;
IF OBJECT_ID('dbo.tb_tooling_stock_balance', 'U') IS NOT NULL DROP TABLE dbo.tb_tooling_stock_balance;
IF OBJECT_ID('dbo.tbm_tooling_item', 'U') IS NOT NULL DROP TABLE dbo.tbm_tooling_item;
IF OBJECT_ID('dbo.tbm_tooling_supplier', 'U') IS NOT NULL DROP TABLE dbo.tbm_tooling_supplier;
IF OBJECT_ID('dbo.tbm_tooling_location', 'U') IS NOT NULL DROP TABLE dbo.tbm_tooling_location;
IF OBJECT_ID('dbo.tbm_tooling_category', 'U') IS NOT NULL DROP TABLE dbo.tbm_tooling_category;
IF OBJECT_ID('dbo.tbm_user', 'U') IS NOT NULL DROP TABLE dbo.tbm_user;
IF OBJECT_ID('dbo.tbm_machine_number', 'U') IS NOT NULL DROP TABLE dbo.tbm_machine_number;
IF OBJECT_ID('dbo.tbm_machine_type', 'U') IS NOT NULL DROP TABLE dbo.tbm_machine_type;
IF OBJECT_ID('dbo.tbm_area', 'U') IS NOT NULL DROP TABLE dbo.tbm_area;
IF OBJECT_ID('dbo.tbm_department', 'U') IS NOT NULL DROP TABLE dbo.tbm_department;

CREATE TABLE dbo.tbm_department (
  id INT IDENTITY(1,1) PRIMARY KEY,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.tbm_area (
  id INT IDENTITY(1,1) PRIMARY KEY,
  departmentId INT NOT NULL,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tbm_area_tbm_department FOREIGN KEY (departmentId) REFERENCES dbo.tbm_department(id)
);

CREATE TABLE dbo.tbm_machine_type (
  id INT IDENTITY(1,1) PRIMARY KEY,
  areaId INT NOT NULL,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tbm_machine_type_tbm_area FOREIGN KEY (areaId) REFERENCES dbo.tbm_area(id)
);

CREATE TABLE dbo.tbm_machine_number (
  id INT IDENTITY(1,1) PRIMARY KEY,
  machineTypeId INT NOT NULL,
  machineNumber NVARCHAR(80) NOT NULL,
  name NVARCHAR(150) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tbm_machine_number_tbm_machine_type FOREIGN KEY (machineTypeId) REFERENCES dbo.tbm_machine_type(id)
);

CREATE TABLE dbo.tbm_user (
  id INT IDENTITY(1,1) PRIMARY KEY,
  empId NVARCHAR(50) NOT NULL UNIQUE,
  name NVARCHAR(150) NOT NULL,
  position NVARCHAR(80) NOT NULL,
  username NVARCHAR(80) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  departmentId INT NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  role NVARCHAR(20) NOT NULL DEFAULT 'user',
  permissions NVARCHAR(MAX) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tbm_user_tbm_department FOREIGN KEY (departmentId) REFERENCES dbo.tbm_department(id)
);

CREATE TABLE dbo.tbm_tooling_category (
  id INT IDENTITY(1,1) PRIMARY KEY,
  categoryCode NVARCHAR(50) NOT NULL UNIQUE,
  categoryName NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.tbm_tooling_location (
  id INT IDENTITY(1,1) PRIMARY KEY,
  locationCode NVARCHAR(50) NOT NULL UNIQUE,
  locationName NVARCHAR(150) NOT NULL,
  description NVARCHAR(255) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.tbm_tooling_supplier (
  id INT IDENTITY(1,1) PRIMARY KEY,
  supplierCode NVARCHAR(50) NOT NULL UNIQUE,
  supplierName NVARCHAR(180) NOT NULL,
  contact NVARCHAR(180) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.tbm_tooling_item (
  id INT IDENTITY(1,1) PRIMARY KEY,
  itemCode NVARCHAR(80) NOT NULL UNIQUE,
  itemName NVARCHAR(180) NOT NULL,
  categoryId INT NULL,
  itemType NVARCHAR(40) NOT NULL DEFAULT 'spare_part',
  unit NVARCHAR(30) NOT NULL DEFAULT 'pcs',
  minimumStock DECIMAL(18,2) NOT NULL DEFAULT 0,
  maximumStock DECIMAL(18,2) NOT NULL DEFAULT 0,
  safetyStock DECIMAL(18,2) NOT NULL DEFAULT 0,
  leadTimeDays INT NOT NULL DEFAULT 0,
  slowMovementDays INT NOT NULL DEFAULT 90,
  deadStockDays INT NOT NULL DEFAULT 180,
  minimumOrderQuantity DECIMAL(18,2) NOT NULL DEFAULT 0,
  preferredSupplierId INT NULL,
  criticalLevel NVARCHAR(30) NOT NULL DEFAULT 'normal',
  locationId INT NULL,
  qrCode NVARCHAR(120) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tbm_tooling_item_category FOREIGN KEY (categoryId) REFERENCES dbo.tbm_tooling_category(id),
  CONSTRAINT FK_tbm_tooling_item_location FOREIGN KEY (locationId) REFERENCES dbo.tbm_tooling_location(id),
  CONSTRAINT FK_tbm_tooling_item_supplier FOREIGN KEY (preferredSupplierId) REFERENCES dbo.tbm_tooling_supplier(id)
);

CREATE TABLE dbo.tb_tooling_stock_balance (
  id INT IDENTITY(1,1) PRIMARY KEY,
  itemId INT NOT NULL,
  locationId INT NOT NULL,
  quantityOnHand DECIMAL(18,2) NOT NULL DEFAULT 0,
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tb_tooling_stock_balance_item FOREIGN KEY (itemId) REFERENCES dbo.tbm_tooling_item(id),
  CONSTRAINT FK_tb_tooling_stock_balance_location FOREIGN KEY (locationId) REFERENCES dbo.tbm_tooling_location(id)
);

CREATE TABLE dbo.tb_tooling_stock_transaction (
  id INT IDENTITY(1,1) PRIMARY KEY,
  transactionNo NVARCHAR(80) NOT NULL UNIQUE,
  movementType NVARCHAR(30) NOT NULL,
  itemId INT NOT NULL,
  locationId INT NOT NULL,
  quantity DECIMAL(18,2) NOT NULL,
  balanceAfter DECIMAL(18,2) NOT NULL,
  departmentId INT NULL,
  userId INT NULL,
  referenceType NVARCHAR(40) NULL,
  referenceId INT NULL,
  referenceNo NVARCHAR(80) NULL,
  remark NVARCHAR(255) NULL,
  transactionDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tb_tooling_stock_transaction_item FOREIGN KEY (itemId) REFERENCES dbo.tbm_tooling_item(id),
  CONSTRAINT FK_tb_tooling_stock_transaction_location FOREIGN KEY (locationId) REFERENCES dbo.tbm_tooling_location(id)
);

CREATE TABLE dbo.tb_tooling_request (
  id INT IDENTITY(1,1) PRIMARY KEY,
  requestNo NVARCHAR(80) NOT NULL UNIQUE,
  requesterId INT NOT NULL,
  departmentId INT NULL,
  referenceType NVARCHAR(40) NULL,
  referenceId INT NULL,
  status NVARCHAR(30) NOT NULL DEFAULT 'pending',
  remark NVARCHAR(255) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tb_tooling_request_requester FOREIGN KEY (requesterId) REFERENCES dbo.tbm_user(id),
  CONSTRAINT FK_tb_tooling_request_department FOREIGN KEY (departmentId) REFERENCES dbo.tbm_department(id)
);

CREATE TABLE dbo.tb_tooling_request_item (
  id INT IDENTITY(1,1) PRIMARY KEY,
  requestId INT NOT NULL,
  itemId INT NOT NULL,
  locationId INT NOT NULL,
  requestedQuantity DECIMAL(18,2) NOT NULL,
  issuedQuantity DECIMAL(18,2) NOT NULL DEFAULT 0,
  status NVARCHAR(30) NOT NULL DEFAULT 'pending',
  CONSTRAINT FK_tb_tooling_request_item_request FOREIGN KEY (requestId) REFERENCES dbo.tb_tooling_request(id),
  CONSTRAINT FK_tb_tooling_request_item_item FOREIGN KEY (itemId) REFERENCES dbo.tbm_tooling_item(id),
  CONSTRAINT FK_tb_tooling_request_item_location FOREIGN KEY (locationId) REFERENCES dbo.tbm_tooling_location(id)
);

CREATE TABLE dbo.tb_tooling_adjustment (
  id INT IDENTITY(1,1) PRIMARY KEY,
  adjustmentNo NVARCHAR(80) NOT NULL UNIQUE,
  itemId INT NOT NULL,
  locationId INT NOT NULL,
  adjustmentType NVARCHAR(30) NOT NULL,
  quantity DECIMAL(18,2) NOT NULL,
  reason NVARCHAR(255) NOT NULL,
  adjustedBy INT NOT NULL,
  adjustedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tb_tooling_adjustment_item FOREIGN KEY (itemId) REFERENCES dbo.tbm_tooling_item(id),
  CONSTRAINT FK_tb_tooling_adjustment_location FOREIGN KEY (locationId) REFERENCES dbo.tbm_tooling_location(id),
  CONSTRAINT FK_tb_tooling_adjustment_user FOREIGN KEY (adjustedBy) REFERENCES dbo.tbm_user(id)
);

CREATE TABLE dbo.tb_tooling_planning_snapshot (
  id INT IDENTITY(1,1) PRIMARY KEY,
  itemId INT NOT NULL,
  itemCode NVARCHAR(80) NOT NULL,
  itemName NVARCHAR(180) NOT NULL,
  currentStock DECIMAL(18,2) NOT NULL DEFAULT 0,
  averageDailyUsage DECIMAL(18,4) NOT NULL DEFAULT 0,
  reorderPoint DECIMAL(18,2) NOT NULL DEFAULT 0,
  daysUntilStockout DECIMAL(18,2) NULL,
  suggestedOrderQuantity DECIMAL(18,2) NOT NULL DEFAULT 0,
  planningStatus NVARCHAR(40) NOT NULL DEFAULT 'normal',
  criticalLevel NVARCHAR(30) NOT NULL DEFAULT 'normal',
  supplierId INT NULL,
  calculatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_tb_tooling_planning_snapshot_item FOREIGN KEY (itemId) REFERENCES dbo.tbm_tooling_item(id)
);

CREATE INDEX IX_tbm_area_departmentId ON dbo.tbm_area(departmentId);
CREATE INDEX IX_tbm_machine_type_areaId ON dbo.tbm_machine_type(areaId);
CREATE INDEX IX_tbm_machine_number_machineTypeId ON dbo.tbm_machine_number(machineTypeId);
CREATE INDEX IX_tbm_user_departmentId ON dbo.tbm_user(departmentId);
CREATE INDEX IX_tbm_tooling_item_itemType ON dbo.tbm_tooling_item(itemType);
CREATE INDEX IX_tb_tooling_stock_balance_itemId ON dbo.tb_tooling_stock_balance(itemId);
CREATE INDEX IX_tb_tooling_stock_transaction_itemId ON dbo.tb_tooling_stock_transaction(itemId);

INSERT INTO dbo.tbm_department (code, name, status)
VALUES
  ('ADMIN', 'Administrator', 'active'),
  ('ENG', 'Engineering', 'active'),
  ('PRD', 'Production', 'active'),
  ('WH', 'Warehouse', 'active'),
  ('MNT', 'Maintenance Operations', 'active');

INSERT INTO dbo.tbm_area (departmentId, code, name, status)
SELECT id, 'CTRL', 'Control Room', 'active' FROM dbo.tbm_department WHERE code = 'ADMIN'
UNION ALL
SELECT id, 'LINE-A', 'Line A', 'active' FROM dbo.tbm_department WHERE code = 'PRD'
UNION ALL
SELECT id, 'LINE-B', 'Line B', 'active' FROM dbo.tbm_department WHERE code = 'PRD'
UNION ALL
SELECT id, 'STORE', 'Tooling Store', 'active' FROM dbo.tbm_department WHERE code = 'WH';

INSERT INTO dbo.tbm_area (departmentId, code, name, status)
SELECT id, 'MNT-A', 'Maintenance Bay A', 'active' FROM dbo.tbm_department WHERE code = 'MNT'
UNION ALL
SELECT id, 'MNT-B', 'Maintenance Bay B', 'active' FROM dbo.tbm_department WHERE code = 'MNT'
UNION ALL
SELECT id, 'MNT-C', 'Maintenance Bay C', 'active' FROM dbo.tbm_department WHERE code = 'MNT';

INSERT INTO dbo.tbm_machine_type (areaId, code, name, status)
SELECT id, 'PANEL', 'Control Panel', 'active' FROM dbo.tbm_area WHERE code = 'CTRL'
UNION ALL
SELECT id, 'CNV', 'Conveyor', 'active' FROM dbo.tbm_area WHERE code = 'LINE-A'
UNION ALL
SELECT id, 'FILL', 'Filling Machine', 'active' FROM dbo.tbm_area WHERE code = 'LINE-A'
UNION ALL
SELECT id, 'TOOL', 'Tool Cabinet', 'active' FROM dbo.tbm_area WHERE code = 'STORE';

INSERT INTO dbo.tbm_machine_type (areaId, code, name, status)
SELECT area.id, CONCAT(area.code, '-', typeSeed.code), CONCAT(area.name, ' ', typeSeed.name), 'active'
FROM dbo.tbm_area AS area
CROSS JOIN (
  VALUES
    ('PMP', 'Pump'),
    ('MTR', 'Motor'),
    ('CMP', 'Compressor'),
    ('FAN', 'Industrial Fan'),
    ('HST', 'Hoist'),
    ('PRS', 'Press Machine')
) AS typeSeed(code, name)
WHERE area.code IN ('MNT-A', 'MNT-B', 'MNT-C');

INSERT INTO dbo.tbm_machine_number (machineTypeId, machineNumber, name, status)
SELECT id, 'PANEL-ADMIN-01', 'Admin Control Panel', 'active' FROM dbo.tbm_machine_type WHERE code = 'PANEL'
UNION ALL
SELECT id, 'CNV-A-001', 'Line A Conveyor 1', 'active' FROM dbo.tbm_machine_type WHERE code = 'CNV'
UNION ALL
SELECT id, 'FILL-A-001', 'Line A Filling 1', 'active' FROM dbo.tbm_machine_type WHERE code = 'FILL'
UNION ALL
SELECT id, 'TOOL-ST-001', 'Main Tool Cabinet', 'active' FROM dbo.tbm_machine_type WHERE code = 'TOOL';

INSERT INTO dbo.tbm_machine_number (machineTypeId, machineNumber, name, status)
SELECT
  machineType.id,
  CONCAT(machineType.code, '-', RIGHT(CONCAT('00', machineSeed.machineNo), 2)),
  CONCAT(machineType.name, ' ', machineSeed.machineNo),
  'active'
FROM dbo.tbm_machine_type AS machineType
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS machineSeed(machineNo)
WHERE machineType.code LIKE 'MNT-%';

INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
SELECT
  'ADM-001',
  'System Administrator',
  'Maintenance',
  'admin',
  'admin',
  id,
  'active',
  'admin',
  '{"preventiveMaintenance":"admin","toolingStore":"admin","jobRequest":"admin","adminMode":"admin"}'
FROM dbo.tbm_department
WHERE code = 'ADMIN';

INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
SELECT
  'ENG-001',
  'Maintenance Engineer',
  'Maintenance',
  'engineer01',
  'engineer01',
  id,
  'active',
  'user',
  '{"preventiveMaintenance":"admin","toolingStore":"user","jobRequest":"admin","adminMode":"none"}'
FROM dbo.tbm_department
WHERE code = 'ENG';

INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
SELECT
  'QC-001',
  'QC Inspector',
  'QC',
  'qc01',
  'qc01',
  id,
  'active',
  'user',
  '{"preventiveMaintenance":"user","toolingStore":"none","jobRequest":"user","adminMode":"none"}'
FROM dbo.tbm_department
WHERE code = 'PRD';

INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
SELECT
  'PRD-001',
  'Production Operator',
  'Production',
  'production01',
  'production01',
  id,
  'active',
  'user',
  '{"preventiveMaintenance":"user","toolingStore":"none","jobRequest":"user","adminMode":"none"}'
FROM dbo.tbm_department
WHERE code = 'PRD';
