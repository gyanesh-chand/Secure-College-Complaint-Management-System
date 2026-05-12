import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SubmitComplaintPage from "./pages/SubmitComplaintPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import "./App.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/submit" element={
                <ProtectedRoute roles={["student"]}><SubmitComplaintPage /></ProtectedRoute>
              } />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={["admin"]}><AdminUsersPage /></ProtectedRoute>
              } />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgb(15 23 42)",
                border: "1px solid rgb(30 41 59)",
                color: "rgb(241 245 249)",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
