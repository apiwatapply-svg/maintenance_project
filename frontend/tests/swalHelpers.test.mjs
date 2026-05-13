import assert from "node:assert/strict";
import test from "node:test";
import { buildConfirmAlert, buildSuccessAlert, confirmAlertOptions, successAlertOptions } from "../src/lib/swalHelpers.js";

test("success alerts auto close after 1.5 seconds without confirm button", () => {
  assert.deepEqual(successAlertOptions, {
    icon: "success",
    timer: 1500,
    timerProgressBar: true,
    showConfirmButton: false
  });
});

test("buildSuccessAlert keeps auto close behavior with message content", () => {
  assert.deepEqual(buildSuccessAlert("Saved", "Record has been saved."), {
    icon: "success",
    timer: 1500,
    timerProgressBar: true,
    showConfirmButton: false,
    title: "Saved",
    text: "Record has been saved."
  });
});

test("confirm alerts require an explicit confirm or cancel action", () => {
  assert.equal(confirmAlertOptions.showCancelButton, true);
  assert.equal(confirmAlertOptions.reverseButtons, true);
  assert.equal(confirmAlertOptions.confirmButtonText, "Confirm");
  assert.equal(confirmAlertOptions.cancelButtonText, "Cancel");
});

test("buildConfirmAlert allows context-specific labels", () => {
  assert.deepEqual(buildConfirmAlert("Submit inspection?", "This will save the PM result.", { confirmButtonText: "Submit" }), {
    ...confirmAlertOptions,
    title: "Submit inspection?",
    text: "This will save the PM result.",
    confirmButtonText: "Submit"
  });
});
