export const jobRequestStatuses = [
  { key: "total", label: "Total Request", tone: "border-slate-200 bg-white", bar: "bg-slate-900" },
  { key: "waitMm", label: "Wait MM", tone: "border-amber-200 bg-amber-50", bar: "bg-amber-500" },
  { key: "mmRepair", label: "MM Repair", tone: "border-blue-200 bg-blue-50", bar: "bg-blue-600" },
  { key: "waitQc", label: "Wait QC", tone: "border-violet-200 bg-violet-50", bar: "bg-violet-600" },
  { key: "qcInspection", label: "QC Inspection", tone: "border-fuchsia-200 bg-fuchsia-50", bar: "bg-fuchsia-600" },
  { key: "waitProd", label: "Wait Prod", tone: "border-cyan-200 bg-cyan-50", bar: "bg-cyan-600" },
  { key: "prodConfirming", label: "Prod Confirming", tone: "border-indigo-200 bg-indigo-50", bar: "bg-indigo-600" },
  { key: "completed", label: "Completed", tone: "border-emerald-200 bg-emerald-50", bar: "bg-emerald-600" }
];

export const jobRequestSections = [
  {
    key: "dashboard",
    title: "Job Request Dashboard",
    shortTitle: "Dashboard",
    href: "/job-request/dashboard",
    icon: "DB",
    subtitle: "Analyze repair problems, bottlenecks, and turnaround time",
    accent: "bg-slate-950",
    ring: "ring-slate-200",
    primaryAction: ""
  },
  {
    key: "handover",
    title: "Job Handover",
    shortTitle: "Handover",
    href: "/job-request/handover",
    icon: "HO",
    subtitle: "Transfer unfinished jobs to the next responsible person",
    accent: "bg-teal-600",
    ring: "ring-teal-200",
    primaryAction: "New Handover"
  },
  {
    key: "production",
    title: "Production Request",
    shortTitle: "Production",
    href: "/job-request/production",
    icon: "PR",
    subtitle: "Create requests and confirm repaired machines",
    accent: "bg-sky-600",
    ring: "ring-sky-200",
    primaryAction: "New Request"
  },
  {
    key: "maintenance",
    title: "Maintenance Repair",
    shortTitle: "Maintenance",
    href: "/job-request/maintenance",
    icon: "MM",
    subtitle: "Accept, repair, and route jobs to the next owner",
    accent: "bg-amber-500 text-slate-950",
    ring: "ring-amber-200",
    primaryAction: ""
  },
  {
    key: "qc",
    title: "QC Inspection",
    shortTitle: "QC",
    href: "/job-request/qc",
    icon: "QC",
    subtitle: "Inspect repaired machines and approve readiness",
    accent: "bg-violet-600",
    ring: "ring-violet-200",
    primaryAction: ""
  }
];

export const jobRequestRejectRoutes = {
  qc: {
    fromSection: "QC",
    targetSection: "MM",
    targetStatus: "MM_REPAIR",
    progressColumn: "qc"
  },
  production: {
    fromSection: "Production",
    targetSection: "QC",
    targetStatus: "WAIT_QC",
    progressColumn: "prod"
  }
};

export const jobRequestTableColumns = [
  { key: "no", label: "No" },
  { key: "jobNo", label: "Job No" },
  { key: "status", label: "Status" },
  { key: "machineName", label: "Machine Name" },
  { key: "machineCode", label: "Machine Code" },
  { key: "productionLine", label: "Production Line" },
  { key: "area", label: "Area" },
  { key: "priority", label: "Priority" },
  { key: "requestBy", label: "Request By" },
  { key: "prodProgress", label: "Prod" },
  { key: "mmProgress", label: "MM" },
  { key: "qcProgress", label: "QC" },
  { key: "action", label: "Available Action" }
];

export const jobRequestHandoverColumns = [
  { key: "no", label: "No" },
  { key: "jobNo", label: "Job No" },
  { key: "status", label: "Status" },
  { key: "currentOwner", label: "Current Owner" },
  { key: "handoverFrom", label: "Handover From" },
  { key: "handoverTo", label: "Handover To" },
  { key: "reason", label: "Reason" },
  { key: "shiftName", label: "Shift" },
  { key: "createdAt", label: "Created At" },
  { key: "action", label: "Action" }
];

