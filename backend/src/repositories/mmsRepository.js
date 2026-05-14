const { getPool } = require("../config/database");

function mapMachine(row) {
  const activeJobNo = row.active_job_no || null;

  return {
    id: row.id,
    areaCode: row.area_code || "",
    area: row.area_name || row.area_code || "Unassigned",
    machineTypeCode: row.machine_type_code || "",
    machineType: row.machine_type_name || row.machine_type_code || "Unknown Type",
    machineNo: row.machine_no,
    machineName: row.machine_name || row.machine_no,
    status: row.status || "active",
    activeJobNo,
    activeJobStatus: row.active_job_status || null,
    jobRequestActive: Boolean(activeJobNo),
    eventStatus: activeJobNo ? row.active_job_status : "NONE",
    plcStatus: "RUN",
    cycleTime: 5,
    model: "MODEL-A"
  };
}

async function listSimulationMachines() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      mn.id,
      mn.machine_no,
      mn.machine_name,
      mn.machine_type_code,
      mn.status,
      mt.machine_type_name,
      mt.area_code,
      a.area_name,
      active_job.job_no AS active_job_no,
      active_job.status AS active_job_status
    FROM dbo.tbm_machine_no mn
    LEFT JOIN dbo.tbm_machine_type mt ON mt.machine_type_code = mn.machine_type_code
    LEFT JOIN dbo.tbm_area a ON a.area_code = mt.area_code
    OUTER APPLY (
      SELECT TOP 1 job_no, status
      FROM dbo.tb_job_request jr
      WHERE jr.machine_no = mn.machine_no
        AND jr.status NOT IN ('COMPLETED', 'CANCELLED')
      ORDER BY jr.requested_at DESC
    ) active_job
    WHERE ISNULL(mn.status, 'active') = 'active'
    ORDER BY a.area_name, mt.machine_type_name, mn.machine_no;
  `);

  return result.recordset.map(mapMachine);
}

module.exports = {
  listSimulationMachines,
  mapMachine
};
