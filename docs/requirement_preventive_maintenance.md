# Requirement: Preventive Maintenance Module for `maintenance_project` v2

> เป้าหมาย: ทำส่วน Preventive Maintenance ของ `maintenance_project` ให้ใช้แนวคิดเดียวกับ `maintenance_pm_project` แต่ลดความซับซ้อนลง เน้นเข้าใจง่าย ใช้ข้อมูลเครื่องจักรที่มีอยู่แล้ว และเพิ่ม **Machine Layout View** สำหรับดูสถานะ PM ตามพื้นที่/ไลน์/เครื่องจักร

---

## 1. Summary

ระบบ Preventive Maintenance จะเป็น module สำหรับวางแผน PM, ตั้งค่า checklist, map checklist กับเครื่องจักร, ทำ inspection, ดูประวัติ และดูสถานะ PM แบบ realtime โดยยึดโครงสร้างเดิมของ `maintenance_project`

แนวทางสำคัญของ version นี้คือ:

- Sidebar หลักเหลือ **5 tab**
- รวม `PM Type Master` และ `Machine Mapping` เป็นเมนูเดียวชื่อ **PM Setup**
- Calendar อยู่ใน **PM Plan** ไม่แยกเป็น sidebar ใหม่
- Machine Layout อยู่ใน **PM Plan** เป็น view ย่อย
- Machine Layout ระยะแรกใช้แบบ **Grid Card ตาม Area / Line** ไม่ทำ drag & drop ก่อน
- PM Type Master ลดความซับซ้อน เหลือ field พื้นฐานที่ใช้จริง

---

## 2. Sidebar Structure

```txt
Preventive Maintenance
├── Dashboard
├── PM Plan
├── PM Setup
├── Inspection
└── History / Report
```

จำนวน sidebar tab หลัก = **5 tab**

| Tab | หน้าที่อยู่ข้างใน | จุดประสงค์ |
|---|---|---|
| Dashboard | PM Dashboard | ดูภาพรวมสถานะ PM |
| PM Plan | List View, Calendar View, Machine Layout View, Create/Edit Plan | วางแผนและดูสถานะ PM |
| PM Setup | PM Type Master, PM Type Builder, Machine Mapping | ตั้งค่า checklist และ map กับเครื่องจักร |
| Inspection | Inspection List, Inspection Form | ทำรายการตรวจ PM |
| History / Report | History, Report, Export | ดูประวัติและรายงาน |

---

## 3. Page / UI Count

### 3.1 UI หลักที่ต้องมี

1. Dashboard
2. PM Plan - List View
3. PM Plan - Calendar View
4. PM Plan - Machine Layout View
5. Create / Edit PM Plan
6. PM Setup Landing
7. PM Type Master List
8. PM Type Builder
9. Machine Mapping
10. Inspection List
11. Inspection Form
12. History / Report

### 3.2 Modal ที่ต้องมี

1. Add Checklist Item Modal
2. Add PM Type to Machine Modal
3. View PM Detail Modal หรือ Side Panel

---

## 4. Preventive Maintenance Concept

### 4.1 Flow การใช้งานหลัก

```txt
1. Admin สร้าง PM Type / Checklist
        ↓
2. Admin นำ PM Type ไป map กับเครื่องจักร
        ↓
3. ระบบสร้าง PM Plan ตาม frequency
        ↓
4. Technician เปิด Inspection แล้วกรอกผลตรวจ
        ↓
5. ระบบบันทึกผล OK / NG / Overdue / Completed
        ↓
6. Dashboard, Calendar, Machine Layout, Report update แบบ realtime
```

### 4.2 ลดความซับซ้อนของ PM Type Master

PM Type Master ไม่ต้องทำ logic ซับซ้อน ให้รองรับ field พื้นฐานเท่านั้น:

| Field Type | ใช้สำหรับ | ตัวอย่าง |
|---|---|---|
| Image | อัปโหลดรูปภาพ | รูปเครื่องก่อน/หลัง PM |
| OK / NG | เลือกผลตรวจง่าย ๆ | ตรวจระดับน้ำมัน OK/NG |
| Dropdown | เลือกจากตัวเลือก | Good / Normal / Bad |
| Text | กรอกข้อความ | หมายเหตุ |
| Number | กรอกตัวเลข | Temperature, Pressure |

