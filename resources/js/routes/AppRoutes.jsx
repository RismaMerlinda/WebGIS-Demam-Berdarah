import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import LandingPage from '../pages/public/LandingPage';
import PublicDashboard from '../pages/public/PublicDashboard';
import PublicMapPage from '../pages/public/PublicMapPage';
import PublicComparePage from '../pages/public/PublicComparePage';
import PublicTrendPage from '../pages/public/PublicTrendPage';
import PublicMetadataPage from '../pages/public/PublicMetadataPage';
import PublicEducationPage from '../pages/public/PublicEducationPage';
import LoginPage from '../pages/admin/LoginPage';
import AdminPlaceholderDashboard from '../pages/admin/AdminPlaceholderDashboard';
import AdminCaseManagementPage from '../pages/admin/AdminCaseManagementPage';
import AdminRegionManagementPage from '../pages/admin/AdminRegionManagementPage';
import AdminPeriodManagementPage from '../pages/admin/AdminPeriodManagementPage';
import AdminMetadataManagementPage from '../pages/admin/AdminMetadataManagementPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
import AdminUserManagementPage from '../pages/admin/AdminUserManagementPage';
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
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminPlaceholderDashboard />} />
          <Route path="/admin/cases" element={<AdminCaseManagementPage />} />
          <Route path="/admin/regions" element={<AdminRegionManagementPage />} />
          <Route path="/admin/periods" element={<AdminPeriodManagementPage />} />
          <Route path="/admin/metadata" element={<AdminMetadataManagementPage />} />
          <Route path="/admin/users" element={<AdminUserManagementPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/education" element={<Navigate to="/admin/dashboard?view=education" replace />} />
        </Route>
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
