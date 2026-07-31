import {
  AlertCircle,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { statusLabels } from "../../data/workspaceData";

function CsvPreviewTable({ table }) {
  const columns = Array.isArray(table?.columns)
    ? table.columns
    : [];
  const rows = Array.isArray(table?.rows)
    ? table.rows
    : [];

  return (
    <div className="csv-preview">
      <div className="csv-preview-summary">
        <span>{rows.length} rows shown</span>
        <span>{columns.length} columns shown</span>
        {table?.isTruncated && (
          <span className="csv-preview-limited">
            Preview limited
          </span>
        )}
      </div>

      <div className="csv-table-scroll">
        <table className="csv-preview-table">
          <thead>
            <tr>
              <th className="csv-row-number">#</th>
              {columns.map((column, index) => (
                <th key={`${column}-${index}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="csv-row-number">
                  {row.rowNumber}
                </td>
                {columns.map((_, index) => {
                  const value = row.cells?.[index] ?? "";

                  return (
                    <td
                      key={`${row.rowNumber}-${index}`}
                      title={value}
                    >
                      {value || "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewPanel({
  document,
  error,
  fileUrl = "",
  html = "",
  isLoading,
  pages,
  previewType = "text",
  table,
  onClose,
}) {
  if (!document) {
    return null;
  }

  const previewPages = Array.isArray(pages)
    ? pages
    : [];
  const hasTablePreview =
    previewType === "table" &&
    Array.isArray(table?.columns) &&
    table.columns.length > 0;
  const isFilePreview = previewType === "file";
  const hasFilePreview =
    isFilePreview && Boolean(fileUrl);
  const hasHtmlPreview =
    previewType === "html" && Boolean(html);
  const previewPanelClassName = hasFilePreview
    ? "preview-panel preview-panel-file"
    : "preview-panel";
  const htmlPreviewDocument = hasHtmlPreview
    ? `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            :root { color-scheme: light; }
            body {
              margin: 0;
              padding: 44px;
              color: #111827;
              background: #ffffff;
              font-family: Georgia, "Times New Roman", serif;
              font-size: 16px;
              line-height: 1.65;
            }
            h1, h2, h3, h4, h5, h6 {
              margin: 1.1em 0 0.45em;
              color: #111827;
              line-height: 1.2;
            }
            h1 { font-size: 2rem; }
            h2 { font-size: 1.55rem; }
            h3 { font-size: 1.25rem; }
            p { margin: 0 0 0.85em; }
            table {
              width: 100%;
              margin: 1em 0;
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 0.95rem;
            }
            th, td {
              padding: 9px 10px;
              border: 1px solid #d1d5db;
              text-align: left;
              vertical-align: top;
            }
            th {
              color: #111827;
              background: #f3f4f6;
              font-weight: 700;
            }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${html}</body>
      </html>`
    : "";

  return (
    <div
      className="preview-modal-backdrop"
      role="presentation"
    >
      <section
        className={previewPanelClassName}
        aria-label="Document preview"
        aria-modal="true"
        role="dialog"
      >
        {isFilePreview ? (
          <button
            className="icon-button preview-file-close"
            type="button"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        ) : (
          <header className="preview-header">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>{document.name}</h2>
              <div className="preview-meta">
                <span className="badge neutral">
                  {document.format}
                </span>
                <span
                  className={`badge status-${document.status}`}
                >
                  {statusLabels[document.status] ??
                    document.status}
                </span>
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close preview"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </header>
        )}

        <div className="preview-content">
          {isLoading ? (
            <div className="preview-state">
              <Loader2 className="spinner" size={34} />
              <h3>Loading preview</h3>
              <p>
                Preparing the most faithful preview
                available for this document.
              </p>
            </div>
          ) : error ? (
            <div className="preview-state preview-error">
              <AlertCircle size={34} />
              <h3>Unable to load preview</h3>
              <p>{error}</p>
            </div>
          ) : hasFilePreview ? (
            <iframe
              className="preview-file-frame"
              title={`${document.name} preview`}
              src={fileUrl}
            />
          ) : hasHtmlPreview ? (
            <iframe
              className="preview-html-frame"
              title={`${document.name} preview`}
              sandbox=""
              srcDoc={htmlPreviewDocument}
            />
          ) : hasTablePreview ? (
            <CsvPreviewTable table={table} />
          ) : previewPages.length === 0 ? (
            <div className="preview-state">
              <FileText size={34} />
              <h3>No preview available</h3>
              <p>
                This document does not have extracted text
                available yet.
              </p>
            </div>
          ) : (
            previewPages.map((page, index) => (
              <section
                className="preview-page"
                key={`${page.pageNumber}-${index}`}
              >
                <div className="page-separator">
                  Page {page.pageNumber}
                </div>
                <pre className="preview-text-block">
                  {page.text}
                </pre>
                {page.isTruncated && (
                  <p className="preview-truncated-note">
                    Preview truncated to keep this panel fast.
                  </p>
                )}
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default PreviewPanel;
