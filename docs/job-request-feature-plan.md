# Job Request Feature Plan

## เป้าหมาย

สร้างระบบ Job Request สำหรับงานซ่อมแบบครบวงจร ตั้งแต่ Production แจ้งงาน, Maintenance รับและซ่อม, QC ตรวจสอบ, Production confirm, จนจบงาน พร้อม realtime notification, เสียงแจ้งเตือน, popup กลางจอ, history ทุกครั้งที่ส่งต่องาน, dashboard วิเคราะห์หลายชั้น และระบบต่อกะสำหรับ Production, Maintenance, QC

ระบบต้องยึดหลัก:

- ใช้ Next.js + Tailwind + Axios สำหรับ frontend
- ใช้ Node.js + Express MVC สำหรับ backend
- ใช้ MSSQL โดยไม่ใช้ ORM
- ตาราง master ใช้ prefix `tbm_`
- ตาราง transaction/log ใช้ prefix `tb_`
- รองรับ Socket.IO สำหรับ realtime
- ใช้ SweetAlert2 สำหรับ popup notification กลางหน้าจอ
- ทุกหน่วยงานเห็นเฉพาะหน้าของตัวเอง ยกเว้น super admin
- ทุก form ต้องพิมพ์น้อยที่สุด ใช้ searchable dropdown และจำค่าที่เลือกบ่อยไว้ใน localStorage
- ทุกขั้นตอนต้องแนบรูปได้ โดยเลือกไฟล์หรือเปิดกล้องถ่ายรูป
- ทุก endpoint ต้องมี unit test

## บทบาทและสิทธิ์

### Production

- Login ด้วยรหัส Production
- สร้างใบ Request
- เห็นเฉพาะงาน Production
- Confirm เครื่องหลัง Maintenance หรือ QC ส่งกลับมา
- Production admin สามารถ CRUD master ที่เกี่ยวกับ Production ได้
- ต้องกรอก Emp ID ตอนสร้าง/รับ/confirm งาน

### Maintenance

- Login ด้วยรหัส Maintenance
- เห็นงานที่ Production หรือ QC ส่งมาให้ Maintenance
- กดรับงานและระบุผู้รับงาน
- บันทึกผลซ่อม
- เลือกส่งต่อไป QC หรือ Production
- Maintenance admin สามารถ CRUD master ที่เกี่ยวกับ Maintenance ได้

### QC

- Login ด้วยรหัส QC
- เห็นงานที่ Maintenance ส่งมาตรวจ
- กดรับงานและระบุผู้รับงาน
- ตรวจเครื่องและเลือกผลลัพธ์
- QC admin สามารถ CRUD master ที่เกี่ยวกับ QC ได้

### Super Admin

- เห็นทุกหน่วยงาน
- จัดการ master ทุกหมวด
- ดู dashboard และ histories ทุกส่วน
- จัดการ worker ทุกหน่วยงาน

## โครงสร้างเมนู

### Production

- Production Request
- Production Confirm
- Production Shift Handover
- Production History

### Maintenance

- Maintenance Incoming
- Maintenance Active Job
- Maintenance Repair Result
- Maintenance Shift Handover
- Maintenance History

### QC

- QC Incoming
- QC Inspection
- QC Shift Handover
- QC History

### Dashboard

- Machine Analyze
- Worker Analyze (สร้างรอไว้ก่อน แต่ยังไม่ทำกราฟ)

### Histories

- Repair Histories

### Admin Mode

แยก sidebar ตามส่วนงาน:

- Production Master
- Maintenance Master
- QC Master
- Worker Master
- Machine Master
- Notification Setting

## Database Plan

### Worker Master

ตาราง `tbm_worker`

ใช้เก็บพนักงานทุกหน่วยงาน

Field หลัก:

- id
- empId
- workerCode
- workerName
- departmentCode: production, maintenance, qc
- position
- phone
- email
- imageUrl
- status
- createdAt
- updatedAt

Mock data:

- PRD-001, Production Operator A, Production
- PRD-002, Production Leader B, Production
- MNT-001, Maintenance Technician A, Maintenance
- MNT-002, Maintenance Engineer B, Maintenance
- QC-001, QC Inspector A, QC
- QC-002, QC Leader B, QC

### Production Master

ตาราง `tbm_job_request_area`

- areaCode
- areaName
- departmentCode
- status

Mock data:

- LINE-A, Line A
- LINE-B, Line B
- PACKING, Packing Area
- UTILITY, Utility Area

ตาราง `tbm_job_request_machine_type`

- machineTypeCode
- machineTypeName
- areaId
- status

Mock data:

- CONVEYOR, Conveyor
- MIXER, Mixer
- PACKER, Packing Machine
- PUMP, Pump
- COMPRESSOR, Air Compressor
- ROBOT, Robot Arm

ตาราง `tbm_job_request_machine`

- machineNo
- machineName
- areaId
- machineTypeId
- status

Mock data:

- CV-A-001, Conveyor Line A 001
- CV-A-002, Conveyor Line A 002
- MX-B-001, Mixer Line B 001
- PK-001, Packing Machine 001
- PMP-UT-001, Utility Pump 001

ตาราง `tbm_job_request_problem`

- problemCode
- problemName
- machineTypeId
- priorityDefault
- status

Mock data:

- ABNORMAL-NOISE, Abnormal noise
- NOT-RUNNING, Machine not running
- SENSOR-ERROR, Sensor error
- AIR-LEAK, Air leak
- OIL-LEAK, Oil leak
- JAM, Product jam

ตาราง `tbm_job_request_priority`

- priorityCode
- priorityName
- slaMinutes
- status

Mock data:

- LOW, Low, 240
- NORMAL, Normal, 120
- HIGH, High, 60
- URGENT, Urgent, 30

ตาราง `tbm_job_request_production_confirm_result`

- resultCode
- resultName
- status

Mock data:

- OK-RUNNING, Machine running normally
- NG-SEND-MAINTENANCE, Not OK - send back to Maintenance
- NG-SEND-QC, Not OK - send to QC

### Maintenance Master

ตาราง `tbm_job_request_downtime`

- downtimeCode
- downtimeName
- machineTypeId
- status

Mock data:

- ELECTRICAL, Electrical issue
- MECHANICAL, Mechanical issue
- PNEUMATIC, Pneumatic issue
- SENSOR, Sensor issue
- OPERATION, Operation setting issue

ตาราง `tbm_job_request_repair_action`

- actionCode
- actionName
- machineTypeId
- status

Mock data:

- ADJUST, Adjust setting
- REPLACE-PART, Replace part
- CLEANING, Cleaning
- TIGHTENING, Tightening
- WIRING-CHECK, Wiring check
- TEST-RUN, Test run

ตาราง `tbm_job_request_root_cause`

- causeCode
- causeName
- machineTypeId
- status

Mock data:

- WEAR, Part wear
- LOOSE, Loose part
- DIRTY, Dirty sensor
- BROKEN, Broken part
- SETTING, Wrong setting

ตาราง `tbm_job_request_maintenance_result`

- resultCode
- resultName
- nextTarget
- status

Mock data:

- SEND-QC, Send to QC
- SEND-PRODUCTION, Send to Production Confirm

### QC Master

ตาราง `tbm_job_request_qc_check_item`

- checkCode
- checkName
- machineTypeId
- status

Mock data:

- SAFETY-GUARD, Safety guard check
- PRODUCT-SAMPLE, Product sample check
- NOISE-VIBRATION, Noise and vibration check
- SENSOR-STATUS, Sensor status check
- TRIAL-RUN, Trial run check

ตาราง `tbm_job_request_qc_result`

- resultCode
- resultName
- nextTarget
- status

Mock data:

- NG-MAINTENANCE, Not pass - return to Maintenance
- SEND-PRODUCTION, Send to Production Confirm
- PASS-CLOSE, Pass - close job

### Shift Handover Master

ตาราง `tbm_job_request_shift`

- shiftCode
- shiftName
- startTime
- endTime
- departmentCode
- status

Mock data:

- PRD-DAY, Production Day Shift
- PRD-NIGHT, Production Night Shift
- MNT-DAY, Maintenance Day Shift
- MNT-NIGHT, Maintenance Night Shift
- QC-DAY, QC Day Shift
- QC-NIGHT, QC Night Shift

### Job Transaction Tables

ตาราง `tb_job_request`

- id
- requestNo
- requestDate
- productionEmpId
- productionWorkerId
- areaId
- machineTypeId
- machineId
- problemId
- priorityId
- description
- status
- currentDepartment
- currentAssigneeWorkerId
- currentStep
- lastActionAt
- createdBy
- createdAt
- updatedAt

Status หลัก:

- requested
- maintenance_accepted
- maintenance_repairing
- sent_to_qc
- qc_accepted
- qc_rejected
- sent_to_production
- production_rejected_to_maintenance
- production_rejected_to_qc
- completed
- cancelled

ตาราง `tb_job_request_attachment`

- id
- requestId
- stepCode
- departmentCode
- fileUrl
- fileType
- capturedBy
- createdAt

