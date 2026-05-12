import assert from "node:assert/strict";
import test from "node:test";
import { buildSuccessAlert, successAlertOptions } from "../src/lib/swalHelpers.js";

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
