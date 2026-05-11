IF COL_LENGTH('dbo.tbm_user', 'position') IS NULL
BEGIN
  ALTER TABLE dbo.tbm_user ADD position NVARCHAR(80) NULL;
END;

EXEC sp_executesql N'
  UPDATE dbo.tbm_user
  SET position =
    CASE
      WHEN username LIKE ''qc%'' THEN ''QC''
      WHEN username LIKE ''production%'' THEN ''Production''
      ELSE ''Maintenance''
    END
  WHERE position IS NULL;
';

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_department WHERE code = 'MNT')
BEGIN
  INSERT INTO dbo.tbm_department (code, name, status)
  VALUES ('MNT', 'Maintenance Operations', 'active');
END;

DECLARE @maintenanceDepartmentId INT = (SELECT TOP 1 id FROM dbo.tbm_department WHERE code = 'MNT');

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_area WHERE code = 'MNT-A')
BEGIN
  INSERT INTO dbo.tbm_area (departmentId, code, name, status)
  VALUES
    (@maintenanceDepartmentId, 'MNT-A', 'Maintenance Bay A', 'active'),
    (@maintenanceDepartmentId, 'MNT-B', 'Maintenance Bay B', 'active'),
    (@maintenanceDepartmentId, 'MNT-C', 'Maintenance Bay C', 'active');
END;

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
WHERE area.code IN ('MNT-A', 'MNT-B', 'MNT-C')
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.tbm_machine_type AS existingType
    WHERE existingType.code = CONCAT(area.code, '-', typeSeed.code)
  );

INSERT INTO dbo.tbm_machine_number (machineTypeId, machineNumber, name, status)
SELECT
  machineType.id,
  CONCAT(machineType.code, '-', RIGHT(CONCAT('00', machineSeed.machineNo), 2)),
  CONCAT(machineType.name, ' ', machineSeed.machineNo),
  'active'
FROM dbo.tbm_machine_type AS machineType
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS machineSeed(machineNo)
WHERE machineType.code LIKE 'MNT-%'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.tbm_machine_number AS existingMachine
    WHERE existingMachine.machineNumber = CONCAT(machineType.code, '-', RIGHT(CONCAT('00', machineSeed.machineNo), 2))
  );

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_user WHERE username = 'qc01')
BEGIN
  EXEC sp_executesql N'
    INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
    SELECT
      ''QC-001'',
      ''QC Inspector'',
      ''QC'',
      ''qc01'',
      ''qc01'',
      id,
      ''active'',
      ''user'',
      ''{"preventiveMaintenance":"user","toolingStore":"none","jobRequest":"user","adminMode":"none"}''
    FROM dbo.tbm_department
    WHERE code = ''PRD'';
  ';
END;

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_user WHERE username = 'production01')
BEGIN
  EXEC sp_executesql N'
    INSERT INTO dbo.tbm_user (empId, name, position, username, password, departmentId, status, role, permissions)
    SELECT
      ''PRD-001'',
      ''Production Operator'',
      ''Production'',
      ''production01'',
      ''production01'',
      id,
      ''active'',
      ''user'',
      ''{"preventiveMaintenance":"user","toolingStore":"none","jobRequest":"user","adminMode":"none"}''
    FROM dbo.tbm_department
    WHERE code = ''PRD'';
  ';
END;
