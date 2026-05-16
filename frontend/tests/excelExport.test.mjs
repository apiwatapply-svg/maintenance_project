import assert from "node:assert/strict";
import test from "node:test";
import { buildExcelWorkbookHtml, excelExportInternals } from "../src/lib/excelExport.js";

test("excel export builds a styled workbook with title filters and sections", () => {
  const html = buildExcelWorkbookHtml({
    title: "MMS Table Report",
    subtitle: "Daily report",
    filters: [
      { label: "Area", value: "Line A" },
      { label: "Machine", value: "PNL-A-001" }
    ],
    sections: [
      {
        title: "Output",
        columns: [
          { key: "label", label: "Hour" },
          { key: "output", label: "Output", type: "number" }
        ],
        rows: [
          { label: "07:00", output: 100 },
          { label: "Total", output: 100, _excelType: "summary" }
        ]
      }
    ]
  });

  assert.match(html, /MMS Table Report/);
  assert.match(html, /Line A/);
  assert.match(html, /PNL-A-001/);
  assert.match(html, /border-collapse: collapse/);
  assert.match(html, /summary-row/);
  assert.match(html, /mso-number-format/);
});

test("excel export escapes cell content and normalizes filenames", () => {
  const html = buildExcelWorkbookHtml({
    title: "Unsafe <Report>",
    sections: [
      {
        title: "Rows",
        columns: [{ key: "value", label: "Value" }],
        rows: [{ value: "<script>alert('x')</script>" }]
      }
    ]
  });

  assert.match(html, /Unsafe &lt;Report&gt;/);
  assert.match(html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.equal(excelExportInternals.safeFileName("MMS Report 2026/05"), "MMS-Report-2026-05.xls");
});
