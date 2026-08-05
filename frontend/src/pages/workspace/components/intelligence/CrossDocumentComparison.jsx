import {
  AlertCircle,
  GitCompareArrows,
  Loader2,
} from "lucide-react";

function formatSourceLabel(source) {
  const metadata = [];

  if (source.pageNumber) {
    metadata.push(`p. ${source.pageNumber}`);
  }

  if (
    source.chunkIndex !== null &&
    source.chunkIndex !== undefined
  ) {
    metadata.push(`chunk ${source.chunkIndex}`);
  }

  return [
    `[${source.citationNumber ?? source.label}]`,
    source.documentName,
    metadata.length > 0
      ? metadata.join(", ")
      : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function ComparisonAnswer({ answer }) {
  const blocks = String(answer ?? "")
    .split(/\n{2,}|\n(?=[A-Z][A-Za-z ]{2,40}:?$)/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="comparison-answer">
      {blocks.map((block, index) => {
        const normalizedBlock = block.replace(/:$/, "");
        const isHeading =
          index > 0 &&
          normalizedBlock.length <= 60 &&
          !normalizedBlock.includes("[");

        if (isHeading) {
          return (
            <h4 key={`${block}-${index}`}>
              {normalizedBlock}
            </h4>
          );
        }

        return (
          <p key={`${block}-${index}`}>
            {block}
          </p>
        );
      })}
    </div>
  );
}

function CrossDocumentComparison({
  documents,
  comparison,
  onComparisonChange,
  onCompare,
}) {
  const firstDocument = documents.find(
    (document) => document.id === comparison.firstDocumentId
  );

  const secondDocument = documents.find(
    (document) => document.id === comparison.secondDocumentId
  );
  const selectedDocumentsReady =
    firstDocument?.status === "ready" &&
    secondDocument?.status === "ready";

  const canCompare =
    documents.length >= 2 &&
    Boolean(comparison.topic.trim()) &&
    comparison.firstDocumentId !== comparison.secondDocumentId &&
    selectedDocumentsReady &&
    !comparison.isLoading;

  const citations =
    comparison.citations?.length > 0
      ? comparison.citations
      : comparison.sources ?? [];

  return (
    <section className="comparison-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Cross-Document Comparison</p>
          <h2>Compare source positions</h2>
        </div>
      </header>

      <div className="step-form">
        <div className="form-group">
          <label htmlFor="first-document">First document</label>
          <select
            id="first-document"
            value={comparison.firstDocumentId}
            disabled={documents.length === 0}
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                firstDocumentId: event.target.value,
                hasResult: false,
                error: "",
                answer: "",
                citations: [],
                sources: [],
              }))
            }
          >
            {documents.length === 0 && (
              <option value="">No documents uploaded</option>
            )}
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="second-document">
            Second document
          </label>
          <select
            id="second-document"
            value={comparison.secondDocumentId}
            disabled={documents.length < 2}
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                secondDocumentId: event.target.value,
                hasResult: false,
                error: "",
                answer: "",
                citations: [],
                sources: [],
              }))
            }
          >
            {documents.length < 2 && (
              <option value="">
                Upload another document to compare
              </option>
            )}
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="comparison-topic">
            Comparison topic
          </label>
          <input
            id="comparison-topic"
            value={comparison.topic}
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                topic: event.target.value,
                hasResult: false,
                error: "",
                answer: "",
                citations: [],
                sources: [],
              }))
            }
            placeholder="Example: compliance obligations"
          />
        </div>

        <button
          className="primary-action"
          type="button"
          onClick={onCompare}
          disabled={!canCompare}
        >
          {comparison.isLoading ? (
            <Loader2 className="spinner" size={17} />
          ) : (
            <GitCompareArrows size={17} />
          )}
          {comparison.isLoading ? "Comparing" : "Compare"}
        </button>
      </div>

      {documents.length >= 2 &&
        firstDocument &&
        secondDocument &&
        !selectedDocumentsReady && (
          <div className="comparison-status" role="status">
            <AlertCircle size={17} />
            Both selected documents must be ready before comparison.
          </div>
        )}

      {comparison.error && (
        <div className="comparison-status is-error" role="alert">
          <AlertCircle size={17} />
          {comparison.error}
        </div>
      )}

      {comparison.hasResult &&
        firstDocument &&
        secondDocument &&
        !comparison.error && (
        <article className="comparison-result">
          <h3>Comparative response</h3>
          <ComparisonAnswer answer={comparison.answer} />
          {citations.length > 0 && (
            <div className="citation-chip-row">
              {citations.map((citation) => (
                <button
                  key={`${citation.chunkId}-${citation.citationNumber ?? citation.label}`}
                  type="button"
                  title={citation.text}
                >
                  {formatSourceLabel(citation)}
                </button>
              ))}
            </div>
          )}
        </article>
        )}
    </section>
  );
}

export default CrossDocumentComparison;
