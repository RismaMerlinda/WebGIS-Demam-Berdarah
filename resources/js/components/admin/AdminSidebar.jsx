import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Users,
  User,
  BookOpen,
  LogOut,
  Map,
  Home,
  ExternalLink,
  X,
  Loader2,
  Shield,
  MapPinned,
  CalendarDays,
  Database,
} from 'lucide-react';

export default function AdminSidebar({ onNavigate, onClose, isMobile = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const currentView = searchParams.get('view');

  const mainNavItems = [
    {
      name: 'Dashboard',
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      testId: 'admin-nav-dashboard',
      isActive:
        location.pathname === '/admin/dashboard' && currentView !== 'education',
    },
    {
      name: 'Kelola Kasus DBD',
      to: '/admin/cases',
      icon: Layers,
      testId: 'admin-nav-cases',
      isActive: location.pathname.startsWith('/admin/cases'),
    },
    {
      name: 'Kelola Wilayah',
      to: '/admin/regions',
      icon: MapPinned,
      testId: 'admin-nav-regions',
      isActive: location.pathname.startsWith('/admin/regions'),
    },
    {
      name: 'Kelola Periode',
      to: '/admin/periods',
      icon: CalendarDays,
      testId: 'admin-nav-periods',
      isActive: location.pathname.startsWith('/admin/periods'),
    },
    {
      name: 'Kelola Metadata',
      to: '/admin/metadata',
      icon: Database,
      testId: 'admin-nav-metadata',
      isActive: location.pathname.startsWith('/admin/metadata'),
    },
    {
      name: 'Manajemen Pengguna',
      to: '/admin/users',
      icon: Users,
      testId: 'admin-nav-users',
      isActive: location.pathname.startsWith('/admin/users'),
    },
    {
      name: 'Profil Saya',
      to: '/admin/profile',
      icon: User,
      testId: 'admin-nav-profile',
      isActive: location.pathname.startsWith('/admin/profile'),
    },
    {
      name: 'Edukasi',
      to: '/admin/dashboard?view=education',
      icon: BookOpen,
      testId: 'admin-nav-education',
      isActive:
        location.pathname === '/admin/education' ||
        (location.pathname === '/admin/dashboard' && currentView === 'education'),
    },
  ];

  const roleDisplay = user?.role === 'user' ? 'USER' : 'SUPER_ADMIN';

  const handleClickNav = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-[#0c201a] text-white border-r border-[#193a30] select-none">
      {/* 1. BAGIAN ATAS SIDEBAR: IDENTITAS APLIKASI (SATU KALI) */}
      <div className="flex items-center justify-between px-4 py-4.5 border-b border-[#193a30] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#194337] to-[#123027] border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm tracking-tight text-white leading-tight">
              WebGIS DBD
            </div>
            <div className="text-[11px] text-emerald-300/90 font-medium leading-tight mt-0.5">
              Kabupaten Banyumas
            </div>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#142f26] transition-colors cursor-pointer"
            aria-label="Tutup navigasi sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. BAGIAN NAVIGASI UTAMA & AKSES WEBGIS */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {/* Kelompok Menu Utama */}
        <div className="space-y-1">
          <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Menu Utama
          </p>
          {mainNavItems.map((item) => {
            const active = item.isActive;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                to={item.to}
                data-testid={item.testId}
                onClick={handleClickNav}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#194337] text-white shadow-2xs border-l-[3px] border-emerald-400 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-[#142f26] border-l-[3px] border-transparent'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Kelompok Akses WebGIS */}
        <div className="pt-2 border-t border-[#193a30] space-y-1">
          <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Akses WebGIS
          </p>
          <Link
            to="/peta"
            target="_blank"
            rel="noreferrer"
            onClick={handleClickNav}
            className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-[#142f26] transition-colors"
            title="Buka Peta Interaktif Publik di tab baru"
          >
            <div className="flex items-center gap-3">
              <Map className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Peta Publik</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </Link>

          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            onClick={handleClickNav}
            className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-[#142f26] transition-colors"
            title="Buka Beranda WebGIS di tab baru"
          >
            <div className="flex items-center gap-3">
              <Home className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Beranda WebGIS</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* 3. BAGIAN BAWAH SIDEBAR: INFORMASI AKUN ADMINISTRATOR & TOMBOL LOGOUT */}
      <div className="shrink-0 mt-auto border-t border-[#193a30] p-3.5 bg-[#081511]">
        {/* Administrator Profile Link */}
        <Link
          to="/admin/profile"
          onClick={handleClickNav}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#122e25] transition-colors group mb-2.5"
          title="Buka Profil Saya"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#194337] to-[#123027] border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0 shadow-2xs">
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
              {user?.name || 'Administrator'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
              <span className="truncate max-w-[95px]">@{user?.username || 'admin'}</span>
              <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#143d31] text-emerald-300 border border-emerald-500/30">
                {roleDisplay}
              </span>
            </div>
          </div>
        </Link>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          data-testid="admin-logout-button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 text-rose-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          title="Keluar dari sesi administrator"
        >
          {loggingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

