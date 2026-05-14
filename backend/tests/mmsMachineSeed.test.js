const assert = require("node:assert/strict");
const test = require("node:test");
const { buildMmsMachineSeedData } = require("../scripts/seed_mms_machines");

test("mms machine seed creates 4 areas 14 types and 100 real machine records", () => {
  const seed = buildMmsMachineSeedData();

  assert.equal(seed.areas.length, 4);
  assert.equal(seed.machineTypes.length, 14);
  assert.equal(seed.machines.length, 100);
  assert.equal(new Set(seed.machines.map((machine) => machine.machine_no)).size, 100);
  assert.equal(seed.machines.every((machine) => machine.status === "active"), true);
});

test("mms machine seed keeps machine types connected to seeded areas", () => {
  const seed = buildMmsMachineSeedData();
  const areaCodes = new Set(seed.areas.map((area) => area.area_code));

  assert.equal(seed.machineTypes.every((machineType) => areaCodes.has(machineType.area_code)), true);
});

test("mms seed includes local working shifts for 07:00 to 07:00 day", () => {
  const seed = buildMmsMachineSeedData();

  assert.deepEqual(seed.workingShifts.map((shift) => [shift.shift_code, shift.start_time_local, shift.end_time_local]), [
    ["A", "07:00", "15:00"],
    ["B", "15:00", "23:00"],
    ["C", "23:00", "07:00"]
  ]);
});