export const jobRequestPriorityRank = {
  Urgent: 1,
  High: 2,
  Medium: 3,
  Low: 4
};

export const jobRequestFieldRules = {
  autoRun: ["jobNo", "requestedAt", "acceptAt", "history timestamp"],
  searchableDropdown: [
    "empId",
    "area",
    "machineType",
    "machineNo",
    "problem",
    "priority",
    "maintenancePic",
    "repairCause",
    "repairAction",
    "issuedSparePartUsed",
    "qcResult",
    "qcFinding",
    "qcRejectReason",
    "confirmResult",
    "confirmCheck",
    "productionRejectReason",
    "handoverTo",
    "handoverPendingItem"
  ],
  autoFill: ["machineNo from machineType", "machineType from machineNo", "area from machineNo", "spare part options from tooling issue records"]
};

export const jobRequestMultiSelectFields = [
  "problem",
  "repairCause",
  "repairAction",
  "issuedSparePartUsed",
  "qcFinding",
  "qcRejectReason",
  "confirmCheck",
  "productionRejectReason",
  "handoverPendingItem"
];

export const jobRequestPerformanceStatusKeys = [
  { key: "waitMm", label: "Wait MM", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "mmRepair", label: "MM Repair", tone: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "waitQc", label: "Wait QC", tone: "border-violet-200 bg-violet-50 text-violet-700" },
  { key: "qcInspection", label: "QC Inspection", tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" },
  { key: "waitProd", label: "Wait Prod", tone: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  { key: "prodConfirming", label: "Prod Confirming", tone: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  { key: "completed", label: "Completed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
];

export function getJobRequestSection(key) {
  return jobRequestSections.find((section) => section.key === key) || null;
}

export function getJobRequestSectionsForScope(scope) {
  if (scope === "all") {
    return jobRequestSections;
  }

  return jobRequestSections.filter((section) => ["dashboard", "handover", scope].includes(section.key));
}

export function getJobRequestTableColumns() {
  return jobRequestTableColumns;
}

export function getAvailableJobAction(sectionKey, status) {
  const permissionMap = {
    production: {
      WAIT_MM: "View / Cancel",
      MM_REPAIR: "View",
      WAIT_QC: "View",
      QC_INSPECTION: "View",
      WAIT_PROD_CONFIRM: "Accept",
      PROD_CONFIRMING: "Confirm / Reject",
      COMPLETED: "View",
      CANCELLED: "View"
    },
    maintenance: {
      WAIT_MM: "Accept Job",
      MM_REPAIR: "Repair / Send",
      WAIT_QC: "View",
      QC_INSPECTION: "View",
      WAIT_PROD_CONFIRM: "View",
      PROD_CONFIRMING: "View",
      COMPLETED: "View",
      CANCELLED: "View"
    },
    qc: {
      WAIT_MM: "View",
      MM_REPAIR: "View",
      WAIT_QC: "Accept",
      QC_INSPECTION: "Inspect",
      WAIT_PROD_CONFIRM: "View",
      PROD_CONFIRMING: "View",
      COMPLETED: "View",
      CANCELLED: "View"
    },
    handover: {
      WAIT_MM: "Handover",
      MM_REPAIR: "Handover",
      WAIT_QC: "Handover",
      QC_INSPECTION: "Handover",
      WAIT_PROD_CONFIRM: "Handover",
      PROD_CONFIRMING: "Handover",
      COMPLETED: "View",
      CANCELLED: "View"
    }
  };

  return permissionMap[sectionKey]?.[status] || "View";
}

export function getJobRequestRejectRoute(sectionKey) {
  return jobRequestRejectRoutes[sectionKey] || null;
}

export function sortJobRequests(jobs) {
  return [...jobs].sort((first, second) => {
    const firstPriority = jobRequestPriorityRank[first.priority] || 99;
    const secondPriority = jobRequestPriorityRank[second.priority] || 99;

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return new Date(first.requestedAt).getTime() - new Date(second.requestedAt).getTime();
  });
}

export const jobRequestRealtimeEvents = [
  "new_job_request",
  "job_accepted",
  "job_wait_qc",
  "job_qc_accepted",
  "job_wait_confirming",
  "job_production_accepted",
  "job_rejected_by_qc",
  "job_rejected_by_production",
  "job_completed",
  "job_handover_created",
  "job-updated"
];
