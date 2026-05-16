# Test Topics And Execution Checklist

Last updated: 2026-05-16

This document is the project-wide test map for unit and end-to-end coverage. It lists what should be tested for every major feature, which automated checks currently cover the topic, and the latest local execution result.

## Test Policy

- Unit tests cover config, helper, repository, validation, calculation, routing metadata, realtime event names, and role rules.
- E2E tests cover user-facing workflows through frontend pages, backend APIs, MSSQL-backed data, and Socket.IO where relevant.
- Realtime MMS values must flow through Socket.IO first. MSSQL is the source for closed-hour history and reports.
- New connected features must not rely on frontend mock data.
- Before push, run backend tests, frontend tests, and frontend build for broad changes.

## Feature Topic Matrix

| Feature | Unit Test Topics | E2E Test Topics |
| --- | --- | --- |
| Home portal and sessions | Home route links, login-route redirects, session guard rules, logout destinations, API base URL helper | Open home, enter each login, verify protected redirects, verify logout returns to `/`, verify already-logged-in users cannot return to login |
| Authentication and role access | Seeded users, feature scopes, role home paths, section permission matrix | Login as `admin`, `mmadmin`, `prodadmin`, `qcadmin`, `tooladmin`; verify allowed and blocked pages |
| Admin mode | Resource maps, `tbm_` table mapping, pagination, query filters, employee image middleware, upload path handling | CRUD Users, Departments, Area, Machine Type, Machine No, Employee; upload employee image; verify changes feed dropdowns in Job Request, PM, Tooling, MMS |
| Common factory master | Area, line, section, team, responsible group, employee, machine type, machine no reference behavior | Create or update master values once, then verify every feature uses the same values from backend/MSSQL |
| Tooling and Store | Tooling resource config, table prefixes, payload validation, negative stock guard, numeric parsing, calibration next-date and status calculations | Tool master CRUD, spare stock CRUD, stock in, stock out, borrow, return, calibration update, movement history, report filters |
| Job Request | Schema statements, status list, multi-problem/action fields, document number, priority sorting, dashboard summary, realtime rooms | Production creates request, Maintenance accepts/repairs, QC inspects/accepts/rejects, Production confirms readiness, handover continues job, dashboard updates, MMS overlay receives socket context |
| Preventive Maintenance | PM schema, PM type/checklist config, machine-to-multiple-PM mapping, UTC timestamps, pagination, status tones | PM type CRUD, checklist builder, machine mapping, plan creation, inspection submit, history, reports, shared PM master values in Admin where needed |
| MMS Dashboard and Simulation | Status gate, payload shape, current working day, current-hour initialization from closed MSSQL history, hourly buffer flush, report matrix, overview filters, graph/table helper calculations | Simulation opens from MSSQL machine master, initializes from closed-hour MSSQL history plus current-hour elapsed production, emits all telemetry via Socket.IO, dashboard opened later receives snapshot, graph/table/machine-working use MSSQL history plus live socket values |
| MMS realtime and Socket.IO | MMS event names, snapshot request event, feature rooms, hourly buffer, closed-hour flush, job-request event listener list | Change output/status/alarm/model/CT in Simulation and verify Dashboard, Overall Working, Machine Working, Graph Report, Table Report update without page refresh |
| Reports and calculations | Availability, performance, quality, OEE, NG rate, target/output accumulation, date period columns | Verify daily/monthly/yearly reports against seeded MSSQL rows and current working day boundary 07:00-07:00 |
| SweetAlert and common UI helpers | Success auto-close, confirm dialog labels, reusable query builders, pagination helpers | Destructive actions show confirm, successful mutations auto-close, errors display backend messages |
| Backend health and infrastructure | DB config reset, health route, CI command parity, seed scripts | Backend health returns ok, e2e seed command prepares deterministic data, CI-equivalent local test/build passes |

## Automated Unit Execution

