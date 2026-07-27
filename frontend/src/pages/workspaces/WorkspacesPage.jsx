import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";
import {
  createWorkspace,
  deleteWorkspace as deleteWorkspaceRequest,
  getWorkspaces,
  updateWorkspace,
} from "../../services/api";
import DashboardHeader from "./components/DashboardHeader";
import DashboardState from "./components/DashboardState";
import DeleteWorkspaceDialog from "./components/DeleteWorkspaceDialog";
import MetricStrip from "./components/MetricStrip";
import WorkspaceGrid from "./components/WorkspaceGrid";
import WorkspaceModal from "./components/WorkspaceModal";
import {
  buildWorkspacePayload,
  emptyWorkspace,
  normalizeWorkspace,
} from "./workspaceDashboardUtils";
import "../WorkspacePages.css";

function WorkspacesPage() {
  const {
    token,
    user,
    refreshCurrentUser,
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

  const [deleteState, setDeleteState] =
    useState(null);

  const [modalError, setModalError] =
    useState("");

  const [deleteError, setDeleteError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
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

  function openDeleteDialog(workspace) {
    setDeleteError("");
    setDeleteState({
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

  function closeDeleteDialog() {
    if (isDeleting) {
      return;
    }

    setDeleteState(null);
    setDeleteError("");
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

  async function handleDeleteWorkspace() {
    if (!token) {
      setDeleteError(
        "Authentication is required."
      );
      return;
    }

    const workspace = deleteState?.workspace;

    if (!workspace) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteWorkspaceRequest(
        workspace.id,
        token
      );

      setWorkspaces((current) =>
        current.filter(
          (currentWorkspace) =>
            currentWorkspace.id !== workspace.id
        )
      );

      refreshCurrentUser().catch((error) => {
        console.error(
          "User storage refresh failed:",
          error
        );
      });

      setDeleteState(null);
    } catch (error) {
      setDeleteError(
        error.message ||
          "Unable to delete workspace."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-shell">
        <DashboardHeader
          user={user}
          isLoading={isLoading}
          onCreateWorkspace={openCreateModal}
        />

        <MetricStrip
          workspaceCount={workspaces.length}
          totals={totals}
        />

        {isLoading ? (
          <DashboardState type="loading" />
        ) : loadError ? (
          <DashboardState
            type="error"
            error={loadError}
            onRetry={() =>
              setReloadKey((current) => current + 1)
            }
          />
        ) : workspaces.length === 0 ? (
          <DashboardState
            type="empty"
            onCreateWorkspace={openCreateModal}
          />
        ) : (
          <WorkspaceGrid
            workspaces={workspaces}
            onCreateWorkspace={openCreateModal}
            onEditWorkspace={openEditModal}
            onDeleteWorkspace={openDeleteDialog}
          />
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

      {deleteState && (
        <DeleteWorkspaceDialog
          workspace={deleteState.workspace}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={closeDeleteDialog}
          onConfirm={handleDeleteWorkspace}
        />
      )}
    </section>
  );
}

export default WorkspacesPage;
