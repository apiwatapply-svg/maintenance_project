# Audit Report: Feature Admin & Tooling Store

**Date:** 2026-05-12
**Scope:** `backend/src/` (Controllers, Services, Routes, Configs)

This document provides a technical audit of the **Admin** and **Tooling Store** features based on the backend implementation. No code has been modified during this audit.

---

## 1. Feature: Admin (`adminResources`, `adminService`, `adminController`, `adminRoutes`)

The Admin feature serves as the central management hub for master data and user access control. 

### Key Capabilities
- **Master Data Management (Dynamic CRUD):** Uses a dynamic `/:resource` endpoint structure to handle full CRUD operations for multiple entities including `departments`, `areas`, `machine-types`, `machine-numbers`, and `users`.
- **Authentication:** Provides a local login endpoint (`POST /login`) that verifies user credentials and issues an `admin-local-token`.
- **Role-Based Access Control (RBAC):** Manages user roles (`admin`, `user`, `none`) and granular feature-level permissions (`preventiveMaintenance`, `toolingStore`, `jobRequest`, `adminMode`).
- **Data Validation & Sanitization:** Centralized field validation through `assertPayload` to ensure required fields are present before database operations.
- **Real-time Notifications:** Integrates with `socketService` (`emitAdminChange`) to broadcast `create`, `update`, and `delete` events across the system.

### Security & Architecture Observations
- Roles and permissions are parsed from JSON strings.
- Standardized error handling with specific HTTP status codes (e.g., 400 for bad requests, 404 for not found).
- Dynamic routing reduces code duplication but requires strictly defined configuration mappings (`adminResources.js`).

---

## 2. Feature: Tooling Store (`toolingRoutes`, `toolingService`, `toolingController`)

The Tooling Store is a highly comprehensive inventory and supply chain management module. It tracks items, manages stock movements, and generates intelligent reordering suggestions.

### Key Capabilities
- **Inventory & Item Management:**
  - Search and lookup via standard text search or QR Code (`/items/qr/:qrCode`).
  - Supports image uploads for item catalogs.
- **Stock Movements (In/Out/Return):**
  - **Stock In & Out:** Generates unique transaction numbers (`TIN-`, `TOUT-`). Validates active items and locations.
  - **Return System:** Tracks returnable quantities and categorizes returns by condition (`good`, `damaged`, `lost`). Generates `TRTN-` transactions.
  - Emits real-time socket events for stock changes, including low-stock alerts (`tooling:low-stock`) and recovery alerts (`tooling:stock-recovered`).
- **Tooling Requests Workflow:**
  - Complete lifecycle: `Pending` -> `Approved`/`Rejected` -> `Issued`.
  - Tracks the requester (`requesterId`) and approver. 
  - Generates request numbers (`REQ-`) and issue transaction numbers (`TREQ-`).
- **Intelligent Planning & Reporting:**
  - Contains an advanced planning algorithm (`calculatePlanningRow`) that calculates:
    - Average Daily Usage based on lookback days.
    - Reorder Point & Suggested Order Quantity (considering Safety Stock & Maximum Stock).
    - Days until stockout.
  - Categorizes inventory status dynamically: `overstock`, `dead_stock`, `critical_slow_movement`, `slow_movement`, `stockout_risk`, `need_order`, `reorder_soon`.
  - Comprehensive reporting endpoints (`/reports/:reportKey`) for issues by department/machine, movement logs, and stockout risks.
- **Dashboard Data Aggregation:** Builds movement charts grouping stock-in and stock-out totals dynamically by year-month.

### Security & Architecture Observations
- Uses custom middleware (`requireToolingAccess`) to enforce strict authorization. Most transactional operations (Stock In/Out, Approve/Reject, Return) require an `admin` role, while `user` can access read-only routes and create requests.
- Extensive numerical validation (e.g., ensuring quantities are greater than zero, returns do not exceed issued amounts).
- Heavily relies on socket emissions to keep clients completely synchronized with warehouse states.

---
**Summary:** Both features are well-structured, utilizing dynamic resource management and real-time socket integrations. The Tooling Store is notably complex, incorporating automated inventory planning and robust lifecycle states for supply requests.
