import {
  FileText,
  Layers3,
  Sparkles,
} from "lucide-react";

function MetricStrip({
  workspaceCount,
  totals,
}) {
  return (
    <div className="metric-strip">
      <article>
        <Layers3 size={20} />
        <span>{workspaceCount}</span>
        <p>Workspaces</p>
      </article>
      <article>
        <FileText size={20} />
        <span>{totals.documents}</span>
        <p>Documents</p>
      </article>
      <article>
        <Sparkles size={20} />
        <span>{totals.pages.toLocaleString()}</span>
        <p>Pages processed</p>
      </article>
    </div>
  );
}

export default MetricStrip;
