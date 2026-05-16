const { sql, getPool } = require("../config/database");

function toBangkokDateText(now = new Date()) {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const mmsWorkingHourLabels = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
  "23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00"
];

function getMmsHourSort(hourLabel) {
  const index = mmsWorkingHourLabels.indexOf(String(hourLabel || ""));
  return index >= 0 ? index + 1 : 99;
}

function getMmsHourSortSql(alias = "mh") {
  return `CASE ${alias}.hour_label
    WHEN '07:00' THEN 1 WHEN '08:00' THEN 2 WHEN '09:00' THEN 3 WHEN '10:00' THEN 4
    WHEN '11:00' THEN 5 WHEN '12:00' THEN 6 WHEN '13:00' THEN 7 WHEN '14:00' THEN 8
    WHEN '15:00' THEN 9 WHEN '16:00' THEN 10 WHEN '17:00' THEN 11 WHEN '18:00' THEN 12
    WHEN '19:00' THEN 13 WHEN '20:00' THEN 14 WHEN '21:00' THEN 15 WHEN '22:00' THEN 16
    WHEN '23:00' THEN 17 WHEN '00:00' THEN 18 WHEN '01:00' THEN 19 WHEN '02:00' THEN 20
    WHEN '03:00' THEN 21 WHEN '04:00' THEN 22 WHEN '05:00' THEN 23 WHEN '06:00' THEN 24
    ELSE 99
  END`;
}

function getClosedMmsHourSortFilterSql(alias = "mh") {
  return `${getMmsHourSortSql(alias)} < @currentHourSort`;
}

function getMmsWorkSlot(now = new Date()) {
  const bangkokDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const localHour = bangkokDate.getUTCHours();
  const workDate = new Date(bangkokDate);

  if (localHour < 7) {
    workDate.setUTCDate(workDate.getUTCDate() - 1);
  }

  return {
    hourLabel: `${String(localHour).padStart(2, "0")}:00`,
    shiftCode: localHour >= 7 && localHour < 15 ? "A" : localHour >= 15 && localHour < 23 ? "B" : "C",
    workDate: workDate.toISOString().slice(0, 10)
  };
}

function getCurrentMmsWorkDate(now = new Date()) {
  return getMmsWorkSlot(now).workDate;
}

function normalizeMmsStatus(payload = {}) {
  if (payload.simMachineAlarm) return "ALARM";
  return payload.effectiveStatus || payload.plcStatus || payload.status || "RUN";
}

function mapMmsRealtimePayloadToHourlyRow(payload = {}, slot = getMmsWorkSlot()) {
  const cycleTime = Math.max(1, Number(payload.cycleTime ?? payload.ct ?? 5) || 5);
  const status = normalizeMmsStatus(payload);
  const plannedSeconds = 3600;
  const stopSeconds = status === "RUN" ? 0 : plannedSeconds;
  const alarmSeconds = status === "ALARM" ? plannedSeconds : 0;

  return {
    alarm_seconds: alarmSeconds,
    cycle_time_sec: cycleTime,
    hour_label: slot.hourLabel,
    machine_no: payload.machineNo || payload.machine_no,
    output_ng: Math.max(0, Math.floor(Number(payload.outputNg ?? payload.output_ng ?? 0) || 0)),
    output_ok: Math.max(0, Math.floor(Number(payload.outputOk ?? payload.output_ok ?? payload.output ?? 0) || 0)),
    planned_seconds: plannedSeconds,
    run_seconds: Math.max(0, plannedSeconds - stopSeconds),
    shift_code: slot.shiftCode,
    status,
    stop_seconds: stopSeconds,
    target_output: Math.floor(plannedSeconds / cycleTime),
    work_date: slot.workDate
  };
}