### 4.3 Criteria ของ Field

แต่ละ checklist item สามารถกำหนดได้:

- ชื่อรายการตรวจ
- ประเภท input
- required หรือไม่
- min value เฉพาะ Number
- max value เฉพาะ Number
- unit เฉพาะ Number เช่น °C, bar, mm
- dropdown options เฉพาะ Dropdown
- sort order
- active / inactive

---

## 5. Machine Layout Concept

### 5.1 Machine Layout คืออะไร

Machine Layout คือมุมมองที่แสดงเครื่องจักรเป็น card ตามพื้นที่หรือไลน์การผลิต เพื่อให้ผู้ใช้เห็นสถานะ PM ของแต่ละเครื่องได้เร็ว ไม่ต้องดูเฉพาะตารางหรือ calendar

ตัวอย่างสถานะ:

```txt
🟢 Completed / OK
🟡 Due Today
🔴 Overdue / NG
⚪ No PM Plan
🔵 Planned
```

### 5.2 ตำแหน่งของ Machine Layout

Machine Layout จะอยู่ในเมนู **PM Plan** เป็น view ย่อย

```txt
PM Plan
├── List View
├── Calendar View
└── Machine Layout View
```

ไม่แนะนำให้แยก Machine Layout เป็น sidebar tab ใหม่ใน phase แรก เพราะจะทำให้เมนูเยอะเกินไป

### 5.3 Version แรกของ Machine Layout

ให้ทำแบบง่ายก่อน:

```txt
Machine Layout = Grid Card Group by Area / Line
```

ยังไม่ต้องทำ:

- Drag & Drop ตำแหน่งเครื่อง
- Upload floor plan
- กำหนด x/y position บนแผนผัง
- Zoom / Pan
- Layout editor

### 5.4 ข้อมูลที่ใช้แสดง Machine Layout

ใช้ข้อมูลเครื่องจักรที่มีอยู่แล้วใน `maintenance_project` ให้มากที่สุด เช่น:

```txt
machine_id
machine_code
machine_name
area
line
location
machine_status
```

แล้วนำข้อมูล PM status มารวมเพื่อแสดงบน card

### 5.5 กรณีอยากต่อยอดในอนาคต

ถ้าต้องการทำ layout จริงแบบกำหนดตำแหน่งได้ ให้เพิ่ม table ภายหลัง:

```txt
machine_layouts
- id
- machine_id
- area
- line
- x_position
- y_position
- width
- height
- sort_order
- created_at
- updated_at
```

แต่ phase แรกยังไม่จำเป็น

---

## 6. Status Definition

| Status | ความหมาย | แสดงผล |
|---|---|---|
| Planned | มีแผนแล้ว แต่ยังไม่ถึงวันทำ | Blue badge |
| Due Today | ถึงกำหนดวันนี้ | Yellow badge |
| Overdue | เลยกำหนดแล้วยังไม่ทำ | Red badge |
| In Progress | เริ่มกรอก inspection แล้วแต่ยังไม่ submit | Purple badge |
| Completed | ทำ PM เสร็จแล้ว | Green badge |
| NG | ผลตรวจมี NG หรือค่าหลุด criteria | Red badge |
| Skipped | ข้ามรายการ PM | Gray badge |
| No Plan | เครื่องยังไม่มี PM Plan | Light gray badge |

---

## 7. Page Requirements + Mockup UI

---

# 7.1 Dashboard

## Purpose

ใช้ดูภาพรวมสถานะ Preventive Maintenance ทั้งหมด

## Main Components

