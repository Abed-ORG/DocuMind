import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Edit3,
  FileText,
  FolderPlus,
  Layers3,
  Plus,
  Sparkles,
} from "lucide-react";

import documindHero from "../assets/documind-hero.png";
import { useAuth } from "../context/AuthContext";
import "./WorkspacePages.css";

const colorOptions = [
  "#4F46E5",
  "#0F766E",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#7C3AED",
  "#2563EB",
  "#475569",
];

const initialWorkspaces = [
  {
    id: "market-research",
    name: "Market Research",
    description:
      "Competitor filings, analyst notes, and quarterly commentary.",
    color: "#4F46E5",
    documents: 18,
    pages: 642,
    lastActivity: "12 minutes ago",
  },
  {
    id: "contract-review",
    name: "Contract Review",
    description:
      "Master service agreements, redlines, and renewal exhibits.",
    color: "#0F766E",
    documents: 9,
    pages: 214,
    lastActivity: "Yesterday",
  },
  {
    id: "policy-library",
    name: "Policy Library",
    description:
      "Internal operating policies and compliance references.",
    color: "#F59E0B",
    documents: 27,
    pages: 1086,
    lastActivity: "Jul 12, 2026",
  },
];

const emptyWorkspace = {
  name: "",
  description: "",
  color: colorOptions[0],
};

function WorkspaceModal({
  mode,
  workspace,
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
          <div className="form-group">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
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
              placeholder="Optional context for this workspace"
            />
          </div>

          <div className="color-picker-group">
            <span>Color</span>
            <div className="color-picker">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className={
                    formData.color === color
                      ? "color-dot is-selected"
                      : "color-dot"
                  }
                  type="button"
                  style={{ background: color }}
                  aria-label={`Choose ${color}`}
                  onClick={() =>
                    setFormData((current) => ({
                      ...current,
                      color,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <footer className="modal-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button className="primary-action" type="submit">
              {isEditing ? "Save" : "Create"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function WorkspacesPage() {
  const { user } = useAuth();

  const [workspaces, setWorkspaces] =
    useState(initialWorkspaces);

  const [modalState, setModalState] =
    useState(null);

  const totals = useMemo(
    () =>
      workspaces.reduce(
        (summary, workspace) => ({
          documents: summary.documents + workspace.documents,
          pages: summary.pages + workspace.pages,
        }),
        {
          documents: 0,
          pages: 0,
        }
      ),
    [workspaces]
  );

  function openCreateModal() {
    setModalState({
      mode: "create",
      workspace: emptyWorkspace,
    });
  }

  function openEditModal(workspace) {
    setModalState({
      mode: "edit",
      workspace,
    });
  }

  function handleModalSubmit(formData) {
    if (modalState.mode === "edit") {
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === modalState.workspace.id
            ? {
                ...workspace,
                ...formData,
                lastActivity: "Just now",
              }
            : workspace
        )
      );
    } else {
      setWorkspaces((current) => [
        {
          ...formData,
          id: formData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
          documents: 0,
          pages: 0,
          lastActivity: "Just now",
        },
        ...current,
      ]);
    }

    setModalState(null);
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>
              Welcome
              {user?.firstName
                ? `, ${user.firstName}`
                : ""}
            </h1>
            <p>
              Review active document workspaces, processing volume, and
              recent activity.
            </p>
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={openCreateModal}
          >
            <FolderPlus size={18} />
            Create Workspace
          </button>
        </header>

        <div className="metric-strip">
          <article>
            <Layers3 size={20} />
            <span>{workspaces.length}</span>
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

        {workspaces.length === 0 ? (
          <div className="empty-state">
            <img src={documindHero} alt="" />
            <h2>Create your first workspace</h2>
            <p>
              Workspaces keep related documents, chats, comparisons, and
              analytics together.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="workspace-grid">
            <button
              className="create-workspace-card"
              type="button"
              onClick={openCreateModal}
            >
              <span>
                <Plus size={24} />
              </span>
              <strong>Create Workspace</strong>
              <p>Start a new document collection.</p>
            </button>

            {workspaces.map((workspace) => (
              <article className="workspace-card" key={workspace.id}>
                <div className="workspace-card-top">
                  <span
                    className="workspace-color-dot"
                    style={{ background: workspace.color }}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Edit ${workspace.name}`}
                    onClick={() => openEditModal(workspace)}
                  >
                    <Edit3 size={17} />
                  </button>
                </div>

                <Link
                  className="workspace-card-link"
                  to={`/workspace/${workspace.id}/documents`}
                >
                  <h2>{workspace.name}</h2>
                  <p>{workspace.description}</p>
                </Link>

                <dl className="workspace-stats">
                  <div>
                    <dt>Documents</dt>
                    <dd>{workspace.documents}</dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>{workspace.pages.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Last activity</dt>
                    <dd>{workspace.lastActivity}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalState && (
        <WorkspaceModal
          mode={modalState.mode}
          workspace={modalState.workspace}
          onCancel={() => setModalState(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </section>
  );
}

export default WorkspacesPage;
