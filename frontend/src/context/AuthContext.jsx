/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router";

import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/api";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY =
  "documind_token";

const LOGOUT_BUFFER_MS = 800;

function getStoredToken() {
  return localStorage.getItem(
    TOKEN_STORAGE_KEY
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function AuthProvider({
  children,
}) {
  const navigate = useNavigate();

  const [token, setToken] = useState(
    getStoredToken
  );

  const [user, setUser] = useState(null);

  const [isLoading, setIsLoading] =
    useState(Boolean(getStoredToken()));

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  function saveAuthentication(authData) {
    setToken(authData.token);
    setUser(authData.user);

    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      authData.token
    );
  }

  function clearAuthentication() {
    setToken(null);
    setUser(null);

    localStorage.removeItem(
      TOKEN_STORAGE_KEY
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response =
          await getCurrentUser(token);

        if (isMounted) {
          setUser(response.user);
        }
      } catch (error) {
        console.error(
          "Session restoration failed:",
          error
        );

        if (isMounted) {
          clearAuthentication();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function register(formData) {
    const response =
      await registerUser(formData);

    saveAuthentication(response);

    return response;
  }

  async function login(credentials) {
    const response =
      await loginUser(credentials);

    saveAuthentication(response);

    return response;
  }

  async function logout() {
    setIsLoggingOut(true);

    await wait(LOGOUT_BUFFER_MS);

    clearAuthentication();
    setIsLoggingOut(false);

    navigate("/login", {
      replace: true,
    });
  }

  const contextValue = {
    token,
    user,
    isLoading,
    isLoggingOut,
    isAuthenticated:
      Boolean(token && user),
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(
    AuthContext
  );

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}