- Total PM Plan
- Due Today
- Overdue
- Completed
- NG Result
- Upcoming PM
- Recent Inspection
- PM Status Overview
- Machine Status Summary

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                    [Refresh]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Total PM     │ │ Due Today    │ │ Overdue      │ │ Completed    │        │
│ │ 120          │ │ 8            │ │ 3            │ │ 95           │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                                             │
│ ┌──────────────┐                                                            │
│ │ NG Result    │                                                            │
│ │ 4            │                                                            │
│ └──────────────┘                                                            │
│                                                                             │
│ ┌───────────────────────────────────┐ ┌───────────────────────────────────┐ │
│ │ PM Status Overview                │ │ Upcoming PM                       │ │
│ │ Planned     ███████               │ │ CNC-01 | Daily Check | Today      │ │
│ │ Completed   ███████████           │ │ CNC-02 | Weekly Check | Tomorrow   │ │
│ │ Overdue     ██                    │ │ Pump-01| Monthly PM   | 15 May     │ │
│ └───────────────────────────────────┘ └───────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Recent Inspection                                                       │ │
│ │ Machine | PM Type       | Result | Inspector | Date                     │ │
│ │ CNC-01  | Daily Check   | OK     | Apiwat    | 13 May 2026              │ │
│ │ CNC-02  | Weekly Check  | NG     | Somchai   | 13 May 2026              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.2 PM Plan - List View

## Purpose

ใช้ดูรายการ PM Plan แบบตาราง ค้นหา กรอง และแก้ไขได้ง่าย

## Main Components

- Button Create PM Plan
- Toggle View: List / Calendar / Machine Layout
- Filter by Machine, PM Type, Status, Date Range
- PM Plan Table

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Plan                                             [+ Create PM Plan]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [List View] [Calendar View] [Machine Layout View]                            │
│                                                                             │
│ Filter:                                                                     │
│ [Machine ▼] [PM Type ▼] [Status ▼] [Date Range 📅] [Search]                 │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ List View                                                               │ │
│ ├────────────┬──────────┬──────────────┬───────────┬──────────┬──────────┤ │
│ │ Date       │ Machine  │ PM Type      │ Frequency │ Status   │ Action   │ │
│ ├────────────┼──────────┼──────────────┼───────────┼──────────┼──────────┤ │
│ │ 13/05/26   │ CNC-01   │ Daily Check  │ Daily     │ Planned  │ View/Edit│ │
│ │ 14/05/26   │ CNC-02   │ Weekly Check │ Weekly    │ Due      │ View/Edit│ │
│ │ 15/05/26   │ Pump-01  │ Monthly PM   │ Monthly   │ Overdue  │ View/Edit│ │
│ └────────────┴──────────┴──────────────┴───────────┴──────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.3 PM Plan - Calendar View

## Purpose

ใช้ดูแผน PM ตามวัน/สัปดาห์/เดือน เพื่อเห็นภาพรวมว่าวันไหนมีงานอะไร

## Main Components

- View Toggle
- Month / Week / Day selector
- Today button
- Calendar grid
- PM event card

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Plan                                             [+ Create PM Plan]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [List View] [Calendar View] [Machine Layout View]                            │
│                                                                             │
│ [<] [Today] [>]                         May 2026             [Month ▼]      │
│                                                                             │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┐│
│ │ Sun      │ Mon      │ Tue      │ Wed      │ Thu      │ Fri      │ Sat    ││
│ ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤│
│ │ 4        │ 5        │ 6        │ 7        │ 8        │ 9        │ 10     ││
│ │          │ CNC-01   │          │ Pump-01  │          │          │        ││
│ │          │ Planned  │          │ Complete │          │          │        ││
│ ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤│
│ │ 11       │ 12       │ 13       │ 14       │ 15       │ 16       │ 17     ││
│ │          │ CNC-02   │ CNC-01   │ Pump-02  │ Motor-01 │          │        ││
│ │          │ Overdue  │ Due      │ Planned  │ Planned  │          │        ││
│ └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.4 PM Plan - Machine Layout View

## Purpose

ใช้ดูสถานะ PM ตามเครื่องจักรในรูปแบบ layout card ตาม Area / Line เพื่อให้เห็นภาพรวมหน้างานเร็วกว่า table

## Main Components

