import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import WorkspacePage from "./pages/WorkspacePage";
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
          />

          <Route
            path="/workspace/:workspaceId/:section"
            element={<WorkspacePage />}
          />
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
