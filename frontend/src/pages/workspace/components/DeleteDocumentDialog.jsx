import {
  AlertTriangle,
  FileText,
  X,
} from "lucide-react";

function DeleteDocumentDialog({
  document,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop document-dialog-backdrop" role="presentation">
      <section
        className="workspace-modal document-action-modal delete-document-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="delete-document-title"
      >
        <header className="modal-header document-action-header">
          <span className="document-dialog-icon is-danger">
            <AlertTriangle size={22} />
          </span>

          <div>
            <p className="eyebrow">Delete</p>
            <h2 id="delete-document-title">
              Delete this document?
            </h2>
          </div>

          <button
            className="icon-button document-dialog-close"
            type="button"
            aria-label="Close delete document dialog"
            disabled={isDeleting}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </header>

        <div className="delete-warning">
          <AlertTriangle size={22} />
          <p>
            This will permanently remove the file from this workspace and
            delete its stored upload. This action cannot be undone.
          </p>
        </div>

        <div className="duplicate-name-card delete-document-card">
          <div className="document-dialog-file-row">
            <span className="file-icon">
              <FileText size={18} />
            </span>
            <div>
              <span>Document to delete</span>
              <strong>{document.name}</strong>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <footer className="modal-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="danger-action"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting..." : "Delete document"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default DeleteDocumentDialog;
