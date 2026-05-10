import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthItem } from "../utils/authStorage";

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Redirige vers /auth si non authentifié */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getAuthItem("token");

  if (!token) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (getAuthItem("role") === "admin") {
    return <Navigate to="/admin/console" replace />;
  }

  return <>{children}</>;
}
