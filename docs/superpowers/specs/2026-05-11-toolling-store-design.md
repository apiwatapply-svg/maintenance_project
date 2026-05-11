# Toolling & Store Feature Plan

## Goal

Build Toolling & Store as a factory spare-part inventory module first. The module should let authorized users request, receive, issue, return, adjust, and track spare parts while broadcasting important changes to other systems through Socket.IO.

Tool borrowing can be added later, but it is not the first priority. The first implementation should focus on accurate stock balance, stock movement, low-stock control, issue requests, and traceability by department, machine, PM task, or job request.

This plan is for design only. It does not include implementation changes.

## Current Project Context

- Frontend uses Next.js.
- Backend uses Node.js Express MVC.
- Database is MSSQL without ORM.
- Admin already manages departments, areas, machine types, machine numbers, users, and feature permissions.
- Existing user permissions include `toolingStore` with `none`, `user`, and `admin`.
- Socket.IO already exists and currently emits admin data change events.

## User Roles

### Toolling & Store User

- Can log in when `toolingStore` permission is `user` or `admin`.
- Can view allowed stock data.
- Can create issue requests.
- Can create spare-part issue requests.
- Can view own request and movement history.

### Toolling & Store Admin

- Can do everything a user can do.
- Can manage spare-part master data.
- Can approve or reject spare-part issue requests.
- Can perform stock in, stock out, return, and adjustment.
- Can view reports and all transaction history.

## Recommended Feature Set

### 1. Dashboard

Show the operational overview for the store:

- Total active items.
- Low stock items.
- Pending issue requests.
- Critical spare parts below minimum stock.
- Latest stock movement.
- Critical items that need replenishment.

Socket.IO should update dashboard cards when stock or request status changes.

### 2. Tooling Item Master

Manage all spare parts, consumables, and safety stock items. Tools that require borrow-return tracking should be treated as a later extension.

Fields:

- Item code.
- Item name.
- Category.
- Item type: `spare_part`, `consumable`, `safety_stock`.
- Unit.
- Minimum stock.
- Location/bin.
- QR code value.
- Status.

Filters:

- Search by item code or name.
- Category.
- Item type.
- Status.
- Location.
- Low stock only.

### 3. Location Master

Manage store locations, shelves, racks, or bins.

Fields:

- Location code.
- Location name.
- Description.
- Status.

Filters:

- Search.
- Status.

### 4. Supplier Master

Optional but useful for Stock In and reports.

Fields:

- Supplier code.
- Supplier name.
- Contact.
- Status.

Filters:

- Search.
- Status.

### 5. Stock Balance

Show current stock by item and location.

Important rule:

- Users should not directly edit stock balance.
- Balance changes must come from stock transactions: stock in, stock out, return, or adjustment.

Filters:

- Search by item.
- Category.
- Item type.
- Location.
- Low stock only.
- Status.

### 6. Stock In

Receive new items into stock.

Input methods:

- Scan QR code.
- Type or scan item code into a search input.
- Select item from searchable dropdown.

Flow:

1. User scans QR code or searches item.
2. System loads item detail and current balance.
3. User enters quantity, location, supplier, reference number, and remark.
4. System creates stock transaction.
5. System updates stock balance.
6. System emits `tooling:stock-changed`.
7. If item was low stock and now recovered, system emits a low-stock recovery event.

Validation:

- Quantity must be greater than zero.
- Item must be active.
- Location must be active.
- Duplicate reference number should be warned if configured.

### 7. Stock Out / Issue

Issue items to a user, department, machine, PM task, or job request.

Input methods:

- Scan QR code.
- Type or scan item code.
- Select item from searchable dropdown.

Flow:

1. User scans QR code or searches item.
2. System loads item detail, available quantity, and location.
3. User enters issue quantity and target use.
4. Target use can be:
   - Department.
   - Area.
   - Machine number.
   - Job request.
   - Preventive maintenance task.
   - General use.
5. System validates available stock.
6. System creates stock transaction.
7. System updates stock balance.
8. System emits `tooling:stock-changed`.
9. If stock is below minimum, system emits `tooling:low-stock`.

Validation:

- Quantity must be greater than zero.
- Stock must be sufficient.
- Admin can issue directly.
- User should create a request instead of direct issue unless the workflow allows user direct issue.

### 8. Issue Request and Approval

Allow users to request items before stock is issued.

