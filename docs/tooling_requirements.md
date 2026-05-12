---
trigger: always_on
---

# Tooling Store System Requirements

## Version

**Version:** Simple Version / MVP
**Purpose:** A basic system for managing tools, equipment, spare parts, consumable stock items, borrowing, returning, stock movement, calibration tracking, dashboard alerts, and simple reports.
**Main Users:** Admin, Store Keeper, User

---

# 1. Project Overview

## 1.1 Objective

The Tooling Store System is designed to manage tools, equipment, consumable items, and measuring instruments in a factory, maintenance department, or tooling room.

This simple version focuses on essential features that are easy to understand, easy to develop, and practical for daily use.

The system should help users to:

- Manage tool master data
- Manage spare part / consumable master data
- Check tool availability
- Borrow and return tools
- Control stock in and stock out
- Check stock balance
- Track stock movement history
- Track calibration due dates
- Display important alerts on the dashboard
- Search and filter data easily
- Export basic reports to Excel

---

# 2. System Scope

## 2.1 Features Included in This Version

This simple version includes the following modules:

1. Dashboard
2. Tool Master / Tool List
3. Spare Part / Consumable Master
4. Borrow / Return
5. Stock In / Stock Out
6. Stock Balance
7. Movement History
8. Calibration Management
9. QR Code / Barcode Basic Function
10. User & Role Basic Function
11. Notification / Alert on Dashboard
12. Basic Reports
13. Search & Filter

## 2.1.1 Requirement Change: Separate Tools From Spare Parts

Tooling & Store must clearly separate **borrowable tools** from **spare parts / consumables**.

### A. Tool Master

Tool Master is for items that are tracked individually and normally returned after use.

Examples:

- Torque wrench
- Dial gauge
- Vernier caliper
- Hand tools
- Special tools

Main flow:

- Add / edit / delete tool master
- Check availability
- Borrow tool
- Return tool
- Track overdue borrow
- Track calibration if required

### B. Spare Part / Consumable

Spare Part / Consumable is for stock items that are consumed, installed, or issued from inventory.

Examples:

- Bearing
- Sensor
- Bolt / nut
- Grease
- Tape
- Pneumatic fitting

Main flow:

- Add / edit / delete spare part master
- Receive stock in
- Issue stock out
- Check stock balance
- Track movement history
- Alert low stock / over stock
- Export report to Excel

### C. Data Ownership Rule

Do not duplicate master data that already belongs to Admin Mode.

Reuse from Admin Mode:

- User
- Department
- Employee
- Area
- Machine Type
- Machine No

Tooling & Store owns only tooling-specific master data:

- Tool Category
- Store Location
- Unit
- Tool Master
- Spare Part / Consumable Master
- Stock Movement
- Calibration records

## 2.2 Features Not Included in This Version

The following features are not included in this simple version and can be developed in future phases:

- Advanced approval workflow
- Detailed audit log for every field change
- Email notification
- LINE notification
- SMS notification
- PDF export
- Mobile application
- ERP integration
- Advanced dashboard charts
- Repair cost report
- Advanced Excel import function
- Multi-level permission control

---

# 2.3 Implementation Plan After Requirement Change

## Phase 1: Tooling Foundation

Purpose: Prepare database, API, and UI structure without duplicating Admin Mode data.

Pages:

- Dashboard
- Tool List
- Spare Part / Consumable
- Categories
- Locations
- Units

Backend:

- `tbm_tooling_category`
- `tbm_tooling_location`
- `tbm_tooling_unit`
- `tb_tooling_tool`
- `tb_tooling_spare_part`

Rules:

- All dropdown fields must be searchable dropdowns.
- Add and edit must open modal.
- Use Tailwind CSS only for UI.
- Use axios for API calls.
- Use SweetAlert2 for alert and confirm.

## Phase 2: Tool Borrow / Return

Purpose: Manage borrowable tools.

Pages:

- Borrow Request
- Borrow / Issue Tool
- Return Tool
- Overdue Borrow

Backend:

- `tb_tooling_borrow_request`
- `tb_tooling_borrow_transaction`
- `tb_tooling_return_transaction`

Rules:

- Borrow only tools with status `Available`.
- Return only tools that are currently borrowed.
- Overdue is calculated from due date.
- QR / barcode input must support scan or typed searchable input.

## Phase 3: Spare Part Stock In / Stock Out

Purpose: Manage spare part inventory.

Pages:

- Stock In
- Stock Out
- Stock Balance

Backend:

- `tb_tooling_stock_in`
- `tb_tooling_stock_out`
- `tb_tooling_stock_balance`

Rules:

- Receive quantity and issue quantity must be numeric only.
- Default quantity after scan is `1`.
- Stock out cannot exceed available balance.
- Low stock is current stock less than minimum stock.
- Over stock is current stock greater than maximum stock.

## Phase 4: Movement History

