import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  Edit3,
  FileText,
  FolderPlus,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import documindHero from "../assets/documind-hero.png";
import { useAuth } from "../context/AuthContext";
import {
  createWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "../services/api";
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

const emptyWorkspace = {
  name: "",
  description: "",
  color: colorOptions[0],
};

const activityTimestampFormatter =
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function formatActivityTimestamp(value) {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No activity yet";
  }

  return activityTimestampFormatter.format(date);
}

function getStatValue(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function normalizeWorkspace(workspace) {
  const activityTimestamp =
    workspace.lastActivity ??
    workspace.updatedAt ??
    workspace.createdAt;

  return {
    id: workspace.id ?? workspace._id,
    name: workspace.name,
    description: workspace.description ?? "",
    color: workspace.color ?? colorOptions[0],
    documents: getStatValue(
      workspace.documentCount ??
        workspace.documents
    ),
    pages: getStatValue(
      workspace.pageCount ??
        workspace.pages
    ),
    lastActivity:
      formatActivityTimestamp(
        activityTimestamp
      ),
  };
}

function buildWorkspacePayload(formData) {
  return {
    name: formData.name.trim(),
    description:
      formData.description.trim(),
    color: formData.color,
  };
}

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
                  disabled={isSubmitting}
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

function WorkspacesPage() {
  const {
    token,
    user,
  } = useAuth();

  const [workspaces, setWorkspaces] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  const [modalState, setModalState] =
    useState(null);

  const [modalError, setModalError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaces() {
      if (!token) {
        setWorkspaces([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response =
          await getWorkspaces(token);

        if (isMounted) {
          setWorkspaces(
            (response.workspaces ?? []).map(
              normalizeWorkspace
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error.message ||
              "Unable to load workspaces."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, [token, reloadKey]);

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
    setModalError("");
    setModalState({
      mode: "create",
      workspace: emptyWorkspace,
    });
  }

  function openEditModal(workspace) {
    setModalError("");
    setModalState({
      mode: "edit",
      workspace,
    });
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setModalState(null);
    setModalError("");
  }

  async function handleModalSubmit(formData) {
    if (!token) {
      setModalError(
        "Authentication is required."
      );
      return;
    }

    const payload =
      buildWorkspacePayload(formData);

    setIsSaving(true);
    setModalError("");

    try {
      if (modalState.mode === "edit") {
        const response =
          await updateWorkspace(
            modalState.workspace.id,
            payload,
            token
          );

        const updatedWorkspace =
          normalizeWorkspace(
            response.workspace
          );

        setWorkspaces((current) =>
          current.map((workspace) =>
            workspace.id ===
            updatedWorkspace.id
              ? updatedWorkspace
              : workspace
          )
        );
      } else {
        const response =
          await createWorkspace(
            payload,
            token
          );

        setWorkspaces((current) => [
          normalizeWorkspace(
            response.workspace
          ),
          ...current,
        ]);
      }

      setModalState(null);
    } catch (error) {
      setModalError(
        error.message ||
          "Unable to save workspace."
      );
    } finally {
      setIsSaving(false);
    }
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
            disabled={isLoading}
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

        {isLoading ? (
          <div className="empty-state dashboard-state">
            <Loader2 className="spinner" size={34} />
            <h2>Loading workspaces</h2>
            <p>
              Fetching your workspace list from the API.
            </p>
          </div>
        ) : loadError ? (
          <div className="empty-state dashboard-state">
            <AlertCircle size={34} />
            <h2>Unable to load workspaces</h2>
            <p>{loadError}</p>
            <button
              className="secondary-action"
              type="button"
              onClick={() =>
                setReloadKey((current) => current + 1)
              }
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        ) : workspaces.length === 0 ? (
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
                  <p>
                    {workspace.description ||
                      "No description yet."}
                  </p>
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
          error={modalError}
          isSubmitting={isSaving}
          onCancel={closeModal}
          onSubmit={handleModalSubmit}
        />
      )}
    </section>
  );
}

export default WorkspacesPage;
