const {
  createJobRequest,
  getJobRequestDashboard,
  listIssuedSpareParts,
  listJobRequestHandovers,
  listJobRequestHistory,
  listJobRequestOptions,
  listJobRequests,
  transitionJob
} = require("../repositories/jobRequestRepository");
const { emitJobRequestEvent, emitRealtimeEvent } = require("../socket");

function statusToSection(status) {
  if (status === "WAIT_MM" || status === "MM_REPAIR") return "maintenance";
  if (status === "WAIT_QC" || status === "QC_INSPECTION") return "qc";
  if (status === "WAIT_PROD_CONFIRM" || status === "PROD_CONFIRMING") return "production";
  return "production";
}

async function list(req, res, next) {
  try {
    const data = await listJobRequests(req.query);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await createJobRequest(req.body);
    const io = req.app.get("io");

    if (io) {
      emitJobRequestEvent(io, "new_job_request", {
        jobNo: result.jobNo,
        status: result.status,
        toSection: "maintenance",
        toSections: ["maintenance"],
        job: result
      });
      emitRealtimeEvent(io, {
        feature: "job-request",
        scopes: ["maintenance", "all"],
        event: "new_job_request",
        payload: { jobNo: result.jobNo, status: result.status, job: result }
      });
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const data = await getJobRequestDashboard(req.query);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function handovers(req, res, next) {
  try {
    const data = await listJobRequestHandovers();
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function history(req, res, next) {
  try {
    const data = await listJobRequestHistory(req.params.jobNo);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function options(req, res, next) {
  try {
    const data = await listJobRequestOptions();
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function issuedSpareParts(req, res, next) {
  try {
    const data = await listIssuedSpareParts(req.params.jobNo);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function action(req, res, next) {
  try {
    const result = await transitionJob(req.params.jobNo, req.body);
    const targetSection = statusToSection(result.status);
    const io = req.app.get("io");

    if (io) {
      emitJobRequestEvent(io, req.body.eventName || "job_request_updated", {
        jobNo: result.jobNo,
        status: result.status,
        toSection: targetSection,
        toSections: [targetSection],
        job: result
      });
      emitRealtimeEvent(io, {
        feature: "job-request",
        scopes: [targetSection, "all"],
        event: req.body.eventName || "job_request_updated",
        payload: { jobNo: result.jobNo, status: result.status, job: result }
      });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  action,
  create,
  dashboard,
  handovers,
  history,
  issuedSpareParts,
  list,
  options
};