| Order | Topic | Command | Latest Result |
| --- | --- | --- | --- |
| 1 | Backend admin resource mapping | `cd backend && node --test tests/adminResources.test.js` | Passed 2026-05-16, 3 tests |
| 2 | Backend auth scope rules | `cd backend && node --test tests/authController.test.js` | Passed 2026-05-16, 1 test |
| 3 | Backend database config | `cd backend && node --test tests/databaseConfig.test.js` | Passed 2026-05-16, 1 test |
| 4 | Backend e2e seed data | `cd backend && node --test tests/e2eSeedData.test.js` | Passed 2026-05-16, 5 tests |
| 5 | Backend employee image upload | `cd backend && node --test tests/employeeImageUpload.test.js` | Passed 2026-05-16, 2 tests |
| 6 | Backend job request repository | `cd backend && node --test tests/jobRequestRepository.test.js` | Passed 2026-05-16, 9 tests |
| 7 | Backend job request sockets | `cd backend && node --test tests/jobRequestSocket.test.js` | Passed 2026-05-16, 2 tests |
| 8 | Backend MMS machine seed | `cd backend && node --test tests/mmsMachineSeed.test.js` | Passed 2026-05-16, 3 tests |
| 9 | Backend MMS simulation and realtime | `cd backend && node --test tests/mmsSimulation.test.js` | Passed 2026-05-16, 15 tests |
| 10 | Backend preventive resources | `cd backend && node --test tests/preventiveResources.test.js` | Passed 2026-05-16, 7 tests |
| 11 | Backend tooling resources | `cd backend && node --test tests/toolingResources.test.js` | Passed 2026-05-16, 7 tests |
| 12 | Backend tooling validation | `cd backend && node --test tests/toolingValidation.test.js` | Passed 2026-05-16, 8 tests |
| 13 | Frontend admin config | `cd frontend && node --test tests/adminResources.test.mjs` | Passed 2026-05-16, 5 tests |
| 14 | Frontend job request config | `cd frontend && node --test tests/jobRequestConfig.test.mjs` | Passed 2026-05-16, 13 tests |
| 15 | Frontend MMS simulation/dashboard helpers | `cd frontend && node --test tests/mmsSimulation.test.mjs` | Passed 2026-05-16, 30 tests |
| 16 | Frontend preventive config | `cd frontend && node --test tests/preventiveConfig.test.mjs` | Passed 2026-05-16, 3 tests |
| 17 | Frontend SweetAlert helpers | `cd frontend && node --test tests/swalHelpers.test.mjs` | Passed 2026-05-16, 4 tests |
| 18 | Frontend tooling config | `cd frontend && node --test tests/toolingResources.test.mjs` | Passed 2026-05-16, 14 tests |
| 19 | Full backend unit suite | `cd backend && npm test` | Passed 2026-05-16, 64 tests |
| 20 | Full frontend unit suite | `cd frontend && npm test` | Passed 2026-05-16, 70 tests |
| 21 | Frontend production build | `cd frontend && npm run build` | Passed 2026-05-16 |

## E2E Execution Topics

| Order | Topic | Current Automation | Latest Result |
| --- | --- | --- | --- |
| 1 | Backend health smoke | `GET http://localhost:5000/api/health` | Passed 2026-05-16, HTTP 200 |
| 2 | Frontend route smoke for all App Router pages | `GET http://localhost:3000/<route>` for public and protected routes | Passed 2026-05-16, 27 routes; `/job-request` returns expected redirect 307 |
| 3 | MMS Socket.IO telemetry smoke | Socket client emits MMS payload and listener receives all telemetry fields | Passed 2026-05-16, received machine/status/output/NG/CT/model/canProduceOutput |
| 4 | MMS snapshot smoke | Simulation page receives a value, Dashboard opened later receives it through `mms:snapshot-request` | Passed 2026-05-16, Dashboard received `MODEL-D`, `OK 444,444`, `NG 55` |
| 5 | Full feature E2E workflow | `node scripts/run_full_e2e_checks.js` against local backend/frontend/MSSQL | Passed 2026-05-16, 9/9 topics |
| 6 | Frontend source mock scan | `rg "mock\|Mock\|demo\|dummy\|fixture"` against `frontend/src` | Passed 2026-05-16, no frontend source mock data remains |
| 7 | CI parity | Backend suite, frontend suite, frontend build | Passed 2026-05-16 |

## Latest Execution Notes

- Backend dev server was started with `node --watch server.js` on port 5000 for E2E smoke checks.
- Frontend dev server was started with `npm run dev -- -p 3000` on port 3000 for route and browser checks.
- Route smoke covered home, admin, job request, MMS dashboard, preventive maintenance, and tooling store pages.
- MMS Socket.IO telemetry smoke confirmed live payload propagation without using MSSQL as the realtime state store.
- MMS snapshot smoke confirmed a dashboard opened after the simulator still receives current simulator values through `mms:snapshot-request`.
- Full feature E2E passed 9/9 topics: health, role matrix, MMS MSSQL API, admin CRUD, tooling stock/borrow/calibration, job request workflow, preventive workflow, MMS realtime payload, and protected frontend routes.
- Frontend connected source no longer carries `mock*` tooling data. Preventive uses empty initial state until `/api/preventive/bootstrap` returns backend data.

## Remaining E2E Depth To Add

These are deeper browser-level checks that can be added after the current API/browser E2E runner.

| Priority | Feature | E2E Scenario |
| --- | --- | --- |
| P1 | Admin/Common Master | Browser-create master data once and verify it appears in Job Request, PM, Tooling, and MMS dropdowns |
| P1 | Job Request + MMS | Browser-create active job and verify MMS card shows job overlay without overriding PLC/GOT status |
| P1 | MMS | Open Simulation at mid-hour, verify closed-hour MSSQL values plus current elapsed output, then verify Dashboard snapshot on every MMS page |
| P2 | Preventive | Browser-create PM type/checklist/mapping -> generate plan -> submit inspection -> report history |
| P2 | Tooling | Browser stock in -> stock out -> borrow -> return -> movement report -> low stock state |
| P2 | Tooling Calibration | Browser update calibration, calculate next date/status, verify due-soon/expired report |
| P2 | Reports | Compare daily/monthly/yearly report UI values against seeded MSSQL aggregates |
| P3 | UI guardrails | Sidebar collapse, filters localStorage, responsive route smoke, no horizontal overflow on monitoring pages |
