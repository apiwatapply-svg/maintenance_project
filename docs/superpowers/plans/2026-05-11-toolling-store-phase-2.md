# Toolling Store Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Toolling & Store master-data CRUD, stock read, searchable dropdown, and QR lookup APIs.

**Architecture:** Extend the Phase 1 Toolling MVC files without replacing the existing admin or Toolling foundation. Keep write APIs admin-only through `requireToolingAccess("admin")`, while read/search endpoints remain available to Toolling users.

**Tech Stack:** Node.js, Express, Jest, Supertest, MSSQL, Socket.IO in later write events.

---

## Files

- Modify: `backend/src/config/toolingResources.js`
- Modify: `backend/src/repositories/toolingRepository.js`
- Modify: `backend/src/services/toolingService.js`
- Modify: `backend/src/controllers/toolingController.js`
- Modify: `backend/src/routes/toolingRoutes.js`
- Modify: `backend/tests/toolingRoutes.test.js`
- Modify: `backend/tests/toolingService.test.js`

## Task 1: Route Tests

- [x] Add failing tests for master CRUD endpoints.
- [x] Add failing tests for admin-only writes.
- [x] Add failing tests for stock balance listing.
- [x] Add failing tests for searchable dropdown and QR lookup.

## Task 2: Resource Config

- [x] Add fields and required fields for items.
- [x] Add categories, locations, and suppliers resources.
- [x] Keep stock read-only in this phase.

## Task 3: Repository and Service

- [x] Add `getById`, `create`, `update`, and `remove`.
- [x] Add item dropdown search.
- [x] Add QR lookup by QR code or item code.
- [x] Add payload validation in service layer.

## Task 4: Routes and Controller

- [x] Add create/update/delete routes guarded by admin access.
- [x] Add `/api/tooling/items/search`.
- [x] Add `/api/tooling/items/qr/:qrCode`.
- [x] Preserve route order so search and QR routes are not captured by `/:resource/:id`.

## Task 5: Verification

- [ ] Run backend test suite.
- [ ] Run frontend test suite to check session regression.
- [ ] Commit Phase 2 changes.
