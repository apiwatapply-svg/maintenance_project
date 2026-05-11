# Toolling Store Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 foundation for Toolling & Store spare-part inventory: database schema, backend MVC boundaries, permission checks, socket event helpers, and unit tests.

**Architecture:** Follow the existing Express MVC structure. Keep Toolling & Store in focused files under controllers, routes, services, repositories, and config without rewriting admin code. Use MSSQL SQL strings directly, no ORM.

**Tech Stack:** Node.js, Express, Jest, Supertest, MSSQL, Socket.IO, Next.js later phases.

---

## Files

- Create: `backend/src/config/toolingResources.js`
- Create: `backend/src/middlewares/requireToolingAccess.js`
- Create: `backend/src/repositories/toolingRepository.js`
- Create: `backend/src/services/toolingService.js`
- Create: `backend/src/controllers/toolingController.js`
- Create: `backend/src/routes/toolingRoutes.js`
- Modify: `backend/src/routes/index.js`
- Modify: `backend/src/services/socketService.js`
- Modify: `backend/database/schema.sql`
- Create: `backend/database/migrations/20260511_create_tooling_foundation.sql`
- Create: `backend/tests/toolingRoutes.test.js`
- Create: `backend/tests/toolingService.test.js`
- Create: `backend/tests/socketService.test.js`

## Task 1: Resource Config and Permission Middleware

- [ ] Write failing tests for tooling permission behavior.
- [ ] Implement `toolingResources.js` with allowed resource names.
- [ ] Implement `requireToolingAccess.js`.
- [ ] Verify middleware tests pass.

## Task 2: Socket Event Helper

- [ ] Write failing tests for Toolling socket event emission.
- [ ] Add `emitToolingChange(payload)` to socket service.
- [ ] Verify socket tests pass.

## Task 3: Tooling MVC Skeleton

- [ ] Write failing route tests for `/api/tooling/dashboard`, `/api/tooling/items`, and unknown resources.
- [ ] Add controller, service, repository, and routes.
- [ ] Register `/api/tooling`.
- [ ] Verify route tests pass.

## Task 4: Database Foundation

- [ ] Add idempotent migration for Toolling master and transaction foundation tables.
- [ ] Add the same tables to schema reset file.
- [ ] Include planning fields on `tbm_tooling_item` for later replenishment prediction.
- [ ] Verify backend tests still pass.

## Task 5: Final Verification

- [ ] Run backend unit tests.
- [ ] Run frontend unit tests to confirm no session regression.
- [ ] Build frontend only if frontend files changed.
- [ ] Commit Phase 1 changes.
