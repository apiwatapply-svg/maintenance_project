const excelMimeType = "application/vnd.ms-excel;charset=utf-8";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeFileName(value = "report") {
  const cleaned = String(value)
    .replace(/\.xls$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleaned || "report"}.xls`;
}

function normalizeColumns(columns = []) {
  return columns.map((column) => (typeof column === "string" ? { key: column, label: column } : column));
}

function getCellValue(row = {}, column = {}) {
  if (typeof column.value === "function") return column.value(row);
  return row[column.key];
}

function getColumnClass(column = {}) {
  if (column.type === "number") return "number";
  if (column.type === "percent") return "percent";
  if (column.type === "date") return "center";
  return "";
}

function getColumnStyle(column = {}) {
  const width = Number(column.width || 90);
  return `width:${width}px;`;
}

function renderFilterRows(filters = []) {
  if (!filters.length) return "";

  return `
    <table class="filter-table" cellspacing="0" cellpadding="0">
      <tbody>
        ${filters.map((item) => `
          <tr>
            <th>${escapeHtml(item.label)}</th>
            <td>${escapeHtml(item.value || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderSection(section = {}) {
  const columns = normalizeColumns(section.columns || []);
  const rows = section.rows || [];
  const title = section.title ? `<h2>${escapeHtml(section.title)}</h2>` : "";
  const meta = section.meta ? `<p class="section-meta">${escapeHtml(section.meta)}</p>` : "";

  return `
    <section>
      ${title}
      ${meta}
      <table class="data-table" cellspacing="0" cellpadding="0">
        <colgroup>
          ${columns.map((column) => `<col style="${getColumnStyle(column)}" />`).join("")}
        </colgroup>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label || column.key)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const rowClass = row._excelType === "summary" ? "summary-row" : "";
            return `
              <tr class="${rowClass}">
                ${columns.map((column) => {
                  const value = getCellValue(row, column);
                  return `<td class="${getColumnClass(column)}">${escapeHtml(value)}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </section>
  `;
}

export function buildExcelWorkbookHtml({ title, subtitle = "", filters = [], sections = [] } = {}) {
  const safeTitle = escapeHtml(title || "Report");
  const safeSubtitle = escapeHtml(subtitle);

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    @page { margin: 0.45in 0.35in; mso-page-orientation: landscape; }
    body { margin: 0; font-family: Calibri, Arial, sans-serif; color: #0f172a; background: #ffffff; }
    .report-frame { width: 100%; }
    .title-table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
    .title-table td { border: 0; }
    .title-cell { padding: 14px 16px; background: #0f172a; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0; }
    .subtitle-cell { padding: 8px 16px; background: #e0f2fe; color: #0c4a6e; font-size: 12px; font-weight: 700; }
    .filter-table { margin: 8px 0 14px; border-collapse: collapse; width: 560px; }
    .filter-table th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; width: 170px; }
    .filter-table th, .filter-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
    h2 { margin: 14px 0 4px; color: #0f172a; font-size: 15px; font-weight: 700; }
    .section-meta { margin: 0 0 6px; color: #475569; font-size: 11px; font-weight: 700; }
    .data-table { border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; }
    .data-table th { background: #164e63; color: #ffffff; font-size: 11px; font-weight: 700; text-align: center; vertical-align: middle; }
    .data-table th, .data-table td { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10.5px; line-height: 14px; vertical-align: middle; mso-number-format: "\\@"; white-space: normal; }
    .data-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .data-table .summary-row td { background: #fef3c7; color: #78350f; font-weight: 700; }
    .number, .percent { text-align: right; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <div class="report-frame">
    <table class="title-table" cellspacing="0" cellpadding="0">
      <tr><td class="title-cell">${safeTitle}</td></tr>
      ${safeSubtitle ? `<tr><td class="subtitle-cell">${safeSubtitle}</td></tr>` : ""}
    </table>
    ${renderFilterRows(filters)}
    ${sections.map(renderSection).join("")}
  </div>
</body>
</html>`;
}

export function downloadHtmlExcel(options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const html = buildExcelWorkbookHtml(options);
  const blob = new Blob([html], { type: excelMimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName(options.filename || options.title || "report");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return link.download;
}

export const excelExportInternals = {
  escapeHtml,
  safeFileName
};
