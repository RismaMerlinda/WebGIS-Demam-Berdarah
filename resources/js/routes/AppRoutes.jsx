import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/public/LandingPage';
import PublicDashboard from '../pages/public/PublicDashboard';
import PublicMapPage from '../pages/public/PublicMapPage';
import PublicComparePage from '../pages/public/PublicComparePage';
import PublicTrendPage from '../pages/public/PublicTrendPage';
import PublicMetadataPage from '../pages/public/PublicMetadataPage';
import PublicEducationPage from '../pages/public/PublicEducationPage';
import LoginPage from '../pages/admin/LoginPage';
import AdminPlaceholderDashboard from '../pages/admin/AdminPlaceholderDashboard';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
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
        <Route path="/perbandingan" element={<PublicComparePage />} />
        <Route path="/tren" element={<PublicTrendPage />} />
        <Route path="/metadata" element={<PublicMetadataPage />} />
        <Route path="/edukasi" element={<PublicEducationPage />} />
      </Route>

      {/* Guest Only Routes (Redirects to /admin/dashboard if already authenticated) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Administrator Routes (Guarded by session and admin authorization) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin/dashboard" element={<AdminPlaceholderDashboard />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
