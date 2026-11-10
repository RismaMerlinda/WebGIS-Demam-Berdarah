import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  CalendarDays,
  CalendarRange,
  Search,
  RefreshCw,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Info,
  Calendar,
  CloudRain,
  Sun,
  Activity,
  MapPin,
  Clock,
  Sparkles,
  Plus,
  SquarePen,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari', short: 'Jan' },
  { value: 2, label: 'Februari', short: 'Feb' },
  { value: 3, label: 'Maret', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'Mei', short: 'Mei' },
  { value: 6, label: 'Juni', short: 'Jun' },
  { value: 7, label: 'Juli', short: 'Jul' },
  { value: 8, label: 'Agustus', short: 'Agu' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'Oktober', short: 'Okt' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'Desember', short: 'Des' },
];

export default function AdminPeriodManagementPage() {
  const navigate = useNavigate();

  // State Management: List & Stats
  const [periodsList, setPeriodsList] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total_periods: 0,
    total_years: 0,
    published_count: 0,
    unpublished_count: 0,
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });

  // Detail Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailPeriodId, setDetailPeriodId] = useState(null);
  const [detailPeriodData, setDetailPeriodData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // =========================================================================
  // System Feature 26: Create Period States
  // =========================================================================
  const initialCreateForm = {
    tahun: '2026',
    bulan: '4',
    nama: 'April 2026',
    label_singkat: 'Apr 2026',
    keterangan: '',
    status_publikasi: 'DAPAT_DIPUBLIKASIKAN',
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialCreateForm);
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createFormGeneralError, setCreateFormGeneralError] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // =========================================================================
  // System Feature 27: Edit Period States
  // =========================================================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [editFormData, setEditFormData] = useState({
    tahun: '',
    bulan: '1',
    nama: '',
    label_singkat: '',
    keterangan: '',
    status_publikasi: 'DAPAT_DIPUBLIKASIKAN',
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormGeneralError, setEditFormGeneralError] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // =========================================================================
  // System Feature 28: Delete Period States
  // =========================================================================
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPeriod, setDeletingPeriod] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Fetch periods data from backend API
  const fetchPeriods = useCallback(
    async (page = 1, search = '', year = 'all') => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          page,
          per_page: 10,
        };

        if (search && search.trim()) {
          params.search = search.trim();
        }

        if (year && year !== 'all') {
          params.year = year;
        }

        const res = await axios.get('/api/admin/periods', { params });

        if (res.data?.success) {
          setPeriodsList(res.data.periods || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
          if (res.data.summary) {
            setSummaryStats(res.data.summary);
          }
          if (Array.isArray(res.data.years)) {
            setAvailableYears(res.data.years);
          }
        } else {
          throw new Error(res.data?.message || 'Gagal memuat data periode waktu.');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true, state: { from: { pathname: '/admin/periods' } } });
          return;
        }

        console.error('Error fetching periods:', err);
        const errMsg =
          err.response?.data?.message ||
          'Data periode waktu gagal dimuat. Silakan coba kembali.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // Trigger fetch when page, activeSearch, or selectedYear changes
  useEffect(() => {
    fetchPeriods(currentPage, activeSearch, selectedYear);
  }, [fetchPeriods, currentPage, activeSearch, selectedYear]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setCurrentPage(1);
  };

  // Clear Search
  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  // Handle Year Filter Change
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setSelectedYear('all');
    setCurrentPage(1);
  };

  // Refresh current data
  const handleRefresh = () => {
    fetchPeriods(currentPage, activeSearch, selectedYear);
  };

  // =========================================================================
  // Detail Modal Handlers
  // =========================================================================
  const handleOpenDetailModal = async (periodId) => {
    setDetailPeriodId(periodId);
    setDetailPeriodData(null);
    setDetailError(null);
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);

    try {
      const res = await axios.get(`/api/admin/periods/${periodId}`);
      if (res.data?.success && res.data.period) {
        setDetailPeriodData(res.data.period);
      } else {
        throw new Error(res.data?.message || 'Gagal memuat rincian periode waktu.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/periods' } } });
        return;
      }
      console.error('Error loading period detail:', err);
      setDetailError(
        err.response?.data?.message ||
        'Terjadi kendala saat mengambil rincian data periode waktu.'
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailPeriodId(null);
    setDetailPeriodData(null);
    setDetailError(null);
  };

  // =========================================================================
  // System Feature 26: Create Period Handlers
  // =========================================================================
  const handleOpenCreateModal = () => {
    const currentYear = new Date().getFullYear();
    const defaultMonth = 4;
    const monthObj = MONTH_OPTIONS.find((m) => m.value === defaultMonth) || MONTH_OPTIONS[0];

    setCreateFormData({
      tahun: String(currentYear),
      bulan: String(monthObj.value),
      nama: `${monthObj.label} ${currentYear}`,
      label_singkat: `${monthObj.short} ${currentYear}`,
      keterangan: '',
      status_publikasi: 'DAPAT_DIPUBLIKASIKAN',
    });
    setCreateFormErrors({});
    setCreateFormGeneralError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isSubmittingCreate) return;
    setIsCreateModalOpen(false);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Sinkronisasi otomatis label nama dan label singkat saat bulan atau tahun berubah
      if (name === 'tahun' || name === 'bulan') {
        const monthNum = parseInt(name === 'bulan' ? value : next.bulan, 10);
        const yearVal = name === 'tahun' ? value : next.tahun;
        const monthObj = MONTH_OPTIONS.find((m) => m.value === monthNum);

        if (monthObj && yearVal) {
          next.nama = `${monthObj.label} ${yearVal}`;
          next.label_singkat = `${monthObj.short} ${yearVal}`;
        }
      }

      return next;
    });

    if (createFormErrors[name]) {
      setCreateFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Live Preview Computed Values
  const previewData = useMemo(() => {
    const y = parseInt(createFormData.tahun, 10) || 2026;
    const m = parseInt(createFormData.bulan, 10) || 1;
    const monthObj = MONTH_OPTIONS.find((opt) => opt.value === m) || MONTH_OPTIONS[0];
    const kode = `${y}-${String(m).padStart(2, '0')}`;
    const nama = createFormData.nama.trim() || `${monthObj.label} ${y}`;
    const labelSingkat = createFormData.label_singkat.trim() || `${monthObj.short} ${y}`;

    let musim = 'Musim Hujan (Puncak Penularan DBD)';
    if ([4, 5].includes(m)) {
      musim = 'Pancaroba (Peralihan Hujan - Kemarau)';
    } else if ([6, 7, 8].includes(m)) {
      musim = 'Musim Kemarau (Waspada DBD)';
    } else if (m === 9) {
      musim = 'Pancaroba (Peralihan Kemarau - Hujan)';
    }

    return {
      kode_periode: kode,
      nama,
      label_singkat: labelSingkat,
      keterangan_musim: musim,
    };
  }, [createFormData]);

  // Submit Create Period Form
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateFormErrors({});
    setCreateFormGeneralError(null);

    // Validasi Sisi Klien
    const errors = {};
    const tahunNum = parseInt(createFormData.tahun, 10);
    if (!createFormData.tahun || isNaN(tahunNum)) {
      errors.tahun = 'Tahun observasi wajib diisi dengan angka tahun yang valid.';
    } else if (tahunNum < 2000 || tahunNum > 2099) {
      errors.tahun = 'Tahun observasi harus berada pada rentang 2000 sampai 2099.';
    }

    const bulanNum = parseInt(createFormData.bulan, 10);
    if (!createFormData.bulan || isNaN(bulanNum) || bulanNum < 1 || bulanNum > 12) {
      errors.bulan = 'Bulan observasi wajib dipilih (Januari sampai Desember).';
    }

    if (!createFormData.nama.trim()) {
      errors.nama = 'Label periode lengkap wajib diisi.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    setIsSubmittingCreate(true);

    try {
      const payload = {
        tahun: tahunNum,
        bulan: bulanNum,
        nama: createFormData.nama.trim(),
        label_singkat: createFormData.label_singkat ? createFormData.label_singkat.trim() : null,
        keterangan: createFormData.keterangan ? createFormData.keterangan.trim() : null,
        status_publikasi: createFormData.status_publikasi,
      };

      const res = await axios.post('/api/admin/periods', payload);

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setSuccessToast({
          title: 'Periode Berhasil Ditambahkan!',
          message:
            res.data.message ||
            `Periode ${res.data.period?.nama || payload.nama} berhasil didaftarkan ke sistem kalender observasi.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Reset ke halaman pertama dan perbarui data serta metrik
        setCurrentPage(1);
        fetchPeriods(1, activeSearch, selectedYear);
      } else {
        throw new Error(res.data?.message || 'Gagal menambahkan periode pemantauan.');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response.data?.errors || {};
        const mappedErrors = {};
        Object.keys(backendErrors).forEach((key) => {
          mappedErrors[key] = Array.isArray(backendErrors[key])
            ? backendErrors[key][0]
            : backendErrors[key];
        });
        setCreateFormErrors(mappedErrors);
        setCreateFormGeneralError(
          err.response.data?.message ||
          'Validasi data periode gagal. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/periods' } } });
      } else if (err.response?.status === 403) {
        setCreateFormGeneralError('Akses ditolak. Anda tidak memiliki izin untuk menambah data periode.');
      } else {
        setCreateFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // =========================================================================
  // System Feature 27: Edit Period Handlers & Computed Preview
  // =========================================================================
  const handleOpenEditModal = (item) => {
    setEditingPeriod(item);
    const initialMonth = item.bulan ? String(item.bulan) : '1';
    const initialYear = item.tahun ? String(item.tahun) : '2026';
    const initialStatus =
      item.status_publikasi ||
      (item.is_published ? 'DAPAT_DIPUBLIKASIKAN' : 'INTERNAL_BELUM_DIIZINKAN');

    setEditFormData({
      tahun: initialYear,
      bulan: initialMonth,
      nama: item.nama || '',
      label_singkat: item.label_singkat || '',
      keterangan: item.keterangan || '',
      status_publikasi: initialStatus,
    });
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    setEditingPeriod(null);
    setEditFormErrors({});
    setEditFormGeneralError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (editFormErrors[name]) {
      setEditFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Live Preview Perubahan Data Periode (System Feature 27)
  const editPreviewData = useMemo(() => {
    const y = parseInt(editFormData.tahun, 10) || (editingPeriod?.tahun ?? 2026);
    const m = parseInt(editFormData.bulan, 10) || (editingPeriod?.bulan ?? 1);
    const monthObj = MONTH_OPTIONS.find((opt) => opt.value === m) || MONTH_OPTIONS[0];
    const kode = `${y}-${String(m).padStart(2, '0')}`;
    const nama = editFormData.nama.trim() || `${monthObj.label} ${y}`;
    const labelSingkat = editFormData.label_singkat.trim() || `${monthObj.short} ${y}`;

    let musim = 'Musim Hujan (Puncak Penularan DBD)';
    if ([4, 5].includes(m)) {
      musim = 'Pancaroba (Peralihan Hujan - Kemarau)';
    } else if ([6, 7, 8].includes(m)) {
      musim = 'Musim Kemarau (Waspada DBD)';
    } else if (m === 9) {
      musim = 'Pancaroba (Peralihan Kemarau - Hujan)';
    }

    return {
      tahun: y,
      bulan: m,
      bulan_nama: monthObj.label,
      kode_periode: kode,
      nama,
      label_singkat: labelSingkat,
      keterangan_musim: musim,
    };
  }, [editFormData, editingPeriod]);

  // Submit Perubahan Periode Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPeriod) return;

    setEditFormErrors({});
    setEditFormGeneralError(null);

    // Validasi Sisi Klien
    const errors = {};
    const tahunNum = parseInt(editFormData.tahun, 10);
    if (!editFormData.tahun || isNaN(tahunNum)) {
      errors.tahun = 'Tahun observasi wajib diisi dengan angka tahun yang valid.';
    } else if (tahunNum < 2000 || tahunNum > 2099) {
      errors.tahun = 'Tahun observasi harus berada pada rentang 2000 sampai 2099.';
    }

    const bulanNum = parseInt(editFormData.bulan, 10);
    if (!editFormData.bulan || isNaN(bulanNum) || bulanNum < 1 || bulanNum > 12) {
      errors.bulan = 'Bulan observasi wajib dipilih (Januari sampai Desember).';
    }

    if (!editFormData.nama.trim()) {
      errors.nama = 'Label periode lengkap wajib diisi.';
    }

    if (!editFormData.status_publikasi) {
      errors.status_publikasi = 'Status publikasi wajib dipilih.';
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsSubmittingEdit(true);

    try {
      const payload = {
        tahun: tahunNum,
        bulan: bulanNum,
        nama: editFormData.nama.trim(),
        label_singkat: editFormData.label_singkat ? editFormData.label_singkat.trim() : null,
        keterangan: editFormData.keterangan ? editFormData.keterangan.trim() : null,
        status_publikasi: editFormData.status_publikasi,
      };

      const res = await axios.put(`/api/admin/periods/${editingPeriod.id}`, payload);

      if (res.data?.success) {
        setIsEditModalOpen(false);
        setEditingPeriod(null);
        setSuccessToast({
          title: 'Perubahan Berhasil Disimpan!',
          message: res.data.message || 'Informasi periode berhasil diperbarui.',
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Segarkan tabel periode dan metrik dengan parameter aktif saat ini
        fetchPeriods(currentPage, activeSearch, selectedYear);
      } else {
        throw new Error(res.data?.message || 'Gagal memperbarui informasi periode.');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response.data?.errors || {};
        const mappedErrors = {};
        Object.keys(backendErrors).forEach((key) => {
          mappedErrors[key] = Array.isArray(backendErrors[key])
            ? backendErrors[key][0]
            : backendErrors[key];
        });
        setEditFormErrors(mappedErrors);
        setEditFormGeneralError(
          err.response.data?.message ||
          'Validasi perubahan periode gagal. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/periods' } } });
      } else if (err.response?.status === 403) {
        setEditFormGeneralError(
          'Akses ditolak. Anda tidak memiliki izin untuk mengedit data periode.'
        );
      } else if (err.response?.status === 404) {
        setEditFormGeneralError(
          'Data periode tidak ditemukan dalam sistem atau sudah dihapus.'
        );
      } else {
        setEditFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // =========================================================================
  // System Feature 28: Delete Period Handlers
  // =========================================================================
  const handleOpenDeleteModal = (item) => {
    setDeletingPeriod(item);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmittingDelete) return;
    setIsDeleteModalOpen(false);
    setDeletingPeriod(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPeriod) return;
    setIsSubmittingDelete(true);
    setDeleteModalError(null);

    try {
      const res = await axios.delete(`/api/admin/periods/${deletingPeriod.id}`);
      if (res.data?.success) {
        setIsDeleteModalOpen(false);
        const deletedNama = deletingPeriod.nama;
        setDeletingPeriod(null);
        setSuccessToast({
          title: 'Periode Berhasil Dihapus!',
          message: res.data.message || `Data periode ${deletedNama} berhasil dihapus dari sistem.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Perbarui tabel periode dan metrik
        const targetPage =
          periodsList.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
        fetchPeriods(targetPage, activeSearch, selectedYear);
      } else {
        throw new Error(res.data?.message || 'Gagal menghapus data periode.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/periods' } } });
      } else if (err.response?.status === 403) {
        setDeleteModalError('Akses ditolak. Anda tidak memiliki izin untuk menghapus data periode.');
      } else if (err.response?.status === 422) {
        setDeleteModalError(
          err.response.data?.message ||
            'Periode tidak dapat dihapus karena masih digunakan oleh data kasus DBD.'
        );
      } else if (err.response?.status === 404) {
        setDeleteModalError('Data periode tidak ditemukan dalam sistem atau sudah dihapus sebelumnya.');
      } else {
        setDeleteModalError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const hasActiveFilters = activeSearch.trim() !== '' || selectedYear !== 'all';

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. PAGE HEADER                                                      */}
      {/* =================================================================== */}
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Administrator', to: '/admin/dashboard' },
          { label: 'Kelola Periode' },
        ]}
        title="Pengelolaan Data Periode Waktu"
        description="Kelola dan akses informasi kalender periode observasi kasus DBD berdasarkan tahun dan bulan."
        badge="Kalender Observasi Kasus Bulanan"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="btn-open-create-period"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            title="Tambah data periode observasi baru"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>Tambah Periode Baru</span>
          </button>
          <button
            type="button"
            data-testid="btn-refresh-periods"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Segarkan data periode waktu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </AdminPageHeader>

      {/* Toast Notification Banner (Success) */}
      {successToast && (
        <div
          data-testid="toast-success-period"
          className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">{successToast.title}</p>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                {successToast.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer p-1"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. SUMMARY METRIC CARDS                                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Periode Terdaftar */}
        <div className="rounded-2xl border border-[#d8e2dd] bg-white p-4.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7d8f87] uppercase tracking-wider">
              Total Periode
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800">
              <CalendarDays className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#17221e]">
              {Number(summaryStats.total_periods).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-[#7d8f87] ml-1.5 font-medium">periode</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7d8f87]">
            Kalender observasi tercatat di sistem
          </p>
        </div>

        {/* Total Tahun Observasi */}
        <div className="rounded-2xl border border-[#d8e2dd] bg-white p-4.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7d8f87] uppercase tracking-wider">
              Tahun Observasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
              <CalendarRange className="w-4 h-4 text-teal-700" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#17221e]">
              {Number(summaryStats.total_years).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-[#7d8f87] ml-1.5 font-medium">tahun</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7d8f87]">
            Rentang tahun data historis aktif
          </p>
        </div>

        {/* Periode Dipublikasikan */}
        <div className="rounded-2xl border border-[#d8e2dd] bg-white p-4.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7d8f87] uppercase tracking-wider">
              Dipublikasikan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {Number(summaryStats.published_count).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-emerald-700 ml-1.5 font-medium">aktif</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7d8f87]">
            Dapat diakses publik pada peta &amp; dashboard
          </p>
        </div>

        {/* Periode Internal / Belum Publikasi */}
        <div className="rounded-2xl border border-[#d8e2dd] bg-white p-4.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7d8f87] uppercase tracking-wider">
              Draft / Internal
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-800">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {Number(summaryStats.unpublished_count).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-amber-700 ml-1.5 font-medium">tertutup</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7d8f87]">
            Khusus evaluasi internal Dinkes
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. SEARCH & FILTER CONTROLS                                         */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-[#d8e2dd] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Kolom Pencarian Kata Kunci */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d8f87]" />
              <input
                type="text"
                data-testid="input-search-periods"
                placeholder="Cari berdasarkan label atau kode periode..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#d2ded8] bg-[#fbfbfa] text-xs text-[#17221e] placeholder-[#7d8f87] focus:bg-white focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  data-testid="btn-clear-search"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                  title="Hapus kata kunci"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Controls: Filter Tahun & Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tahun Observasi */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4e6057] shrink-0">Tahun:</span>
              <select
                data-testid="select-filter-year"
                value={selectedYear}
                onChange={handleYearChange}
                className="px-3 py-2 rounded-xl border border-[#d2ded8] bg-[#fbfbfa] text-xs font-medium text-[#17221e] hover:bg-white focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all cursor-pointer"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    Tahun {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Reset Filter */}
            {hasActiveFilters && (
              <button
                type="button"
                data-testid="btn-reset-filters"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Kembalikan semua filter ke pengaturan awal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Informasi Status Filter Aktif */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-[#f1f5f3] flex flex-wrap items-center gap-2 text-xs text-[#7d8f87]">
            <span className="font-semibold text-[#4e6057]">Filter Aktif:</span>
            {activeSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]">
                <span>Pencarian: &ldquo;{activeSearch}&rdquo;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-emerald-950 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedYear !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]">
                <span>Tahun: {selectedYear}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-emerald-950 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. DATA TABLE                                                       */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-[#d8e2dd] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="table-periods" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8e5] bg-[#fbfbfa] text-[#4e6057]">
                <th className="py-3 px-4 font-bold text-center w-12">No</th>
                <th className="py-3 px-4 font-bold w-28">Kode Periode</th>
                <th className="py-3 px-4 font-bold w-20">Tahun</th>
                <th className="py-3 px-4 font-bold w-28">Bulan</th>
                <th className="py-3 px-4 font-bold min-w-[180px]">Label Periode</th>
                <th className="py-3 px-4 font-bold w-28">Label Singkat</th>
                <th className="py-3 px-4 font-bold min-w-[200px]">Keterangan Musim</th>
                <th className="py-3 px-4 font-bold text-center w-36">Status Publikasi</th>
                <th className="py-3 px-4 font-bold text-center w-52 min-w-[210px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f3]">
              {/* State 1: Loading State */}
              {loading && (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-[#7d8f87]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-800" />
                      <p className="font-semibold text-xs text-[#17221e]">
                        Memuat data kalender periode waktu...
                      </p>
                      <p className="text-[11px] text-[#7d8f87]">
                        Mengambil informasi observasi dari basis data MySQL
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 2: Error State */}
              {!loading && error && (
                <tr>
                  <td colSpan="9" className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-[#17221e]">
                          Data periode waktu gagal dimuat
                        </p>
                        <p className="text-xs text-rose-600">{error}</p>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-retry-periods"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 3: Empty State */}
              {!loading && !error && periodsList.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-[#7d8f87]">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#fbfbfa] border border-[#d8e2dd] flex items-center justify-center mx-auto text-[#7d8f87]">
                        <CalendarDays className="w-6 h-6 text-[#7d8f87]" />
                      </div>
                      {hasActiveFilters ? (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Data Periode Tidak Ditemukan
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Tidak ada data periode yang sesuai dengan pencarian atau filter tahun yang dipilih.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Semua Filter</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Belum Ada Data Periode Waktu
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Basis data belum memiliki rekaman kalender periode observasi kasus.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* State 4: Render Rows */}
              {!loading &&
                !error &&
                periodsList.map((item, index) => {
                  const rowNumber = (pagination.current_page - 1) * pagination.per_page + index + 1;
                  const isRainy = item.keterangan_musim.includes('Hujan');
                  const isDry = item.keterangan_musim.includes('Kemarau');

                  return (
                    <tr
                      key={item.id}
                      data-testid={`row-period-${item.id}`}
                      className="hover:bg-[#fbfbfa] transition-colors"
                    >
                      {/* 1. No */}
                      <td className="py-3 px-4 text-center font-medium text-[#7d8f87]">
                        {rowNumber}
                      </td>

                      {/* 2. Kode Periode */}
                      <td className="py-3 px-4 font-mono font-semibold text-[#123027]">
                        {item.kode_periode}
                      </td>

                      {/* 3. Tahun */}
                      <td className="py-3 px-4 font-semibold text-[#17221e]">
                        {item.tahun}
                      </td>

                      {/* 4. Bulan */}
                      <td className="py-3 px-4 text-[#4e6057]">
                        {item.bulan ? (
                          <span className="font-medium text-[#17221e]">
                            {item.bulan_nama}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#7d8f87] italic">
                            {item.bulan_nama}
                          </span>
                        )}
                      </td>

                      {/* 5. Label Periode */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span className="font-bold text-[#17221e]">{item.nama}</span>
                        </div>
                      </td>

                      {/* 6. Label Singkat */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.label_singkat}
                        </span>
                      </td>

                      {/* 7. Keterangan Musim */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isRainy ? (
                            <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          ) : isDry ? (
                            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          )}
                          <span
                            className={`text-[11px] font-medium ${isRainy
                                ? 'text-sky-800 font-semibold'
                                : isDry
                                  ? 'text-amber-800'
                                  : 'text-[#4e6057]'
                              }`}
                          >
                            {item.keterangan_musim}
                          </span>
                        </div>
                      </td>

                      {/* 8. Status Publikasi */}
                      <td className="py-3 px-4 text-center">
                        {item.is_published ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Dipublikasikan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft / Internal</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Aksi (Detail, Edit & Hapus) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">
                          <button
                            type="button"
                            data-testid={`btn-detail-period-${item.id}`}
                            onClick={() => handleOpenDetailModal(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title={`Lihat detail periode ${item.nama}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-edit-period-${item.id}`}
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 hover:border-amber-300 text-amber-900 font-semibold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title="Edit Periode"
                          >
                            <SquarePen className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-delete-period-${item.id}`}
                            onClick={() => handleOpenDeleteModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 hover:border-rose-300 text-rose-700 font-semibold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title="Hapus Periode"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* =================================================================== */}
        {/* 5. TABLE PAGINATION FOOTER                                          */}
        {/* =================================================================== */}
        {!loading && periodsList.length > 0 && (
          <div
            data-testid="periods-pagination"
            className="p-4 sm:px-6 border-t border-[#f1f5f3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="text-[#7d8f87] text-center sm:text-left">
              Menampilkan{' '}
              <span className="font-bold text-[#17221e]">
                {pagination.from || 1}
              </span>{' '}
              sampai{' '}
              <span className="font-bold text-[#17221e]">
                {pagination.to || periodsList.length}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-[#17221e]">{pagination.total}</span>{' '}
              periode observasi
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-prev-page"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-2 font-medium text-[#4e6057]">
                Halaman {pagination.current_page} dari {pagination.last_page || 1}
              </span>

              <button
                type="button"
                data-testid="btn-next-page"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(pagination.last_page || 1, prev + 1)
                  )
                }
                disabled={currentPage >= (pagination.last_page || 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. MODAL DETAIL PERIODE WAKTU (SYSTEM FEATURE 25)                   */}
      {/* =================================================================== */}
      {isDetailModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-period-title"
          data-testid="modal-detail-period"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] border-b border-[#e2e8e5] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2
                    id="modal-detail-period-title"
                    data-testid="modal-detail-period-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Detail Periode Waktu Observasi
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    {detailPeriodData
                      ? `${detailPeriodData.nama} (Kode: ${detailPeriodData.kode_periode})`
                      : 'Memuat rincian informasi periode...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-detail-modal"
                onClick={handleCloseDetailModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer"
                aria-label="Tutup dialog rincian periode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Loading Detail */}
              {isLoadingDetail && (
                <div className="py-12 text-center text-[#7d8f87]">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-800 mb-2" />
                  <p className="font-semibold text-xs text-[#17221e]">
                    Memuat Rincian Periode Waktu...
                  </p>
                </div>
              )}

              {/* Error Detail */}
              {!isLoadingDetail && detailError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <h4 className="font-bold text-xs">Gagal Memuat Detail Periode</h4>
                    <p className="text-xs mt-0.5">{detailError}</p>
                  </div>
                </div>
              )}

              {/* Ready Detail Content */}
              {!isLoadingDetail && !detailError && detailPeriodData && (
                <div className="space-y-4">
                  {/* Card 1: Identitas Kalender */}
                  <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-[#e9efe8] pb-2 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Identitas Kalender Observasi</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Kode Periode:</span>
                        <span className="font-mono font-bold text-[#17221e] text-sm">
                          {detailPeriodData.kode_periode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Tahun Observasi:</span>
                        <span className="font-bold text-[#17221e] text-sm">
                          {detailPeriodData.tahun}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Bulan:</span>
                        <span className="font-semibold text-[#17221e]">
                          {detailPeriodData.bulan_nama}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Label Singkat:</span>
                        <span className="font-mono font-medium text-[#123027]">
                          {detailPeriodData.label_singkat}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Tipe Agregasi:</span>
                        <span className="font-semibold text-[#17221e]">
                          {detailPeriodData.tipe_periode_label}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Keterangan Musim:</span>
                        <span className="font-bold text-teal-800">
                          {detailPeriodData.keterangan_musim}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Status Tata Kelola & Publikasi */}
                  <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-[#e9efe8] pb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Status Publikasi &amp; Tata Kelola Data</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Status Publikasi:</span>
                        <div className="mt-1">
                          {detailPeriodData.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{detailPeriodData.status_publikasi_label}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{detailPeriodData.status_publikasi_label}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Sumber Data:</span>
                        <span className="font-medium text-[#17221e]">
                          {detailPeriodData.sumber_data}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Kelengkapan Wilayah:</span>
                        <span className="font-medium text-[#17221e]">
                          {detailPeriodData.status_kelengkapan}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7d8f87] block text-[11px]">Terakhir Diperbarui:</span>
                        <span className="font-medium text-[#17221e]">
                          {detailPeriodData.updated_at_formatted}
                        </span>
                      </div>
                    </div>

                    {detailPeriodData.keterangan && (
                      <div className="pt-2 border-t border-[#e9efe8]">
                        <span className="text-[#7d8f87] block text-[11px]">Catatan / Keterangan:</span>
                        <p className="text-xs text-[#17221e] mt-0.5 italic">
                          &ldquo;{detailPeriodData.keterangan}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Statistik Kasus Terkait */}
                  <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-[#e9efe8] pb-2 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Agregasi Kasus DBD Terkait ({detailPeriodData.total_case_records} Kecamatan)</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[11px] text-[#7d8f87] block">Kasus Terkonfirmasi</span>
                        <span className="text-lg font-extrabold text-emerald-800">
                          {Number(detailPeriodData.total_cases).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-[#7d8f87] block">pasien</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[11px] text-[#7d8f87] block">Kematian (DSS)</span>
                        <span className="text-lg font-extrabold text-rose-700">
                          {Number(detailPeriodData.total_deaths).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-[#7d8f87] block">jiwa</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-[#7d8f87] block">Rekaman Wilayah</span>
                        <span className="text-lg font-extrabold text-[#17221e]">
                          {detailPeriodData.total_case_records}
                        </span>
                        <span className="text-[10px] text-[#7d8f87] block">kecamatan</span>
                      </div>
                    </div>

                    {/* Top 5 Districts with cases if any */}
                    {Array.isArray(detailPeriodData.top_districts) &&
                      detailPeriodData.top_districts.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-[#4e6057] block mb-1.5">
                            Kecamatan Kasus Terbanyak pada Periode Ini:
                          </span>
                          <div className="space-y-1">
                            {detailPeriodData.top_districts.map((d, i) => (
                              <div
                                key={d.kecamatan_id || i}
                                className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white border border-slate-100 text-[11px]"
                              >
                                <span className="font-semibold text-[#17221e] flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-[#7d8f87]" />
                                  <span>{d.kecamatan_nama}</span>
                                </span>
                                <span className="font-bold text-emerald-800">
                                  {d.jumlah_kasus} kasus{' '}
                                  <span className="text-[#7d8f87] font-normal">
                                    ({d.jumlah_meninggal} wafat)
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end">
              <button
                type="button"
                data-testid="btn-modal-close"
                onClick={handleCloseDetailModal}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. MODAL TAMBAH PERIODE PEMANTAUAN BARU (SYSTEM FEATURE 26)         */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-period-title"
          data-testid="modal-create-period"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] border-b border-[#e2e8e5] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2
                    id="modal-create-period-title"
                    data-testid="modal-create-period-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Tambah Periode Pemantauan Baru
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Tambahkan kalender periode observasi kasus DBD bulanan ke dalam sistem
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-create-modal"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog tambah periode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
                {/* General Error Banner */}
                {createFormGeneralError && (
                  <div
                    data-testid="alert-create-period-general-error"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <p className="font-bold text-rose-900">Gagal Menyimpan Periode</p>
                      <p className="mt-0.5 leading-relaxed">{createFormGeneralError}</p>
                    </div>
                  </div>
                )}

                {/* Section A: Identitas Waktu Observasi */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider border-b border-[#e9efe8] pb-1.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-800" />
                    <span>A. Identitas Waktu Observasi</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tahun */}
                    <div>
                      <label
                        htmlFor="input-period-year"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Tahun Observasi <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="input-period-year"
                        type="number"
                        name="tahun"
                        data-testid="input-period-year"
                        value={createFormData.tahun}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        min="2000"
                        max="2099"
                        placeholder="Contoh: 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 ${createFormErrors.tahun
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {createFormErrors.tahun && (
                        <p
                          data-testid="error-period-year"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {createFormErrors.tahun}
                        </p>
                      )}
                    </div>

                    {/* Bulan */}
                    <div>
                      <label
                        htmlFor="select-period-month"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Bulan Observasi <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="select-period-month"
                        name="bulan"
                        data-testid="select-period-month"
                        value={createFormData.bulan}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 cursor-pointer ${createFormErrors.bulan
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label} (Bulan {m.value})
                          </option>
                        ))}
                      </select>
                      {createFormErrors.bulan && (
                        <p
                          data-testid="error-period-month"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {createFormErrors.bulan}
                        </p>
                      )}
                    </div>

                    {/* Label Periode Lengkap */}
                    <div>
                      <label
                        htmlFor="input-period-name"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Label Periode Lengkap <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="input-period-name"
                        type="text"
                        name="nama"
                        data-testid="input-period-name"
                        value={createFormData.nama}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        placeholder="Contoh: April 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 ${createFormErrors.nama
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {createFormErrors.nama && (
                        <p
                          data-testid="error-period-name"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {createFormErrors.nama}
                        </p>
                      )}
                    </div>

                    {/* Label Singkat */}
                    <div>
                      <label
                        htmlFor="input-period-short-name"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Label Singkat <span className="text-[10px] text-slate-400 font-normal">(Untuk Grafik &amp; Peta)</span>
                      </label>
                      <input
                        id="input-period-short-name"
                        type="text"
                        name="label_singkat"
                        data-testid="input-period-short-name"
                        value={createFormData.label_singkat}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        placeholder="Contoh: Apr 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] font-mono transition-all outline-hidden focus:ring-2 ${createFormErrors.label_singkat
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {createFormErrors.label_singkat && (
                        <p
                          data-testid="error-period-short-name"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {createFormErrors.label_singkat}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Deskripsi atau Catatan Musim */}
                  <div>
                    <label
                      htmlFor="textarea-period-notes"
                      className="block font-bold text-[#17221e] mb-1.5"
                    >
                      Deskripsi / Catatan Kondisi Musim <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <textarea
                      id="textarea-period-notes"
                      name="keterangan"
                      rows={2}
                      data-testid="textarea-period-notes"
                      value={createFormData.keterangan}
                      onChange={handleCreateFormChange}
                      disabled={isSubmittingCreate}
                      placeholder="Contoh: Periode observasi fase peralihan musim hujan ke kemarau (pancaroba) di Banyumas."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#d2ded8] bg-white text-xs text-[#17221e] placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
                    />
                    {createFormErrors.keterangan && (
                      <p
                        data-testid="error-period-notes"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {createFormErrors.keterangan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section B: Kebijakan Status Publikasi */}
                <div className="space-y-3 pt-2 border-t border-[#e2e8e5]">
                  <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                    <span>B. Kebijakan Status Publikasi</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opsi 1: Dipublikasikan */}
                    <label
                      htmlFor="radio-published"
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${createFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-[#d8e2dd] bg-[#fbfbfa] hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        id="radio-published"
                        name="status_publikasi"
                        data-testid="radio-status-published"
                        value="DAPAT_DIPUBLIKASIKAN"
                        checked={createFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN'}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        className="mt-0.5 text-emerald-700 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#17221e] block">
                          Dipublikasikan ke WebGIS &amp; Pengguna
                        </span>
                        <p className="text-[11px] text-[#7d8f87] leading-relaxed">
                          Periode tersedia pada filter peta WebGIS, perbandingan periode, dan grafik tren publik.
                        </p>
                      </div>
                    </label>

                    {/* Opsi 2: Draft Internal */}
                    <label
                      htmlFor="radio-draft"
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${createFormData.status_publikasi === 'INTERNAL_BELUM_DIIZINKAN'
                          ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                          : 'border-[#d8e2dd] bg-[#fbfbfa] hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        id="radio-draft"
                        name="status_publikasi"
                        data-testid="radio-status-draft"
                        value="INTERNAL_BELUM_DIIZINKAN"
                        checked={createFormData.status_publikasi === 'INTERNAL_BELUM_DIIZINKAN'}
                        onChange={handleCreateFormChange}
                        disabled={isSubmittingCreate}
                        className="mt-0.5 text-amber-700 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#17221e] block">
                          Draft Internal (Hanya Admin)
                        </span>
                        <p className="text-[11px] text-[#7d8f87] leading-relaxed">
                          Periode hanya dapat diakses melalui pengelolaan administrator dan tersembunyi dari publik.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Section C: Live Preview Data Periode */}
                <div className="pt-2 border-t border-[#e2e8e5] space-y-2">
                  <span className="text-xs font-bold text-[#17221e] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pratinjau Data Periode Baru (Live Preview)</span>
                  </span>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <span className="text-[#7d8f87] text-[11px]">Kode Periode Otomatis:</span>
                      <span className="font-mono font-bold text-emerald-950 text-xs">
                        {previewData.kode_periode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <span className="text-[#7d8f87] text-[11px]">Label Periode Lengkap:</span>
                      <span className="font-bold text-[#17221e]">
                        {previewData.nama}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <span className="text-[#7d8f87] text-[11px]">Label Singkat:</span>
                      <span className="font-mono font-medium text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {previewData.label_singkat}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <span className="text-[#7d8f87] text-[11px]">Kondisi Iklim / Musim:</span>
                      <span className="font-bold text-teal-800">
                        {previewData.keterangan_musim}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#7d8f87] text-[11px]">Visibilitas Publik:</span>
                      <span>
                        {createFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Dipublikasikan ke WebGIS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft Internal (Tertutup)</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="btn-cancel-create-period"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-create-period"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Periode...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Simpan Periode</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. SYSTEM FEATURE 27: MODAL EDIT PERIODE                            */}
      {/* =================================================================== */}
      {isEditModalOpen && editingPeriod && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-period-title"
          data-testid="modal-edit-period"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] border-b border-[#e2e8e5] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                  <SquarePen className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2
                    id="modal-edit-period-title"
                    data-testid="modal-edit-period-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Ubah Informasi Periode
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Perbarui informasi tahun, bulan, label nama, dan status publikasi periode observasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-edit-modal"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog edit periode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
                {/* General Error Banner */}
                {editFormGeneralError && (
                  <div
                    data-testid="alert-edit-period-general-error"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <p className="font-bold text-rose-900">Gagal Menyimpan Perubahan</p>
                      <p className="mt-0.5 leading-relaxed">{editFormGeneralError}</p>
                    </div>
                  </div>
                )}

                {/* Section A: Identitas Waktu Observasi */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider border-b border-[#e9efe8] pb-1.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-800" />
                    <span>A. Identitas Waktu Observasi</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tahun */}
                    <div>
                      <label
                        htmlFor="input-edit-period-year"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Tahun Observasi <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="input-edit-period-year"
                        type="number"
                        name="tahun"
                        data-testid="input-edit-period-year"
                        value={editFormData.tahun}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        min="2000"
                        max="2099"
                        placeholder="Contoh: 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 ${editFormErrors.tahun
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {editFormErrors.tahun && (
                        <p
                          data-testid="error-edit-period-year"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {editFormErrors.tahun}
                        </p>
                      )}
                    </div>

                    {/* Bulan */}
                    <div>
                      <label
                        htmlFor="select-edit-period-month"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Bulan Observasi <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="select-edit-period-month"
                        name="bulan"
                        data-testid="select-edit-period-month"
                        value={editFormData.bulan}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 cursor-pointer ${editFormErrors.bulan
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label} (Bulan {m.value})
                          </option>
                        ))}
                      </select>
                      {editFormErrors.bulan && (
                        <p
                          data-testid="error-edit-period-month"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {editFormErrors.bulan}
                        </p>
                      )}
                    </div>

                    {/* Label Periode Lengkap */}
                    <div>
                      <label
                        htmlFor="input-edit-period-name"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Label Periode Lengkap <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="input-edit-period-name"
                        type="text"
                        name="nama"
                        data-testid="input-edit-period-name"
                        value={editFormData.nama}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        placeholder="Contoh: Januari 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] transition-all outline-hidden focus:ring-2 ${editFormErrors.nama
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {editFormErrors.nama && (
                        <p
                          data-testid="error-edit-period-name"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {editFormErrors.nama}
                        </p>
                      )}
                    </div>

                    {/* Label Singkat */}
                    <div>
                      <label
                        htmlFor="input-edit-period-short-name"
                        className="block font-bold text-[#17221e] mb-1.5"
                      >
                        Label Singkat <span className="text-[10px] text-slate-400 font-normal">(Untuk Grafik &amp; Peta)</span>
                      </label>
                      <input
                        id="input-edit-period-short-name"
                        type="text"
                        name="label_singkat"
                        data-testid="input-edit-period-short-name"
                        value={editFormData.label_singkat}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        placeholder="Contoh: Jan 2026"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] font-mono transition-all outline-hidden focus:ring-2 ${editFormErrors.label_singkat
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                            : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                      />
                      {editFormErrors.label_singkat && (
                        <p
                          data-testid="error-edit-period-short-name"
                          className="text-[11px] text-rose-600 font-medium mt-1"
                        >
                          {editFormErrors.label_singkat}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Deskripsi atau Catatan Musim */}
                  <div>
                    <label
                      htmlFor="textarea-edit-period-notes"
                      className="block font-bold text-[#17221e] mb-1.5"
                    >
                      Deskripsi / Catatan Kondisi Musim <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <textarea
                      id="textarea-edit-period-notes"
                      name="keterangan"
                      rows={2}
                      data-testid="textarea-edit-period-notes"
                      value={editFormData.keterangan}
                      onChange={handleEditFormChange}
                      disabled={isSubmittingEdit}
                      placeholder="Contoh: Periode observasi fase peralihan musim hujan ke kemarau (pancaroba) di Banyumas."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#d2ded8] bg-white text-xs text-[#17221e] placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
                    />
                    {editFormErrors.keterangan && (
                      <p
                        data-testid="error-edit-period-notes"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {editFormErrors.keterangan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section B: Kebijakan Status Publikasi */}
                <div className="space-y-3 pt-2 border-t border-[#e2e8e5]">
                  <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                    <span>B. Kebijakan Status Publikasi</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opsi 1: Dipublikasikan */}
                    <label
                      htmlFor="radio-edit-published"
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${editFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-[#d8e2dd] bg-[#fbfbfa] hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        id="radio-edit-published"
                        name="status_publikasi"
                        data-testid="radio-edit-status-published"
                        value="DAPAT_DIPUBLIKASIKAN"
                        checked={editFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN'}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        className="mt-0.5 text-emerald-700 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#17221e] block">
                          Dipublikasikan ke WebGIS &amp; Pengguna
                        </span>
                        <p className="text-[11px] text-[#7d8f87] leading-relaxed">
                          Periode tersedia pada WebGIS dan dapat digunakan oleh pengguna pada filter waktu.
                        </p>
                      </div>
                    </label>

                    {/* Opsi 2: Draft Internal */}
                    <label
                      htmlFor="radio-edit-draft"
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${editFormData.status_publikasi === 'INTERNAL_BELUM_DIIZINKAN'
                          ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                          : 'border-[#d8e2dd] bg-[#fbfbfa] hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        id="radio-edit-draft"
                        name="status_publikasi"
                        data-testid="radio-edit-status-draft"
                        value="INTERNAL_BELUM_DIIZINKAN"
                        checked={editFormData.status_publikasi === 'INTERNAL_BELUM_DIIZINKAN'}
                        onChange={handleEditFormChange}
                        disabled={isSubmittingEdit}
                        className="mt-0.5 text-amber-700 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#17221e] block">
                          Draft Internal (Hanya Admin)
                        </span>
                        <p className="text-[11px] text-[#7d8f87] leading-relaxed">
                          Periode hanya dapat diakses administrator dan tidak ditampilkan pada pilihan periode publik.
                        </p>
                      </div>
                    </label>
                  </div>
                  {editFormErrors.status_publikasi && (
                    <p
                      data-testid="error-edit-period-status"
                      className="text-[11px] text-rose-600 font-medium mt-1"
                    >
                      {editFormErrors.status_publikasi}
                    </p>
                  )}
                </div>

                {/* Section C: Live Preview Data Perubahan */}
                <div className="pt-2 border-t border-[#e2e8e5] space-y-2">
                  <span className="text-xs font-bold text-[#17221e] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pratinjau Perubahan Periode (Live Preview)</span>
                  </span>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-[#7d8f87] text-[11px]">Tahun &amp; Bulan:</span>
                      <span className="font-bold text-[#17221e] text-xs">
                        {editPreviewData.bulan_nama} {editPreviewData.tahun} (Bulan {editPreviewData.bulan})
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-[#7d8f87] text-[11px]">Kode Periode:</span>
                      <span className="font-mono font-bold text-amber-950 text-xs">
                        {editPreviewData.kode_periode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-[#7d8f87] text-[11px]">Label Periode Lengkap:</span>
                      <span className="font-bold text-[#17221e]">
                        {editPreviewData.nama}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-[#7d8f87] text-[11px]">Label Singkat:</span>
                      <span className="font-mono font-medium text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {editPreviewData.label_singkat}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-[#7d8f87] text-[11px]">Kondisi Iklim / Musim:</span>
                      <span className="font-bold text-teal-800">
                        {editPreviewData.keterangan_musim}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#7d8f87] text-[11px]">Status Publikasi:</span>
                      <span>
                        {editFormData.status_publikasi === 'DAPAT_DIPUBLIKASIKAN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Dipublikasikan ke WebGIS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft Internal (Hanya Admin)</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="btn-cancel-edit-period"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-edit-period"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <SquarePen className="w-3.5 h-3.5 text-amber-100" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 9. SYSTEM FEATURE 28: MODAL KONFIRMASI HAPUS PERIODE               */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingPeriod && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-period-title"
          data-testid="modal-delete-period"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fff9f9] border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-period-title"
                    data-testid="modal-delete-period-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Periode Waktu
                  </h2>
                  <p className="text-xs text-rose-700/80">
                    Konfirmasi tindakan penghapusan kalender periode observasi kasus DBD
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-delete-modal"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-rose-900 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog konfirmasi hapus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error Alert Banner if deletion fails */}
              {deleteModalError && (
                <div
                  data-testid="alert-delete-period-error"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-bold text-rose-900">Gagal Menghapus Periode</p>
                    <p className="mt-0.5 leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              {/* Confirmation Prompt */}
              <p className="text-[#2c3e35] text-xs leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus periode pemantauan ini? Data periode yang telah
                dihapus tidak lagi ditampilkan dalam pengelolaan kalender observasi.
              </p>

              {/* Selected Period Info Card */}
              <div className="rounded-xl border border-slate-200 bg-[#fbfbfa] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[#7d8f87] font-medium">Kode Periode:</span>
                  <span className="font-mono font-bold text-[#123027] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {deletingPeriod.kode_periode}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[#7d8f87] font-medium">Label Periode Lengkap:</span>
                  <span className="font-bold text-[#17221e]">{deletingPeriod.nama}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[#7d8f87] font-medium">Tahun &amp; Bulan:</span>
                  <span className="font-semibold text-[#17221e]">
                    {deletingPeriod.bulan_nama} {deletingPeriod.tahun}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[#7d8f87] font-medium">Label Singkat:</span>
                  <span className="font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {deletingPeriod.label_singkat || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[#7d8f87] font-medium">Status Publikasi:</span>
                  <span>
                    {deletingPeriod.is_published ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Dipublikasikan</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Draft / Internal</span>
                      </span>
                    )}
                  </span>
                </div>

                {/* Indikasi Ketergantungan Data Kasus */}
                {Number(deletingPeriod.total_cases || 0) > 0 ? (
                  <div className="pt-1">
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Memiliki Data Kasus Terkait:</span>
                        <span>
                          Periode ini mencatat {deletingPeriod.total_cases} kasus DBD ({deletingPeriod.total_case_records} rekaman agregat).
                          Sistem akan menolak penghapusan demi menjaga integritas data kasus.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 pt-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tidak memiliki rekaman kasus terkait (Aman dihapus).</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                data-testid="btn-cancel-delete-period"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-period"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Periode...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Periode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
