import { X } from "lucide-react";

function PreviewPanel({ document, onClose }) {
  if (!document) {
    return null;
  }

  return (
    <aside className="preview-panel" aria-label="Document preview">
      <header className="preview-header">
        <div>
          <p className="eyebrow">Preview</p>
          <h2>{document.name}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close preview"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className="preview-content">
        {document.preview.split("\n").map((line) =>
          line.startsWith("---") ? (
            <div className="page-separator" key={line}>
              {line}
            </div>
          ) : (
            <p key={line}>{line}</p>
          )
        )}
      </div>
    </aside>
  );
}

export default PreviewPanel;
