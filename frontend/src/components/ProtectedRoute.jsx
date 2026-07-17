import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const location = useLocation();

  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <section className="page">
        <p>Checking your session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;