ตาราง `tb_job_request_history`

- id
- requestId
- actionCode
- fromDepartment
- toDepartment
- statusBefore
- statusAfter
- actorWorkerId
- actorEmpId
- remark
- payloadJson
- createdAt

ใช้ table นี้เป็น timeline ทั้งหมดตั้งแต่ Production Request จนจบงาน

ตาราง `tb_job_request_maintenance_result`

- id
- requestId
- maintenanceWorkerId
- downtimeId
- rootCauseId
- repairActionId
- repairRemark
- nextTarget
- createdAt

ตาราง `tb_job_request_qc_result`

- id
- requestId
- qcWorkerId
- checkItemId
- qcResultId
- qcRemark
- createdAt

ตาราง `tb_job_request_production_confirm`

- id
- requestId
- productionWorkerId
- confirmResultId
- confirmRemark
- createdAt

ตาราง `tb_job_request_shift_handover`

- id
- departmentCode
- shiftId
- handoverFromWorkerId
- handoverToWorkerId
- activeRequestIdsJson
- summary
- createdAt

## Workflow Detail

### 1. Production Request

Production login แล้วสร้างใบ Request

ข้อมูลที่ต้องกรอก:

- Emp ID: searchable dropdown จาก `tbm_worker` เฉพาะ Production
- Area: searchable dropdown และจำค่ารอบก่อนใน localStorage
- Machine Type: searchable dropdown กรองตาม Area และจำค่ารอบก่อนใน localStorage
- Machine No: searchable dropdown กรองตาม Machine Type
- Problem: searchable dropdown กรองตาม Machine Type
- Priority: dropdown
- Description: optional text
- Attachment: เลือกรูปหรือเปิดกล้องถ่ายรูป

UX เพื่อลดการพิมพ์:

- ถ้าเลือก Area แล้วครั้งต่อไป prefill Area เดิม
- ถ้าเลือก Machine Type แล้วครั้งต่อไป prefill Machine Type เดิม
- Machine No แสดงเฉพาะเครื่องใน Area + Type
- Problem แสดงตาม Machine Type
- Emp ID autocomplete จากรหัสหรือชื่อ

หลัง submit:

- สร้าง `tb_job_request`
- เพิ่ม history action `production_requested`
- ส่ง Socket.IO ไป Maintenance room
- Maintenance ได้ยินเสียงแจ้งเตือน
- Maintenance เห็น SweetAlert2 popup กลางหน้าจอ พร้อมรายละเอียดงาน

### 2. Maintenance Accept

Maintenance เห็นรายการ incoming job

เมื่อกดรับงานต้องระบุ:

- Emp ID หรือ Worker ผู้รับงาน
- เวลาเริ่มรับงาน

ระบบต้อง:

- update status เป็น `maintenance_accepted`
- update currentDepartment = maintenance
- update currentAssigneeWorkerId
- เพิ่ม history action `maintenance_accepted`
- แสดงรายละเอียดทั้งหมดจาก Production

### 3. Maintenance Repair Result

Maintenance ไปซ่อมและบันทึกผล

ข้อมูลที่ต้องกรอก:

- Downtime: searchable dropdown ตาม Machine Type
- Root Cause: searchable dropdown ตาม Machine Type
- Repair Action: searchable dropdown ตาม Machine Type
- Repair Remark: optional
- Attachment: เลือกรูปหรือเปิดกล้อง
- Next Target:
  - Send to QC
  - Send to Production Confirm

หลัง save:

- insert `tb_job_request_maintenance_result`
- insert `tb_job_request_history`
- ถ้า send QC:
  - status = sent_to_qc
  - currentDepartment = qc
  - ส่ง Socket.IO ไป QC room
  - QC ได้เสียงแจ้งเตือน + SweetAlert2 popup
- ถ้า send Production:
  - status = sent_to_production
  - currentDepartment = production
  - ส่ง Socket.IO ไป Production room
  - Production ได้เสียงแจ้งเตือน + SweetAlert2 popup

ข้อมูลที่ส่งต่อ:

- Production Request detail
- Maintenance repair result
- Attachment ทุกขั้น
- History timeline ทั้งหมด

### 4. QC Inspection

QC เห็นงานที่ Maintenance ส่งมา

เมื่อกดรับ:

- ต้องเลือก QC Worker หรือ Emp ID
- status = qc_accepted
- เพิ่ม history `qc_accepted`

ตอนตรวจสอบ:

- Check Item: searchable dropdown ตาม Machine Type
- QC Result:
  - Not pass - return to Maintenance
  - Send to Production Confirm
  - Pass - close job