Request status:

- `draft`.
- `pending`.
- `approved`.
- `rejected`.
- `issued`.
- `cancelled`.
- `pending_stock`.

Flow:

1. User creates request.
2. User adds one or more items.
3. Items can be selected by QR scan, item code input, or searchable dropdown.
4. User submits request.
5. Admin receives realtime event.
6. Admin approves or rejects.
7. If approved and stock is enough, admin can issue stock.
8. Stock movement is created only when issued.

Socket.IO events:

- `tooling:request-created`.
- `tooling:request-approved`.
- `tooling:request-rejected`.
- `tooling:request-issued`.

### 9. Return

Return unused spare parts after issue.

Return type:

- Spare part return.
- Tool return.
- Damaged return.
- Lost item report.

Flow:

1. Scan QR code or select item from searchable dropdown.
2. Select linked issue transaction when available.
3. Enter returned quantity and condition.
4. If condition is good, stock can return to available balance.
5. If condition is damaged or lost, stock should not return to available balance.
6. System emits `tooling:stock-changed`.

### 10. Borrow Tool Later Extension

Track tools that must be returned. This is useful, but it should be implemented after the spare-part inventory flow is stable.

Fields:

- Borrow number.
- Item.
- Borrower.
- Department.
- Machine or job reference.
- Borrow date.
- Due date.
- Return date.
- Status.

Status:

- `borrowed`.
- `returned`.
- `overdue`.
- `lost`.
- `damaged`.

Socket.IO events:

- `tooling:borrow-created`.
- `tooling:borrow-returned`.
- `tooling:borrow-overdue`.

### 11. Stock Adjustment

Adjust balance for stock count, damaged item, lost item, or correction.

Rules:

- Admin only.
- Must require reason.
- Must create transaction history.
- Should not overwrite balance without audit trail.

Adjustment types:

- Increase.
- Decrease.
- Set counted quantity.

### 12. Transaction History

Show every stock movement.

Movement types:

- Stock in.
- Stock out.
- Issue request.
- Return.
- Adjustment.
- Transfer.

Filters:

- Date range.
- Item.
- Movement type.
- Department.
- User.
- Location.
- Machine number.
- Job request reference.
- PM reference.

### 13. Reports

Recommended reports:

- Low stock report.
- Stock balance report.
- Stock movement report.
- Issue by department.
- Issue by machine.
- Issue by job request.
- Adjustment report.

Export can be added later after core CRUD and movement flow are stable.

## QR Code and Searchable Dropdown Design

Stock In, Stock Out, Return, and Request Item selection should support two input styles:

### QR Scan

- QR scanner can read item QR code into an input field.
- QR value maps to item code or dedicated QR code value.
- After scan, the system automatically fetches item detail.
- If item is not found, show a clear error.
- If multiple stock locations exist, ask user to select location.

### Searchable Dropdown

- Dropdown supports typing item code or item name.
- Shows useful context:
  - Item code.
  - Item name.
  - Available stock.
  - Unit.
  - Location.
  - Low stock badge when applicable.
- Should debounce search to reduce backend calls.
- Should support keyboard selection for fast store operation.

### Manual Code Input

- User can type item code manually.
- Pressing Enter should behave like scanning QR.
- This is important when scanner hardware is unavailable.

## Socket.IO Plan

Socket.IO should use feature-specific events and consistent payloads.

### Event Names

- `tooling:item-changed`
- `tooling:stock-changed`
- `tooling:request-created`
- `tooling:request-approved`
- `tooling:request-rejected`
- `tooling:request-issued`
- `tooling:low-stock`
- `tooling:stock-recovered`

### Recommended Payload Shape

```json
{
  "resource": "stock",
  "action": "issue",
  "id": 12,
  "itemId": 25,
  "itemCode": "SP-00025",
  "referenceType": "job_request",
  "referenceId": 104,
  "changedBy": 3,
  "changedAt": "2026-05-11T10:00:00.000Z"
}
```

### Consumers

MMS Dashboard:

- Listens for stock and low stock events.
- Refreshes dashboard counters.

Job Request:

- Listens for request-issued and stock-changed events when movement is linked to a job request.
- Shows whether parts were issued for a job.

Preventive Maintenance:

- Listens for stock events linked to PM references.
- Can warn if required parts are low before PM execution.

Admin:

