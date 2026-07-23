import { useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";
import {
  ChevronDown,
  FileSearch,
  LogOut,
  Settings,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Header.css";

function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  return `${first}${last}` || "DM";
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const isWorkspaceRoute =
    location.pathname.startsWith("/workspace/");

  if (isWorkspaceRoute) {
    return null;
  }

  function handleLogout() {
    logout();
    navigate("/", {
      replace: true,
    });
  }

  return (
    <header className="site-header">
      <div className="site-header-container">
        <Link className="site-logo" to="/">
          <span className="site-logo-mark">
            <FileSearch size={20} />
          </span>
          <span>DocuMind</span>
        </Link>

        <nav className="site-navigation" aria-label="Primary">
          {isAuthenticated ? (
            <>
              <NavLink
                className="header-dashboard-button"
                to="/dashboard"
              >
                Dashboard
              </NavLink>

              {!isWorkspaceRoute && (
                <div className="profile-menu-wrapper">
                  <button
                    className="avatar-button"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isProfileOpen}
                    onClick={() =>
                      setIsProfileOpen((current) => !current)
                    }
                  >
                    <span className="avatar-initials">
                      {getInitials(user)}
                    </span>
                    <ChevronDown size={16} />
                  </button>

                  {isProfileOpen && (
                    <div className="profile-menu" role="menu">
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
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings size={17} />
                        Profile Settings
                      </Link>

                      <button
                        className="profile-menu-item logout-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        <LogOut size={17} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <NavLink className="header-login-link" to="/login">
                Log In
              </NavLink>

              <NavLink
                className="header-signup-button"
                to="/register"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
