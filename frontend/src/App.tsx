import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import ProjectsPage from "@/pages/Projects/ProjectsPage";
import ProjectDetailPage from "@/pages/Projects/ProjectDetailPage";
import GlobalVaultPage from "@/pages/Credentials/GlobalVaultPage";
import UsersPage from "@/pages/Users/UsersPage";
import AuditPage from "@/pages/Audit/AuditPage";
import { RolesPage } from "@/pages/Settings/RolesPage";
import { RoleDetailPage } from "@/pages/Settings/RoleDetailPage";
import { BoardPage } from "@/pages/ProjectManagement/BoardPage";
import { ListPage } from "@/pages/ProjectManagement/ListPage";
import { BacklogPage } from "@/pages/ProjectManagement/BacklogPage";
import { ParkingLotPage } from "@/pages/ProjectManagement/ParkingLotPage";
import { EpicsPage } from "@/pages/ProjectManagement/EpicsPage";
import { SystemSettingsPage } from "@/pages/Settings/SystemSettingsPage";
import { usePublicSettings } from "@/hooks/usePublicSettings";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuthStore();
  if (!isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  usePublicSettings()
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/"                     element={<DashboardPage />} />
          <Route path="/projects"             element={<ProjectsPage />} />
          <Route path="/projects/:id"         element={<ProjectDetailPage />} />
          <Route path="/vault"                element={<GlobalVaultPage />} />
          <Route path="/users"                element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          <Route path="/audit"                element={<RequireAdmin><AuditPage /></RequireAdmin>} />
          <Route path="/settings/roles"         element={<RequireAdmin><RolesPage /></RequireAdmin>} />
          <Route path="/settings/roles/:roleId" element={<RequireAdmin><RoleDetailPage /></RequireAdmin>} />
          <Route path="/settings/system"        element={<RequireAdmin><SystemSettingsPage /></RequireAdmin>} />
          <Route path="/projects/:id/board"     element={<BoardPage />} />
          <Route path="/projects/:id/list"      element={<ListPage />} />
          <Route path="/projects/:id/backlog"   element={<BacklogPage />} />
          <Route path="/projects/:id/parking-lot" element={<ParkingLotPage />} />
          <Route path="/projects/:id/epics"       element={<EpicsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