async function ensureMmsReportSchema(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.tb_mms_machine_hourly', 'U') IS NULL
    CREATE TABLE dbo.tb_mms_machine_hourly (
      id INT IDENTITY(1,1) PRIMARY KEY,
      work_date DATE NOT NULL,
      shift_code NVARCHAR(20) NOT NULL,
      hour_label NVARCHAR(20) NOT NULL,
      machine_no NVARCHAR(80) NOT NULL,
      status NVARCHAR(40) NOT NULL,
      planned_seconds INT NOT NULL DEFAULT 0,
      run_seconds INT NOT NULL DEFAULT 0,
      stop_seconds INT NOT NULL DEFAULT 0,
      alarm_seconds INT NOT NULL DEFAULT 0,
      target_output INT NOT NULL DEFAULT 0,
      output_ok INT NOT NULL DEFAULT 0,
      output_ng INT NOT NULL DEFAULT 0,
      cycle_time_sec DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'UX_tb_mms_machine_hourly_work_hour_machine'
        AND object_id = OBJECT_ID('dbo.tb_mms_machine_hourly')
    )
    CREATE UNIQUE INDEX UX_tb_mms_machine_hourly_work_hour_machine
      ON dbo.tb_mms_machine_hourly (work_date, hour_label, machine_no);
  `);
}

function mapMachine(row) {
  const activeJobNo = row.active_job_no || null;
  const outputOk = Number(row.output_ok || 0);
  const outputNg = Number(row.output_ng || 0);
  const targetOutput = Number(row.target_output || 0);
  const plannedSeconds = Number(row.planned_seconds || 0);
  const runSeconds = Number(row.run_seconds || 0);
  const totalOutput = outputOk + outputNg;
  const availability = plannedSeconds > 0 ? Number(((runSeconds / plannedSeconds) * 100).toFixed(1)) : 0;
  const performance = targetOutput > 0 ? Number(((totalOutput / targetOutput) * 100).toFixed(1)) : 0;
  const quality = totalOutput > 0 ? Number(((outputOk / totalOutput) * 100).toFixed(1)) : 0;
  const oee = Number(((availability * performance * quality) / 10000).toFixed(1));

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
    plcStatus: row.latest_status || "RUN",
    cycleTime: Number(row.cycle_time_sec || 0) || 5,
    model: "MODEL-A",
    outputOk,
    outputNg,
    output: totalOutput,
    targetOutput,
    availability,
    performance,
    quality,
    oee
  };
}

async function listSimulationMachines() {
  const pool = await getPool();
  await ensureMmsReportSchema(pool);
  const slot = getMmsWorkSlot();
  const hourSortSql = getMmsHourSortSql("mh");
  const closedHourSortFilterSql = getClosedMmsHourSortFilterSql("mh");
  const result = await pool.request()
    .input("workDate", sql.Date, slot.workDate)
    .input("currentHourSort", sql.Int, getMmsHourSort(slot.hourLabel))
    .query(`
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
      active_job.status AS active_job_status,
      mms.output_ok,
      mms.output_ng,
      mms.target_output,
      mms.planned_seconds,
      mms.run_seconds,
      mms.cycle_time_sec,
      latest.status AS latest_status
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
    OUTER APPLY (
      SELECT
        SUM(output_ok) AS output_ok,
        SUM(output_ng) AS output_ng,
        SUM(target_output) AS target_output,
        SUM(planned_seconds) AS planned_seconds,
        SUM(run_seconds) AS run_seconds,
        AVG(cycle_time_sec) AS cycle_time_sec
      FROM dbo.tb_mms_machine_hourly mh
      WHERE mh.machine_no = mn.machine_no
        AND mh.work_date = @workDate
        AND ${closedHourSortFilterSql}
    ) mms
    OUTER APPLY (
      SELECT TOP 1 status
      FROM dbo.tb_mms_machine_hourly mh
      WHERE mh.machine_no = mn.machine_no
        AND mh.work_date = @workDate
        AND ${closedHourSortFilterSql}
      ORDER BY
        ${hourSortSql} DESC
    ) latest
    WHERE ISNULL(mn.status, 'active') = 'active'
    ORDER BY a.area_name, mt.machine_type_name, mn.machine_no;
  `);

  return result.recordset.map(mapMachine);
}

function getDateFilter(period, query = {}) {
  if (period === "yearly") {
    return {
      from: `${query.year || new Date().getUTCFullYear()}-01-01`,
      to: `${query.year || new Date().getUTCFullYear()}-12-31`
    };
  }
  if (period === "monthly") {
    const month = query.month || toBangkokDateText().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(end.getUTCDate() - 1);
    return { from: month + "-01", to: end.toISOString().slice(0, 10) };
  }
  const date = query.date || toBangkokDateText();
  return { from: date, to: date };
}

function getBucketExpression(period) {
  if (period === "yearly") {
    return {
      label: "FORMAT(mh.work_date, 'MMM', 'en-US')",
      sort: "MONTH(mh.work_date)"
    };
  }
  if (period === "monthly") {
    return {
      label: "RIGHT('0' + CAST(DAY(mh.work_date) AS NVARCHAR(2)), 2)",
      sort: "DAY(mh.work_date)"
    };
  }
  return {
    label: "mh.hour_label",
    sort: `CASE mh.hour_label
      WHEN '07:00' THEN 1 WHEN '08:00' THEN 2 WHEN '09:00' THEN 3 WHEN '10:00' THEN 4
      WHEN '11:00' THEN 5 WHEN '12:00' THEN 6 WHEN '13:00' THEN 7 WHEN '14:00' THEN 8
      WHEN '15:00' THEN 9 WHEN '16:00' THEN 10 WHEN '17:00' THEN 11 WHEN '18:00' THEN 12
      WHEN '19:00' THEN 13 WHEN '20:00' THEN 14 WHEN '21:00' THEN 15 WHEN '22:00' THEN 16
      WHEN '23:00' THEN 17 WHEN '00:00' THEN 18 WHEN '01:00' THEN 19 WHEN '02:00' THEN 20
      WHEN '03:00' THEN 21 WHEN '04:00' THEN 22 WHEN '05:00' THEN 23 WHEN '06:00' THEN 24
      ELSE 99
    END`
  };
}

function addReportFilters(request, query = {}) {
  const clauses = ["mh.work_date BETWEEN @fromDate AND @toDate"];
  if (query.area && query.area !== "All") {
    request.input("area", sql.NVarChar(150), query.area);
    clauses.push("ISNULL(a.area_name, a.area_code) = @area");
  }
  if (query.machineType && query.machineType !== "All") {
    request.input("machineType", sql.NVarChar(150), query.machineType);
    clauses.push("ISNULL(mt.machine_type_name, mt.machine_type_code) = @machineType");
  }
  if (query.machineNo && query.machineNo !== "All") {
    request.input("machineNo", sql.NVarChar(80), query.machineNo);
    clauses.push("mh.machine_no = @machineNo");
  }
  return clauses.join(" AND ");
}

function mapReportRow(row) {
  const output = Number(row.output_ok || 0) + Number(row.output_ng || 0);
  const plannedSeconds = Number(row.planned_seconds || 0);
  const runSeconds = Number(row.run_seconds || 0);
  const targetOutput = Number(row.target_output || 0);
  const availability = plannedSeconds > 0 ? Number(((runSeconds / plannedSeconds) * 100).toFixed(1)) : 0;
  const performance = targetOutput > 0 ? Number(((output / targetOutput) * 100).toFixed(1)) : 0;
  const quality = output > 0 ? Number(((Number(row.output_ok || 0) / output) * 100).toFixed(1)) : 0;
  const oee = Number(((availability * performance * quality) / 10000).toFixed(1));

  return {
    alarmHours: Number((Number(row.alarm_seconds || 0) / 3600).toFixed(2)),
    availability,
    ct: Number(row.cycle_time_sec || 0),
    label: row.bucket_label,
    ng: Number(row.output_ng || 0),
    oee,
    output,
    performance,
    quality,
    rejectRate: output > 0 ? Number(((Number(row.output_ng || 0) / output) * 100).toFixed(2)) : 0,
    runHours: Number((runSeconds / 3600).toFixed(2)),
    sort: Number(row.bucket_sort || 0),
    stopHours: Number((Number(row.stop_seconds || 0) / 3600).toFixed(2)),
    target: targetOutput
  };
}

async function listMmsReport(query = {}) {
  const pool = await getPool();
  await ensureMmsReportSchema(pool);
  const period = ["daily", "monthly", "yearly"].includes(query.period || query.graphPeriod) ? (query.period || query.graphPeriod) : "daily";
  const dateFilter = getDateFilter(period, query);
  const bucket = getBucketExpression(period);
  const request = pool.request()
    .input("fromDate", sql.Date, dateFilter.from)
    .input("toDate", sql.Date, dateFilter.to);
  const whereClause = addReportFilters(request, query);

  const result = await request.query(`
    SELECT
      ${bucket.label} AS bucket_label,
      ${bucket.sort} AS bucket_sort,
      SUM(mh.planned_seconds) AS planned_seconds,
      SUM(mh.run_seconds) AS run_seconds,
      SUM(mh.stop_seconds) AS stop_seconds,
      SUM(mh.alarm_seconds) AS alarm_seconds,
      SUM(mh.target_output) AS target_output,
      SUM(mh.output_ok) AS output_ok,
      SUM(mh.output_ng) AS output_ng,
      AVG(mh.cycle_time_sec) AS cycle_time_sec
    FROM dbo.tb_mms_machine_hourly mh
    LEFT JOIN dbo.tbm_machine_no mn ON mn.machine_no = mh.machine_no
    LEFT JOIN dbo.tbm_machine_type mt ON mt.machine_type_code = mn.machine_type_code
    LEFT JOIN dbo.tbm_area a ON a.area_code = mt.area_code
    WHERE ${whereClause}
    GROUP BY ${bucket.label}, ${bucket.sort}
    ORDER BY ${bucket.sort};
  `);

  const series = result.recordset.map(mapReportRow);
  const totals = series.reduce((sum, row) => ({
    alarmHours: sum.alarmHours + row.alarmHours,
    ng: sum.ng + row.ng,
    output: sum.output + row.output,
    runHours: sum.runHours + row.runHours,
    stopHours: sum.stopHours + row.stopHours,
    target: sum.target + row.target
  }), { alarmHours: 0, ng: 0, output: 0, runHours: 0, stopHours: 0, target: 0 });
  const weighted = result.recordset.reduce((sum, row) => ({
    outputNg: sum.outputNg + Number(row.output_ng || 0),
    outputOk: sum.outputOk + Number(row.output_ok || 0),
    plannedSeconds: sum.plannedSeconds + Number(row.planned_seconds || 0),
    runSeconds: sum.runSeconds + Number(row.run_seconds || 0),
    targetOutput: sum.targetOutput + Number(row.target_output || 0)
  }), { outputNg: 0, outputOk: 0, plannedSeconds: 0, runSeconds: 0, targetOutput: 0 });
  const totalOutput = weighted.outputOk + weighted.outputNg;
  const availability = weighted.plannedSeconds > 0 ? Number(((weighted.runSeconds / weighted.plannedSeconds) * 100).toFixed(1)) : 0;
  const performance = weighted.targetOutput > 0 ? Number(((totalOutput / weighted.targetOutput) * 100).toFixed(1)) : 0;
  const quality = totalOutput > 0 ? Number(((weighted.outputOk / totalOutput) * 100).toFixed(1)) : 0;

  return {
    filters: {
      ...query,
      fromDate: dateFilter.from,
      period,
      toDate: dateFilter.to
    },
    series,
    summary: {
      alarmHours: Number(totals.alarmHours.toFixed(2)),
      availability,
      ng: totals.ng,
      oee: Number(((availability * performance * quality) / 10000).toFixed(1)),
      output: totals.output,
      performance,
      quality,
      rejectRate: totalOutput > 0 ? Number(((weighted.outputNg / totalOutput) * 100).toFixed(2)) : 0,
      runHours: Number(totals.runHours.toFixed(2)),
      stopHours: Number(totals.stopHours.toFixed(2)),
      target: totals.target
    }
  };
}

async function upsertMmsRealtimePayload(payload = {}, now = new Date(), slotOverride = null) {
  const machineNo = payload.machineNo || payload.machine_no;
  if (!machineNo) return null;

  const pool = await getPool();
  await ensureMmsReportSchema(pool);

  const slot = slotOverride || getMmsWorkSlot(now);
  const row = mapMmsRealtimePayloadToHourlyRow(payload, slot);
  const hourSortSql = getMmsHourSortSql("tb_mms_machine_hourly");
  const totals = await pool.request()
    .input("work_date", sql.Date, row.work_date)
    .input("hour_label", sql.NVarChar(20), row.hour_label)
    .input("currentHourSort", sql.Int, getMmsHourSort(slot.hourLabel))
    .input("machine_no", sql.NVarChar(80), row.machine_no)
    .query(`
      SELECT
        SUM(output_ok) AS previous_output_ok,
        SUM(output_ng) AS previous_output_ng
      FROM dbo.tb_mms_machine_hourly
      WHERE work_date = @work_date
        AND machine_no = @machine_no
        AND ${hourSortSql} < @currentHourSort;
    `);
  const previousOk = Number(totals.recordset[0]?.previous_output_ok || 0);
  const previousNg = Number(totals.recordset[0]?.previous_output_ng || 0);
  const hourOutputOk = Math.max(0, row.output_ok - previousOk);
  const hourOutputNg = Math.max(0, row.output_ng - previousNg);

  await pool.request()
    .input("work_date", sql.Date, row.work_date)
    .input("shift_code", sql.NVarChar(20), row.shift_code)
    .input("hour_label", sql.NVarChar(20), row.hour_label)
    .input("machine_no", sql.NVarChar(80), row.machine_no)
    .input("status", sql.NVarChar(40), row.status)
    .input("planned_seconds", sql.Int, row.planned_seconds)
    .input("run_seconds", sql.Int, row.run_seconds)
    .input("stop_seconds", sql.Int, row.stop_seconds)
    .input("alarm_seconds", sql.Int, row.alarm_seconds)
    .input("target_output", sql.Int, row.target_output)
    .input("output_ok", sql.Int, hourOutputOk)
    .input("output_ng", sql.Int, hourOutputNg)
    .input("cycle_time_sec", sql.Decimal(10, 2), row.cycle_time_sec)
    .query(`
      MERGE dbo.tb_mms_machine_hourly AS target
      USING (SELECT @work_date AS work_date, @hour_label AS hour_label, @machine_no AS machine_no) AS source
        ON target.work_date = source.work_date
          AND target.hour_label = source.hour_label
          AND target.machine_no = source.machine_no
      WHEN MATCHED THEN
        UPDATE SET
          shift_code = @shift_code,
          status = @status,
          planned_seconds = @planned_seconds,
          run_seconds = @run_seconds,
          stop_seconds = @stop_seconds,
          alarm_seconds = @alarm_seconds,
          target_output = @target_output,
          output_ok = @output_ok,
          output_ng = @output_ng,
          cycle_time_sec = @cycle_time_sec,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (work_date, shift_code, hour_label, machine_no, status, planned_seconds, run_seconds, stop_seconds, alarm_seconds, target_output, output_ok, output_ng, cycle_time_sec)
        VALUES (@work_date, @shift_code, @hour_label, @machine_no, @status, @planned_seconds, @run_seconds, @stop_seconds, @alarm_seconds, @target_output, @output_ok, @output_ng, @cycle_time_sec);
    `);

  return {
    ...row,
    output_ng: hourOutputNg,
    output_ok: hourOutputOk
  };
}

module.exports = {
  ensureMmsReportSchema,
  getClosedMmsHourSortFilterSql,
  getCurrentMmsWorkDate,
  getMmsHourSort,
  getMmsWorkSlot,
  listMmsReport,
  listSimulationMachines,
  mapMachine,
  mapMmsRealtimePayloadToHourlyRow,
  upsertMmsRealtimePayload
};
