import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/public/LandingPage';
import PublicDashboard from '../pages/public/PublicDashboard';
import PublicMapPage from '../pages/public/PublicMapPage';
import LoginPage from '../pages/admin/LoginPage';
import AdminPlaceholderDashboard from '../pages/admin/AdminPlaceholderDashboard';
import ProtectedRoute from '../components/ProtectedRoute';
import GuestRoute from '../components/GuestRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages with Standard Public Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<PublicDashboard />} />
        <Route path="/peta" element={<PublicMapPage />} />
      </Route>

      {/* Guest Only Routes (Redirects to /admin/dashboard if already authenticated) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Administrator Routes (Guarded by session and admin authorization) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin/dashboard" element={<AdminPlaceholderDashboard />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
