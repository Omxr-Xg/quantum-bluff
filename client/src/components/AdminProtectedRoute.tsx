import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getAdminAuthToken,
  isAdminAuthSession,
  migrateLegacyAdminTokenInPlayerSlot,
} from "../utils/adminAuth";

interface Props {
  children: ReactNode;
}

/** Accès réservé au jeton émis par POST /api/auth/admin/login. */
export function AdminProtectedRoute({ children }: Props) {
  const location = useLocation();

  useEffect(() => {
    migrateLegacyAdminTokenInPlayerSlot();
  }, []);

  if (!getAdminAuthToken() || !isAdminAuthSession()) {
    return <Navigate to="/auth/admin" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
