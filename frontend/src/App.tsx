import { Navigate, Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import HODDashboard from "@/pages/HOD-Dashboard";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import ViceDeanDashboard from "@/pages/Vice-Dean-Dashboard";
import Archive from "@/pages/Archive";
import MonitoringOfficerDashboard from "@/pages/Monitoring-Officer-Dashboard";
import ViewCompiled from "@/pages/ViewCompiled";
import Classified from "@/pages/Classified";
import FinanceDashboard from "@/pages/Finance-Dashboard";
import DeanDashboard from "@/pages/Dean-Dashboard";
import Admin from "@/pages/Admin-Dashboard";
import Integration from "@/pages/Integration";
import Audit from "@/pages/Audit";
import Configuration from "@/pages/Configuration";
import Notification from "@/pages/Notification";
import NotificationConfig from "@/pages/NotificationConfig";
import Tariff from "@/pages/Tariff";
import Timetable from "@/pages/Timetable";
import UsersDirectory from "@/pages/Users-directory";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <FontSizeProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route
                path="/hod-dashboard"
                element={
                  <ProtectedRoute requiredRoles="HOD">
                    <HODDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submitted-records"
                element={
                  <ProtectedRoute>
                    <ViceDeanDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <ProtectedRoute>
                    <Archive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/archive/:lecturer"
                element={
                  <ProtectedRoute>
                    <Archive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fiches"
                element={
                  <ProtectedRoute>
                    <MonitoringOfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fiches/record/:id"
                element={
                  <ProtectedRoute>
                    <ViewCompiled />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/classified"
                element={
                  <ProtectedRoute requiredRoles="Academic Monitoring Officer">
                    <Classified />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tariffication"
                element={
                  <ProtectedRoute>
                    <FinanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tariff"
                element={
                  <ProtectedRoute requiredRoles={["Finance Officer", "Admin"]}>
                    <Tariff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRoles="Admin">
                    <UsersDirectory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approval"
                element={
                  <ProtectedRoute>
                    <DeanDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integration"
                element={
                  <ProtectedRoute>
                    <Integration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <Audit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuration"
                element={
                  <ProtectedRoute>
                    <Configuration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification"
                element={
                  <ProtectedRoute>
                    <Notification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification-config"
                element={
                  <ProtectedRoute requiredRoles="Admin">
                    <NotificationConfig />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable"
                element={
                  <ProtectedRoute>
                    <Timetable />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>

            <Toaster />
          </div>
        </FontSizeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App
