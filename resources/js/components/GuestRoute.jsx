import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fbfbfa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#123027] animate-spin" />
          <p className="text-sm text-[#4e6057] font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
