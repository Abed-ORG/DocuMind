import {
  Loader2,
  RefreshCw,
} from "lucide-react";

import { summaryLevels } from "../../data/workspaceData";

const knownSummaryHeadings = [
  "Document Purpose",
  "Major Themes and Important Details",
  "Curiosity and Learning",
  "Curiosity and Innovation",
  "Curiosity in Society",
  "Risks and Consequences",
  "Dependencies and Critical Factors",
  "Conclusion",
  "Conclusions",
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSummaryText(text) {
  let normalizedText = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  knownSummaryHeadings.forEach((heading) => {
    const pattern = new RegExp(
      `\\b(${escapePattern(heading)})(?=\\s+[A-Z0-9])`,
      "g"
    );

    normalizedText = normalizedText.replace(
      pattern,
      (_, title) => `\n\n${title}\n`
    );
  });

  normalizedText = normalizedText.replace(
    /\s+-\s+/g,
    "\n- "
  );

  return normalizedText
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSummarySections(text) {
  const normalizedText = normalizeSummaryText(text);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = [];
  let currentSection = {
    title: "",
    blocks: [],
  };

  function pushCurrentSection() {
    if (
      currentSection.title ||
      currentSection.blocks.length > 0
    ) {
      sections.push(currentSection);
    }
  }

  lines.forEach((line) => {
    const isHeading =
      knownSummaryHeadings.includes(line) ||
      (/^[A-Z][A-Za-z0-9 ,&-]{2,80}$/.test(line) &&
        !line.endsWith(".") &&
        line.split(/\s+/).length <= 8);

    if (isHeading) {
      pushCurrentSection();
      currentSection = {
        title: line,
        blocks: [],
      };
      return;
    }

    currentSection.blocks.push(line);
  });

  pushCurrentSection();

  return sections;
}

function SummaryContent({ text }) {
  const sections = parseSummarySections(text);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="summary-content">
      {sections.map((section, sectionIndex) => {
        const bullets = section.blocks.filter((block) =>
          block.startsWith("- ")
        );
        const paragraphs = section.blocks.filter(
          (block) => !block.startsWith("- ")
        );

        return (
          <section
            className="summary-section"
            key={`${section.title}-${sectionIndex}`}
          >
            {section.title && <h4>{section.title}</h4>}
            {paragraphs.map((paragraph, index) => (
              <p key={`paragraph-${index}`}>
                {paragraph}
              </p>
            ))}
            {bullets.length > 0 && (
              <ul>
                {bullets.map((bullet, index) => (
                  <li key={`bullet-${index}`}>
                    {bullet.replace(/^- /, "")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SummaryPanel({
  summaryState,
  document,
  panelRef,
  onLevelChange,
  onRegenerate,
}) {
  if (!summaryState || !document) {
    return null;
  }

  return (
    <section className="summary-panel" ref={panelRef}>
      <header>
        <div>
          <p className="eyebrow">Summary</p>
          <h3>{document.name}</h3>
        </div>
        {summaryState.cached && (
          <span className="badge success">Cached</span>
        )}
      </header>

      <div className="summary-levels" role="group">
        {summaryLevels.map((level) => (
          <button
            key={level.key}
            className={
              summaryState.level === level.key
                ? "summary-level is-active"
                : "summary-level"
            }
            type="button"
            onClick={() => onLevelChange(level.key)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="summary-result">
        {summaryState.isLoading ? (
          <div className="loading-row">
            <Loader2 className="spinner" size={18} />
            Generating summary
          </div>
        ) : summaryState.error ? (
          <p className="summary-error">
            {summaryState.error}
          </p>
        ) : (
          <SummaryContent text={summaryState.text} />
        )}
      </div>

      <button
        className="secondary-action"
        type="button"
        onClick={onRegenerate}
      >
        <RefreshCw size={16} />
        Regenerate
      </button>
    </section>
  );
}

export default SummaryPanel;
