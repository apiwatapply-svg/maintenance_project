# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

This is a factory maintenance management project with a split frontend/backend structure.

- `frontend/`: Next.js App Router, React, Tailwind CSS, Axios, Recharts, Socket.IO client, SweetAlert2.
- `backend/`: Node.js, Express MVC, Socket.IO, Microsoft SQL Server via `mssql`.
- `docs/`: feature requirements and planning notes.
- `.github/workflows/ci.yml`: CI for backend tests, frontend tests, and frontend build.

The application currently covers these major features:

- Home portal and system login pages.
- Admin mode: user, department, area, machine type, machine no, employee master data.
- Tooling & Store: tools, spare part stock, transactions, calibration, reports.
- Job Request: production request, maintenance repair, QC inspection, handover, dashboards.
- Preventive Maintenance: PM type/checklist setup, plans, inspections, reports.
- MMS Dashboard: machine monitoring, simulation, machine working, overall machine working, reports.

## Non-Negotiable Rules

- Do not change backend APIs unless the user explicitly asks for API changes.
- Do not change database schema unless the user explicitly asks for schema changes.
- Do not change business logic when the task is UI-only.
- Do not remove existing routes or features.
- Do not use Bootstrap.
- Do not add an ORM. Use `mssql` directly.
- Do not create frontend hard-coded mock data for connected features. If test/demo data is needed, seed or insert it through MSSQL/backend flows.
- Use Tailwind CSS for application pages and components, with a factory operation theme suitable for real industrial systems. The home page and login pages may keep their existing special styling unless the user asks to refactor them.
- Use Axios for frontend/backend HTTP calls.
- Use SweetAlert2 for user success/error/confirm dialogs.
- Use the shared `SearchableDropdown` pattern for dropdowns that users search or select from.
- Use Socket.IO for realtime updates where a feature changes state that another page should know about.
- Keep date/time storage and backend calculations UTC where applicable; show local time in the UI.

## Repository Layout

```text
backend/
  server.js
  src/
    app.js
    socket.js
    config/
    controllers/
    middlewares/
    repositories/
    routes/
    services/
  tests/
  images/

frontend/
  src/
    app/
    components/
    lib/
  public/
  tests/

docs/
.github/workflows/
```

## Commands

Run from the relevant subdirectory.

```bash
cd backend
npm run dev
npm test
```

```bash
cd frontend
npm run dev
npm test
npm run build
```

Backend dev must run with:

```bash
node --watch server.js
```

The backend default port is `5000`; frontend default port is `3000`.

## CI

The CI workflow runs:

- `backend`: `npm ci`, `npm test`
- `frontend`: `npm ci`, `npm test`, `npm run build`

