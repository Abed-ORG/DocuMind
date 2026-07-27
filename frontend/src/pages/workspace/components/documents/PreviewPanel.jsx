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

  return (
    <aside className="preview-panel" aria-label="Document preview">
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

      <div className="preview-content">
        {isLoading ? (
          <div className="preview-state">
            <Loader2 className="spinner" size={34} />
            <h3>Loading preview</h3>
            <p>
              Reading extracted text from this document.
            </p>
          </div>
        ) : error ? (
          <div className="preview-state preview-error">
            <AlertCircle size={34} />
            <h3>Unable to load preview</h3>
            <p>{error}</p>
          </div>
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
    </aside>
  );
}

export default PreviewPanel;
