IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_category WHERE categoryCode = 'BRG')
BEGIN
  INSERT INTO dbo.tbm_tooling_category (categoryCode, categoryName, status)
  VALUES
    ('BRG', 'Bearings', 'active'),
    ('ELC', 'Electrical Parts', 'active'),
    ('PNE', 'Pneumatic Parts', 'active');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_location WHERE locationCode = 'ST-A01')
BEGIN
  INSERT INTO dbo.tbm_tooling_location (locationCode, locationName, description, status)
  VALUES
    ('ST-A01', 'Store Rack A-01', 'Fast moving spare parts rack', 'active'),
    ('ST-B01', 'Store Rack B-01', 'Electrical and sensor rack', 'active'),
    ('ST-C01', 'Store Rack C-01', 'Pneumatic and fitting rack', 'active');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_supplier WHERE supplierCode = 'SUP-MRO')
BEGIN
  INSERT INTO dbo.tbm_tooling_supplier (supplierCode, supplierName, contact, status)
  VALUES
    ('SUP-MRO', 'MRO Industrial Supply', 'purchase@mro.local', 'active'),
    ('SUP-ELEC', 'Factory Electrical Parts', 'sales@electrical.local', 'active');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.tbm_tooling_item WHERE itemCode = 'SP-BRG-6204')
BEGIN
  INSERT INTO dbo.tbm_tooling_item (
    itemCode,
    itemName,
    categoryId,
    itemType,
    unit,
    minimumStock,
    maximumStock,
    safetyStock,
    leadTimeDays,
    slowMovementDays,
    deadStockDays,
    minimumOrderQuantity,
    preferredSupplierId,
    criticalLevel,
    locationId,
    qrCode,
    imageUrl,
    status
  )
  SELECT
    seed.itemCode,
    seed.itemName,
    category.id,
    'spare_part',
    seed.unit,
    seed.minimumStock,
    seed.maximumStock,
    seed.safetyStock,
    seed.leadTimeDays,
    seed.slowMovementDays,
    seed.deadStockDays,
    seed.minimumOrderQuantity,
    supplier.id,
    seed.criticalLevel,
    location.id,
    seed.qrCode,
    seed.imageUrl,
    'active'
  FROM (
    VALUES
      ('SP-BRG-6204', 'Bearing 6204 ZZ', 'BRG', 'ST-A01', 'SUP-MRO', 'pcs', 8, 60, 5, 7, 90, 180, 10, 'important', 'QR-SP-BRG-6204', '/images/tooling/bearing-6204.jpg', 24),
      ('SP-BRG-6305', 'Bearing 6305 ZZ', 'BRG', 'ST-A01', 'SUP-MRO', 'pcs', 6, 48, 4, 7, 90, 180, 10, 'normal', 'QR-SP-BRG-6305', '/images/tooling/bearing-6305.jpg', 18),
      ('SP-SEN-PROX', 'Proximity Sensor M12', 'ELC', 'ST-B01', 'SUP-ELEC', 'pcs', 5, 30, 3, 14, 120, 240, 5, 'critical', 'QR-SP-SEN-PROX', '/images/tooling/proximity-sensor-m12.jpg', 9),
      ('SP-REL-24V', 'Relay 24VDC', 'ELC', 'ST-B01', 'SUP-ELEC', 'pcs', 10, 80, 5, 10, 120, 240, 10, 'important', 'QR-SP-REL-24V', '/images/tooling/relay-24vdc.jpg', 35),
      ('SP-CYL-25', 'Pneumatic Cylinder 25mm', 'PNE', 'ST-C01', 'SUP-MRO', 'pcs', 4, 24, 2, 21, 120, 240, 4, 'critical', 'QR-SP-CYL-25', '/images/tooling/pneumatic-cylinder-25mm.jpg', 6),
      ('SP-FIT-8MM', 'PU Fitting 8mm', 'PNE', 'ST-C01', 'SUP-MRO', 'pcs', 20, 150, 10, 5, 90, 180, 20, 'normal', 'QR-SP-FIT-8MM', '/images/tooling/pu-fitting-8mm.jpg', 65)
  ) AS seed(
    itemCode,
    itemName,
    categoryCode,
    locationCode,
    supplierCode,
    unit,
    minimumStock,
    maximumStock,
    safetyStock,
    leadTimeDays,
    slowMovementDays,
    deadStockDays,
    minimumOrderQuantity,
    criticalLevel,
    qrCode,
    imageUrl,
    quantityOnHand
  )
  INNER JOIN dbo.tbm_tooling_category AS category ON category.categoryCode = seed.categoryCode
  INNER JOIN dbo.tbm_tooling_location AS location ON location.locationCode = seed.locationCode
  INNER JOIN dbo.tbm_tooling_supplier AS supplier ON supplier.supplierCode = seed.supplierCode;
END;

INSERT INTO dbo.tb_tooling_stock_balance (itemId, locationId, quantityOnHand)
SELECT item.id, item.locationId, seed.quantityOnHand
FROM dbo.tbm_tooling_item AS item
INNER JOIN (
  VALUES
    ('SP-BRG-6204', 24),
    ('SP-BRG-6305', 18),
    ('SP-SEN-PROX', 9),
    ('SP-REL-24V', 35),
    ('SP-CYL-25', 6),
    ('SP-FIT-8MM', 65)
) AS seed(itemCode, quantityOnHand) ON seed.itemCode = item.itemCode
WHERE item.locationId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.tb_tooling_stock_balance AS balance
    WHERE balance.itemId = item.id AND balance.locationId = item.locationId
  );