- Remark
- Attachment: เลือกรูปหรือเปิดกล้อง

ผลลัพธ์:

4.1 ไม่ผ่าน ส่งกลับ Maintenance

- status = qc_rejected
- currentDepartment = maintenance
- เพิ่ม history `qc_rejected_to_maintenance`
- ส่ง Socket.IO ไป Maintenance พร้อมเสียงและ popup
- เข้า loop Maintenance อีกครั้ง

4.2 ส่งให้ Production Confirm

- status = sent_to_production
- currentDepartment = production
- เพิ่ม history `qc_sent_to_production`
- ส่ง Socket.IO ไป Production พร้อมเสียงและ popup

4.3 ผ่านและจบงาน

- status = completed
- currentDepartment = none
- เพิ่ม history `qc_completed_job`

### 5. Production Confirm

Production เห็นงานที่ Maintenance หรือ QC ส่งมา

ต้องกรอก:

- Production Worker / Emp ID
- Confirm Result: searchable dropdown จาก `tbm_job_request_production_confirm_result`
- Remark
- Attachment: เลือกรูปหรือเปิดกล้อง

ทางเลือก:

5.1 ไม่ผ่าน ส่งกลับ Maintenance

- status = production_rejected_to_maintenance
- currentDepartment = maintenance
- เพิ่ม history
- ส่ง Socket.IO ไป Maintenance พร้อมเสียงและ popup
- เข้า loop Maintenance

5.2 ไม่ผ่าน ส่งให้ QC

- status = production_rejected_to_qc
- currentDepartment = qc
- เพิ่ม history
- ส่ง Socket.IO ไป QC พร้อมเสียงและ popup
- เข้า loop QC

5.3 ผ่าน จบงาน

- status = completed
- เพิ่ม history `production_completed_job`

## Shift Handover Plan

ต้องมีหน้า Shift Handover สำหรับ Production, Maintenance, QC

ปัญหาที่ต้องจัดการ:

- งานค้างระหว่างกะ
- คนรับงานเดิมเลิกกะ
- งานซ่อมยังไม่เสร็จ
- งานอยู่ระหว่างรอ QC/Production Confirm
- งาน popup แจ้งเตือนแล้วแต่ยังไม่มีคนรับ

แนวทาง:

- ทุกหน่วยงานมีหน้า `Shift Handover`
- ผู้ส่งกะเลือก Shift ปัจจุบัน, ผู้รับกะ, และรายการงานค้าง
- ระบบดึง active jobs ของหน่วยงานนั้นให้อัตโนมัติ
- ผู้ส่งกะใส่ summary หรือ remark
- ผู้รับกะกดยืนยันรับต่อ
- หลังยืนยัน ระบบเพิ่ม history action `shift_handover`
- ถ้ามี currentAssignee เดิม ให้เปลี่ยนเป็น assignee ใหม่เฉพาะงานที่เลือก
- ส่ง Socket.IO ไปผู้รับกะหรือ department room

Field ที่ควรมี:

- Department
- Shift
- Handover From
- Handover To
- Active Jobs
- Important Remark
- Attachment optional

## Realtime Notification Plan

ใช้ Socket.IO room ตามหน่วยงาน:

- production
- maintenance
- qc
- admin

Event หลัก:

- job-request:created
- job-request:maintenance-accepted
- job-request:sent-to-maintenance
- job-request:sent-to-qc
- job-request:sent-to-production
- job-request:completed
- job-request:cancelled
- job-request:shift-handover

Frontend behavior:

- เมื่อได้รับ event ของหน่วยงานตัวเอง ให้เล่นเสียงแจ้งเตือน
- แสดง SweetAlert2 popup กลางจอ
- Popup ต้องแสดง:
  - Request No
  - Area
  - Machine Type
  - Machine No
  - Problem
  - Priority
  - Current Status
  - ปุ่ม View Detail
- ถ้า user อยู่คนละหน้า ให้ popup ยังขึ้นได้
- ถ้า user ไม่ได้ login หน่วยงานนั้น ไม่ต้องรับ event

## Attachment And Camera Plan

ทุก step รองรับ:

- Upload image
- Open camera
- Preview image ก่อนบันทึก
- ลบรูปก่อน submit
- บันทึก path ใน backend image folder แยก feature

Folder:

- `backend/images/job-request/production`
- `backend/images/job-request/maintenance`
- `backend/images/job-request/qc`
- `backend/images/job-request/handover`

## Dashboard Plan

### Header Summary

หน้า Dashboard ควรมี summary card:

- Total Requests
- Pending Maintenance
- Waiting QC
- Waiting Production Confirm
- Completed
- Cancelled
- Average Repair Time
- Over SLA