Purpose: Show transaction log for inventory and tool movement.

Pages:

- Movement History

Backend:

- `tb_tooling_movement_history`

Rules:

- Store stock in, stock out, borrow, return, adjustment, and calibration movement.
- Use pagination and load only current page.
- Use filters and remember filter values in localStorage.

## Phase 5: Calibration

Purpose: Track measuring tools and calibration due dates.

Pages:

- Calibration List
- Calibration Due Soon
- Calibration Expired

Backend:

- `tb_tooling_calibration`

Rules:

- Due soon means next calibration date is within 30 days.
- Expired means next calibration date is before current date.
- Date storage uses UTC.
- UI display uses local time.

## Phase 6: Reports

Purpose: Export operational reports.

Pages:

- Reports

Reports:

- Tool List
- Spare Part List
- Stock Balance
- Low Stock
- Over Stock
- Borrow History
- Overdue Borrow
- Calibration Due Soon
- Calibration Expired
- Movement History

Rules:

- Export Excel only.
- Excel columns must fit content.
- Excel must have table borders.

---

# 3. User Roles

This version includes 3 user roles:

1. Admin
2. Store Keeper
3. User

## 3.1 Admin

Admin is the system administrator who can manage all system data and settings.

### Admin Permissions

Admin can:

- Log in to the system
- Manage users
- Manage tool master data
- Manage stock items
- Create borrow transactions
- Create return transactions
- Create stock in transactions
- Create stock out transactions
- Manage calibration records
- View dashboard
- View reports
- Export reports to Excel
- Manage basic settings such as category, location, unit, and department

## 3.2 Store Keeper

Store Keeper is the main user who manages the tooling store, tool issue, tool return, stock receiving, and stock issuing.

### Store Keeper Permissions

Store Keeper can:

- Log in to the system
- View dashboard
- View tool list
- Add tools
- Edit tools
- View tool details
- Create borrow transactions
- Create return transactions
- Add stock items
- Create stock in transactions
- Create stock out transactions
- Manage calibration records
- View reports
- Export reports to Excel

## 3.3 User

User is a general system user who can view tool information and request tool borrowing.

### User Permissions

User can:

- Log in to the system
- View dashboard summary
- View tool list
- View tool details
- Search and filter tools
- Check tool availability
- Request to borrow tools
- View own borrow history

---

# 4. System Modules

The system contains the following main modules:

```text
Dashboard
Tool Management
Borrow / Return
Stock Management
Calibration
QR Code / Barcode
Reports
Settings
```

---

# 5. Dashboard Module

## 5.1 Purpose

The Dashboard module displays the overall status of the tooling store. It helps Admin, Store Keeper, and User quickly understand tool availability, stock status, and important alerts.

## 5.2 Dashboard Summary Cards

The dashboard must display the following summary cards:

| Card                 | Description                                        |
| -------------------- | -------------------------------------------------- |
| Total Tools          | Total number of tools in the system                |
| Available Tools      | Number of tools available for use                  |
| Borrowed Tools       | Number of tools currently borrowed                 |
| Repair Tools         | Number of tools under repair or waiting for repair |
| Low Stock Items      | Number of stock items below minimum stock          |
| Overdue Borrow       | Number of borrowed tools that are overdue          |
| Calibration Due Soon | Number of tools due for calibration within 30 days |
| Calibration Expired  | Number of tools with expired calibration           |

## 5.3 Dashboard Tables

The dashboard should display the following tables.

### 5.3.1 Overdue Borrow List

The table should display:

- Borrow No.
- Tool Code
- Tool Name
- Borrower Name
- Department
- Borrow Date
- Due Date
- Overdue Days

### 5.3.2 Low Stock List

The table should display:

- Item Code
- Item Name
- Current Stock
- Minimum Stock
- Unit
- Location

### 5.3.3 Calibration Due Soon List

The table should display:

- Tool Code
- Tool Name
- Serial Number
- Next Calibration Date
- Calibration Status

## 5.4 Business Rules

- If tool status is `Available`, count it as an available tool.
- If tool status is `Borrowed`, count it as a borrowed tool.
- If tool status is `Repair`, count it as a repair tool.
- If the current date is greater than the due date and the tool has not been returned, show it as overdue.
- If current stock is less than minimum stock, show it as low stock.
- If the next calibration date is within 30 days from the current date, show it as calibration due soon.
- If the next calibration date is earlier than the current date, show it as calibration expired.

---

# 6. Tool Master / Tool List Module

## 6.1 Purpose

The Tool Master module is used to store and manage all tools in the tooling store. Examples include hand tools, measuring tools, special tools, and equipment that must be tracked individually.

## 6.2 Tool Data Fields

The system must store the following tool information:

| Field Name    | Type            | Required | Description                           |
| ------------- | --------------- | -------- | ------------------------------------- |
| Tool Code     | Text            | Yes      | Unique tool code                      |
| Tool Name     | Text            | Yes      | Tool name                             |
| Category      | Dropdown        | Yes      | Tool category                         |
| Brand         | Text            | No       | Tool brand                            |
| Model         | Text            | No       | Tool model                            |
| Serial Number | Text            | No       | Serial number                         |
| Location      | Text / Dropdown | Yes      | Storage location                      |
| Status        | Dropdown        | Yes      | Tool status                           |
| Minimum Stock | Number          | No       | Minimum stock quantity, if applicable |
| Unit          | Text / Dropdown | No       | Unit, such as pcs, set, box           |
| Image         | File            | No       | Tool image                            |
| Remark        | Textarea        | No       | Additional notes                      |
| Created Date  | DateTime        | Auto     | Created date and time                 |
| Updated Date  | DateTime        | Auto     | Last updated date and time            |

## 6.3 Tool Status

The system must support the following basic tool statuses:

| Status    | Meaning                               |
| --------- | ------------------------------------- |
| Available | Tool is ready to use                  |
| Borrowed  | Tool is currently borrowed            |
| Repair    | Tool is damaged or waiting for repair |
| Lost      | Tool is lost                          |

## 6.4 Functional Requirements

### 6.4.1 Add Tool

Admin and Store Keeper can add a new tool.

The system must allow the user to:

- Enter Tool Code
- Enter Tool Name
- Select Category
- Enter Brand
- Enter Model
- Enter Serial Number
- Select or enter Location
- Select initial Status
- Enter Minimum Stock, if applicable
- Select Unit
- Upload tool image
- Enter Remark
- Save tool data

### 6.4.2 Edit Tool

Admin and Store Keeper can edit existing tool data.

The system must allow the user to:

- View existing tool data
- Edit tool data
- Save updated data
- Update the last updated date automatically

### 6.4.3 Delete Tool

Admin can delete tool data.

Business rules:

- If the tool status is `Borrowed`, the system must not allow deletion.
- If the tool already has borrow history, future versions should use inactive status instead of physical deletion.
- In this simple version, delete is allowed only after confirmation.

### 6.4.4 View Tool Detail

Admin, Store Keeper, and User can view tool details.

The detail page should display:

- Tool Code
- Tool Name
- Category
- Brand
- Model
- Serial Number
- Location
- Status
- Image
- Remark
- Latest borrow history, if any
- Calibration information, if any

### 6.4.5 Tool List

The Tool List page must display:

- Tool Code
- Tool Name
- Category
- Brand
- Model
- Serial Number
- Location
- Status
- Action buttons based on role permission

## 6.5 Validation Rules

- Tool Code is required.
- Tool Code must be unique.
- Tool Name is required.
- Category is required.
- Location is required.
- Status is required.
- Minimum Stock must be a number and must not be negative.

---

# 7. Borrow / Return Module

## 7.1 Purpose

The Borrow / Return module is used to record tool borrowing and returning. It helps the Store Keeper know who borrowed each tool, when it was borrowed, and when it should be returned.

## 7.2 Borrow Request

User can create a borrow request. Store Keeper can review the request and record the official borrow transaction.

### Borrow Request Fields

| Field Name           | Type            | Required | Description                            |
| -------------------- | --------------- | -------- | -------------------------------------- |
| Request No.          | Text            | Auto     | Borrow request number                  |
| Requester Name       | User            | Auto     | User who requests the tool             |
| Department           | Text / Dropdown | Yes      | Requester department                   |
| Tool Code            | Dropdown / Scan | Yes      | Tool code                              |
| Tool Name            | Auto            | Auto     | Tool name                              |
| Request Date         | Date            | Yes      | Request date                           |
| Expected Return Date | Date            | Yes      | Expected return date                   |
| Request Status       | Dropdown        | Auto     | Pending, Approved, Rejected, Cancelled |
| Remark               | Textarea        | No       | Additional notes                       |

### Borrow Request Status

| Status    | Meaning                                         |
| --------- | ----------------------------------------------- |
| Pending   | Waiting for Store Keeper action                 |
| Approved  | Request approved and borrow transaction created |
| Rejected  | Request rejected                                |
| Cancelled | Request cancelled by requester                  |

## 7.3 Borrow Transaction Fields

| Field Name    | Type            | Required | Description                             |
| ------------- | --------------- | -------- | --------------------------------------- |
| Borrow No.    | Text            | Auto     | Borrow transaction number               |
| Borrower Name | Text            | Yes      | Name of the person who borrows the tool |
| Department    | Text / Dropdown | Yes      | Borrower department                     |
| Tool Code     | Dropdown / Scan | Yes      | Tool code                               |
| Tool Name     | Auto            | Auto     | Tool name                               |
| Borrow Date   | Date            | Yes      | Borrow date                             |
| Due Date      | Date            | Yes      | Expected return date                    |
