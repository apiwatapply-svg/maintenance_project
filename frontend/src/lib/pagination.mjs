export function clampPage(page, totalPages) {
  const maxPage = Math.max(Number(totalPages) || 1, 1);
  const currentPage = Number(page) || 1;

  return Math.min(Math.max(currentPage, 1), maxPage);
}

export function getPaginationPages(page, totalPages) {
  const maxPage = Math.max(Number(totalPages) || 1, 1);
  const currentPage = clampPage(page, maxPage);

  if (maxPage <= 7) {
    return Array.from({ length: maxPage }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", maxPage];
  }

  if (currentPage >= maxPage - 3) {
    return [1, "ellipsis-left", maxPage - 4, maxPage - 3, maxPage - 2, maxPage - 1, maxPage];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    "ellipsis-right",
    maxPage
  ];
}