Filter:

- Year
- Month หรือ All Months
- Department scope ตามสิทธิ์
- จำค่า filter ใน localStorage

### Tab 1: Machine Analyze

Chart layout:

- ชั้นที่ 1 ใช้ bar chart กว้าง 100%
- ชั้นที่ 2-4 ใช้ bar chart 70% และ pie chart 30%
- ทุกชั้นต้องมี back button แบบเลือกกลับไป layer ที่ต้องการ
- ใช้คำ button:
  - Back to Daily
  - Back to Area
  - Back to Machine Type
  - Back to Machine No

Status ที่ใช้ในกราฟ:

- request
- cancel
- success

#### Layer 1: Daily Analyze

Filter เดือนหรือ All Months ในปีนั้น

- X axis: จำนวนครั้งที่ซ่อม
- Y axis: วันที่ในเดือน หรือเดือนถ้าเลือก All Months
- Series: request, cancel, success
- ไม่มี pie chart
- Bar chart กว้าง 100%

Click day/month เพื่อไป Layer 2

#### Layer 2: Area Analyze

- X axis: จำนวนครั้งที่ซ่อม
- Y axis: Area
- Series: request, cancel, success
- Pie chart: สัดส่วนแต่ละ Area

Click Area เพื่อไป Layer 3

#### Layer 3: Machine Type Analyze

- X axis: จำนวนครั้งที่ซ่อม
- Y axis: Machine Type ใน Area ที่เลือก
- Series: request, cancel, success
- Pie chart: สัดส่วนแต่ละ Machine Type

Click Machine Type เพื่อไป Layer 4

#### Layer 4: Machine No Analyze

- X axis: จำนวนครั้งที่ซ่อม
- Y axis: Machine No ใน Machine Type ที่เลือก
- Series: request, cancel, success
- Pie chart: สัดส่วนแต่ละ Machine No

Click Machine No เพื่อดูรายการ request ที่เกี่ยวข้องใน modal หรือ side panel

### Tab 2: Worker Analyze

สร้าง tab และ route ไว้ก่อน แต่ยังไม่ทำกราฟ

อนาคตจะใช้วิเคราะห์:

- จำนวนงานที่รับต่อคน
- เวลาเฉลี่ยซ่อมต่อคน
- งานที่ rework
- งานที่เกิน SLA
- งานที่ส่งกลับจาก QC/Production

## Histories Page

หน้า Histories ใช้ดูประวัติการซ่อมงานทั้งหมด

Filter:

- Department
- Area
- Machine Type
- Machine No
- Status
- Date From
- Date To

ต้องจำค่า filter ใน localStorage

Pagination:

- โหลดข้อมูลเฉพาะหน้าที่แสดง
- ไม่โหลดทั้งหมดแล้วค่อย slice ที่ frontend

Table columns:

- No
- Request No
- Request Date
- Department
- Area
- Machine Type
- Machine No
- Problem
- Current Status
- Last Action
- Last Actor
- Updated At
- Action Detail

Detail view:

- แสดง timeline จาก `tb_job_request_history`
- แสดงรูปทุกขั้น
- แสดงข้อมูล Production Request
- แสดง Maintenance result
- แสดง QC result
- แสดง Production confirm
- แสดง Shift handover history

## Admin Mode Plan

เพิ่ม sidebar แยกหัวข้อ:

### Production Master

- Area
- Machine Type
- Machine No
- Problem List
- Priority
- Production Confirm Result

### Maintenance Master

- Worker
- Downtime by Machine Type
- Root Cause by Machine Type
- Repair Action by Machine Type
- Maintenance Result

### QC Master

- Worker
- QC Check Item by Machine Type
- QC Result

### Shift Master

- Shift by Department
- Handover Setting

### Worker Master

- Worker CRUD
- Emp ID
- Name
- Department
- Position
- Image
- Status

### Notification Setting

- Enable sound
- Sound file
- Popup duration
- Department room mapping

## API Plan

Production:

- `POST /api/job-request/requests`
- `GET /api/job-request/production/incoming`
- `POST /api/job-request/:id/production-confirm`

Maintenance:

- `GET /api/job-request/maintenance/incoming`
- `PUT /api/job-request/:id/maintenance-accept`
- `POST /api/job-request/:id/maintenance-result`

QC:

- `GET /api/job-request/qc/incoming`
- `PUT /api/job-request/:id/qc-accept`
- `POST /api/job-request/:id/qc-result`

Dashboard:

