import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import { DashboardSkeleton } from "../../components/Skeleton";
import {
  createWorkspace,
  deleteWorkspace as deleteWorkspaceRequest,
  getWorkspaces,
  updateWorkspace,
} from "../../services/api";
import {
  DashboardHeader,
  DashboardState,
  MetricStrip,
} from "./components/dashboard";
import { ROBOT_PET_EVENT } from "./components/dashboard/RobotPet";
import {
  DeleteWorkspaceDialog,
  WorkspaceModal,
} from "./components/dialogs";
import { WorkspaceGrid } from "./components/workspaceCards";
import {
  buildWorkspacePayload,
  emptyWorkspace,
  normalizeWorkspace,
} from "./utils/workspaceDashboardUtils";
import "../WorkspacePages.css";

const WORKSPACE_DIVE_NAVIGATION_DELAY = 940;

function WorkspacesPage() {
  const navigate = useNavigate();

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
  const [openingWorkspaceId, setOpeningWorkspaceId] =
    useState(null);
  const navigationTimerRef = useRef(null);

  useEffect(
    () => () => {
      window.clearTimeout(navigationTimerRef.current);
    },
    []
  );

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

  function openWorkspace(workspace, targetElement) {
    if (openingWorkspaceId) {
      return;
    }

    const targetBounds =
      targetElement
        .closest(".workspace-card")
        ?.getBoundingClientRect() ??
      targetElement.getBoundingClientRect();

    setOpeningWorkspaceId(workspace.id);
    window.dispatchEvent(
      new CustomEvent(ROBOT_PET_EVENT, {
        detail: {
          action: "workspace-dive",
          targetRect: {
            left: targetBounds.left,
            top: targetBounds.top,
            width: targetBounds.width,
            height: targetBounds.height,
          },
        },
      })
    );

    navigationTimerRef.current =
      window.setTimeout(() => {
        navigate(
          `/workspace/${workspace.id}/documents`
        );
      }, WORKSPACE_DIVE_NAVIGATION_DELAY);
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
        />

        {isLoading ? (
          <DashboardSkeleton />
        ) : loadError ? (
          <>
            <MetricStrip
              workspaceCount={workspaces.length}
              totals={totals}
            />
            <DashboardState
              type="error"
              error={loadError}
              onRetry={() =>
                setReloadKey((current) => current + 1)
              }
            />
          </>
        ) : (
          <>
            <MetricStrip
              workspaceCount={workspaces.length}
              totals={totals}
            />
            {workspaces.length === 0 ? (
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
                onOpenWorkspace={openWorkspace}
              />
            )}
          </>
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