Before pushing or opening a PR, run the relevant tests locally. For broad changes, run all three:

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npm run build
```

Do not commit generated reports or local test artifacts.

## Generated Files And Ignore Policy

Do not commit:

- `node_modules/`
- `.next/`
- `.npm-cache/`
- `.qa/`
- `screenshots/`
- `output/`
- `frontend/test-results/`
- Playwright reports/caches generated at repo root.

Do not create a root-level `package.json` or `package-lock.json` for this project unless the repository is intentionally being converted to a root workspace. A root lockfile can make Next.js infer the wrong workspace root.

## Backend Architecture

The backend follows Express MVC:

- `routes/`: route definitions under `/api`.
- `controllers/`: request/response orchestration.
- `repositories/`: SQL Server access through `mssql`.
- `config/`: resource maps, schema/seed helpers, status constants.
- `services/`: validation/calculation helpers.
- `middlewares/`: upload, error, and not-found handlers.

Main route prefixes:

- `/api/admin`
- `/api/auth`
- `/api/health`
- `/api/job-requests`
- `/api/mms`
- `/api/preventive`
- `/api/tooling`

Database connection config is in `backend/src/config/database.js` and reads:

- `DB_USER`
- `DB_PASSWORD`
- `DB_SERVER`
- `DB_DATABASE`
- `DB_PORT`
- `DB_ENCRYPT`
- `DB_TRUST_SERVER_CERTIFICATE`

Environment files are loaded from `backend/.env.local` first and `backend/.env` second.

## Database Conventions

- Master tables must start with `tbm_`.
- Transaction/general data tables must start with `tb_`.
- Use SQL Server `DATETIME2` and `SYSUTCDATETIME()` for UTC timestamps.
- Avoid ad hoc schema edits inside UI work.
- Keep resource maps and tests aligned when adding/changing resources.
- Existing master/resource examples:
  - Admin: `tbm_user`, `tbm_department`, `tbm_area`, `tbm_machine_type`, `tbm_machine_no`, `tbm_employee`
  - Tooling master: `tbm_tooling_category`, `tbm_tooling_location`, `tbm_tooling_unit`
  - Tooling transactions: `tb_tooling_*`
  - PM master: `tbm_pm_type`, `tbm_pm_checklist_item`
  - PM transactions: `tb_pm_*`

## Realtime Rules

Socket setup is centralized in `backend/src/socket.js`.

Use these patterns:

- Job Request section rooms: `production_room`, `maintenance_room`, `qc_room`.
- Generic feature rooms: `feature:scope`, via `getFeatureRoom(feature, scope)`.
- MMS emits:
  - `mms:machine-status-changed`
  - `mms:machine-output-changed`
  - `mms:machine-alarm-changed`

When a backend action changes state that another page needs, emit an event from the controller/service path after the database write succeeds. Do not emit fake frontend-only state for connected workflows.

## Frontend Architecture

The frontend uses Next.js App Router.

Important shared files:

- `frontend/src/lib/api.js`: Axios instance and backend asset URL helper.
- `frontend/src/lib/session.js`: localStorage session rules and guards.
- `frontend/src/components/SearchableDropdown.js`: searchable dropdown component.
- `frontend/src/components/ProtectedWorkspaceShell.js`: protected layout/session shell.
- `frontend/src/components/AppFooter.js`: shared footer.
- `frontend/src/lib/*Config.js`: page configs, status rules, table columns, helpers.
- `frontend/src/lib/*Realtime.js`: Socket.IO client helpers.

Feature shell components:

- `AdminResourcePage.js`
- `ToolingStoreShell.js`
- `JobRequestShell.js`
- `PreventiveMaintenanceShell.js`
- `MmsDashboardShell.js`
- `MmsSimulationShell.js`

Prefer extending existing shells and config files over creating unrelated page-specific patterns.

## UI / UX Rules

- Style application pages with Tailwind classes using an industrial/factory theme: compact spacing, strong hierarchy, restrained colors, readable tables, clear badges, and practical monitoring layouts.
- Keep a factory operation system style:
  - dark sidebar
  - light gray workspace background
  - white cards
  - subtle borders and shadows
  - compact filters and tables
  - clear status badges
  - readable dashboard charts
- Avoid marketing landing-page layouts for operational screens.
- Avoid decorative or excessive animation.
- Keep sidebars collapsible where the feature uses a workspace layout.
- Collapsed sidebars must not introduce horizontal scrollbars.
- Use modals for create/edit flows unless the requirement says otherwise.
- Use confirmation dialogs for destructive or state-changing actions.
- Success dialogs should auto-close after about 1.5 seconds when appropriate.
- Filters should remember useful user choices in localStorage.
- Tables should include a user-facing `No` column where requested, pagination, clear headers, and compact action buttons.
- Dropdowns that select existing data should be searchable and full-width in their field.
- Numeric fields must use numeric inputs and validation; do not allow arbitrary text.
- Every feature change must include or update unit tests for the changed unit. Do not skip tests just because the change looks small.

## Login And Session Rules

Most feature pages require login. MMS dashboard pages are intentionally accessible without login unless the user says otherwise.

Session config is in `frontend/src/lib/session.js`:

- `admin`
- `pm`
- `store`
- `job`

Logout should return to `/`.

If a user is already logged in, the app should prevent returning to the home/login page for that feature and redirect to the appropriate home page.

Known demo login pattern:

- Main super admin: username `admin`, password `admin`
- Section admin users may use username pattern such as `mmadmin`, `qcadmin`, `prodadmin`, `tolladmin` with password `admin` if seeded.

Do not hard-code passwords into UI logic. Use backend auth/session flows.

## Feature Notes

### Admin

Admin resources are config-driven in both backend and frontend.

Sidebar groups:

- Access: Users
- Master Data: Departments, Area, Machine Type, Machine No
- Employee Data: Employee Data

Create/edit should use modals. Employees support image upload stored by the backend under `backend/images/...`.

### Tooling & Store

Focus is maintenance inventory/tool control.

Important flows:

- tool master
- spare part stock
- stock in / stock out
- borrow / return
- calibration update
- movement history
- reports

Calibration status should be derived from next calibration date and interval. Only show calibration action where it makes sense.

### Job Request

The workflow is role-based:

- Production creates requests and confirms machine readiness.
- Maintenance accepts and repairs.
- QC inspects when routed.
- Handover supports shift continuation.

Requests can have multiple problems and repair actions, including Other. State changes should produce history and realtime notification to the target section.

Sorting rule: higher priority first; if same priority, older request first.

### Preventive Maintenance

Supports:

- PM type master
- checklist builder
- mapping machines to multiple PM types
- PM plans
- inspection and history
- reports

Checklist item editing should avoid nested modal confusion. If the UI requires multiple editing layers, prefer a dedicated page or a single clear modal flow.

### MMS Dashboard

MMS pages are monitoring pages and do not require login by default.

MMS statuses include:

- `RUN`
- `WAIT_PART`
- `BRAKE_TIME`
- `PLAN_STOP`
- `WARM_UP`
- `MM_REPAIR`
- `MM_PREVENTIVE`
- `QC`
- `CLEANING`
- `ALARM`
- `STOP`

Output should be blocked for non-running statuses and active alarm. MMS machine status comes from the MMS/GOT simulation; Job Request can provide event context, but should not randomly override machine status unless the feature explicitly requires it.

Working day display is local `07:00` to next-day `07:00`. Shifts are:

- A: `07:00-15:00`
- B: `15:00-23:00`
- C: `23:00-07:00`

Charts should use Recharts when possible. Keep dashboard cards compact enough for factory monitoring screens.

## Testing Guidelines

Backend tests live in `backend/tests/*.test.js` and use Node's built-in test runner.

Frontend tests live in `frontend/tests/*.test.mjs` and use Node's built-in test runner.

When adding behavior:

- Always add or update unit tests for the changed unit.
- Add or update tests near the feature config/helper/repository.
- Cover endpoint/resource config behavior where applicable.
- Cover realtime event names/room mapping for socket changes.
- Cover date/time calculations, status transitions, sorting, filtering, and pagination helpers.
- For UI-only refactors, still run frontend tests and build.

## Git Workflow

- Work on feature branches, normally `feature/<name>`.
- Do not commit generated files or local screenshots.
- Stage explicit files only.
- Before push/PR, run relevant tests and build.
- PR target is normally `main`.
- If GitHub CLI auth fails, push the branch and provide the compare URL:

```text
https://github.com/apiwatapply-svg/maintenance_project/compare/main...<branch>?expand=1
```

## Agent Behavior For This Repo

When making changes:

1. Read the relevant requirement document in `docs/` if the task touches a feature workflow.
2. Inspect existing component/config/repository patterns before editing.
3. Keep changes scoped to the requested feature.
4. Prefer reusable config/helper changes over copy-paste UI logic.
5. Do not rewrite large files from scratch unless explicitly requested.
6. Preserve existing user changes in the working tree.
7. Verify with tests/build before claiming completion.
8. Mention anything not run or any blocker clearly.
