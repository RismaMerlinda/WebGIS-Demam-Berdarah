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
    <div className="min-h-dvh bg-[#fbfbfa] flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        {/* Tautan Kembali ke Beranda */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Beranda</span>
          </Link>
        </div>

        {/* Card Login Sederhana & Bersih */}
        <div className="bg-white border border-[#e2e8e5] rounded-lg p-6 sm:p-8">
          {/* Logo & Identitas Sistem */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-md bg-[#123027] text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#17221e] tracking-tight block leading-tight">
                WebGIS DBD Banyumas
              </span>
              <span className="text-[11px] text-[#7d8f87]">Portal Administrator</span>
            </div>
          </div>

          {/* Judul & Subjudul */}
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold text-[#17221e] tracking-tight">
              Masuk Administrator
            </h1>
            <p className="text-xs text-[#4e6057] leading-relaxed">
              Gunakan akun terdaftar untuk mengakses panel pengelolaan data spasial.
            </p>
          </div>

          {/* Pesan Error / Rate Limit */}
          {generalError && (
            <div
              className={`mb-5 p-3 rounded-md text-xs flex items-start gap-2.5 border ${rateLimitSeconds
                  ? 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]'
                  : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                }`}
            >
              {rateLimitSeconds ? (
                <Clock className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#b91c1c] shrink-0 mt-0.5" />
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
                className="block text-xs font-medium text-[#17221e]"
              >
                Alamat Email
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
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
                  className={`block w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-md border bg-white text-[#17221e] placeholder-[#7d8f87] focus:outline-none focus:border-[#123027] transition-colors ${errors.email
                      ? 'border-[#fecaca] focus:border-[#b91c1c]'
                      : 'border-[#c5d1cb]'
                    }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-[#b91c1c] pt-0.5">
                  {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                </p>
              )}
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#17221e]"
              >
                Password
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
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
                  className={`block w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-md border bg-white text-[#17221e] placeholder-[#7d8f87] focus:outline-none focus:border-[#123027] transition-colors ${errors.password
                      ? 'border-[#fecaca] focus:border-[#b91c1c]'
                      : 'border-[#c5d1cb]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-[#b91c1c] pt-0.5">
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
                  className="w-3.5 h-3.5 rounded text-[#123027] focus:ring-[#123027] border-[#c5d1cb] cursor-pointer"
                />
                <span className="text-xs text-[#4e6057]">
                  Ingat sesi saya
                </span>
              </label>
            </div>

            {/* Tombol Login */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#123027] hover:bg-[#194337] active:bg-[#0c201a] disabled:bg-[#c5d1cb] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none"
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

          {/* Catatan Singkat */}
          <div className="mt-6 pt-4 border-t border-[#e2e8e5] text-center">
            <p className="text-[11px] text-[#7d8f87]">
              Akses terbatas untuk administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
