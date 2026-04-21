import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
}

/** Accès réservé au jeton émis par POST /api/auth/admin/login. */
export function AdminProtectedRoute({ children }: Props) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/auth/admin" state={{ from: location.pathname }} replace />;
  }

  if (localStorage.getItem("role") !== "admin") {
    return <Navigate to="/auth/admin" replace />;
  }

  return <>{children}</>;
}