- View Toggle
- Filter by Area, Line, Status, PM Type
- Search Machine
- Legend สีสถานะ
- Machine Card Grid
- Selected Machine Detail Panel
- Action: View PM Plan, Start Inspection

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Plan                                                     [+ Create Plan] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [List View] [Calendar View] [Machine Layout View]                            │
│                                                                             │
│ Filter: [Area ▼] [Line ▼] [Status ▼] [PM Type ▼] [Search Machine]           │
│                                                                             │
│ Legend:  🟢 Completed  🟡 Due Today  🔴 Overdue/NG  ⚪ No Plan  🔵 Planned   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Factory Layout: Production Line A                                       │ │
│ │                                                                         │ │
│ │   ┌──────────┐     ┌──────────┐     ┌──────────┐                       │ │
│ │   │ CNC-01   │     │ CNC-02   │     │ CNC-03   │                       │ │
│ │   │ 🟢 OK    │     │ 🟡 Due   │     │ 🔴 Over  │                       │ │
│ │   └──────────┘     └──────────┘     └──────────┘                       │ │
│ │                                                                         │ │
│ │   ┌──────────┐     ┌──────────┐     ┌──────────┐                       │ │
│ │   │ Pump-01  │     │ Pump-02  │     │ Motor-01 │                       │ │
│ │   │ ⚪ No PM  │     │ 🟢 OK    │     │ 🟡 Due   │                       │ │
│ │   └──────────┘     └──────────┘     └──────────┘                       │ │
│ │                                                                         │ │
│ │   ┌──────────┐     ┌──────────┐                                        │ │
│ │   │ Line-A01 │     │ Line-A02 │                                        │ │
│ │   │ 🔴 NG    │     │ 🔵 Plan  │                                        │ │
│ │   └──────────┘     └──────────┘                                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Selected Machine Detail                                                 │ │
│ │ Machine: CNC-02                                                         │ │
│ │ Area: Production Line A                                                 │ │
│ │ PM Status: Due Today                                                    │ │
│ │ Current PM: Daily Check                                                 │ │
│ │ Due Date: 13/05/2026                                                    │ │
│ │ Assigned To: Technician A                                               │ │
│ │ Last Result: OK                                                         │ │
│ │                                                                         │ │
│ │ [View PM Plan] [Start Inspection]                                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Machine Card Data

แต่ละ machine card ควรแสดง:

```txt
Machine Code
Machine Name หรือ short name
PM Status
Current PM Type
Due Date แบบสั้น
```

ตัวอย่าง:

```txt
┌──────────────┐
│ CNC-01       │
│ Daily Check  │
│ 🟡 Due Today │
│ 13/05/26     │
└──────────────┘
```

---

# 7.5 Create / Edit PM Plan

## Purpose

ใช้สร้างหรือแก้ไขแผน PM โดยเลือก PM Type และเครื่องจักร

## Main Components

- Plan Name
- PM Type
- Machine
- Frequency
- Start Date
- Assigned To
- Preview Checklist

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create PM Plan                                      [Cancel] [Save Plan]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Section 1: Plan Information                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Plan Name        [ Daily PM CNC Line A                         ]        │ │
│ │ PM Type          [ Daily Check ▼                              ]        │ │
│ │ Machine          [ CNC-01 ▼                                   ]        │ │
│ │ Frequency        [ Daily ▼                                    ]        │ │
│ │ Start Date       [ 13/05/2026 📅                              ]        │ │
│ │ Assigned To      [ Technician ▼                               ]        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Section 2: Preview Checklist                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 1. Check oil level                  Type: OK/NG       Required: Yes     │ │
│ │ 2. Upload machine image             Type: Image       Required: Yes     │ │
│ │ 3. Temperature                      Type: Number      Min: 20 Max: 80   │ │
│ │ 4. Remark                           Type: Text        Required: No      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.6 PM Setup Landing

## Purpose

รวมส่วนตั้งค่า PM Type และ Machine Mapping ไว้ใน tab เดียว ลดจำนวนเมนู sidebar

## Main Components

- Card: PM Type Master
- Card: Machine Mapping
- Summary จำนวน PM Type
- Summary จำนวนเครื่องที่ map แล้ว/ยังไม่ map

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Setup                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌───────────────────────────────┐ ┌───────────────────────────────────────┐ │
│ │ PM Type Master                │ │ Machine Mapping                       │ │
│ │ สร้างหัวข้อ PM และ Checklist │ │ ผูก PM Type กับเครื่องจักร          │ │
│ │                               │ │                                       │ │
│ │ Total PM Type: 12             │ │ Mapped Machine: 45                   │ │
│ │ Active: 10                    │ │ No PM Plan: 8                        │ │
│ │                               │ │                                       │ │
│ │ [Open PM Type Master]         │ │ [Open Machine Mapping]                │ │
│ └───────────────────────────────┘ └───────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.7 PM Type Master List

