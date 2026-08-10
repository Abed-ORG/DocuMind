import { useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
} from "react-router";
import {
  ChevronDown,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";

import DocuMindLogo from "./DocuMindLogo";
import { useAuth } from "../context/AuthContext";
import { getStorageUsage } from "../utils/storageUsage";
import "./Header.css";

function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  return `${first}${last}` || "DM";
}

function Header() {
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const {
    user,
    isAuthenticated,
    isLoggingOut,
    logout,
  } = useAuth();

  const isWorkspaceRoute =
    location.pathname.startsWith("/workspace/");
  const storageUsage = getStorageUsage(user);

  if (isWorkspaceRoute) {
    return null;
  }

  function handleLogout() {
    logout();
  }

  return (
    <header className="site-header">
      <div className="site-header-container">
        <Link className="site-logo" to="/">
          <DocuMindLogo className="site-logo-image" />
        </Link>

        <nav
          className="header-section-links"
          aria-label="Landing sections"
        >
          <a className="header-nav-link" href="/#features">
            Features
          </a>
          <a className="header-nav-link" href="/#how-it-works">
            How It Works
          </a>
          {isAuthenticated && (
            <NavLink
              className="header-nav-link"
              to="/dashboard"
            >
              Dashboard
            </NavLink>
          )}
        </nav>

        <nav className="site-navigation" aria-label="Primary">
          {isAuthenticated ? (
            <>
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
                          <strong>{storageUsage.label}</strong>
                        </div>
                        <div className="storage-track">
                          <span
                            style={{
                              width: `${storageUsage.percent}%`,
                            }}
                          />
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
                        disabled={isLoggingOut}
                        aria-busy={isLoggingOut}
                        onClick={handleLogout}
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
