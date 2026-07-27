import { GitCompareArrows } from "lucide-react";

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

  const canCompare =
    documents.length >= 2 &&
    Boolean(comparison.topic.trim()) &&
    comparison.firstDocumentId !== comparison.secondDocumentId;

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
          <label htmlFor="first-document">Step 1: First document</label>
          <select
            id="first-document"
            value={comparison.firstDocumentId}
            disabled={documents.length === 0}
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                firstDocumentId: event.target.value,
                hasResult: false,
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
            Step 1: Second document
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
            Step 2: Comparison topic
          </label>
          <input
            id="comparison-topic"
            value={comparison.topic}
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                topic: event.target.value,
                hasResult: false,
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
          <GitCompareArrows size={17} />
          Step 3: Compare
        </button>
      </div>

      {comparison.hasResult && firstDocument && secondDocument && (
        <article className="comparison-result">
          <h3>Comparative response</h3>
          <p>
            Both documents connect {comparison.topic} to traceable AI
            review. The outlook report frames it as a buyer requirement,
            while the interview notes describe it as a daily workflow
            blocker when source passages are hard to inspect.
          </p>
          <div className="citation-chip-row">
            <button type="button">{firstDocument.name}</button>
            <button type="button">{secondDocument.name}</button>
          </div>
        </article>
      )}
    </section>
  );
}

export default CrossDocumentComparison;
