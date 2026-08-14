import {
  AlertCircle,
  Check,
  ChevronDown,
  FileOutput,
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
  groups,
  rows,
  onExtractionPromptChange,
  onClearDocumentFocus,
  onDocumentSelectionChange,
  onExtract,
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
  const displayGroups = Array.isArray(groups)
    ? groups
    : [];
  const hasRows =
    displayGroups.some(
      (group) => group.rows?.length > 0
    ) || rows.length > 0;
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
          <FileOutput size={17} />
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
            placeholder="Describe the fields to export, such as key dates, party names, payment terms, and source clauses"
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

      {extractionState?.isLoading ? (
        <div className="extraction-table-wrap">
          <table className="extraction-table">
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  <div className="loading-row">
                    <Loader2 className="spinner" size={18} />
                    Extracting structured rows
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : hasRows ? (
        <div className="extraction-result-groups">
          {displayGroups.map((group) => (
            <section
              className="extraction-result-group"
              key={group.id ?? group.title}
            >
              {displayGroups.length > 1 && (
                <header className="extraction-result-group-header">
                  <h3>{group.title}</h3>
                  <span>
                    {group.kind === "records"
                      ? "Repeated records"
                      : "Single-value fields"}
                  </span>
                </header>
              )}

              <div className="extraction-table-wrap">
                <table className="extraction-table">
                  <thead>
                    <tr>
                      {group.columns.map((column) => (
                        <th key={column.key}>
                          {column.label ?? column.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, rowIndex) => (
                      <tr
                        key={`${group.id}-${rowIndex}`}
                      >
                        {group.columns.map((column) => (
                          <td key={column.key}>
                            {row.values?.[column.key] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="extraction-table-wrap">
          <table className="extraction-table">
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  {extractionState?.hasRun
                    ? "No matching rows were found in the retrieved sources."
                    : "Enter the fields you need, then export structured rows with values, types, and source citations."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default StructuredExtraction;
