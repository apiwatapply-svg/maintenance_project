IF COL_LENGTH('dbo.tbm_user', 'empId') IS NULL
BEGIN
  ALTER TABLE dbo.tbm_user ADD empId NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.tbm_user', 'name') IS NULL
BEGIN
  ALTER TABLE dbo.tbm_user ADD name NVARCHAR(150) NULL;
END;

EXEC sp_executesql N'
  UPDATE dbo.tbm_user
  SET empId =
    CASE
      WHEN username = ''admin'' THEN ''ADM-001''
      WHEN username = ''engineer01'' THEN ''ENG-001''
      ELSE CONCAT(''EMP-'', RIGHT(CONCAT(''0000'', id), 4))
    END
  WHERE empId IS NULL;
';

IF COL_LENGTH('dbo.tbm_user', 'fullName') IS NOT NULL
BEGIN
  EXEC sp_executesql N'
    UPDATE dbo.tbm_user
    SET name = COALESCE(name, fullName, username)
    WHERE name IS NULL;
  ';
END
ELSE
BEGIN
  EXEC sp_executesql N'
    UPDATE dbo.tbm_user
    SET name = COALESCE(name, username)
    WHERE name IS NULL;
  ';
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_tbm_user_empId'
    AND object_id = OBJECT_ID('dbo.tbm_user')
)
BEGIN
  CREATE UNIQUE INDEX UX_tbm_user_empId ON dbo.tbm_user(empId);
END;