## Purpose

ใช้ดูรายการ PM Type ทั้งหมด

## Main Components

- Search
- Create PM Type
- PM Type Table
- Edit / Copy / Disable

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Type Master                                      [+ Create PM Type]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Search: [ Search PM Type...                                      ]          │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ PM Type Name     | Checklist Count | Status | Updated At | Action       │ │
│ ├──────────────────┼─────────────────┼────────┼────────────┼──────────────┤ │
│ │ Daily Check      | 8               | Active | 13/05/2026 | Edit / Copy  │ │
│ │ Weekly Check     | 12              | Active | 12/05/2026 | Edit / Copy  │ │
│ │ Monthly PM       | 20              | Active | 10/05/2026 | Edit / Copy  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.8 PM Type Builder

## Purpose

ใช้สร้าง template checklist แบบง่าย

## Main Components

- PM Type Name
- Description
- Status
- Checklist Items
- Add Checklist Item Modal

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create PM Type                                      [Cancel] [Save]         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PM Type Info                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ PM Type Name       [ Daily Check CNC                         ]          │ │
│ │ Description        [ Basic daily machine inspection           ]          │ │
│ │ Status             [ Active ▼                                ]          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Checklist Items                                      [+ Add Item]           │
│ ┌────┬──────────────────────┬──────────┬────────────┬────────┬────────────┐│
│ │ No │ Check Item           │ Type     │ Criteria   │ Req.   │ Action     ││
│ ├────┼──────────────────────┼──────────┼────────────┼────────┼────────────┤│
│ │ 1  │ Check oil level      │ OK/NG    │ -          │ Yes    │ Edit/Delete││
│ │ 2  │ Upload image         │ Image    │ -          │ Yes    │ Edit/Delete││
│ │ 3  │ Temperature          │ Number   │ 20 - 80    │ Yes    │ Edit/Delete││
│ │ 4  │ Remark               │ Text     │ -          │ No     │ Edit/Delete││
│ │ 5  │ Machine condition    │ Dropdown │ Good/Bad   │ Yes    │ Edit/Delete││
│ └────┴──────────────────────┴──────────┴────────────┴────────┴────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Add Checklist Item Modal

```txt
┌─────────────────────────────────────────────┐
│ Add Checklist Item                    [X]   │
├─────────────────────────────────────────────┤
│                                             │
│ Item Name                                  │
│ [ Check temperature              ]         │
│                                             │
│ Input Type                                  │
│ [ Number ▼ ]                                │
│                                             │
│ Required                                    │
│ [x] Required                                │
│                                             │
│ Criteria                                    │
│ Min Value [ 20 ]                            │
│ Max Value [ 80 ]                            │
│                                             │
│ Unit                                        │
│ [ °C ]                                      │
│                                             │
│ [Cancel]                         [Add]     │
└─────────────────────────────────────────────┘
```

---

# 7.9 Machine Mapping

## Purpose

ใช้ผูก PM Type กับเครื่องจักร และกำหนด frequency/start date

## Main Components

- Select Machine
- Machine Information
- Assigned PM Type Table
- Add PM Type
- Save Mapping

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ Machine Mapping                                      [Save Mapping]         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Select Machine                                                               │
│ [ CNC-01 ▼ ]                                                                 │
│                                                                             │
│ Machine Information                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Machine Code: CNC-01                                                    │ │
│ │ Machine Name: CNC Machine Line A                                        │ │
│ │ Area: Production Line A                                                 │ │
│ │ Location: Production Line 1                                             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Assign PM Type                                                               │
│ ┌──────────────────────┬────────────┬──────────────┬────────────┬─────────┐│
│ │ PM Type              │ Frequency  │ Start Date   │ Active     │ Action  ││
│ ├──────────────────────┼────────────┼──────────────┼────────────┼─────────┤│
│ │ Daily Check          │ Daily      │ 13/05/2026   │ Yes        │ Remove  ││
│ │ Weekly Check         │ Weekly     │ 13/05/2026   │ Yes        │ Remove  ││
│ └──────────────────────┴────────────┴──────────────┴────────────┴─────────┘│
│                                                                             │
│ [+ Add PM Type]                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.10 Inspection List

