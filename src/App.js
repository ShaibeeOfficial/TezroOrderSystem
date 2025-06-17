import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import RsmDashboard from "./pages/dashboard/RsmDashboard";
import SODashboard from "./pages/dashboard/SODashboard";
import UserProfile from "./components/UserProfile";
import LogisticManagerDashboard from "./pages/dashboard/LogisticManagerDashboard";
import BossDashboard from "./pages/dashboard/BossDashboard";
import DirectOrderDashboard from "./pages/dashboard/DirectOrderDashboard";
import DealerDashboard from "./pages/dashboard/DealerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* 👇 Default route redirects to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* 👇 Protected Routes */}
        <Route
          path="/userprofile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/rsm"
          element={
            <ProtectedRoute allowedRole="rsm">
              <RsmDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/so"
          element={
            <ProtectedRoute allowedRole="so">
              <SODashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/logistic"
          element={
            <ProtectedRoute allowedRole="logistic">
              <LogisticManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/owner"
          element={
            <ProtectedRoute allowedRole="owner">
              <BossDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/dealer"
          element={
            <ProtectedRoute allowedRole="dealer">
              <DealerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/direct"
          element={
            <ProtectedRoute allowedRole={["factoryprocgm", "khanpursale"]}>
              <DirectOrderDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for invalid paths */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;