- `GET /api/job-request/dashboard/summary`
- `GET /api/job-request/dashboard/machine-analyze`
- `GET /api/job-request/dashboard/machine-analyze/:layer`

Histories:

- `GET /api/job-request/histories`
- `GET /api/job-request/histories/:id`

Shift:

- `GET /api/job-request/shift/active-jobs`
- `POST /api/job-request/shift/handover`
- `PUT /api/job-request/shift/handover/:id/accept`

Attachments:

- `POST /api/job-request/attachments`

Master:

- CRUD endpoint แยกตาม resource เช่น `/api/job-request/admin/areas`

## Phase Plan

### Phase 1: Foundation

- สร้าง migration tables
- Seed mock master data
- เพิ่ม auth/session role สำหรับ Production, Maintenance, QC, Super Admin
- เพิ่ม worker master
- เพิ่ม image folder
- Unit test database scripts และ auth

### Phase 2: Production Request

- Backend create request
- Frontend Production Request form
- searchable dropdown
- localStorage remember Area + Machine Type
- image/camera attachment
- socket notify Maintenance
- unit test endpoint + helper

### Phase 3: Maintenance Flow

- Maintenance incoming page
- Accept job
- Repair result form
- Send to QC หรือ Production
- socket notify target department
- history timeline
- unit test

### Phase 4: QC Flow

- QC incoming page
- Accept job
- QC inspection form
- Return to Maintenance, Send Production, Close job
- socket notify
- history timeline
- unit test

### Phase 5: Production Confirm

- Production confirm page
- Pass close job
- Fail to Maintenance
- Fail to QC
- socket notify
- unit test

### Phase 6: Shift Handover

- Shift handover page ทั้ง 3 หน่วยงาน
- active jobs transfer
- handover history
- socket notify receiver
- unit test

### Phase 7: Admin Mode Extension

- เพิ่ม sidebar admin ตามหน่วยงาน
- CRUD master ทุกหมวด
- Worker CRUD พร้อมรูป
- unit test endpoint

### Phase 8: Dashboard

- Machine Analyze layer 1-4
- localStorage filter
- summary header
- drilldown
- responsive chart
- unit test calculation

### Phase 9: Histories

- Histories page
- filter Department, Area, Type, Machine No
- localStorage filters
- pagination server-side
- detail timeline
- unit test filters

### Phase 10: Realtime QA + Polish

- ตรวจ socket ทุกหน่วยงาน
- ตรวจเสียงแจ้งเตือน
- ตรวจ SweetAlert2 popup
- ตรวจ responsive
- run full test + build
- Browser QA ทุก flow

## จุดที่ต้องระวัง

- ห้ามให้หน่วยงานเห็นหน้าของหน่วยงานอื่น ยกเว้น super admin
- ทุกการส่งต่องานต้องมี history
- ทุกการรับงานต้องระบุคนรับ
- ทุก loop กลับ Maintenance/QC/Production ต้องเก็บว่าเป็นรอบที่เท่าไหร่
- การต่อกะต้องไม่ทำให้ owner งานหาย
- Dashboard ต้องใช้ server aggregation ไม่โหลดทุก record มาคำนวณหน้าเว็บ
- Histories ต้อง pagination ที่ backend
- รูปภาพต้องจัดเก็บแยก folder ตาม feature และ step
- SweetAlert2 และเสียงต้องทำงานเฉพาะ department ที่เกี่ยวข้อง

## Open Questions And Recommended Decisions

ส่วนนี้คือจุดที่ยังควรถามหรือกำหนดให้ชัดก่อนเริ่ม implementation จริง ถ้ายังไม่มีคำตอบ ให้ใช้ค่าในหัวข้อ "Recommended decision" เป็น default เพื่อให้ระบบเดินต่อได้อย่างเป็นระเบียบ

### 1. Job Request Cancel

Question:

- ใครสามารถ cancel งานได้บ้าง และ cancel ได้ถึงขั้นตอนไหน

Recommended decision:

- Production admin, Maintenance admin, QC admin และ Super Admin สามารถ cancel ได้
- User ทั่วไป cancel ได้เฉพาะงานที่ตัวเองสร้างและยังไม่มี Maintenance กดรับ
- ถ้า Maintenance รับงานแล้ว ต้องให้ admin เท่านั้นเป็นคน cancel
- ทุก cancel ต้องใส่ reason และบันทึกลง `tb_job_request_history`
- Status ใช้ `cancelled`

### 2. Priority And SLA

Question:

- SLA ควรนับจากเวลาไหน และใช้กับทุก priority หรือไม่

Recommended decision:

