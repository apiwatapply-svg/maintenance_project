# MMS Simulation Requirements

## Purpose

`/mms-dashboard/mms-simulation` is a public machine simulation page for PLC/GOT style machine status. It is opened from MMS Dashboard in a new browser tab and does not require login.

The page simulates machine status and output in realtime, then sends Socket.IO events for MMS monitoring and future modules.

## Pages

| Page | Login | Purpose |
| --- | --- | --- |
| `/mms-dashboard` | No | Public MMS landing/dashboard. Includes a button that opens MMS Simulation in a new tab. |
| `/mms-dashboard/mms-simulation` | No | Machine layout dashboard and PLC/GOT simulation modal. |

## Data Source

Machine layout data must come from MSSQL master tables managed by Admin mode.

| Source | Usage |
| --- | --- |
| `tbm_area` | Area filter and area grouping |
| `tbm_machine_type` | Machine type filter and grouping |
| `tbm_machine_no` | Machine no cards |
| `tb_job_request` | Active repair status that can block machine output |

Frontend-only mock data must not be used for production simulation data. If test data is needed, add it through UI or MSSQL.

## Machine Status

| Status | Output Allowed | Meaning |
| --- | --- | --- |
| `RUN` | Yes | Machine is producing normally |
| `WAIT_PART` | No | Waiting for material or part |
| `BRAKE_TIME` | No | Scheduled break time |
| `PLAN_STOP` | No | Planned stop |
| `WARM_UP` | No | Machine warm-up |
| `MM_REPAIR` | No | GOT machine status for Maintenance repair mode |
| `MM_PREVENTIVE` | No | GOT machine status for Preventive Maintenance mode |
| `QC` | No | GOT machine status for QC inspection mode |
| `CLEANING` | No | GOT machine status for Production cleaning mode |
| `ALARM` | No | Simulated machine alarm |
| `STOP` | No | Machine stopped |

## Job Request Relationship

Machine status must come from GOT/PLC. Job Request is an event/context overlay and must not replace the GOT/PLC machine status. Active Job Request means a job exists for that machine and its status is not `COMPLETED` or `CANCELLED`.

| GOT/PLC Status | Job Request Status | Output | UI Meaning |
| --- | --- | --- | --- |
| `RUN` | none | Increase output | Normal production |
| `RUN` | `WAIT_MM` | Increase output | Machine still runs, repair request pending |
| `RUN` | `MM_REPAIR` | Increase output | Warning: repair job active while machine still runs |
| `STOP` | any active job | Stop | Machine stopped by GOT/PLC |
| `ALARM` | any active job | Stop | Machine alarm |
| `PLAN_STOP` | any active job | Stop | Planned stop |
| `WAIT_PART` | any active job | Stop | Waiting part/material |

Recommended data model:

| Field | Source | Meaning |
| --- | --- | --- |
| `plcStatus` | GOT/PLC | Real machine status |
| `eventStatus` | Job Request / PM / UI action | Current workflow context |
| `effectiveStatus` | UI calculation from GOT/PLC | Display color and machine state |
| `canProduceOutput` | UI/backend calculation from GOT/PLC + alarm | Whether output should increase |

## Socket.IO

The simulator sends events when a machine changes or when the machine cycle time elapses.

| Event | Trigger |
| --- | --- |
| `mms:machine-status-changed` | Status, alarm, model, or effective status changes |
| `mms:machine-output-changed` | Output OK or Output NG changes |
| `mms:machine-alarm-changed` | `simMachineAlarm` changes |

The page also listens to Job Request realtime events and refreshes machine data when a repair job changes.

## Payload

```json
{
  "area": "Line A",
  "machineType": "Conveyor",
  "machineNo": "CNV-A-001",
  "machineName": "Main Conveyor",
  "plcStatus": "RUN",
  "gotScreen": "MES_MENU",
  "outputOk": 1280,
  "outputNg": 12,
  "cycleTime": 4.2,
  "model": "MODEL-A",
  "simMachineAlarm": false,
  "jobRequestActive": false,
  "activeJobNo": null,
  "activeJobStatus": null,
  "eventStatus": "NONE",
  "effectiveStatus": "RUN",
  "canProduceOutput": true,
  "timestampUtc": "2026-05-13T10:00:00.000Z"
}
```

All timestamps are sent in UTC. UI can display local time when needed.

## UI Layout

```text
+--------------------------------------------------------------------------------+
| MMS Simulation Dashboard                                                       |
+--------------------------------------------------------------------------------+
| Area [searchable dropdown] | Machine Type [searchable dropdown] | Machine No   |
+--------------------------------------------------------------------------------+
| Zone / Area Panels                                                             |
| +----------------------------------------------------------------------------+ |
| | Zone 01 - Line A | MC / Run / Alarm / Job / Stop                           | |
| |   Machine Type: Conveyor                                                   | |
| |   [CNV-A-001] [CNV-A-002]                                                  | |
| |   Machine Type: Pump                                                       | |
| |   [PMP-A-001]                                                              | |
| +----------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------+
| Machine Cards stay inside their Zone / Area and Machine Type section           |
| +-------------------------+ +-------------------------+ +---------------------+ |
| | CNV-A-001               | | FIL-A-002               | | SEA-P-004           | |
| | PLC: RUN                | | PLC: WAIT_PART          | | PLC: ALARM          | |
| | OK / NG / CT / Model    | | OK / NG / CT / Model    | | OK / NG / CT        | |
| +-------------------------+ +-------------------------+ +---------------------+ |
+--------------------------------------------------------------------------------+
```

## GOT Modal

```text
+----------------------------------------------------------------+
| MES Menu                                  MC Status: RUN       |
+----------------------------------------------------------------+
| Machine: CNV-A-001 / Conveyor                                  |
| Area: Line A | Active Job: None                                |
+----------------------------------------------------------------+
| Maintenance              QC                  Production         |
| [MM Repair]              [QC]                [Cleaning]         |
| [MM Preventive]                                               |
+----------------------------------------------------------------+
| Status Control                                                 |
| [RUN] [Wait Part] [Brake Time] [Plan Stop] [WarmUp] [STOP]     |
| [sim_machine_alarm]                                            |
+----------------------------------------------------------------+
| Output OK | Output NG | Cycle Time | Model                     |
| [Auto Run ON/OFF] [Send Socket Now] [Close]                    |
+----------------------------------------------------------------+
```

## GOT Panel Machine Status Buttons

The GOT panel buttons are machine status buttons. They must not navigate to another page. When clicked, they update `plcStatus`, stop output when the selected status is not production-capable, and emit MMS socket payloads.

| GOT Button | `plcStatus` | Output | Job Request Relationship |
| --- | --- | --- | --- |
| `MM Repair` | `MM_REPAIR` | Stop | Job Request can show related repair event as overlay, but does not drive this status. |
| `MM Preventive` | `MM_PREVENTIVE` | Stop | Preventive event can be shown as overlay in the future. |
| `QC` | `QC` | Stop | QC job status can be shown as overlay when Job Request reaches QC. |
| `Cleaning` | `CLEANING` | Stop | Production cleaning event can be shown as overlay if needed. |

Panel action socket payloads include:

```json
{
  "gotStatusButton": "MM_REPAIR",
  "panelReason": "GOT_MACHINE_STATUS"
}
```
