IF COL_LENGTH('dbo.tbm_tooling_item', 'imageUrl') IS NULL
BEGIN
  ALTER TABLE dbo.tbm_tooling_item
  ADD imageUrl NVARCHAR(500) NULL;
END;

UPDATE item
SET imageUrl = seed.imageUrl
FROM dbo.tbm_tooling_item AS item
INNER JOIN (
  VALUES
    ('SP-BRG-6204', 'https://commons.wikimedia.org/wiki/Special:FilePath/Ball_bearing.jpg'),
    ('SP-BRG-6305', 'https://commons.wikimedia.org/wiki/Special:FilePath/Rolling-element_bearing_60_mm.jpg'),
    ('SP-SEN-PROX', 'https://commons.wikimedia.org/wiki/Special:FilePath/Inductive%20Proximity%20Switch.jpg'),
    ('SP-REL-24V', 'https://commons.wikimedia.org/wiki/Special:FilePath/2019-08-04_Relay.jpg'),
    ('SP-CYL-25', 'https://commons.wikimedia.org/wiki/Special:FilePath/Pneumatic_cylinder_2172.jpg'),
    ('SP-FIT-8MM', 'https://commons.wikimedia.org/wiki/Special:FilePath/Pneumatic_Tubing_(11569966005).jpg')
) AS seed(itemCode, imageUrl) ON seed.itemCode = item.itemCode
WHERE item.imageUrl IS NULL OR item.imageUrl = '';
