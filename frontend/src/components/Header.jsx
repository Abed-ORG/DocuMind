import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  useLocation,
} from "react-router";
import {
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";

import DocuMindLogo from "./DocuMindLogo";
import { useAuth } from "../context/AuthContext";
import { ROBOT_PET_EVENT } from "../pages/workspaces/components/dashboard/RobotPet";
import { getStorageUsage } from "../utils/storageUsage";
import "./Header.css";

const LOGOUT_ANIMATION_MS = 1500;

function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  return `${first}${last}` || "DM";
}

function Header() {
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);
  const [isLogoutAnimating, setIsLogoutAnimating] =
    useState(false);
  const logoutTimerRef = useRef(null);

  const {
    user,
    isAuthenticated,
    isLoggingOut,
    logout,
  } = useAuth();

  const isWorkspaceRoute =
    location.pathname.startsWith("/workspace/");
  const storageUsage = getStorageUsage(user);

  useEffect(
    () => () => {
      window.clearTimeout(logoutTimerRef.current);
    },
    []
  );

  if (isWorkspaceRoute) {
    return null;
  }

  function sendRobotAction(action) {
    window.dispatchEvent(
      new CustomEvent(ROBOT_PET_EVENT, {
        detail: {
          action,
        },
      })
    );
  }

  function handleProfileToggle() {
    setIsProfileOpen((current) => {
      const next = !current;

      sendRobotAction(
        next ? "profile-open" : "profile-close"
      );

      return next;
    });
  }

  function closeProfileMenu() {
    setIsProfileOpen(false);
    sendRobotAction("profile-close");
  }

  function handleLogout() {
    if (isLogoutAnimating || isLoggingOut) {
      return;
    }

    setIsLogoutAnimating(true);
    setIsProfileOpen(false);
    sendRobotAction("goodbye");

    logoutTimerRef.current =
      window.setTimeout(() => {
        logout();
        setIsLogoutAnimating(false);
      }, LOGOUT_ANIMATION_MS);
  }

  const shouldShowProfileMenu =
    isProfileOpen &&
    isAuthenticated &&
    !isLoggingOut &&
    !isLogoutAnimating;

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
                    onClick={handleProfileToggle}
                  >
                    <span className="avatar-initials">
                      {getInitials(user)}
                    </span>
                  </button>

                  {shouldShowProfileMenu && (
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
                        onClick={closeProfileMenu}
                      >
                        <Settings size={17} />
                        Profile Settings
                      </Link>

                      <button
                        className="profile-menu-item logout-menu-item"
                        type="button"
                        role="menuitem"
                        disabled={
                          isLoggingOut ||
                          isLogoutAnimating
                        }
                        aria-busy={
                          isLoggingOut ||
                          isLogoutAnimating
                        }
                        onClick={handleLogout}
                      >
                        {isLoggingOut ||
                        isLogoutAnimating ? (
                          <Loader2
                            className="logout-spinner"
                            size={17}
                          />
                        ) : (
                          <LogOut size={17} />
                        )}
                        {isLoggingOut ||
                        isLogoutAnimating
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
