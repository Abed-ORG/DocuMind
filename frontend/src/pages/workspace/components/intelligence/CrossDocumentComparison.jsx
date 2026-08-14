import {
  AlertCircle,
  GitCompareArrows,
  Loader2,
} from "lucide-react";

import {
  getCitationChipLabel,
  getCitationTitle,
} from "../../utils/citationUtils";

const comparisonHeadingPattern =
  /^(Overview|Similarities|Differences|Evidence gaps|How .+ treats the topic)\s*[-:]?\s*(.*)$/i;
const inlineCitationPattern = /(\[\d+\])/g;

function getCitationLabel(citation) {
  return String(
    citation.label ?? citation.citationNumber ?? ""
  );
}

function getCitationMap(citations) {
  return new Map(
    citations
      .map((citation) => [
        getCitationLabel(citation),
        citation,
      ])
      .filter(([label]) => Boolean(label))
  );
}

function splitComparisonItems(text) {
  return String(text ?? "")
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseComparisonSections(answer) {
  const lines = String(answer ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = [];
  let currentSection = null;

  function pushSection() {
    if (
      currentSection &&
      (currentSection.title ||
        currentSection.items.length > 0)
    ) {
      sections.push(currentSection);
    }
  }

  lines.forEach((line) => {
    const headingMatch = line.match(
      comparisonHeadingPattern
    );

    if (headingMatch) {
      pushSection();
      currentSection = {
        title: headingMatch[1],
        items: splitComparisonItems(headingMatch[2]),
      };
      return;
    }

    if (!currentSection) {
      currentSection = {
        title: "",
        items: [],
      };
    }

    currentSection.items.push(...splitComparisonItems(line));
  });

  pushSection();

  return sections;
}

function CitationText({
  text,
  citationMap,
  onCitationClick,
}) {
  const parts = String(text ?? "").split(
    inlineCitationPattern
  );

  return parts.map((part, index) => {
    const labelMatch = part.match(/^\[(\d+)\]$/);

    if (!labelMatch) {
      return part;
    }

    const label = labelMatch[1];
    const citation = citationMap.get(label);

    if (!citation) {
      return part;
    }

    return (
      <button
        aria-label={`Open citation ${label}`}
        className="comparison-inline-citation"
        key={`${label}-${index}`}
        type="button"
        onClick={() => onCitationClick(citation)}
        title={getCitationTitle(citation)}
      >
        [{label}]
      </button>
    );
  });
}

function ComparisonAnswer({
  answer,
  citations,
  onCitationClick,
}) {
  const sections = parseComparisonSections(answer);
  const citationMap = getCitationMap(citations);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="comparison-answer">
      {sections.map((section, sectionIndex) => (
        <section
          className="comparison-answer-section"
          key={`${section.title}-${sectionIndex}`}
        >
          {section.title && <h4>{section.title}</h4>}
          {section.items.length > 1 ? (
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>
                  <CitationText
                    citationMap={citationMap}
                    onCitationClick={onCitationClick}
                    text={item}
                  />
                </li>
              ))}
            </ul>
          ) : (
            section.items.map((item, itemIndex) => (
              <p key={`${item}-${itemIndex}`}>
                <CitationText
                  citationMap={citationMap}
                  onCitationClick={onCitationClick}
                  text={item}
                />
              </p>
            ))
          )}
        </section>
      ))}
    </div>
  );
}

function CrossDocumentComparison({
  documents,
  comparison,
  onComparisonChange,
  onCompare,
  onCitationClick,
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
            placeholder="Describe what to compare"
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
          <ComparisonAnswer
            answer={comparison.answer}
            citations={citations}
            onCitationClick={onCitationClick}
          />
          {citations.length > 0 && (
            <div className="citation-chip-row">
              {citations.map((citation, index) => (
                <button
                  key={`${citation.chunkId}-${getCitationLabel(citation)}-${index}`}
                  type="button"
                  onClick={() => onCitationClick(citation)}
                  title={getCitationTitle(citation)}
                >
                  <span>
                    [{getCitationLabel(citation)}]
                  </span>
                  {getCitationChipLabel(citation)}
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
