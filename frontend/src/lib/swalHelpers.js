export const successAlertOptions = {
  icon: "success",
  timer: 1500,
  timerProgressBar: true,
  showConfirmButton: false
};

export const confirmAlertOptions = {
  icon: "question",
  showCancelButton: true,
  reverseButtons: true,
  confirmButtonText: "Confirm",
  cancelButtonText: "Cancel"
};

export function buildSuccessAlert(title, text) {
  return {
    ...successAlertOptions,
    title,
    text
  };
}

export function buildConfirmAlert(title, text, options = {}) {
  return {
    ...confirmAlertOptions,
    title,
    text,
    ...options
  };
}
