import {
  useEffect,
  useState,
} from "react";
import {
  NavLink,
  Link,
  Outlet,
  useLocation,
  useParams,
} from "react-router";
import {
  FileSearch,
  Menu,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getWorkspace as getWorkspaceRequest } from "../../services/api";
import WorkspaceSidebarProfile from "./components/WorkspaceSidebarProfile";
import WorkspaceStatusPanel from "./components/WorkspaceStatusPanel";
import {
  defaultWorkspaceColor,
  navItems,
} from "./workspaceData";
import { getActiveSection } from "./workspaceUtils";
import "../WorkspacePages.css";

function WorkspacePage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const {
    token,
    user,
    isLoggingOut,
    logout,
  } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const [workspace, setWorkspace] =
    useState(null);

  const [isLoadingWorkspace, setIsLoadingWorkspace] =
    useState(true);

  const [workspaceError, setWorkspaceError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      if (!token || !workspaceId) {
        setIsLoadingWorkspace(false);
        return;
      }

      setIsLoadingWorkspace(true);
      setWorkspaceError("");

      try {
        const response =
          await getWorkspaceRequest(
            workspaceId,
            token
          );

        if (isMounted) {
          setWorkspace(response.workspace);
        }
      } catch (error) {
        if (isMounted) {
          setWorkspaceError(
            error.message ||
              "Unable to load this workspace."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingWorkspace(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [token, workspaceId, reloadKey]);

  const activeSection = getActiveSection(
    location.pathname
  );

  const activeNavItem =
    navItems.find(
      (item) => item.key === activeSection
    ) ?? navItems[0];

  const workspaceName =
    workspace?.name ?? "Workspace";

  const workspaceColor =
    workspace?.color ?? defaultWorkspaceColor;

  function handleLogout() {
    logout();
  }

  return (
    <section
      className={
        activeSection === "chat"
          ? "workspace-page is-chat-section"
          : "workspace-page"
      }
    >
      {isSidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={
          isSidebarOpen
            ? "workspace-sidebar is-open"
            : "workspace-sidebar"
        }
      >
        <Link className="workspace-sidebar-brand" to="/">
          <span className="workspace-sidebar-brand-mark">
            <FileSearch size={20} />
          </span>
          <span>DocuMind</span>
        </Link>

        <div className="sidebar-workspace-title">
          <span style={{ background: workspaceColor }} />
          <Link to="/dashboard">
            {workspaceName}
          </Link>
        </div>

        <nav className="workspace-nav" aria-label="Workspace">
          {navItems.map(({ key, label, icon: Icon }) => (
            <NavLink
              key={key}
              to={key}
              className={({ isActive }) =>
                isActive
                  ? "workspace-nav-link is-active"
                  : "workspace-nav-link"
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <WorkspaceSidebarProfile
          user={user}
          isOpen={isProfileOpen}
          onToggle={() =>
            setIsProfileOpen((current) => !current)
          }
          onClose={() => {
            setIsProfileOpen(false);
            setIsSidebarOpen(false);
          }}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      <div className="workspace-main">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open sidebar"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        <div className="workspace-content">
          <p className="eyebrow workspace-section-title">
            {activeNavItem.label}
          </p>

          {isLoadingWorkspace ? (
            <WorkspaceStatusPanel
              type="loading"
              title="Loading workspace"
              message="Fetching the workspace details from the API."
            />
          ) : workspaceError ? (
            <WorkspaceStatusPanel
              type="error"
              title="Unable to load workspace"
              message={workspaceError}
              onRetry={() =>
                setReloadKey((current) => current + 1)
              }
            />
          ) : (
            <Outlet context={{ workspace }} />
          )}
        </div>
      </div>
    </section>
  );
}

export default WorkspacePage;
