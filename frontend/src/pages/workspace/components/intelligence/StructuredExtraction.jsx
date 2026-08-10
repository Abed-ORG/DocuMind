import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Table2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

function StructuredExtraction({
  panelRef,
  documents,
  extractionPrompt,
  extractionState,
  rows,
  onExtractionPromptChange,
  onClearDocumentFocus,
  onDocumentSelectionChange,
  onExtract,
  onSort,
  onExportCsv,
}) {
  const [isReferenceMenuOpen, setIsReferenceMenuOpen] =
    useState(false);
  const referenceMenuRef = useRef(null);
  const columns =
    extractionState?.columns?.length > 0
      ? extractionState.columns
      : [
          "field",
          "value",
          "type",
          "source",
        ];
  const readyDocuments = documents.filter(
    (document) => document.status === "ready"
  );
  const selectedDocumentIds =
    extractionState?.documentIds ?? [];
  const selectedDocumentIdSet = new Set(
    selectedDocumentIds
  );
  const selectedDocumentNames = readyDocuments
    .filter((document) =>
      selectedDocumentIdSet.has(document.id)
    )
    .map((document) => document.name);
  const referenceNames =
    selectedDocumentNames.length > 0
      ? selectedDocumentNames
      : extractionState?.documentNames ?? [];
  const hasRows = rows.length > 0;
  const isFocused = referenceNames.length > 0;
  const referenceLabel =
    referenceNames.length > 0
      ? `${referenceNames.length} file${
          referenceNames.length === 1 ? "" : "s"
        }`
      : "All ready files";
  const canExtract =
    Boolean(extractionPrompt.trim()) &&
    !extractionState?.isLoading;

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        referenceMenuRef.current &&
        !referenceMenuRef.current.contains(event.target)
      ) {
        setIsReferenceMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function toggleDocument(documentId) {
    const nextDocumentIds = selectedDocumentIdSet.has(
      documentId
    )
      ? selectedDocumentIds.filter((id) => id !== documentId)
      : [...selectedDocumentIds, documentId];

    onDocumentSelectionChange(nextDocumentIds);
  }

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

      <div
        className="extraction-reference"
        ref={referenceMenuRef}
      >
        <button
          className="secondary-action"
          type="button"
          onClick={() =>
            setIsReferenceMenuOpen((current) => !current)
          }
          aria-expanded={isReferenceMenuOpen}
          aria-haspopup="menu"
        >
          <FileText size={17} />
          {referenceLabel}
          <ChevronDown size={16} />
        </button>

        {isReferenceMenuOpen && (
          <div
            className="extraction-reference-menu"
            role="menu"
          >
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={selectedDocumentIds.length === 0}
              onClick={() => onDocumentSelectionChange([])}
            >
              <span>
                {selectedDocumentIds.length === 0 && (
                  <Check size={15} />
                )}
              </span>
              All ready files
            </button>

            {readyDocuments.map((document) => {
              const isSelected = selectedDocumentIdSet.has(
                document.id
              );

              return (
                <button
                  key={document.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isSelected}
                  onClick={() => toggleDocument(document.id)}
                >
                  <span>
                    {isSelected && <Check size={15} />}
                  </span>
                  {document.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="extract-control">
        <label htmlFor="extract-prompt">
          What do you want to extract?
        </label>
        {isFocused && (
          <div className="extraction-focus">
            <span>
              Referencing {referenceNames.join(", ")}
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