- Emits master data changes.
- Toolling & Store should refresh dropdown data when department, area, machine, or user data changes.

## Database Plan

Use `tbm_` for master data and `tb_` for transaction/general data.

### Master Tables

- `tbm_tooling_category`
- `tbm_tooling_item`
- `tbm_tooling_location`
- `tbm_tooling_supplier`

### Transaction Tables

- `tb_tooling_stock_balance`
- `tb_tooling_stock_transaction`
- `tb_tooling_request`
- `tb_tooling_request_item`
- `tb_tooling_adjustment`

Later extension:

- `tb_tooling_borrow`

## API Plan

Base path suggestion:

- `/api/tooling`

Recommended endpoints:

- `POST /api/tooling/login` or reuse current login and permission check.
- `GET /api/tooling/dashboard`
- `GET /api/tooling/items`
- `POST /api/tooling/items`
- `PUT /api/tooling/items/:id`
- `DELETE /api/tooling/items/:id`
- `GET /api/tooling/stock`
- `POST /api/tooling/stock-in`
- `POST /api/tooling/stock-out`
- `POST /api/tooling/requests`
- `GET /api/tooling/requests`
- `PUT /api/tooling/requests/:id/approve`
- `PUT /api/tooling/requests/:id/reject`
- `PUT /api/tooling/requests/:id/issue`
- `POST /api/tooling/return`
- `POST /api/tooling/adjustment`
- `GET /api/tooling/transactions`
- `GET /api/tooling/reports/low-stock`
- `GET /api/tooling/reports/movement`

Later extension:

- `POST /api/tooling/borrow`
- `PUT /api/tooling/borrow/:id/return`

## Frontend Page Plan

All Toolling & Store pages should use the same layout:

- Sidebar that can collapse and expand.
- Header with current page title and logged-in user.
- Logout returns to `/`.
- Filters stored in localStorage.
- Pagination.
- Modals for create, edit, approve, reject, issue, return, and adjustment.
- Table headers centered.
- Action buttons aligned consistently.

Pages:

- `/tooling-store`
- `/tooling-store/items`
- `/tooling-store/stock`
- `/tooling-store/stock-in`
- `/tooling-store/stock-out`
- `/tooling-store/requests`
- `/tooling-store/return`
- `/tooling-store/transactions`
- `/tooling-store/reports`

Later extension:

- `/tooling-store/borrow`

## Implementation Phases

### Phase 1: Foundation

- Add database schema.
- Add backend tooling MVC structure.
- Add permission middleware/checking.
- Add unit tests for each endpoint group.
- Add Socket.IO tooling event helpers.

### Phase 2: Master and Stock Read

- Item master CRUD.
- Location master CRUD.
- Category master CRUD.
- Stock balance listing.
- Searchable dropdown API.
- QR/item lookup API.

### Phase 3: Stock Movement

- Stock In.
- Stock Out.
- Transaction history.
- Low stock event.
- Realtime dashboard refresh.

### Phase 4: Request and Approval

- Create request.
- Request item list.
- Approve/reject.
- Issue approved request.
- Link request to stock transaction.

### Phase 5: Reports

- Low stock.
- Movement.
- Issue by department/machine/job.
- Stock adjustment.

### Phase 6: Borrow and Return Later Extension

- Borrow tool.
- Return tool.
- Overdue status.
- Damaged/lost handling.
- Borrowed and overdue tools.

## Test Plan

Backend unit tests should cover:

- Permission checks for `none`, `user`, and `admin`.
- Item CRUD.
- Location CRUD.
- Category CRUD.
- Stock in validation.
- Stock out validation.
- Insufficient stock rejection.
- Request create/approve/reject/issue.
- Adjustment with required reason.
- Transaction history filters.
- QR/item lookup.
- Searchable dropdown result shape.
- Socket event emitted after stock/request changes.

Frontend unit tests should cover:

- Session guard.
- Permission-based navigation.
- Filter localStorage behavior.
- Pagination helper.
- QR/manual input item lookup behavior.
- Searchable dropdown selection behavior.

## Open Decision

The first priority is spare-part stock control.

Implementation should start with:

1. Spare-part item master.
2. Stock balance.
3. Stock In.
4. Stock Out.
5. Issue request and approval.
6. Return and adjustment.
7. Low-stock alerts and reports.

Borrow-return tool control should stay as a later extension after the inventory foundation is stable.
