import { Link } from "react-router";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";

import { getInitials } from "../workspaceUtils";

function WorkspaceSidebarProfile({
  user,
  isOpen,
  onToggle,
  onClose,
  onLogout,
  isLoggingOut,
}) {
  return (
    <div className="workspace-sidebar-profile">
      <button
        className="workspace-avatar-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="avatar-initials">
          {getInitials(user)}
        </span>
        <span className="workspace-profile-copy">
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>
          <span>{user?.email}</span>
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="workspace-profile-menu" role="menu">
          <div className="profile-menu-header">
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <span>{user?.email}</span>
          </div>

          <div className="storage-usage">
            <div className="storage-copy">
              <span>Storage</span>
              <strong>45MB / 100MB</strong>
            </div>
            <div className="storage-track">
              <span style={{ width: "45%" }} />
            </div>
          </div>

          <Link
            className="profile-menu-item"
            to="/dashboard"
            role="menuitem"
            onClick={onClose}
          >
            <Settings size={17} />
            Profile Settings
          </Link>

          <button
            className="profile-menu-item logout-menu-item"
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            onClick={onLogout}
          >
            {isLoggingOut ? (
              <Loader2
                className="logout-spinner"
                size={17}
              />
            ) : (
              <LogOut size={17} />
            )}
            {isLoggingOut
              ? "Logging out..."
              : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSidebarProfile;
