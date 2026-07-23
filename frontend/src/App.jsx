import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/home";
import {
  LoginPage,
  RegisterPage,
} from "./pages/auth";
import WorkspacesPage from "./pages/workspaces";
import WorkspacePage, {
  AnalyticsTab,
  ChatTab,
  DocumentsTab,
} from "./pages/workspace";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          element={<ProtectedRoute />}
        >
          <Route
            path="/dashboard"
            element={<WorkspacesPage />}
          />

          <Route
            path="/workspaces"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/workspace/:workspaceId"
            element={<WorkspacePage />}
          >
            <Route
              index
              element={<Navigate to="documents" replace />}
            />

            <Route
              path="documents"
              element={<DocumentsTab />}
            />

            <Route
              path="chat"
              element={<ChatTab />}
            />

            <Route
              path="analytics"
              element={<AnalyticsTab />}
            />

            <Route
              path="*"
              element={<Navigate to="documents" replace />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>
    </Routes>
  );
}

export default App;