## Purpose

ใช้ดูงาน PM ที่ต้องทำ และเริ่มกรอกผลตรวจ

## Main Components

- Filter Today / Date Range
- Filter Machine
- Filter Status
- Inspection Table
- Action Start / Continue / View

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Inspection                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Filter: [Today ▼] [Machine ▼] [Status ▼] [Search]                           │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Due Date   | Machine | PM Type      | Status    | Inspector | Action    │ │
│ ├────────────┼─────────┼──────────────┼───────────┼───────────┼───────────┤ │
│ │ 13/05/26   | CNC-01  | Daily Check  | Due Today | -         | Start     │ │
│ │ 13/05/26   | CNC-02  | Daily Check  | In Prog.  | Apiwat    | Continue  │ │
│ │ 12/05/26   | Pump-01 | Weekly Check | Overdue   | -         | Start     │ │
│ │ 11/05/26   | Motor-1 | Monthly PM   | Completed | Somchai   | View      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7.11 Inspection Form

## Purpose

ใช้กรอกผลตรวจ PM ตาม checklist ที่สร้างจาก PM Type

## Main Components

- PM Information
- Checklist dynamic input
- Validate required field
- Validate number min/max
- Upload image
- Save Draft
- Submit

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ PM Inspection Form                               [Save Draft] [Submit]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PM Information                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Machine: CNC-01                                                         │ │
│ │ PM Type: Daily Check                                                    │ │
│ │ Due Date: 13/05/2026                                                    │ │
│ │ Inspector: Apiwat                                                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Checklist                                                                   │
│ ┌────┬──────────────────────┬───────────────────────────────┬─────────────┐│
│ │ No │ Check Item           │ Input                         │ Result      ││
│ ├────┼──────────────────────┼───────────────────────────────┼─────────────┤│
│ │ 1  │ Check oil level      │ [ OK ] [ NG ]                 │ OK          ││
│ │ 2  │ Upload image         │ [ Upload Image ]              │ Required    ││
│ │ 3  │ Temperature          │ [ 65 ] °C                     │ OK          ││
│ │ 4  │ Machine condition    │ [ Good ▼ ]                    │ OK          ││
│ │ 5  │ Remark               │ [ Text area...              ] │ -           ││
│ └────┴──────────────────────┴───────────────────────────────┴─────────────┘│
│                                                                             │
│ Overall Result                                                               │
│ [ OK ] [ NG ]                                                                │
│                                                                             │
│ Remark                                                                       │
│ [ Overall remark...                                                ]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Number Validation Example

```txt
Temperature: 95 °C
Status: NG
Warning: Value must be between 20 - 80 °C
```

---

# 7.12 History / Report

## Purpose

ใช้ดูประวัติ PM และ export ข้อมูล

## Main Components

- Date Range Filter
- Machine Filter
- PM Type Filter
- Result Filter
- History Table
- Summary Card
- Export Excel

## Mockup

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│ History / Report                                      [Export Excel]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Filter: [Date Range] [Machine ▼] [PM Type ▼] [Result ▼] [Search]            │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Date       | Machine | PM Type      | Result | Inspector | Action       │ │
│ ├────────────┼─────────┼──────────────┼────────┼───────────┼──────────────┤ │
│ │ 13/05/26   | CNC-01  | Daily Check  | OK     | Apiwat    | View Detail  │ │
│ │ 13/05/26   | CNC-02  | Daily Check  | NG     | Somchai   | View Detail  │ │
│ │ 12/05/26   | Pump-01 | Weekly Check | OK     | Apiwat    | View Detail  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Summary                                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                         │
│ │ Total        │ │ OK           │ │ NG           │                         │
│ │ 150          │ │ 140          │ │ 10           │                         │
│ └──────────────┘ └──────────────┘ └──────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Suggested Routes

