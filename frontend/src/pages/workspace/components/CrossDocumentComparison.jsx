import { GitCompareArrows } from "lucide-react";

function CrossDocumentComparison({
  documents,
  comparison,
  onComparisonChange,
  onCompare,
}) {
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
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                firstDocumentId: event.target.value,
                hasResult: false,
              }))
            }
          >
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
            onChange={(event) =>
              onComparisonChange((current) => ({
                ...current,
                secondDocumentId: event.target.value,
                hasResult: false,
              }))
            }
          >
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
        >
          <GitCompareArrows size={17} />
          Step 3: Compare
        </button>
      </div>

      {comparison.hasResult && (
        <article className="comparison-result">
          <h3>Comparative response</h3>
          <p>
            Both documents connect {comparison.topic} to traceable AI
            review. The outlook report frames it as a buyer requirement,
            while the interview notes describe it as a daily workflow
            blocker when source passages are hard to inspect.
          </p>
          <div className="citation-chip-row">
            <button type="button">2026 Market Outlook.pdf, p.3</button>
            <button type="button">Customer Interview Notes.docx, p.2</button>
          </div>
        </article>
      )}
    </section>
  );
}

export default CrossDocumentComparison;
