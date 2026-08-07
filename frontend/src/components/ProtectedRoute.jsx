import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import { useAuth } from "../context/AuthContext";
import { AuthGateSkeleton } from "./Skeleton";

function ProtectedRoute() {
  const location = useLocation();

  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return <AuthGateSkeleton />;
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
