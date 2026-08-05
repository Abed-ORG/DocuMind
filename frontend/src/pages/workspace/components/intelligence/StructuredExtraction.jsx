import {
  AlertCircle,
  Download,
  Loader2,
  Table2,
  X,
} from "lucide-react";

function StructuredExtraction({
  panelRef,
  extractionPrompt,
  extractionState,
  rows,
  onExtractionPromptChange,
  onClearDocumentFocus,
  onExtract,
  onSort,
  onExportCsv,
}) {
  const columns =
    extractionState?.columns?.length > 0
      ? extractionState.columns
      : [
          "field",
          "value",
          "type",
          "source",
        ];
  const hasRows = rows.length > 0;
  const isFocused =
    Boolean(extractionState?.documentName);
  const canExtract =
    Boolean(extractionPrompt.trim()) &&
    !extractionState?.isLoading;

  return (
    <section className="extraction-panel" ref={panelRef}>
      <header className="panel-header">
        <div>
          <p className="eyebrow">Structured Extraction</p>
          <h2>Extract review-ready fields</h2>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={onExportCsv}
          disabled={!hasRows}
        >
          <Download size={17} />
          Export CSV
        </button>
      </header>

      <div className="extract-control">
        <label htmlFor="extract-prompt">
          What do you want to extract?
        </label>
        {isFocused && (
          <div className="extraction-focus">
            <span>
              Focused on {extractionState.documentName}
            </span>
            <button
              type="button"
              onClick={onClearDocumentFocus}
              aria-label="Clear extraction document focus"
              title="Clear document focus"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div>
          <input
            id="extract-prompt"
            value={extractionPrompt}
            onChange={(event) =>
              onExtractionPromptChange(event.target.value)
            }
            placeholder="Example: all dates and dollar amounts"
          />
          <button
            className="primary-action"
            type="button"
            onClick={onExtract}
            disabled={!canExtract}
          >
            {extractionState?.isLoading ? (
              <Loader2 className="spinner" size={17} />
            ) : (
              <Table2 size={17} />
            )}
            {extractionState?.isLoading
              ? "Extracting"
              : "Extract"}
          </button>
        </div>
      </div>

      {extractionState?.error && (
        <div className="extraction-status is-error" role="alert">
          <AlertCircle size={17} />
          {extractionState.error}
        </div>
      )}

      <div className="extraction-table-wrap">
        <table className="extraction-table">
          <thead>
            <tr>
              {columns.map((key) => (
                <th key={key}>
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                  >
                    {key}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {extractionState?.isLoading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="loading-row">
                    <Loader2 className="spinner" size={18} />
                    Extracting structured rows
                  </div>
                </td>
              </tr>
            ) : hasRows ? (
              rows.map((row, index) => (
                <tr
                  key={`${row.field}-${row.source}-${index}`}
                >
                  {columns.map((column) => (
                    <td key={column}>
                      {row[column] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  {extractionState?.hasRun
                    ? "No matching rows were found in the retrieved sources."
                    : "Run extraction to populate this table."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default StructuredExtraction;
