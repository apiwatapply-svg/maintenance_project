CREATE TABLE Departments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE Areas (
  id INT IDENTITY(1,1) PRIMARY KEY,
  departmentId INT NOT NULL,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_Areas_Departments FOREIGN KEY (departmentId) REFERENCES Departments(id)
);

CREATE TABLE MachineTypes (
  id INT IDENTITY(1,1) PRIMARY KEY,
  areaId INT NOT NULL,
  code NVARCHAR(50) NULL,
  name NVARCHAR(150) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_MachineTypes_Areas FOREIGN KEY (areaId) REFERENCES Areas(id)
);

CREATE TABLE MachineNumbers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  machineTypeId INT NOT NULL,
  machineNumber NVARCHAR(80) NOT NULL,
  name NVARCHAR(150) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_MachineNumbers_MachineTypes FOREIGN KEY (machineTypeId) REFERENCES MachineTypes(id)
);

CREATE TABLE Users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(80) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  fullName NVARCHAR(150) NULL,
  departmentId INT NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'active',
  role NVARCHAR(20) NOT NULL DEFAULT 'user',
  permissions NVARCHAR(MAX) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_Users_Departments FOREIGN KEY (departmentId) REFERENCES Departments(id)
);

CREATE INDEX IX_Areas_DepartmentId ON Areas(departmentId);
CREATE INDEX IX_MachineTypes_AreaId ON MachineTypes(areaId);
CREATE INDEX IX_MachineNumbers_MachineTypeId ON MachineNumbers(machineTypeId);
CREATE INDEX IX_Users_DepartmentId ON Users(departmentId);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE code = 'ADMIN')
BEGIN
  INSERT INTO Departments (code, name, status)
  VALUES ('ADMIN', 'Administrator', 'active');
END;

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
BEGIN
  INSERT INTO Users (username, password, fullName, departmentId, status, role, permissions)
  SELECT
    'admin',
    'admin',
    'System Administrator',
    id,
    'active',
    'admin',
    '{"preventiveMaintenance":"admin","toolingStore":"admin","jobRequest":"admin","adminMode":"admin"}'
  FROM Departments
  WHERE code = 'ADMIN';
END;
