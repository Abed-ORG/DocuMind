import {
  FilePenLine,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

function RenameDocumentDialog({
  document,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}) {
  const [name, setName] = useState(document.name);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(name);
  }

  return (
    <div className="modal-backdrop document-dialog-backdrop" role="presentation">
      <section
        className="workspace-modal document-action-modal rename-document-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="rename-document-title"
      >
        <header className="modal-header document-action-header">
          <span className="document-dialog-icon">
            <FilePenLine size={22} />
          </span>

          <div>
            <p className="eyebrow">Rename</p>
            <h2 id="rename-document-title">
              Rename document
            </h2>
          </div>

          <button
            className="icon-button document-dialog-close"
            type="button"
            aria-label="Close rename dialog"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </header>

        <form className="modal-form document-rename-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="rename-document-name">Document name</label>
            <input
              ref={inputRef}
              id="rename-document-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              disabled={isSubmitting}
              placeholder="Example: Market outlook.pdf"
              required
            />
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
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="primary-action"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save name"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default RenameDocumentDialog;
