import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import RsmDashboard from "./pages/dashboard/RsmDashboard";
import SODashboard from "./pages/dashboard/SODashboard";
import UserProfile from "./components/UserProfile";
import LogisticManagerDashboard from "./pages/dashboard/LogisticManagerDashboard";
import BossDashboard from "./pages/dashboard/BossDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* 👇 Default route redirects to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/userprofile" element={<UserProfile />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/rsm" element={<RsmDashboard />} />
        <Route path="/dashboard/so" element={<SODashboard />} />
        <Route path="/dashboard/logistic" element={<LogisticManagerDashboard />} />
        <Route path="/dashboard/owner" element={<BossDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
