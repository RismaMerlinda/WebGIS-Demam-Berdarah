import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Menu, ShieldCheck } from 'lucide-react';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 flex flex-col lg:flex-row font-sans antialiased">
      {/* =================================================================== */}
      {/* 1. DESKTOP PERMANENT LEFT SIDEBAR                                    */}
      {/* =================================================================== */}
      <div className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        <AdminSidebar />
      </div>

      {/* =================================================================== */}
      {/* 2. MOBILE / TABLET SLIM TOP BAR (HANYA MUNCUL DI LAYAR < LG)       */}
      {/* =================================================================== */}
      <header className="lg:hidden bg-[#0c201a] text-white border-b border-[#193a30] sticky top-0 z-40 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#142f26] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            aria-label="Buka navigasi sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#194337] flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-white">
              WebGIS DBD Banyumas
            </span>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 3. MOBILE / TABLET DRAWER OVERLAY                                   */}
      {/* =================================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col">
            <AdminSidebar
              isMobile={true}
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. MAIN CONTENT AREA (TIDAK ADA NAVBAR BESAR DI DESKTOP)            */}
      {/* =================================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <Outlet />
        </main>

        {/* Minimalist Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4">
            WebGIS Demam Berdarah Dengue Kabupaten Banyumas &copy; 2026. Hak Cipta Dilindungi.
          </div>
        </footer>
      </div>
    </div>
  );
}
