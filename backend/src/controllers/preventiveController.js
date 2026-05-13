const {
  createChecklistItem,
  createInspection,
  createPlan,
  createPmType,
  deleteChecklistItem,
  deletePmType,
  listBootstrap,
  listHistory,
  updateChecklistItem,
  updatePmType
} = require("../repositories/preventiveRepository");
const { emitRealtimeEvent } = require("../socket");

function emitPreventive(req, event, payload) {
  const io = req.app.get("io");

  if (io) {
    emitRealtimeEvent(io, {
      feature: "preventive",
      scopes: ["all"],
      event,
      payload
    });
  }
}

async function bootstrap(req, res, next) {
  try {
    return res.json(await listBootstrap());
  } catch (error) {
    return next(error);
  }
}

async function history(req, res, next) {
  try {
    return res.json(await listHistory(req.query));
  } catch (error) {
    return next(error);
  }
}

async function createType(req, res, next) {
  try {
    const result = await createPmType(req.body);
    emitPreventive(req, "preventive:changed", { type: "pm-type-created", data: result });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateType(req, res, next) {
  try {
    const result = await updatePmType(req.params.id, req.body);
    emitPreventive(req, "preventive:changed", { type: "pm-type-updated", data: result });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function removeType(req, res, next) {
  try {
    const result = await deletePmType(req.params.id);
    emitPreventive(req, "preventive:changed", { type: "pm-type-deleted", id: req.params.id });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function createChecklist(req, res, next) {
  try {
    const result = await createChecklistItem(req.params.pmTypeId, req.body);
    emitPreventive(req, "preventive:changed", { type: "checklist-created", data: result });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateChecklist(req, res, next) {
  try {
    const result = await updateChecklistItem(req.params.itemId, req.body);
    emitPreventive(req, "preventive:changed", { type: "checklist-updated", data: result });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function removeChecklist(req, res, next) {
  try {
    const result = await deleteChecklistItem(req.params.itemId);
    emitPreventive(req, "preventive:changed", { type: "checklist-deleted", id: req.params.itemId });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function createPlanRecord(req, res, next) {
  try {
    const result = await createPlan(req.body);
    emitPreventive(req, "preventive:changed", { type: "plan-created", data: result });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function submitInspection(req, res, next) {
  try {
    const result = await createInspection(req.params.planId, req.body);
    emitPreventive(req, "preventive:changed", { type: "inspection-submitted", data: result });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  bootstrap,
  createChecklist,
  createPlanRecord,
  createType,
  history,
  removeChecklist,
  removeType,
  submitInspection,
  updateChecklist,
  updateType
};