- SLA เริ่มนับจากเวลาที่ Production submit request
- SLA จบเมื่อ status เป็น `completed` หรือ `cancelled`
- SLA warning ใช้ตอนใกล้ครบ 80% ของเวลา
- SLA overdue ใช้เมื่อเกิน `slaMinutes` จาก `tbm_job_request_priority`
- Dashboard ต้องมี card `Over SLA`
- Histories ต้อง filter `SLA Status`: all, normal, warning, overdue

### 3. Rework And Loop Count

Question:

- ถ้างานวนกลับ Maintenance/QC/Production หลายรอบ ต้องนับอย่างไร

Recommended decision:

- เพิ่ม field `loopCount` ใน `tb_job_request`
- ทุกครั้งที่ QC หรือ Production ส่งกลับ Maintenance ให้เพิ่ม `loopCount + 1`
- ทุก history record ต้องเก็บ `loopNo`
- Dashboard และ Histories ควรแสดง rework count
- Worker Analyze ในอนาคตควรใช้ loop count เพื่อดูคุณภาพงานซ่อม

### 4. Work Ownership During Shift Handover

Question:

- ถ้างานยังค้างและคนเดิมออกกะ งานควรเป็นของใคร

Recommended decision:

- งานต้องไม่หายจาก department queue
- ถ้ามี handover แล้ว `currentAssigneeWorkerId` เปลี่ยนเป็นผู้รับกะใหม่
- ถ้ายังไม่มีผู้รับกะ งานยังอยู่ใน department queue แต่แสดง badge `Need Handover`
- Handover ต้องเลือกงานค้างได้หลายงาน
- Handover ต้องสร้าง history action `shift_handover`

### 5. Worker Login Vs Worker Selection

Question:

- Login เป็น account หน่วยงานแล้ว ยังต้องเลือก worker/Emp ID ทุก action หรือไม่

Recommended decision:

- ต้องเลือก worker/Emp ID ทุก action สำคัญ เช่น request, accept, repair, inspect, confirm, handover
- Login account ใช้เพื่อสิทธิ์เข้าหน้า
- Worker/Emp ID ใช้เพื่อระบุคนทำงานจริง
- ถ้า user account ผูกกับ worker ได้ ให้ default worker อัตโนมัติ แต่ยังแก้ไขได้สำหรับ leader/admin

### 6. Super Admin Visibility

Question:

- Super Admin ควรแก้ไขงาน active ได้หรือดูอย่างเดียว

Recommended decision:

- Super Admin ดูได้ทุกงานและแก้ master ได้ทุกหมวด
- Super Admin สามารถ force cancel หรือ force reassign ได้ แต่ต้องใส่ reason
- Super Admin ไม่ควรกด action แทนหน่วยงานปกติ ยกเว้น force action ที่มี audit ชัดเจน

### 7. Production Admin Scope

Question:

- Production admin จัดการ master ได้เฉพาะ Production หรือจัด machine master ทั้งหมดด้วย

Recommended decision:

- Production admin จัดการ Production master และ Machine master ได้
- Maintenance admin จัดการ Maintenance master ได้
- QC admin จัดการ QC master ได้
- Worker master เฉพาะ Super Admin หรือ Admin mode กลางเท่านั้น

### 8. Required Attachments

Question:

- รูปภาพจำเป็นทุกขั้นตอนหรือไม่

Recommended decision:

- Production Request: optional แต่แนะนำ
- Maintenance Repair Result: required อย่างน้อย 1 รูป ถ้าเลือกส่งต่อ QC หรือ Production
- QC Inspection: required อย่างน้อย 1 รูป
- Production Confirm: optional ถ้าผ่าน, required ถ้าไม่ผ่าน
- Shift Handover: optional

### 9. Notification Acknowledgement

Question:

- Popup แจ้งเตือนต้องกดรับทราบหรือหายเอง

Recommended decision:

- SweetAlert2 popup ต้องมีปุ่ม `View Job` และ `Dismiss`
- เสียงแจ้งเตือนเล่น 1 รอบต่อ event
- ถ้าไม่มีคนกดรับงานภายใน SLA warning time ให้ส่ง reminder ซ้ำไป department room
- เก็บ notification log ใน `tb_job_request_notification`

ตาราง `tb_job_request_notification`

- id
- requestId
- eventCode
- targetDepartment
- targetWorkerId
- isRead
- readAt
- createdAt

### 10. Job Number Format

Question:

- Request No ควรออกเลขอย่างไร

Recommended decision:

- ใช้ format `JR-YYYYMMDD-####`
- เลข running แยกตามวัน
- ต้อง unique ใน database
- สร้างจาก backend เท่านั้น ห้าม frontend สร้างเอง