```txt
/preventive-maintenance
/preventive-maintenance/plans
/preventive-maintenance/plans?view=list
/preventive-maintenance/plans?view=calendar
/preventive-maintenance/plans?view=machine-layout
/preventive-maintenance/plans/create
/preventive-maintenance/plans/:id/edit
/preventive-maintenance/setup
/preventive-maintenance/setup/types
/preventive-maintenance/setup/types/create
/preventive-maintenance/setup/types/:id/edit
/preventive-maintenance/setup/mapping
/preventive-maintenance/inspection
/preventive-maintenance/inspection/:id
/preventive-maintenance/reports
```

---

## 9. Suggested Database Tables

> หมายเหตุ: ชื่อตารางสามารถปรับตาม naming convention ของ `maintenance_project` ได้

### 9.1 pm_types

```sql
pm_types
- id
- name
- description
- status
- created_by
- created_at
- updated_at
```

### 9.2 pm_type_items

```sql
pm_type_items
- id
- pm_type_id
- item_name
- input_type
- is_required
- min_value
- max_value
- unit
- dropdown_options_json
- sort_order
- status
- created_at
- updated_at
```

### 9.3 machine_pm_mappings

```sql
machine_pm_mappings
- id
- machine_id
- pm_type_id
- frequency
- start_date
- assigned_to
- is_active
- created_by
- created_at
- updated_at
```

### 9.4 pm_plans

```sql
pm_plans
- id
- machine_id
- pm_type_id
- mapping_id
- plan_date
- due_date
- frequency
- status
- assigned_to
- created_at
- updated_at
```

### 9.5 pm_inspections

```sql
pm_inspections
- id
- pm_plan_id
- machine_id
- pm_type_id
- inspector_id
- started_at
- submitted_at
- overall_result
- remark
- status
- created_at
- updated_at
```

### 9.6 pm_inspection_results

```sql
pm_inspection_results
- id
- inspection_id
- pm_type_item_id
- item_name_snapshot
- input_type_snapshot
- value_text
- value_number
- value_dropdown
- value_ok_ng
- image_url
- result_status
- remark
- created_at
```

### 9.7 Optional: machine_layouts for future

ระยะแรกยังไม่ต้องใช้ ถ้าทำ Machine Layout แบบ Grid จาก area/line

```sql
machine_layouts
- id
- machine_id
- area
- line
- x_position
- y_position
- width
- height
- sort_order
- created_at
- updated_at
```

---

## 10. API Spec Draft

### Dashboard

```txt
GET /api/preventive/dashboard/summary
GET /api/preventive/dashboard/upcoming
GET /api/preventive/dashboard/recent-inspections
```

### PM Plan

```txt
GET    /api/preventive/plans
GET    /api/preventive/plans/:id
POST   /api/preventive/plans
PUT    /api/preventive/plans/:id
DELETE /api/preventive/plans/:id
GET    /api/preventive/plans/calendar
GET    /api/preventive/plans/machine-layout
```

### PM Setup / PM Type

```txt
GET    /api/preventive/types
GET    /api/preventive/types/:id
POST   /api/preventive/types
PUT    /api/preventive/types/:id
DELETE /api/preventive/types/:id
POST   /api/preventive/types/:id/copy
```

### Machine Mapping

```txt
GET    /api/preventive/mappings
GET    /api/preventive/mappings/by-machine/:machineId
POST   /api/preventive/mappings
PUT    /api/preventive/mappings/:id
DELETE /api/preventive/mappings/:id
```

### Inspection

```txt
GET  /api/preventive/inspections
GET  /api/preventive/inspections/:id
POST /api/preventive/inspections/:planId/start
PUT  /api/preventive/inspections/:id/save-draft
POST /api/preventive/inspections/:id/submit
```

### Report

```txt
GET /api/preventive/reports/history
GET /api/preventive/reports/export-excel
```

---

## 11. Socket.io Events

ใช้เฉพาะจุดที่จำเป็น ไม่ต้อง realtime ทุกอย่าง

### Server Emit

```txt
pm:plan-created
pm:plan-updated
pm:inspection-started
pm:inspection-submitted
pm:status-updated
pm:overdue-updated
```

### Client Listen

