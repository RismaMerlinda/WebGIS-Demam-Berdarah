import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  ShieldCheck,
  LogOut,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
  Home,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  HelpCircle,
  FolderKanban,
  Eye,
  EyeOff,
  Upload,
  X,
  MapPin,
  Calendar,
  Users,
  FileText,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  Map,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export default function AdminPlaceholderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  const [mainView, setMainView] = useState(viewParam === 'education' ? 'education' : 'overview');

  useEffect(() => {
    if (viewParam === 'education') {
      setMainView('education');
    } else {
      setMainView('overview');
    }
  }, [viewParam]);

  const handleSetView = (view) => {
    setMainView(view);
    if (view === 'education') {
      setSearchParams({ view: 'education' });
    } else {
      setSearchParams({});
    }
  };

  // =========================================================================
  // SYSTEM FEATURE 8: DASHBOARD ADMINISTRATOR STATE
  // =========================================================================
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [summaryData, setSummaryData] = useState({
    total_kasus: 0,
    total_kecamatan: 0,
    total_periode: 0,
    total_pengguna: 0,
  });
  const [recentCasesData, setRecentCasesData] = useState({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);

  // Fetch Summary and Recent Cases from Laravel MySQL Backend
  const fetchDashboardData = useCallback(async (page = 1, isTableOnly = false) => {
    if (isTableOnly) {
      setTableLoading(true);
    } else {
      setDashboardLoading(true);
    }
    setDashboardError(null);

    try {
      const res = await axios.get('/api/admin/dashboard/summary', {
        params: { page, per_page: 10 },
      });

      if (res.data?.success) {
        setSummaryData(res.data.summary || {
          total_kasus: 0,
          total_kecamatan: 0,
          total_periode: 0,
          total_pengguna: 0,
        });
        setRecentCasesData(res.data.recent_cases || {
          data: [],
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
          from: 0,
          to: 0,
        });
        setCurrentPage(page);
      } else {
        throw new Error(res.data?.message || 'Format respon dashboard tidak valid.');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        'Gagal memuat data dashboard administrator. Silakan periksa koneksi atau coba lagi.';
      setDashboardError(errorMsg);
    } finally {
      setDashboardLoading(false);
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(1);
  }, [fetchDashboardData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= recentCasesData.last_page && newPage !== currentPage) {
      fetchDashboardData(newPage, true);
    }
  };

  // =========================================================================
  // EDUCATION MANAGEMENT STATE (FITUR 11)
  // =========================================================================
  const [activeTab, setActiveTab] = useState('contents'); // 'contents' | 'categories' | 'faqs'
  const [eduLoading, setEduLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [contents, setContents] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Article Form State
  const [editingContentId, setEditingContentId] = useState(null);
  const [contentForm, setContentForm] = useState({
    category_id: '',
    title: '',
    slug: '',
    summary: '',
    content: '',
    reference_source: 'Kementerian Kesehatan Republik Indonesia & WHO',
    sort_order: 1,
    is_published: true,
    image: null,
  });
  const [savingContent, setSavingContent] = useState(false);

  // Category Form State
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    sort_order: 1,
    is_active: true,
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // FAQ Form State
  const [editingFaqId, setEditingFaqId] = useState(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    sort_order: 1,
    is_active: true,
  });
  const [savingFaq, setSavingFaq] = useState(false);

  const fetchAdminEducation = useCallback(async () => {
    setEduLoading(true);
    try {
      const res = await axios.get('/api/admin/education');
      if (res.data?.success) {
        const cats = res.data.categories || [];
        setCategories(cats);
        setContents(res.data.contents || []);
        setFaqs(res.data.faqs || []);
        if (cats.length > 0 && !contentForm.category_id) {
          setContentForm((prev) => ({ ...prev, category_id: String(cats[0].id) }));
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Gagal memuat data manajemen edukasi.',
      });
    } finally {
      setEduLoading(false);
    }
  }, [contentForm.category_id]);

  useEffect(() => {
    if (mainView === 'education') {
      fetchAdminEducation();
    }
  }, [mainView, fetchAdminEducation]);

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

  // --- ARTICLE CRUD HANDLERS ---
  const resetContentForm = () => {
    setEditingContentId(null);
    setContentForm({
      category_id: categories[0] ? String(categories[0].id) : '',
      title: '',
      slug: '',
      summary: '',
      content: '',
      reference_source: 'Kementerian Kesehatan Republik Indonesia & WHO',
      sort_order: 1,
      is_published: true,
      image: null,
    });
  };

  const handleEditContent = (item) => {
    setEditingContentId(item.id);
    setContentForm({
      category_id: String(item.category_id),
      title: item.title || '',
      slug: item.slug || '',
      summary: item.summary || '',
      content: item.content || '',
      reference_source: item.reference_source || '',
      sort_order: item.sort_order ?? 1,
      is_published: Boolean(item.is_published),
      image: null,
    });
    setActiveTab('contents');
  };

  const handleSubmitContent = async (e) => {
    e.preventDefault();
    setSavingContent(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('category_id', contentForm.category_id);
      formData.append('title', contentForm.title);
      if (contentForm.slug) formData.append('slug', contentForm.slug);
      formData.append('summary', contentForm.summary || '');
      formData.append('content', contentForm.content);
      formData.append('reference_source', contentForm.reference_source || '');
      formData.append('sort_order', String(contentForm.sort_order || 0));
      formData.append('is_published', contentForm.is_published ? '1' : '0');
      if (contentForm.image) {
        formData.append('image', contentForm.image);
      }

      const url = editingContentId
        ? `/api/admin/education/contents/${editingContentId}`
        : '/api/admin/education/contents';

      const res = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        resetContentForm();
        fetchAdminEducation();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Gagal menyimpan artikel edukasi. Periksa input Anda.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingContent(false);
    }
  };

  const handleDeleteContent = async (id) => {
    setFeedback(null);
    try {
      const res = await axios.delete(`/api/admin/education/contents/${id}`);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        if (editingContentId === id) resetContentForm();
        fetchAdminEducation();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus artikel.',
      });
    }
  };

  // --- CATEGORY CRUD HANDLERS ---
  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      sort_order: 1,
      is_active: true,
    });
  };

  const handleEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      sort_order: cat.sort_order ?? 1,
      is_active: Boolean(cat.is_active),
    });
    setActiveTab('categories');
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    setFeedback(null);
    try {
      const res = editingCategoryId
        ? await axios.put(`/api/admin/education/categories/${editingCategoryId}`, categoryForm)
        : await axios.post('/api/admin/education/categories', categoryForm);

      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        resetCategoryForm();
        fetchAdminEducation();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan kategori edukasi.',
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    setFeedback(null);
    try {
      const res = await axios.delete(`/api/admin/education/categories/${id}`);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        if (editingCategoryId === id) resetCategoryForm();
        fetchAdminEducation();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus kategori.',
      });
    }
  };

  // --- FAQ CRUD HANDLERS ---
  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqForm({
      question: '',
      answer: '',
      sort_order: 1,
      is_active: true,
    });
  };

  const handleEditFaq = (faq) => {
    setEditingFaqId(faq.id);
    setFaqForm({
      question: faq.question || '',
      answer: faq.answer || '',
      sort_order: faq.sort_order ?? 1,
      is_active: Boolean(faq.is_active),
    });
    setActiveTab('faqs');
  };

  const handleSubmitFaq = async (e) => {
    e.preventDefault();
    setSavingFaq(true);
    setFeedback(null);
    try {
      const res = editingFaqId
        ? await axios.put(`/api/admin/education/faqs/${editingFaqId}`, faqForm)
        : await axios.post('/api/admin/education/faqs', faqForm);

      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        resetFaqForm();
        fetchAdminEducation();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan FAQ edukasi.',
      });
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id) => {
    setFeedback(null);
    try {
      const res = await axios.delete(`/api/admin/education/faqs/${id}`);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        if (editingFaqId === id) resetFaqForm();
        fetchAdminEducation();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menghapus FAQ.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* VIEW 1: DASHBOARD RINGKASAN MASTER DATA & KASUS (FEATURE 8)       */}
      {/* =================================================================== */}
      {mainView === 'overview' && (
        <div className="space-y-6" data-testid="admin-dashboard-view">
          {/* Minimalist Page Header */}
          <AdminPageHeader
            breadcrumbs={[
              { label: 'Administrator', to: '/admin/dashboard' },
              { label: 'Dashboard' },
            ]}
            title="Dashboard"
            description="Ringkasan informasi dan aktivitas pengelolaan WebGIS DBD Kabupaten Banyumas."
          >
            <button
              type="button"
              data-testid="admin-refresh-button"
              onClick={() => fetchDashboardData(currentPage)}
              disabled={dashboardLoading || tableLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Segarkan data ringkasan dan tabel kasus terbaru"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${dashboardLoading || tableLoading ? 'animate-spin' : ''
                  }`}
              />
              <span>Perbarui Data</span>
            </button>
          </AdminPageHeader>

          {/* Error Notification with Retry (Skenario Gagal 3 & 4) */}
          {dashboardError && (
            <div
              data-testid="admin-dashboard-error"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-rose-900">Gangguan Pengambilan Data</p>
                  <p className="text-xs text-rose-700 leading-relaxed">{dashboardError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchDashboardData(currentPage)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* A. 4 RINGKASAN MASTER DATA CARDS                              */}
          {/* ============================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Catatan Kasus DBD */}
            <div
              data-testid="card-total-kasus"
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Kasus DBD</p>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
                    {dashboardLoading ? (
                      <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-lg my-0.5" />
                    ) : (
                      summaryData.total_kasus.toLocaleString('id-ID')
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100">
                Catatan kasus terdata di Banyumas
              </p>
            </div>

            {/* Card 2: Total Wilayah Kecamatan */}
            <div
              data-testid="card-total-kecamatan"
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Wilayah Kecamatan</p>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
                    {dashboardLoading ? (
                      <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg my-0.5" />
                    ) : (
                      summaryData.total_kecamatan.toLocaleString('id-ID')
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100">
                27 kecamatan se-Kabupaten Banyumas
              </p>
            </div>

            {/* Card 3: Total Periode Tersimpan */}
            <div
              data-testid="card-total-periode"
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Periode</p>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
                    {dashboardLoading ? (
                      <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg my-0.5" />
                    ) : (
                      summaryData.total_periode.toLocaleString('id-ID')
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100">
                Rentang waktu agregasi data
              </p>
            </div>

            {/* Card 4: Jumlah Pengguna Terdaftar */}
            <div
              data-testid="card-total-pengguna"
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Pengguna Terdaftar</p>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
                    {dashboardLoading ? (
                      <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg my-0.5" />
                    ) : (
                      summaryData.total_pengguna.toLocaleString('id-ID')
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total akun aktif</span>
                <Link
                  to="/admin/users"
                  className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                >
                  <span>Kelola</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* B. PUSAT NAVIGASI & SHORTCUT AKSI CEPAT                       */}
          {/* ============================================================= */}
          <div
            data-testid="admin-shortcuts-section"
            className="bg-white border border-[#e2e8e5] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f1f5f3] pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-[#17221e] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#123027]" />
                  <span>Pusat Navigasi & Shortcut Aksi Cepat</span>
                </h2>
                <p className="text-xs text-[#7d8f87]">
                  Akses langsung menuju modul pengelolaan sistem sesuai kewenangan administrator.
                </p>
              </div>
              <span className="text-[11px] text-[#4e6057] bg-[#f4f7f5] px-2.5 py-1 rounded-md border border-[#e2e8e5] self-start sm:self-auto">
                SRS Final Banyumas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {/* Shortcut 1: Kelola Konten Edukasi (Tersedia / Aktif) */}
              <div
                onClick={() => handleSetView('education')}
                className="group bg-[#fbfbfa] hover:bg-white border border-[#e2e8e5] hover:border-[#123027] rounded-lg p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-[#eef5f2] text-[#123027] flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                      Aktif
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#17221e] group-hover:text-[#123027]">
                    Kelola Konten Edukasi DBD
                  </h3>
                  <p className="text-[11px] text-[#4e6057] leading-relaxed">
                    Kelola artikel pencegahan 3M Plus, kategori edukasi, dan tanya jawab (FAQ).
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#123027]">
                  <span>Buka Manajemen Edukasi</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Shortcut 2: Peta Interaktif WebGIS (Publik) */}
              <Link
                to="/peta"
                className="group bg-[#fbfbfa] hover:bg-white border border-[#e2e8e5] hover:border-[#123027] rounded-lg p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-[#eef5f2] text-[#123027] flex items-center justify-center">
                      <Map className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                      Publik
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#17221e] group-hover:text-[#123027]">
                    Pratinjau Peta Interaktif
                  </h3>
                  <p className="text-[11px] text-[#4e6057] leading-relaxed">
                    Eksplorasi visualisasi spasial choropleth sebaran kasus DBD di 27 kecamatan.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#123027]">
                  <span>Buka Peta Publik</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Shortcut 3: Dashboard Statistik Publik */}
              <Link
                to="/dashboard"
                className="group bg-[#fbfbfa] hover:bg-white border border-[#e2e8e5] hover:border-[#123027] rounded-lg p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-[#eef5f2] text-[#123027] flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                      Publik
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#17221e] group-hover:text-[#123027]">
                    Dashboard Statistik Publik
                  </h3>
                  <p className="text-[11px] text-[#4e6057] leading-relaxed">
                    Lihat agregasi angka kasus, tren bulanan, dan indikator epidemiologi publik.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#123027]">
                  <span>Buka Dashboard Publik</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Shortcut 4: Kelola Kasus DBD (System Feature 17) */}
              <Link
                to="/admin/cases"
                className="bg-white border border-[#d8e0dc] hover:border-[#123027] rounded-lg p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-all group cursor-pointer"
                title="Buka Halaman Pengelolaan Data Kasus DBD"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-[#eef5f2] text-[#123027] flex items-center justify-center font-bold text-xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Aktif
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#17221e] group-hover:text-[#123027] transition-colors">
                    Kelola Data Kasus DBD
                  </h3>
                  <p className="text-[11px] text-[#4e6057] leading-relaxed">
                    Pemantauan, pencarian, dan filter data agregat kasus DBD bulanan per kecamatan.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#123027] pt-2 border-t border-[#f1f5f3]">
                  <span>Buka Kelola Kasus</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Shortcut 5: Kelola Wilayah Kecamatan (Tahap Berikutnya) */}
              <div
                className="bg-[#fbfbfa]/70 border border-dashed border-[#d8e0dc] rounded-lg p-4 flex flex-col justify-between gap-3 opacity-80"
                title="Fitur ini dijadwalkan pada tahap pengembangan berikutnya sesuai SRS."
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Tahap Berikutnya
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-700">Kelola Wilayah Kecamatan</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Manajemen batas wilayah GeoJSON, demografi, dan kode administratif kecamatan.
                  </p>
                </div>
                <div className="text-[10.5px] font-medium text-slate-400 italic">
                  SRS Master Data: Menunggu implementasi lanjutan
                </div>
              </div>

              {/* Shortcut 6: Manajemen Pengguna (SRS 3.12 - Aktif) */}
              <Link
                to="/admin/users"
                data-testid="shortcut-manage-users"
                className="group bg-[#fbfbfa] hover:bg-white border border-[#e2e8e5] hover:border-[#123027] rounded-lg p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3"
                title="Buka modul Manajemen Pengguna untuk pencarian dan filter master data akun"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-md bg-[#eef5f2] group-hover:bg-[#123027] text-[#123027] group-hover:text-white flex items-center justify-center transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Tersedia (Fitur 12)
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#17221e] group-hover:text-[#123027] transition-colors">
                    Manajemen Pengguna
                  </h3>
                  <p className="text-[11px] text-[#7d8f87] leading-relaxed">
                    Pencarian, penyaringan role, status aktif, dan peninjauan master data seluruh pengguna.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#123027] group-hover:translate-x-0.5 transition-transform">
                  <span>Akses Data Pengguna</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          </div>

          {/* ============================================================= */}
          {/* C. TABEL KASUS DBD TERBARU (DATA AKTUAL DATABASE)             */}
          {/* ============================================================= */}
          <div
            data-testid="admin-recent-cases-table"
            className="bg-white border border-[#e2e8e5] rounded-xl shadow-2xs overflow-hidden"
          >
            {/* Table Header Section */}
            <div className="p-5 border-b border-[#f1f5f3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-[#17221e] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#123027]" />
                  <span>Catatan Kasus DBD Terakhir Diperbarui</span>
                </h2>
                <p className="text-xs text-[#7d8f87]">
                  Menampilkan data kasus agregat aktual yang tersimpan di MySQL, diurutkan dari
                  pembaruan terbaru.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-medium text-[#4e6057]">
                  Total Catatan: <strong>{recentCasesData.total.toLocaleString('id-ID')}</strong>
                </span>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto relative min-h-[220px]">
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#123027]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#123027]" />
                    <span>Memuat data halaman...</span>
                  </div>
                </div>
              )}

              {dashboardLoading ? (
                <div className="p-8 space-y-3">
                  <div className="h-5 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-50 rounded animate-pulse" />
                  <div className="h-10 bg-slate-50 rounded animate-pulse" />
                  <div className="h-10 bg-slate-50 rounded animate-pulse" />
                </div>
              ) : recentCasesData.data.length === 0 ? (
                /* Empty State */
                <div
                  data-testid="empty-recent-cases"
                  className="p-12 text-center flex flex-col items-center justify-center space-y-2 text-[#7d8f87]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#f4f7f5] flex items-center justify-center text-slate-400 mb-1">
                    <FileText className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#17221e]">Belum Ada Catatan Kasus</h3>
                  <p className="text-xs max-w-sm leading-relaxed">
                    Belum terdapat catatan kasus DBD yang tersimpan dalam basis data sistem. Data
                    akan tampil otomatis saat proses pencatatan kasus dilakukan.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8faf9] border-b border-[#e2e8e5] text-[#4e6057] uppercase text-[10.5px] font-bold tracking-wider">
                      <th className="py-3 px-4 sm:px-6">Wilayah Kecamatan</th>
                      <th className="py-3 px-4">Periode</th>
                      <th className="py-3 px-4 text-right">Jumlah Kasus</th>
                      <th className="py-3 px-4 text-right">Incidence Rate (IR)</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Tanggal Pembaruan Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f3]">
                    {recentCasesData.data.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#f8faf9] transition-colors group"
                      >
                        {/* Kecamatan */}
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#17221e]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#7d8f87] group-hover:text-[#123027] shrink-0" />
                            <div>
                              <span className="block font-bold">
                                {item.kecamatan_nama}
                              </span>
                              <span className="text-[10.5px] text-[#7d8f87] font-mono">
                                Kode: {item.kecamatan_kode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Periode */}
                        <td className="py-3.5 px-4 text-[#4e6057]">
                          <div className="inline-flex items-center gap-1.5 bg-[#f4f7f5] border border-[#e2e8e5] px-2.5 py-1 rounded-md text-[11px] font-medium text-[#17221e]">
                            <Calendar className="w-3 h-3 text-[#7d8f87]" />
                            <span>{item.periode_nama}</span>
                          </div>
                        </td>

                        {/* Jumlah Kasus */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-block font-extrabold text-xs px-2.5 py-0.5 rounded-full ${item.jumlah_kasus >= 10
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.jumlah_kasus > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                          >
                            {item.jumlah_kasus.toLocaleString('id-ID')} Kasus
                          </span>
                        </td>

                        {/* Incidence Rate (IR) */}
                        <td className="py-3.5 px-4 text-right font-medium">
                          {item.incidence_rate !== null ? (
                            <span className="font-semibold text-[#17221e]">
                              {item.incidence_rate_formatted}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              Belum tersedia
                            </span>
                          )}
                        </td>

                        {/* Tanggal Pembaruan Data */}
                        <td className="py-3.5 px-4 sm:px-6 text-right text-[#4e6057] font-mono text-[11px]">
                          {item.updated_at_formatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Pagination Footer */}
            {recentCasesData.total > 0 && (
              <div className="p-4 border-t border-[#f1f5f3] bg-[#fbfbfa] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-[#7d8f87]">
                  Menampilkan <strong>{recentCasesData.from || 0}</strong> –{' '}
                  <strong>{recentCasesData.to || 0}</strong> dari{' '}
                  <strong>{recentCasesData.total.toLocaleString('id-ID')}</strong> catatan kasus
                </span>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    data-testid="pagination-prev"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || tableLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#e2e8e5] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#17221e] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="px-3 py-1 text-xs font-semibold text-[#123027] bg-[#eef5f2] rounded border border-[#cbe1d8]">
                    {currentPage} / {recentCasesData.last_page || 1}
                  </span>

                  <button
                    type="button"
                    data-testid="pagination-next"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= recentCasesData.last_page || tableLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#e2e8e5] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#17221e] transition-colors cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: MANAJEMEN EDUKASI KONTEN (FITUR 11)                        */}
      {/* ================================================================= */}
      {mainView === 'education' && (
        <div className="space-y-6" data-testid="admin-education-view">
          {/* Minimalist Page Header */}
          <AdminPageHeader
            breadcrumbs={[
              { label: 'Administrator', to: '/admin/dashboard' },
              { label: 'Edukasi' },
            ]}
            title="Manajemen Konten Edukasi DBD"
            description="Kelola artikel kesehatan masyarakat, kategori topik, panduan 3M Plus, dan daftar FAQ publik."
          >
            <button
              type="button"
              onClick={() => handleSetView('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Dashboard</span>
            </button>
          </AdminPageHeader>

          {/* Feedback Alert */}
          {feedback && (
            <div
              data-testid="admin-education-feedback"
              className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* EDUCATION CONTENT MANAGEMENT PANEL */}
          <div
            data-testid="admin-education-manager"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
          >
            {/* Header & Tabs */}
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  data-testid="admin-tab-contents"
                  onClick={() => setActiveTab('contents')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'contents'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Artikel Edukasi ({contents.length})
                </button>
                <button
                  type="button"
                  data-testid="admin-tab-categories"
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'categories'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Kategori ({categories.length})
                </button>
                <button
                  type="button"
                  data-testid="admin-tab-faqs"
                  onClick={() => setActiveTab('faqs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'faqs'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  FAQ ({faqs.length})
                </button>
              </div>
            </div>

            {eduLoading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#123027]" />
                <span className="text-xs text-slate-500">Memuat data edukasi...</span>
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                {/* TAB 1: CONTENTS */}
                {activeTab === 'contents' && (
                  <div className="space-y-6">
                    {/* Form Tambah/Ubah Artikel */}
                    <form
                      onSubmit={handleSubmitContent}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#123027]" />
                          <span>
                            {editingContentId ? 'Sunting Artikel Edukasi' : 'Tulis Artikel Edukasi Baru'}
                          </span>
                        </h4>
                        {editingContentId && (
                          <button
                            type="button"
                            onClick={resetContentForm}
                            className="text-xs text-slate-500 hover:text-slate-800 underline"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kategori Topik
                          </label>
                          <select
                            required
                            value={contentForm.category_id}
                            onChange={(e) =>
                              setContentForm({ ...contentForm, category_id: e.target.value })
                            }
                            className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Judul Artikel
                          </label>
                          <input
                            type="text"
                            required
                            value={contentForm.title}
                            onChange={(e) =>
                              setContentForm({ ...contentForm, title: e.target.value })
                            }
                            placeholder="Misal: Langkah Tepat 3M Plus di Lingkungan Rumah"
                            className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ringkasan Singkat (Summary)
                        </label>
                        <textarea
                          rows={2}
                          value={contentForm.summary}
                          onChange={(e) =>
                            setContentForm({ ...contentForm, summary: e.target.value })
                          }
                          placeholder="Ringkasan informatif 1-2 kalimat untuk kartu artikel..."
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Isi Konten Edukasi (Lengkap)
                        </label>
                        <textarea
                          rows={5}
                          required
                          value={contentForm.content}
                          onChange={(e) =>
                            setContentForm({ ...contentForm, content: e.target.value })
                          }
                          placeholder="Tuliskan materi edukasi secara runtut dan informatif..."
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Sumber Rujukan
                          </label>
                          <input
                            type="text"
                            value={contentForm.reference_source}
                            onChange={(e) =>
                              setContentForm({ ...contentForm, reference_source: e.target.value })
                            }
                            placeholder="Kemenkes RI / WHO"
                            className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Gambar Sampul (Opsional)
                          </label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) =>
                              setContentForm({ ...contentForm, image: e.target.files[0] })
                            }
                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-200"
                          />
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={contentForm.is_published}
                              onChange={(e) =>
                                setContentForm({
                                  ...contentForm,
                                  is_published: e.target.checked,
                                })
                              }
                              className="rounded text-[#123027] focus:ring-[#123027]"
                            />
                            <span>Publikasikan Langsung</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingContent}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#123027] hover:bg-[#194337] disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          {savingContent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>{editingContentId ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Tabel Daftar Konten */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                          <tr>
                            <th className="p-3">Judul Artikel</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {contents.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70">
                              <td className="p-3 font-semibold text-slate-900">
                                <div>{item.title}</div>
                                <div className="text-[11px] text-slate-400 font-normal">
                                  /{item.slug}
                                </div>
                              </td>
                              <td className="p-3 text-slate-600">
                                {item.category?.name || '-'}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_published
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                  {item.is_published ? 'Publik' : 'Draf'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditContent(item)}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                  title="Sunting"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContent(item.id)}
                                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: CATEGORIES */}
                {activeTab === 'categories' && (
                  <div className="space-y-6">
                    <form
                      onSubmit={handleSubmitCategory}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                    >
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {editingCategoryId ? 'Sunting Kategori' : 'Tambah Kategori Baru'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Kategori
                          </label>
                          <input
                            type="text"
                            required
                            value={categoryForm.name}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, name: e.target.value })
                            }
                            className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Deskripsi Kategori
                          </label>
                          <input
                            type="text"
                            value={categoryForm.description}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, description: e.target.value })
                            }
                            className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {editingCategoryId && (
                          <button
                            type="button"
                            onClick={resetCategoryForm}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingCategory}
                          className="px-4 py-2 bg-[#123027] hover:bg-[#194337] text-white text-xs font-bold rounded-lg shadow-2xs"
                        >
                          Simpan Kategori
                        </button>
                      </div>
                    </form>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                          <tr>
                            <th className="p-3">Nama Kategori</th>
                            <th className="p-3">Deskripsi</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {categories.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/70">
                              <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                              <td className="p-3 text-slate-600">{c.description || '-'}</td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditCategory(c)}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(c.id)}
                                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: FAQS */}
                {activeTab === 'faqs' && (
                  <div className="space-y-6">
                    <form
                      onSubmit={handleSubmitFaq}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                    >
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {editingFaqId ? 'Sunting Pertanyaan FAQ' : 'Tambah Pertanyaan FAQ Baru'}
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Pertanyaan
                        </label>
                        <input
                          type="text"
                          required
                          value={faqForm.question}
                          onChange={(e) =>
                            setFaqForm({ ...faqForm, question: e.target.value })
                          }
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jawaban Penjelasan
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={faqForm.answer}
                          onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        {editingFaqId && (
                          <button
                            type="button"
                            onClick={resetFaqForm}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingFaq}
                          className="px-4 py-2 bg-[#123027] hover:bg-[#194337] text-white text-xs font-bold rounded-lg shadow-2xs"
                        >
                          Simpan FAQ
                        </button>
                      </div>
                    </form>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                          <tr>
                            <th className="p-3">Pertanyaan</th>
                            <th className="p-3">Jawaban</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {faqs.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-50/70">
                              <td className="p-3 font-semibold text-slate-900">{f.question}</td>
                              <td className="p-3 text-slate-600 max-w-md truncate">{f.answer}</td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditFaq(f)}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFaq(f.id)}
                                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