### 11. Machine Down Time Calculation

Question:

- Downtime เริ่มและจบเวลาไหน

Recommended decision:

- `downStartAt` เริ่มตอน Production submit request
- `repairStartAt` เริ่มตอน Maintenance accept
- `repairEndAt` ตอน Maintenance submit repair result
- `downEndAt` ตอน job completed หรือ cancelled
- Dashboard ควรแยก:
  - total downtime
  - maintenance repair time
  - waiting time by department

### 12. Searchable Dropdown Data Source

Question:

- Dropdown ควรโหลดทั้งหมดหรือค้นจาก server

Recommended decision:

- Master ขนาดเล็ก เช่น priority/result โหลดทั้งหมดได้
- Master ที่อาจโต เช่น worker, machine no, problem ให้ค้นจาก server ด้วย query `q`
- Dropdown ต้อง debounce 250 ms
- Dropdown ต้องจำค่าล่าสุดใน localStorage เฉพาะ Area และ Machine Type ตามที่กำหนด

### 13. Camera And Image Limit

Question:

- จำกัดจำนวนรูปและขนาดไฟล์อย่างไร

Recommended decision:

- จำกัดรูปไม่เกิน 5 รูปต่อ step
- ขนาดไฟล์ไม่เกิน 5 MB ต่อรูป
- รองรับ jpg, png, webp
- Backend เก็บเป็น local image path ใน `backend/images/job-request/{step}`
- Database เก็บเฉพาะ path และ metadata

### 14. Histories Permission

Question:

- หน่วยงานดู history ข้ามหน่วยงานได้ไหม

Recommended decision:

- Production เห็น history เฉพาะงานที่เกี่ยวข้องกับ Production ของตัวเอง
- Maintenance เห็น history เฉพาะงานที่เคยเข้าคิว Maintenance หรือกำลังอยู่ Maintenance
- QC เห็น history เฉพาะงานที่เคยเข้าคิว QC หรือกำลังอยู่ QC
- Super Admin เห็นทั้งหมด

### 15. Dashboard Permission

Question:

- Dashboard แสดงข้อมูลทุกหน่วยงานหรือเฉพาะหน่วยงานที่ login

Recommended decision:

- Production/Maintenance/QC admin เห็น dashboard เฉพาะ scope ที่เกี่ยวข้องกับหน่วยงานตัวเอง
- Super Admin เห็นทุก scope และมี filter department
- User ทั่วไปไม่ควรเห็น dashboard ระดับรวม ถ้าไม่มีสิทธิ admin

### 16. Master Data Delete Policy

Question:

- Master data ลบจริงหรือ inactive

Recommended decision:

- ห้าม hard delete master data ที่ถูกใช้งานแล้ว
- ใช้ `status = inactive`
- ถ้ายังไม่เคยถูกใช้งาน สามารถ delete ได้เฉพาะ Super Admin
- CRUD page ต้องแสดง inactive filter

### 17. Audit Fields

Question:

- ทุก table ต้องเก็บ created/updated โดยใครหรือไม่

Recommended decision:

- Master table ต้องมี `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- Transaction table ต้องมี actor ชัดเจนผ่าน workerId/empId และ history
- Admin force action ต้องมี reason เสมอ

### 18. สิ่งที่ควรเพิ่มเข้า Phase Plan

Recommended additions:

- เพิ่ม Phase 0: Confirm Decisions And Data Contract
- เพิ่ม Phase 1.5: Notification Foundation
- เพิ่ม Phase 6.5: Rework Loop And SLA Hardening
- เพิ่ม Phase 8.5: Dashboard Aggregation Endpoints

Phase 0: Confirm Decisions And Data Contract

- สรุป decision จากหัวข้อนี้
- lock status enum
- lock permission matrix
- lock request lifecycle diagram
- lock database naming

Phase 1.5: Notification Foundation

- สร้าง Socket.IO room ตาม department
- สร้าง notification service
- สร้าง frontend notification listener
- เพิ่มเสียงแจ้งเตือน
- เพิ่ม SweetAlert2 popup
- unit test notification payload

Phase 6.5: Rework Loop And SLA Hardening

- เพิ่ม loopCount
- เพิ่ม SLA calculation
- เพิ่ม warning/overdue status
- เพิ่ม reminder notification
- unit test loop/SLA

Phase 8.5: Dashboard Aggregation Endpoints

- ทำ endpoint aggregate สำหรับ layer 1-4
- ห้าม frontend โหลด raw records ทั้งหมดมาคำนวณ
- unit test aggregation query/filter
