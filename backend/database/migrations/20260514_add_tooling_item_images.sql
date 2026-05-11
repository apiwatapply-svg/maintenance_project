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
    ('SP-BRG-6204', '/images/tooling/bearing-6204.jpg'),
    ('SP-BRG-6305', '/images/tooling/bearing-6305.jpg'),
    ('SP-SEN-PROX', '/images/tooling/proximity-sensor-m12.jpg'),
    ('SP-REL-24V', '/images/tooling/relay-24vdc.jpg'),
    ('SP-CYL-25', '/images/tooling/pneumatic-cylinder-25mm.jpg'),
    ('SP-FIT-8MM', '/images/tooling/pu-fitting-8mm.jpg')
) AS seed(itemCode, imageUrl) ON seed.itemCode = item.itemCode
WHERE item.imageUrl IS NULL
   OR item.imageUrl = ''
   OR item.imageUrl LIKE 'https://commons.wikimedia.org/%';
