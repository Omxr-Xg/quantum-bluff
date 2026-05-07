import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthItem } from "../utils/authStorage";

interface Props {
  children: ReactNode;
}

/** Accès réservé au jeton émis par POST /api/auth/admin/login. */
export function AdminProtectedRoute({ children }: Props) {
  const location = useLocation();
  const token = getAuthItem("token");

  if (!token) {
    return <Navigate to="/auth/admin" state={{ from: location.pathname }} replace />;
  }

  if (getAuthItem("role") !== "admin") {
    return <Navigate to="/auth/admin" replace />;
  }

  return <>{children}</>;
}
