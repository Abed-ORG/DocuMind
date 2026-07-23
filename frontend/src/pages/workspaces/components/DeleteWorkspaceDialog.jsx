import { AlertTriangle } from "lucide-react";

function DeleteWorkspaceDialog({
  workspace,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="workspace-modal delete-workspace-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="delete-workspace-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="delete-workspace-title">
              Delete this workspace?
            </h2>
          </div>
        </header>

        <div className="delete-warning">
          <AlertTriangle size={22} />
          <p>
            This will permanently delete the workspace and all related
            documents, chunks, embeddings, conversations, messages, and
            summaries.
          </p>
        </div>

        <div className="delete-target">
          <span style={{ background: workspace.color }} />
          <strong>{workspace.name}</strong>
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
            {isDeleting
              ? "Deleting..."
              : "Delete Workspace"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default DeleteWorkspaceDialog;
