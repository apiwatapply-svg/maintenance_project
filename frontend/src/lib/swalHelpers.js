export const successAlertOptions = {
  icon: "success",
  timer: 1500,
  timerProgressBar: true,
  showConfirmButton: false
};

export function buildSuccessAlert(title, text) {
  return {
    ...successAlertOptions,
    title,
    text
  };
}
