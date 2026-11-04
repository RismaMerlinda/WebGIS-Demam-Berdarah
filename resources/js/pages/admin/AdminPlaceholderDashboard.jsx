import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck,
  LogOut,
  User,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Home
} from 'lucide-react';

export default function AdminPlaceholderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);

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

  const handlePingAdminApi = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await axios.get('/api/admin/ping');
      setPingResult({
        success: true,
        message: res.data.message,
        data: res.data.user,
      });
    } catch (err) {
      setPingResult({
        success: false,
        message: err.response?.data?.message || 'Gagal menghubungi API admin.',
      });
    } finally {
      setPingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">Panel Administrator WebGIS</span>
              <span className="ml-2 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>{user?.name || user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white text-xs font-semibold transition-colors"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Success Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-emerald-900">
              Autentikasi Administrator Berhasil (Fitur 2 Aktif)
            </h2>
            <p className="text-sm text-emerald-800 leading-relaxed">
              Selamat datang, <strong>{user?.name}</strong> ({user?.email}). Sesi administrator Anda telah diverifikasi secara aman oleh Laravel Session & MySQL dengan proteksi CSRF dan regenerasi session.
            </p>
          </div>
        </div>

        {/* Placeholder Info Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-semibold w-fit">
            <Clock className="w-4 h-4" />
            <span>Placeholder Terjadwal: Modul Dashboard Administrator (Fitur 11)</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-slate-900">
              Area Panel Administrator WebGIS DBD Banyumas
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Halaman ini merupakan tempat mendarat resmi setelah login administrator berhasil. Sesuai roadmap 33 fitur Master Instruction, seluruh modul analitik, ringkasan agregat, dan manajemen data master akan dibangun secara bertahap pada Fitur 11 s.d. 32.
            </p>
          </div>

          {/* Test Protected API Button */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Uji Otorisasi Middleware Backend (`auth:web` + `admin` middleware):
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePingAdminApi}
                disabled={pingLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white text-xs font-semibold transition-all shadow-sm"
              >
                {pingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Ping Endpoint API Terproteksi (`/api/admin/ping`)</span>
              </button>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Lihat Landing Page Publik</span>
              </Link>
            </div>

            {pingResult && (
              <div
                className={`p-4 rounded-xl text-xs font-mono border ${
                  pingResult.success
                    ? 'bg-slate-900 text-emerald-400 border-slate-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <p>Status: {pingResult.success ? '200 OK (Authorized)' : 'Error'}</p>
                <p>Pesan: {pingResult.message}</p>
                {pingResult.data && (
                  <p className="mt-1 text-slate-300">
                    Data Sesi: {JSON.stringify(pingResult.data)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
