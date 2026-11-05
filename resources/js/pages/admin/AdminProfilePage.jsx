import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck,
  User,
  Mail,
  Building2,
  Phone,
  Calendar,
  FileText,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader2,
  ExternalLink,
  Edit3,
  Save,
  X,
  AtSign,
  Info,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export default function AdminProfilePage() {
  const { user, logout, checkAuth } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Active Tab: 'profile' | 'password' (System Feature 11)
  const [activeTab, setActiveTab] = useState('profile');

  // System Feature 10: State Mode Edit Profil
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // Form State Edit Profil
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    agency: '',
    phone: '',
    bio: '',
  });

  // System Feature 11: State Ganti Kata Sandi
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState(null);
  const [passwordFormError, setPasswordFormError] = useState(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  // Ambil data profil administrator dari Laravel API
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get('/api/admin/profile');
      if (res.data?.success && res.data?.profile) {
        const p = res.data.profile;
        setProfile(p);
        // Pre-fill form state
        setFormData({
          name: p.name || '',
          username: p.username || '',
          email: p.email || '',
          agency: p.agency || '',
          phone: p.phone || '',
          bio: p.bio || '',
        });
      } else {
        throw new Error(res.data?.message || 'Data profil administrator tidak valid.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/profile' } } });
        return;
      }
      const msg =
        err.response?.data?.message ||
        'Gagal memuat data profil administrator. Silakan periksa koneksi atau coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  // Helper untuk mendapatkan inisial nama
  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Mulai mode pengeditan profil
  const handleStartEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        email: profile.email || '',
        agency: profile.agency || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);
    setIsEditing(true);
  };

  // Batalkan mode pengeditan (revert ke data semula)
  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        email: profile.email || '',
        agency: profile.agency || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
    setFieldErrors({});
    setFormError(null);
    setIsEditing(false);
  };

  // Handle perubahan input form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Hapus error spesifik saat administrator mulai mengetik ulang
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (formError) setFormError(null);
  };

  // Validasi lokal di sisi client sebelum mengirim ke backend
  const validateClientSide = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nama lengkap administrator wajib diisi.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Nama lengkap minimal 2 karakter.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Nama lengkap maksimal 100 karakter.';
    }

    if (!formData.username.trim()) {
      errors.username = 'Username akun wajib diisi.';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username minimal 3 karakter.';
    } else if (formData.username.trim().length > 50) {
      errors.username = 'Username maksimal 50 karakter.';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(formData.username.trim())) {
      errors.username = 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).';
    }

    if (!formData.email.trim()) {
      errors.email = 'Alamat email dinas wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Format alamat email tidak valid.';
    }

    if (formData.phone && formData.phone.trim()) {
      if (!/^[0-9+\-\s()]+$/.test(formData.phone.trim())) {
        errors.phone = 'Nomor kontak hanya boleh berisi angka, tanda tambah (+), minus (-), dan spasi.';
      } else if (formData.phone.trim().length > 25) {
        errors.phone = 'Nomor kontak maksimal 25 karakter.';
      }
    }

    if (formData.agency && formData.agency.trim().length > 120) {
      errors.agency = 'Nama instansi/unit kerja maksimal 120 karakter.';
    }

    if (formData.bio && formData.bio.trim().length > 1000) {
      errors.bio = 'Bio atau catatan tugas maksimal 1000 karakter.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit pengubahan profil administrator
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!validateClientSide()) {
      setFormError('Mohon perbaiki data yang belum sesuai sebelum menyimpan.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        agency: formData.agency.trim() || null,
        phone: formData.phone.trim() || null,
        bio: formData.bio.trim() || null,
      };

      const res = await axios.put('/api/admin/profile', payload);

      if (res.data?.success && res.data?.profile) {
        setProfile(res.data.profile);
        setSuccessMessage(res.data.message || 'Perubahan profil administrator berhasil disimpan.');
        setIsEditing(false);
        setFieldErrors({});

        // Segarkan data sesi aktif pada AuthContext agar nama di navbar sinkron
        if (typeof checkAuth === 'function') {
          checkAuth();
        }
      } else {
        throw new Error(res.data?.message || 'Gagal menyimpan pembaruan profil.');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        // Kesalahan validasi backend
        const validationErrs = err.response.data?.errors || {};
        const formattedErrs = {};
        Object.keys(validationErrs).forEach((key) => {
          formattedErrs[key] = Array.isArray(validationErrs[key])
            ? validationErrs[key][0]
            : validationErrs[key];
        });
        setFieldErrors(formattedErrs);
        setFormError(
          err.response.data?.message || 'Terdapat kesalahan pengisian pada data profil Anda.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true });
      } else {
        setFormError(
          err.response?.data?.message ||
          'Terjadi gangguan saat menyimpan perubahan ke server. Silakan coba lagi.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // System Feature 11: Handlers Ganti Kata Sandi
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));

    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (passwordFormError) setPasswordFormError(null);
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200', text: 'text-slate-400', percent: '0%' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Sangat Lemah', color: 'bg-rose-500', text: 'text-rose-600', percent: '25%' };
      case 2:
        return { score: 2, label: 'Cukup', color: 'bg-amber-500', text: 'text-amber-600', percent: '50%' };
      case 3:
        return { score: 3, label: 'Kuat', color: 'bg-emerald-500', text: 'text-emerald-600', percent: '75%' };
      case 4:
        return { score: 4, label: 'Sangat Kuat', color: 'bg-emerald-600', text: 'text-emerald-700', percent: '100%' };
      default:
        return { score: 0, label: 'Terlalu Pendek', color: 'bg-slate-300', text: 'text-slate-500', percent: '10%' };
    }
  };

  const validatePasswordClientSide = () => {
    const errors = {};
    if (!passwordForm.current_password) {
      errors.current_password = 'Kata sandi saat ini wajib diisi.';
    }

    if (!passwordForm.password) {
      errors.password = 'Kata sandi baru wajib diisi.';
    } else if (passwordForm.password.length < 8) {
      errors.password = 'Kata sandi baru minimal 8 karakter.';
    } else if (passwordForm.password.length > 100) {
      errors.password = 'Kata sandi baru maksimal 100 karakter.';
    } else if (passwordForm.current_password && passwordForm.password === passwordForm.current_password) {
      errors.password = 'Kata sandi baru harus berbeda dari kata sandi saat ini.';
    }

    if (!passwordForm.password_confirmation) {
      errors.password_confirmation = 'Konfirmasi kata sandi baru wajib diisi.';
    } else if (passwordForm.password && passwordForm.password !== passwordForm.password_confirmation) {
      errors.password_confirmation = 'Konfirmasi kata sandi baru tidak sesuai.';
    }

    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setPasswordFormError(null);
    setPasswordSuccessMessage(null);

    if (!validatePasswordClientSide()) {
      setPasswordFormError('Mohon lengkapi dan periksa kembali data kata sandi Anda.');
      return;
    }

    setPasswordSaving(true);

    try {
      const payload = {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      };

      const res = await axios.put('/api/admin/profile/password', payload);

      if (res.data?.success) {
        setPasswordSuccessMessage(
          res.data.message || 'Kata sandi administrator berhasil diperbarui.'
        );
        setPasswordForm({
          current_password: '',
          password: '',
          password_confirmation: '',
        });
        setPasswordFieldErrors({});
      } else {
        throw new Error(res.data?.message || 'Gagal memperbarui kata sandi administrator.');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrs = err.response.data?.errors || {};
        const formattedErrs = {};
        Object.keys(validationErrs).forEach((key) => {
          formattedErrs[key] = Array.isArray(validationErrs[key])
            ? validationErrs[key][0]
            : validationErrs[key];
        });
        setPasswordFieldErrors(formattedErrs);
        setPasswordFormError(
          err.response.data?.message || 'Terdapat kesalahan pada input perubahan kata sandi.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true });
      } else {
        setPasswordFormError(
          err.response?.data?.message ||
          'Terjadi gangguan saat menyimpan perubahan kata sandi. Silakan coba lagi.'
        );
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#fbfbfa] text-[#17221e] flex flex-col font-sans">
      {/* =================================================================== */}
      {/* TOP ADMINISTRATOR NAVIGATION BAR                                    */}
      {/* =================================================================== */}
      <header className="bg-[#0c201a] text-white border-b border-[#193a30] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#194337] flex items-center justify-center font-bold text-sm text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  WebGIS DBD Banyumas
                </span>
                <span className="text-[10.5px] uppercase tracking-wider bg-[#122e25] text-emerald-300 border border-[#1b4337] px-2 py-0.5 rounded font-semibold">
                  {profile?.role || user?.role || 'Admin'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Portal Manajemen & Kewaspadaan Dini Epidemiologi
              </span>
            </div>
          </div>

          {/* Navigation Views Switcher & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="inline-flex items-center bg-[#142f26] p-1 rounded-lg border border-[#1e4539] text-xs">
              <Link
                to="/admin/dashboard"
                className="px-3 py-1.5 rounded-md font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/profile"
                className="px-3 py-1.5 rounded-md font-semibold bg-[#194337] text-white shadow-2xs"
              >
                Profil Saya
              </Link>
            </nav>

            <Link
              to="/peta"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#142f26] hover:bg-[#1a3c31] px-3 py-1.5 rounded-lg border border-[#1e4539] transition-colors"
              title="Buka Peta Interaktif Publik di tab baru"
            >
              <span>Peta Publik</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Keluar dari sesi administrator"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA                                                   */}
      {/* =================================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#4e6057] hover:text-[#123027] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Administrator</span>
          </Link>

          {activeTab === 'profile' && !isEditing && profile && (
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={fetchProfile}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123027] hover:text-[#194337] bg-white border border-[#e2e8e5] hover:border-[#123027] px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Segarkan data dari server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Segarkan</span>
              </button>

              <button
                type="button"
                data-testid="btn-edit-profile"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#123027] hover:bg-[#194337] px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profil</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* TABS NAVIGASI: PROFIL SAYA & GANTI KATA SANDI (SRS 3.11)            */}
        {/* =================================================================== */}
        <div className="flex border-b border-[#e2e8e5] gap-2 pt-1">
          <button
            type="button"
            data-testid="tab-admin-profile"
            onClick={() => {
              setActiveTab('profile');
              setPasswordSuccessMessage(null);
              setPasswordFormError(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'profile'
                ? 'border-[#123027] text-[#123027] bg-[#eef5f2] rounded-t-lg'
                : 'border-transparent text-[#7d8f87] hover:text-[#17221e] hover:border-slate-300'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Informasi Profil</span>
          </button>

          <button
            type="button"
            data-testid="tab-change-password"
            onClick={() => {
              setActiveTab('password');
              setSuccessMessage(null);
              setFormError(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'password'
                ? 'border-[#123027] text-[#123027] bg-[#eef5f2] rounded-t-lg'
                : 'border-transparent text-[#7d8f87] hover:text-[#17221e] hover:border-slate-300'
              }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Ganti Kata Sandi</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: INFORMASI & EDIT PROFIL ADMINISTRATOR (SYSTEM FEATURES 9 & 10)*/}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Success Alert Banner */}
            {successMessage && (
              <div
                data-testid="admin-profile-success"
                className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Error Notification with Retry (Pemuatan Gagal) */}
            {error && (
              <div
                data-testid="admin-profile-error"
                className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#991b1b]"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-[#991b1b]">Gagal Memuat Profil</p>
                    <p className="text-xs text-[#b91c1c] leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && !profile && (
              <div className="bg-white border border-[#e2e8e5] rounded-xl p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
                    <div className="h-4 w-32 bg-slate-100 animate-pulse rounded" />
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-1/2" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-2/3" />
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* MODE 1: FORMULIR EDIT PROFIL ADMINISTRATOR (SYSTEM FEATURE 10)     */}
            {/* ================================================================= */}
            {isEditing && profile && (
              <div
                data-testid="admin-edit-profile-form-section"
                className="bg-white border border-[#e2e8e5] rounded-xl p-6 sm:p-7 shadow-2xs space-y-6"
              >
                <div className="border-b border-[#f1f5f3] pb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-[#17221e] flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#123027]" />
                      <span>Sunting Profil Administrator</span>
                    </h2>
                    <p className="text-xs text-[#7d8f87]">
                      Ubah informasi pribadi dan catatan tugas akun Anda. Nilai yang tersimpan otomatis
                      terisi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-semibold text-[#4e6057] hover:text-[#17221e] px-2.5 py-1 rounded-md border border-[#e2e8e5] hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>

                {/* General Form Error Alert */}
                {formError && (
                  <div
                    data-testid="edit-profile-general-error"
                    className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3.5 text-xs text-[#991b1b] flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <p className="leading-snug">{formError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitEdit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 1. Nama Lengkap Administrator */}
                    <div className="space-y-1">
                      <label htmlFor="name" className="block text-xs font-bold text-[#17221e]">
                        Nama Lengkap <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Contoh: Administrator WebGIS Banyumas"
                        className={`w-full text-xs rounded-lg border p-2.5 bg-white text-[#17221e] transition-colors focus:outline-none focus:ring-1 ${fieldErrors.name
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                          }`}
                      />
                      {fieldErrors.name ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.name}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          Nama lengkap pejabat pengelola atau administrator sistem.
                        </p>
                      )}
                    </div>

                    {/* 2. Username Akun */}
                    <div className="space-y-1">
                      <label htmlFor="username" className="block text-xs font-bold text-[#17221e]">
                        Username <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative rounded-lg">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                          <AtSign className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          required
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="admin_banyumas"
                          className={`w-full text-xs rounded-lg border pl-8 p-2.5 bg-white text-[#17221e] font-mono transition-colors focus:outline-none focus:ring-1 ${fieldErrors.username
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                              : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                            }`}
                        />
                      </div>
                      {fieldErrors.username ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.username}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          Gunakan 3-50 karakter (huruf, angka, titik, atau garis bawah).
                        </p>
                      )}
                    </div>

                    {/* 3. Alamat Email Dinas */}
                    <div className="space-y-1">
                      <label htmlFor="email" className="block text-xs font-bold text-[#17221e]">
                        Alamat Email Dinas <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative rounded-lg">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                          <Mail className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="admin@banyumas.go.id"
                          className={`w-full text-xs rounded-lg border pl-8 p-2.5 bg-white text-[#17221e] font-mono transition-colors focus:outline-none focus:ring-1 ${fieldErrors.email
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                              : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                            }`}
                        />
                      </div>
                      {fieldErrors.email ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          Alamat surat elektronik resmi instansi untuk kredensial login.
                        </p>
                      )}
                    </div>

                    {/* 4. Instansi / Unit Kerja */}
                    <div className="space-y-1">
                      <label htmlFor="agency" className="block text-xs font-bold text-[#17221e]">
                        Instansi / Unit Kerja
                      </label>
                      <div className="relative rounded-lg">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                          <Building2 className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          id="agency"
                          name="agency"
                          value={formData.agency}
                          onChange={handleInputChange}
                          placeholder="Contoh: Dinas Kesehatan Kabupaten Banyumas"
                          className={`w-full text-xs rounded-lg border pl-8 p-2.5 bg-white text-[#17221e] transition-colors focus:outline-none focus:ring-1 ${fieldErrors.agency
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                              : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                            }`}
                        />
                      </div>
                      {fieldErrors.agency ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.agency}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          OPD atau divisi tempat administrator bertugas.
                        </p>
                      )}
                    </div>

                    {/* 5. Nomor Kontak */}
                    <div className="space-y-1 md:col-span-2">
                      <label htmlFor="phone" className="block text-xs font-bold text-[#17221e]">
                        Nomor Kontak / Telepon Dinas
                      </label>
                      <div className="relative rounded-lg">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                          <Phone className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Contoh: 0812-3456-7890 atau +62 812-3456-7890"
                          className={`w-full text-xs rounded-lg border pl-8 p-2.5 bg-white text-[#17221e] font-mono transition-colors focus:outline-none focus:ring-1 ${fieldErrors.phone
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                              : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                            }`}
                        />
                      </div>
                      {fieldErrors.phone ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.phone}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          Nomor telepon seluler atau hotline dinas yang dapat dihubungi.
                        </p>
                      )}
                    </div>

                    {/* 6. Bio / Catatan Tugas */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="bio" className="block text-xs font-bold text-[#17221e]">
                          Bio / Catatan Tugas Administrator
                        </label>
                        <span className="text-[10.5px] text-[#7d8f87]">
                          {formData.bio.length} / 1000 karakter
                        </span>
                      </div>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={4}
                        value={formData.bio}
                        onChange={handleInputChange}
                        placeholder="Tuliskan peran, tupoksi, atau lingkup pengawasan epidemiologi DBD di wilayah Banyumas..."
                        className={`w-full text-xs rounded-lg border p-2.5 bg-white text-[#17221e] transition-colors focus:outline-none focus:ring-1 ${fieldErrors.bio
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                          }`}
                      />
                      {fieldErrors.bio ? (
                        <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.bio}</p>
                      ) : (
                        <p className="text-[10.5px] text-[#7d8f87]">
                          Informasi penugasan ini bersifat internal dan membantu koordinasi tim surveilans.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Informative Security Callout */}
                  <div className="bg-[#f4f7f5] border border-[#d2e4db] rounded-lg p-3 text-xs text-[#123027] flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#194337] shrink-0" />
                    <span className="text-[11px]">
                      Peran administrator (<strong>{profile.role_label}</strong>) dan hak akses akun
                      terlindungi serta tidak dapat diubah melalui formulir ini.
                    </span>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f3]">
                    <button
                      type="button"
                      data-testid="btn-cancel-edit"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      data-testid="btn-save-profile"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] disabled:bg-slate-400 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ================================================================= */}
            {/* MODE 2: TAMPILAN PROFIL READ-ONLY (SYSTEM FEATURE 9)              */}
            {/* ================================================================= */}
            {!isEditing && profile && (
              <div className="space-y-6" data-testid="admin-profile-card">
                {/* A. IDENTITAS ADMINISTRATOR */}
                <div className="bg-white border border-[#e2e8e5] rounded-xl p-6 sm:p-7 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                      {/* Avatar / Foto Profil */}
                      <div className="relative shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#123027] shadow-xs"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#123027] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl tracking-tight shadow-xs border-2 border-[#194337]">
                            {getInitials(profile.name)}
                          </div>
                        )}
                        <span
                          className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"
                          title="Status Akun Aktif"
                        />
                      </div>

                      {/* Identity Information */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef5f2] text-[#123027] border border-[#cbe1d8]">
                            {profile.role_label}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Akun Aktif</span>
                          </span>
                          {!profile.avatar_url && (
                            <span className="text-[11px] text-[#7d8f87] italic">
                              (Belum ada foto profil)
                            </span>
                          )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17221e]">
                          {profile.name}
                        </h1>

                        <div className="flex items-center gap-2 text-xs text-[#4e6057]">
                          <span className="font-mono bg-[#f4f7f5] px-2 py-0.5 rounded border border-[#e2e8e5]">
                            @{profile.username || 'admin'}
                          </span>
                          <span>&bull;</span>
                          <span>ID Pengguna: #{profile.id}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-edit-profile-secondary"
                      onClick={handleStartEdit}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123027] hover:text-[#194337] bg-[#eef5f2] hover:bg-[#e4efe9] border border-[#cbe1d8] px-3.5 py-2 rounded-lg transition-colors cursor-pointer self-start sm:self-center shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Profil</span>
                    </button>
                  </div>
                </div>

                {/* B. INFORMASI DETAIL AKUN */}
                <div className="bg-white border border-[#e2e8e5] rounded-xl p-6 sm:p-7 shadow-2xs space-y-4">
                  <div className="border-b border-[#f1f5f3] pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#17221e] flex items-center gap-2">
                        <User className="w-4 h-4 text-[#123027]" />
                        <span>Informasi Akun Administrator</span>
                      </h2>
                      <p className="text-xs text-[#7d8f87]">
                        Rincian akun dinas dan unit kerja yang terdaftar di basis data sistem.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1 text-xs">
                    {/* Email Dinas */}
                    <div className="bg-[#fbfbfa] border border-[#e2e8e5] rounded-lg p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#7d8f87] font-semibold text-[11px] uppercase tracking-wider">
                        <Mail className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Alamat Email Dinas</span>
                      </div>
                      <div className="font-semibold text-sm text-[#17221e] break-all font-mono">
                        {profile.email}
                      </div>
                    </div>

                    {/* Instansi / Unit Kerja */}
                    <div className="bg-[#fbfbfa] border border-[#e2e8e5] rounded-lg p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#7d8f87] font-semibold text-[11px] uppercase tracking-wider">
                        <Building2 className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Instansi / Unit Kerja</span>
                      </div>
                      <div>
                        {profile.agency ? (
                          <span className="font-semibold text-sm text-[#17221e]">
                            {profile.agency}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] italic">Belum diisi</span>
                        )}
                      </div>
                    </div>

                    {/* Nomor Kontak */}
                    <div className="bg-[#fbfbfa] border border-[#e2e8e5] rounded-lg p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#7d8f87] font-semibold text-[11px] uppercase tracking-wider">
                        <Phone className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Nomor Kontak</span>
                      </div>
                      <div>
                        {profile.phone ? (
                          <span className="font-semibold text-sm text-[#17221e] font-mono">
                            {profile.phone}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] italic">Belum diisi</span>
                        )}
                      </div>
                    </div>

                    {/* Tanggal Pembuatan Akun */}
                    <div className="bg-[#fbfbfa] border border-[#e2e8e5] rounded-lg p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#7d8f87] font-semibold text-[11px] uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Tanggal Pembuatan Akun</span>
                      </div>
                      <div className="font-semibold text-sm text-[#17221e]">
                        {profile.created_at_formatted || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* C. INFORMASI TAMBAHAN: BIO / CATATAN TUGAS */}
                <div className="bg-white border border-[#e2e8e5] rounded-xl p-6 sm:p-7 shadow-2xs space-y-3">
                  <div className="border-b border-[#f1f5f3] pb-3">
                    <h2 className="text-sm sm:text-base font-bold text-[#17221e] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#123027]" />
                      <span>Bio / Catatan Tugas Administrator</span>
                    </h2>
                    <p className="text-xs text-[#7d8f87]">
                      Deskripsi penugasan atau catatan deskriptif peran administrator.
                    </p>
                  </div>

                  <div className="bg-[#fbfbfa] border border-[#e2e8e5] rounded-lg p-4 text-xs leading-relaxed">
                    {profile.bio ? (
                      <p className="text-[#17221e] whitespace-pre-wrap">{profile.bio}</p>
                    ) : (
                      <p className="text-[#94a3b8] italic">
                        Belum ada bio atau catatan tugas yang diisi untuk akun administrator ini.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FORMULIR GANTI KATA SANDI ADMINISTRATOR (SYSTEM FEATURE 11)   */}
        {/* =================================================================== */}
        {activeTab === 'password' && (
          <div
            data-testid="admin-change-password-section"
            className="space-y-6"
          >
            {/* Password Success Alert Banner */}
            {passwordSuccessMessage && (
              <div
                data-testid="admin-password-success"
                className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Password Form Card */}
            <div className="bg-white border border-[#e2e8e5] rounded-xl p-6 sm:p-7 shadow-2xs space-y-6">
              <div className="border-b border-[#f1f5f3] pb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-[#17221e] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#123027]" />
                    <span>Ganti Kata Sandi Administrator</span>
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Perbarui kata sandi akun administrator Anda untuk menjaga keamanan hak akses dan data epidemiologi WebGIS DBD.
                  </p>
                </div>
              </div>

              {/* General Form Error Alert */}
              {passwordFormError && (
                <div
                  data-testid="change-password-general-error"
                  className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3.5 text-xs text-[#991b1b] flex items-start gap-2.5 animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                  <p className="leading-snug">{passwordFormError}</p>
                </div>
              )}

              <form onSubmit={handleSubmitPassword} className="space-y-5" noValidate>
                {/* 1. Kata Sandi Saat Ini */}
                <div className="space-y-1">
                  <label
                    htmlFor="current_password"
                    className="block text-xs font-bold text-[#17221e]"
                  >
                    Kata Sandi Saat Ini <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="current_password"
                      name="current_password"
                      required
                      data-testid="input-current-password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordInputChange}
                      placeholder="Masukkan kata sandi akun saat ini"
                      className={`w-full text-xs rounded-lg border pl-8 pr-10 p-2.5 bg-white text-[#17221e] font-sans transition-colors focus:outline-none focus:ring-1 ${passwordFieldErrors.current_password
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      data-testid="toggle-current-password"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {passwordFieldErrors.current_password ? (
                    <p
                      data-testid="error-current-password"
                      className="text-[11px] text-rose-600 font-medium"
                    >
                      {passwordFieldErrors.current_password}
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-[#7d8f87]">
                      Wajib diisi sesuai dengan kata sandi akun yang aktif saat ini.
                    </p>
                  )}
                </div>

                {/* 2. Kata Sandi Baru */}
                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-[#17221e]"
                  >
                    Kata Sandi Baru <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      required
                      data-testid="input-new-password"
                      value={passwordForm.password}
                      onChange={handlePasswordInputChange}
                      placeholder="Masukkan kata sandi baru (minimal 8 karakter)"
                      className={`w-full text-xs rounded-lg border pl-8 pr-10 p-2.5 bg-white text-[#17221e] font-sans transition-colors focus:outline-none focus:ring-1 ${passwordFieldErrors.password
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      data-testid="toggle-new-password"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Indikator Kekuatan Kata Sandi Proporsional */}
                  {passwordForm.password && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7d8f87]">Kekuatan Kata Sandi:</span>
                        <span className={`font-semibold ${getPasswordStrength(passwordForm.password).text}`}>
                          {getPasswordStrength(passwordForm.password).label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrength(passwordForm.password).color
                            }`}
                          style={{ width: getPasswordStrength(passwordForm.password).percent }}
                        />
                      </div>
                    </div>
                  )}

                  {passwordFieldErrors.password ? (
                    <p
                      data-testid="error-new-password"
                      className="text-[11px] text-rose-600 font-medium"
                    >
                      {passwordFieldErrors.password}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#7d8f87] pt-0.5">
                      <span className={`flex items-center gap-1 ${passwordForm.password.length >= 8 ? 'text-emerald-700 font-medium' : ''}`}>
                        <Check className={`w-3 h-3 ${passwordForm.password.length >= 8 ? 'text-emerald-600' : 'text-slate-300'}`} />
                        Minimal 8 karakter
                      </span>
                      <span className={`flex items-center gap-1 ${/[0-9]/.test(passwordForm.password) ? 'text-emerald-700 font-medium' : ''}`}>
                        <Check className={`w-3 h-3 ${/[0-9]/.test(passwordForm.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        Mengandung angka
                      </span>
                      <span className={`flex items-center gap-1 ${/[a-z]/.test(passwordForm.password) && /[A-Z]/.test(passwordForm.password) ? 'text-emerald-700 font-medium' : ''}`}>
                        <Check className={`w-3 h-3 ${/[a-z]/.test(passwordForm.password) && /[A-Z]/.test(passwordForm.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        Huruf besar & kecil
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Konfirmasi Kata Sandi Baru */}
                <div className="space-y-1">
                  <label
                    htmlFor="password_confirmation"
                    className="block text-xs font-bold text-[#17221e]"
                  >
                    Konfirmasi Kata Sandi Baru <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="password_confirmation"
                      name="password_confirmation"
                      required
                      data-testid="input-confirm-password"
                      value={passwordForm.password_confirmation}
                      onChange={handlePasswordInputChange}
                      placeholder="Ulangi kata sandi baru"
                      className={`w-full text-xs rounded-lg border pl-8 pr-10 p-2.5 bg-white text-[#17221e] font-sans transition-colors focus:outline-none focus:ring-1 ${passwordFieldErrors.password_confirmation
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      data-testid="toggle-confirm-password"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {passwordFieldErrors.password_confirmation ? (
                    <p
                      data-testid="error-confirm-password"
                      className="text-[11px] text-rose-600 font-medium"
                    >
                      {passwordFieldErrors.password_confirmation}
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-[#7d8f87]">
                      Ketik ulang kata sandi baru persis seperti di atas.
                    </p>
                  )}
                </div>

                {/* Security Info Notice */}
                <div className="bg-[#f4f7f5] border border-[#d2e4db] rounded-lg p-3 text-xs text-[#123027] flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#194337] shrink-0" />
                  <span className="text-[11px]">
                    Kata sandi dienkripsi menggunakan algoritma <em>hash</em> standar industri (<em>Bcrypt</em>). Kredensial tidak pernah disimpan dalam format teks terbuka.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f3]">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({
                        current_password: '',
                        password: '',
                        password_confirmation: '',
                      });
                      setPasswordFieldErrors({});
                      setPasswordFormError(null);
                    }}
                    disabled={passwordSaving}
                    className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer"
                  >
                    Bersihkan
                  </button>

                  <button
                    type="submit"
                    data-testid="btn-update-password"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] disabled:bg-slate-400 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    {passwordSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{passwordSaving ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8e5] bg-white py-4 text-center text-xs text-[#7d8f87]">
        <div className="max-w-7xl mx-auto px-4">
          WebGIS Demam Berdarah Dengue Kabupaten Banyumas &copy; 2026. Hak Cipta Dilindungi.
        </div>
      </footer>
    </div>
  );
}
