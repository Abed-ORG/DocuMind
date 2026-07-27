import { useState } from "react";

import { emptyWorkspace } from "../../utils/workspaceDashboardUtils";

function WorkspaceModal({
  mode,
  workspace,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}) {
  const [formData, setFormData] = useState(
    workspace ?? emptyWorkspace
  );

  const isEditing = mode === "edit";

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    onSubmit({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="workspace-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="workspace-modal-title"
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="workspace-modal-title">
              {isEditing ? "Edit Workspace" : "Create Workspace"}
            </h2>
          </div>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              placeholder="Example: Investor diligence"
            />
          </div>

          <div className="form-group">
            <label htmlFor="workspace-description">
              Description
            </label>
            <textarea
              id="workspace-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Optional context for this workspace"
            />
          </div>

          <div className="color-picker-group">
            <label htmlFor="workspace-color">Color</label>
            <div className="color-picker">
              <input
                id="workspace-color"
                className="color-picker-input"
                name="color"
                type="color"
                value={formData.color}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <span className="color-value">
                {formData.color.toUpperCase()}
              </span>
            </div>
          </div>

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
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save"
                  : "Create"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default WorkspaceModal;
