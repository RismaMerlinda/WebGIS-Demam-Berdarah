import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Clock
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Inputs are strictly empty upon initial load
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(null);

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Format alamat email tidak valid.';
    }

    if (!formData.password) {
      errs.password = 'Password wajib diisi.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password minimal harus terdiri dari 6 karakter.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setRateLimitSeconds(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await login(formData.email.trim(), formData.password, formData.remember);

      const destination = location.state?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;

        if (status === 429) {
          setRateLimitSeconds(data.retry_after || 60);
          setGeneralError(
            data.message || 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.'
          );
        } else if (status === 422) {
          if (data.errors) {
            setErrors(data.errors);
          }
          setGeneralError(data.message || 'Kredensial yang dimasukkan tidak cocok.');
        } else if (status === 403) {
          setGeneralError(
            data.message || 'Akses ditolak. Akun tidak memiliki hak akses administrator.'
          );
        } else {
          setGeneralError('Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.');
        }
      } else {
        setGeneralError('Tidak dapat terhubung ke server backend. Periksa koneksi Anda.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        {/* Tautan Kembali ke Beranda */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Beranda</span>
          </Link>
        </div>

        {/* Card Login Sederhana & Bersih */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Logo & Identitas Sistem */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 tracking-tight block leading-tight">
                WebGIS DBD Banyumas
              </span>
              <span className="text-[10px] text-slate-400">Portal Administrator</span>
            </div>
          </div>

          {/* Judul & Subjudul 1 Kalimat */}
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Masuk Administrator
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan akun terdaftar untuk mengakses panel pengelolaan data spasial.
            </p>
          </div>

          {/* Pesan Error / Rate Limit */}
          {generalError && (
            <div
              className={`mb-5 p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                rateLimitSeconds
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {rateLimitSeconds ? (
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="leading-snug">{generalError}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Input Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700"
              >
                Alamat Email
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled={submitting}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="nama@instansi.go.id"
                  className={`block w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-all ${
                    errors.email
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 focus:ring-slate-800 focus:border-slate-800'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-600 pt-0.5">
                  {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                </p>
              )}
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={submitting}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className={`block w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-all ${
                    errors.password
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 focus:ring-slate-800 focus:border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 pt-0.5">
                  {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                </p>
              )}
            </div>

            {/* Checkbox Ingat Sesi */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-600">
                  Ingat sesi saya
                </span>
              </label>
            </div>

            {/* Tombol Login */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-400 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk Administrator</span>
                )}
              </button>
            </div>
          </form>

          {/* Catatan Kecil Singkat */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Akses terbatas untuk administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
