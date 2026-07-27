import {
  Loader2,
  RefreshCw,
} from "lucide-react";

import { summaryLevels } from "../../data/workspaceData";

function SummaryPanel({
  summaryState,
  document,
  onLevelChange,
  onRegenerate,
}) {
  if (!summaryState || !document) {
    return null;
  }

  return (
    <section className="summary-panel">
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
        ) : (
          <p>{summaryState.text}</p>
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
