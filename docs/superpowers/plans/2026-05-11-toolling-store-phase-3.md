# Toolling Store Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stock movement APIs for Stock In, Stock Out, and transaction history reads.

**Architecture:** Extend the existing Toolling MVC files. Keep stock movement writes admin-only, preserve read access for users, and record every movement in `tb_tooling_stock_transaction` while updating `tb_tooling_stock_balance` inside MSSQL transactions.

**Tech Stack:** Node.js, Express, Jest, Supertest, MSSQL, Socket.IO.

---

## Files

- Modify: `backend/src/controllers/toolingController.js`
- Modify: `backend/src/repositories/toolingRepository.js`
- Modify: `backend/src/routes/toolingRoutes.js`
- Modify: `backend/src/services/toolingService.js`
- Modify: `backend/tests/toolingRoutes.test.js`
- Modify: `backend/tests/toolingService.test.js`

## Task 1: Red Tests

- [x] Add route tests for `POST /api/tooling/stock-in`.
- [x] Add route tests for `POST /api/tooling/stock-out`.
- [x] Add route tests for admin-only stock movement writes.
- [x] Add route tests for invalid quantity and insufficient stock.
- [x] Add service tests for realtime events after stock movement.
- [x] Add transaction history read test through `GET /api/tooling/transactions`.

## Task 2: Service

- [x] Validate `itemId`, `locationId`, and positive `quantity`.
- [x] Generate transaction numbers with `TIN` and `TOUT` prefixes.
- [x] Call repository stock movement methods.
- [x] Emit `tooling:data-changed` through `emitToolingChange`.

## Task 3: Repository

- [x] Implement `stockIn` with MSSQL transaction.
- [x] Implement `stockOut` with MSSQL transaction.
- [x] Update or insert stock balance for stock in.
- [x] Reject insufficient stock for stock out.
- [x] Insert stock transaction history for both movement types.

## Task 4: Routes

- [x] Add `/api/tooling/stock-in` before dynamic resource routes.
- [x] Add `/api/tooling/stock-out` before dynamic resource routes.
- [x] Guard both routes with `requireToolingAccess("admin")`.

## Task 5: Verification

- [ ] Run backend test suite.
- [ ] Run frontend test suite for regression.
- [ ] Commit and push Phase 3 because this branch is not `main`.
