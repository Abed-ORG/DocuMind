import {
  CopyPlus,
  FileText,
  X,
} from "lucide-react";

function DuplicateDocumentDialog({
  duplicate,
  onAddDuplicate,
  onSkip,
}) {
  return (
    <div className="modal-backdrop document-dialog-backdrop" role="presentation">
      <section
        className="workspace-modal document-action-modal duplicate-document-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="duplicate-document-title"
      >
        <header className="modal-header document-action-header">
          <span className="document-dialog-icon">
            <CopyPlus size={22} />
          </span>

          <div>
            <p className="eyebrow">Duplicate file</p>
            <h2 id="duplicate-document-title">
              This document already exists
            </h2>
          </div>

          <button
            className="icon-button document-dialog-close"
            type="button"
            aria-label="Skip duplicate document"
            onClick={onSkip}
          >
            <X size={18} />
          </button>
        </header>

        <p className="document-dialog-copy">
          A document named <strong>{duplicate.fileName}</strong> with the same
          file contents is already in this workspace. Add this upload as a
          separate copy or skip it.
        </p>

        <div className="duplicate-name-card">
          <div className="document-dialog-file-row">
            <span className="file-icon">
              <FileText size={18} />
            </span>
            <div>
              <span>Suggested copy name</span>
              <strong>{duplicate.duplicateName}</strong>
            </div>
          </div>
        </div>

        <footer className="modal-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={onSkip}
          >
            Skip file
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={onAddDuplicate}
          >
            Add as copy
          </button>
        </footer>
      </section>
    </div>
  );
}

export default DuplicateDocumentDialog;
