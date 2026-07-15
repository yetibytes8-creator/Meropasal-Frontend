import { Navigate, useLocation } from "react-router-dom";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { canAccessRoute, type StaffRole } from "@/lib/rbac";

interface Props { children: React.ReactNode }

/**
 * Wraps a page inside a staff session. If the logged-in staff member's role
 * does not permit the current route, they are redirected to /access-denied.
 * When no staff session is active the guard is transparent (owner/admin handles
 * their own access via ModuleGuard + JWT auth).
 */
export default function RoleGuard({ children }: Props) {
  const { staffUser } = useStaffAuth();
  const { pathname } = useLocation();

  if (!staffUser) return <>{children}</>;

  if (!canAccessRoute(staffUser.role as StaffRole, pathname)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