```txt
Dashboard listens:
- pm:status-updated
- pm:inspection-submitted
- pm:overdue-updated

PM Plan listens:
- pm:plan-created
- pm:plan-updated
- pm:status-updated

Machine Layout listens:
- pm:status-updated
- pm:inspection-submitted

Inspection listens:
- pm:inspection-started
- pm:inspection-submitted
```

---

## 12. Permission Keys

กำหนดสิทธิ์จาก Admin Mode ตามโครงเดิมของ `maintenance_project`

```txt
preventive.dashboard.view
preventive.plan.view
preventive.plan.create
preventive.plan.edit
preventive.plan.delete
preventive.setup.view
preventive.type.create
preventive.type.edit
preventive.type.delete
preventive.mapping.edit
preventive.inspection.view
preventive.inspection.start
preventive.inspection.submit
preventive.report.view
preventive.report.export
```

---

## 13. Development Plan

### Phase 1: Foundation

- สร้าง route หลักของ Preventive Maintenance
- ทำ sidebar 5 tab
- เชื่อม permission เบื้องต้น
- สร้าง service/controller/model structure ฝั่ง backend

### Phase 2: PM Setup

- PM Type Master List
- PM Type Builder
- Add Checklist Item Modal
- Machine Mapping

### Phase 3: PM Plan

- PM Plan List View
- Create/Edit PM Plan
- Calendar View
- Machine Layout View แบบ Grid ตาม Area / Line

### Phase 4: Inspection

- Inspection List
- Inspection Form
- Required validation
- Number min/max validation
- Upload image
- Save draft / Submit

### Phase 5: Dashboard + Report + Realtime

- Dashboard summary
- History / Report
- Export Excel
- Socket.io realtime update เฉพาะ Dashboard, PM Plan, Machine Layout

---

## 14. Acceptance Criteria

### PM Setup

- User สามารถสร้าง PM Type ได้
- User สามารถเพิ่ม checklist item ได้
- Checklist item รองรับ Image, OK/NG, Dropdown, Text, Number
- Number field สามารถกำหนด min/max ได้
- สามารถกำหนด required field ได้
- สามารถ map PM Type กับเครื่องจักรได้

### PM Plan

- User สามารถดู PM Plan แบบ List ได้
- User สามารถดู PM Plan แบบ Calendar ได้
- User สามารถดู PM Plan แบบ Machine Layout ได้
- User สามารถสร้าง/แก้ไข PM Plan ได้
- สถานะ Due Today / Overdue / Completed แสดงถูกต้อง

### Machine Layout

- แสดงเครื่องจักรแบบ grid ตาม Area / Line ได้
- แต่ละ card แสดง machine code, PM status, PM type, due date ได้
- สี/Badge สถานะตรงกับข้อมูล PM ล่าสุด
- คลิก card แล้วเห็นรายละเอียดเครื่องจักรและ PM ปัจจุบัน
- มีปุ่ม View PM Plan และ Start Inspection

### Inspection

- User สามารถเริ่ม inspection จาก PM Plan ได้
- Form แสดง field ตาม PM Type ที่ตั้งค่าไว้
- Required field ต้อง validate ก่อน submit
- Number field ต้องตรวจ min/max แล้ว set result เป็น NG ถ้าหลุด criteria
- สามารถบันทึก draft ได้
- Submit แล้ว update status เป็น Completed หรือ NG ได้

### Report

- User สามารถดูประวัติ PM ได้
- Filter ตาม date, machine, pm type, result ได้
- Export Excel ได้

---

## 15. Final Recommended Structure

```txt
Preventive Maintenance
├── Dashboard
├── PM Plan
│   ├── List View
│   ├── Calendar View
│   ├── Machine Layout View
│   └── Create / Edit PM Plan
├── PM Setup
│   ├── PM Type Master
│   ├── PM Type Builder
│   └── Machine Mapping
├── Inspection
│   ├── Inspection List
│   └── Inspection Form
└── History / Report
```

สรุปสุดท้าย:

```txt
Sidebar หลัก = 5 tab
UI หลัก = 12 หน้า/view
Modal หลัก = 3 modal
Machine Layout = อยู่ใน PM Plan เป็น view ย่อย
Machine Layout phase แรก = Grid Card ตาม Area / Line
```
