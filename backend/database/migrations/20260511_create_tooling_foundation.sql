IF OBJECT_ID('dbo.tb_tooling_planning_snapshot', 'U') IS NULL
BEGIN
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
    calculatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tb_tooling_adjustment', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_tooling_adjustment (
    id INT IDENTITY(1,1) PRIMARY KEY,
    adjustmentNo NVARCHAR(80) NOT NULL UNIQUE,
    itemId INT NOT NULL,
    locationId INT NOT NULL,
    adjustmentType NVARCHAR(30) NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    reason NVARCHAR(255) NOT NULL,
    adjustedBy INT NOT NULL,
    adjustedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tb_tooling_request_item', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_tooling_request_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    requestId INT NOT NULL,
    itemId INT NOT NULL,
    requestedQuantity DECIMAL(18,2) NOT NULL,
    issuedQuantity DECIMAL(18,2) NOT NULL DEFAULT 0,
    status NVARCHAR(30) NOT NULL DEFAULT 'pending'
  );
END;

IF OBJECT_ID('dbo.tb_tooling_request', 'U') IS NULL
BEGIN
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
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tb_tooling_stock_transaction', 'U') IS NULL
BEGIN
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
    transactionDate DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tb_tooling_stock_balance', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_tooling_stock_balance (
    id INT IDENTITY(1,1) PRIMARY KEY,
    itemId INT NOT NULL,
    locationId INT NOT NULL,
    quantityOnHand DECIMAL(18,2) NOT NULL DEFAULT 0,
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tbm_tooling_item', 'U') IS NULL
BEGIN
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
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tbm_tooling_supplier', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tbm_tooling_supplier (
    id INT IDENTITY(1,1) PRIMARY KEY,
    supplierCode NVARCHAR(50) NOT NULL UNIQUE,
    supplierName NVARCHAR(180) NOT NULL,
    contact NVARCHAR(180) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tbm_tooling_location', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tbm_tooling_location (
    id INT IDENTITY(1,1) PRIMARY KEY,
    locationCode NVARCHAR(50) NOT NULL UNIQUE,
    locationName NVARCHAR(150) NOT NULL,
    description NVARCHAR(255) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF OBJECT_ID('dbo.tbm_tooling_category', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tbm_tooling_category (
    id INT IDENTITY(1,1) PRIMARY KEY,
    categoryCode NVARCHAR(50) NOT NULL UNIQUE,
    categoryName NVARCHAR(150) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbm_tooling_item_itemType' AND object_id = OBJECT_ID('dbo.tbm_tooling_item'))
BEGIN
  CREATE INDEX IX_tbm_tooling_item_itemType ON dbo.tbm_tooling_item(itemType);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_tooling_stock_balance_itemId' AND object_id = OBJECT_ID('dbo.tb_tooling_stock_balance'))
BEGIN
  CREATE INDEX IX_tb_tooling_stock_balance_itemId ON dbo.tb_tooling_stock_balance(itemId);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_tooling_stock_transaction_itemId' AND object_id = OBJECT_ID('dbo.tb_tooling_stock_transaction'))
BEGIN
  CREATE INDEX IX_tb_tooling_stock_transaction_itemId ON dbo.tb_tooling_stock_transaction(itemId);
END;
