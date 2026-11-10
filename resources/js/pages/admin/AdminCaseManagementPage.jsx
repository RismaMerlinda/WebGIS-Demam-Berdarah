import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  ShieldCheck,
  Layers,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  X,
  AlertCircle,
  ExternalLink,
  LogOut,
  Loader2,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Users,
  User,
  HeartCrack,
  Info,
  Plus,
  CheckCircle2,
  Calculator,
  Edit3,
  Lock,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminCaseManagementPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [casesList, setCasesList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [summaryStats, setSummaryStats] = useState({
    total_records: 0,
    total_cases: 0,
    total_deaths: 0,
    average_ir: 0,
  });
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown reference options
  const [districtsList, setDistrictsList] = useState([]);
  const [periodsList, setPeriodsList] = useState([]);

  // Detail Modal States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState(null);
  const [detailCaseData, setDetailCaseData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // System Feature 18: Create Case Form States
  const initialCreateForm = {
    kecamatan_id: '',
    periode_id: '',
    jumlah_kasus: '',
    jumlah_meninggal: '0',
    jumlah_penduduk: '',
    status_publikasi: 'DAPAT_DIPUBLIKASIKAN',
    keterangan: '',
    kasus_laki_laki: '',
    kasus_perempuan: '',
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialCreateForm);
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createFormGeneralError, setCreateFormGeneralError] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Auto-calculated Incidence Rate (IR)
  const calculatedIR = React.useMemo(() => {
    const cases = parseInt(createFormData.jumlah_kasus, 10);
    const pop = parseInt(createFormData.jumlah_penduduk, 10);
    if (!isNaN(cases) && !isNaN(pop) && pop > 0 && cases >= 0) {
      return ((cases / pop) * 100000).toFixed(2);
    }
    return null;
  }, [createFormData.jumlah_kasus, createFormData.jumlah_penduduk]);

  // System Feature 19: Edit Case Form States
  const initialEditForm = {
    kecamatan_id: '',
    kecamatan_nama: '',
    kecamatan_kode: '',
    periode_id: '',
    periode_nama: '',
    jumlah_kasus: '',
    jumlah_meninggal: '0',
    jumlah_penduduk: '',
    status_publikasi: 'DAPAT_DIPUBLIKASIKAN',
    keterangan: '',
    kasus_laki_laki: '',
    kasus_perempuan: '',
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [editFormData, setEditFormData] = useState(initialEditForm);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormGeneralError, setEditFormGeneralError] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Auto-calculated Incidence Rate (IR) for Edit Form
  const calculatedEditIR = React.useMemo(() => {
    const cases = parseInt(editFormData.jumlah_kasus, 10);
    const pop = parseInt(editFormData.jumlah_penduduk, 10);
    if (!isNaN(cases) && !isNaN(pop) && pop > 0 && cases >= 0) {
      return ((cases / pop) * 100000).toFixed(2);
    }
    return null;
  }, [editFormData.jumlah_kasus, editFormData.jumlah_penduduk]);

  // System Feature 20: Delete Case Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [errorToast, setErrorToast] = useState(null);

  // Load districts and periods reference options for dropdowns
  const fetchFilterReferences = useCallback(async () => {
    try {
      const [districtsRes, periodsRes] = await Promise.all([
        axios.get('/api/admin/districts'),
        axios.get('/api/admin/periods'),
      ]);

      if (districtsRes.data?.success && Array.isArray(districtsRes.data.districts)) {
        setDistrictsList(districtsRes.data.districts);
      }
      if (periodsRes.data?.success && Array.isArray(periodsRes.data.periods)) {
        setPeriodsList(periodsRes.data.periods);
      }
    } catch (err) {
      console.warn('Gagal memuat referensi filter kecamatan/periode:', err);
    }
  }, []);

  // Fetch cases data from backend
  const fetchCases = useCallback(
    async (page = 1, search = '', district = 'all', period = 'all') => {
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

        if (district && district !== 'all') {
          params.district_id = district;
        }

        if (period && period !== 'all') {
          params.period_id = period;
        }

        const res = await axios.get('/api/admin/cases', { params });

        if (res.data?.success && res.data.cases) {
          setCasesList(res.data.cases.data || []);
          setPagination({
            current_page: res.data.cases.current_page || 1,
            last_page: res.data.cases.last_page || 1,
            per_page: res.data.cases.per_page || 10,
            total: res.data.cases.total || 0,
            from: res.data.cases.from || 0,
            to: res.data.cases.to || 0,
          });

          if (res.data.summary) {
            setSummaryStats(res.data.summary);
          }
        } else {
          throw new Error(res.data?.message || 'Format data kasus DBD tidak valid.');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true, state: { from: { pathname: '/admin/cases' } } });
          return;
        }

        const msg =
          err.response?.data?.message ||
          'Terjadi kendala saat memuat data kasus DBD dari basis data MySQL.';
        setError(msg);
        setCasesList([]);
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // Initialize data
  useEffect(() => {
    fetchFilterReferences();
  }, [fetchFilterReferences]);

  useEffect(() => {
    fetchCases(currentPage, activeSearch, districtFilter, periodFilter);
  }, [fetchCases, currentPage, activeSearch, districtFilter, periodFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  // Handle Filter Changes
  const handleDistrictChange = (e) => {
    setDistrictFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePeriodChange = (e) => {
    setPeriodFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setDistrictFilter('all');
    setPeriodFilter('all');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchCases(currentPage, activeSearch, districtFilter, periodFilter);
  };

  // Detail Modal Handlers
  const handleOpenDetailModal = async (caseId) => {
    setIsDetailModalOpen(true);
    setDetailCaseId(caseId);
    setDetailCaseData(null);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await axios.get(`/api/admin/cases/${caseId}`);
      if (res.data?.success && res.data?.case) {
        setDetailCaseData(res.data.case);
      } else {
        throw new Error(res.data?.message || 'Data kasus DBD tidak ditemukan.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/cases' } } });
      } else if (err.response?.status === 403) {
        setDetailError('Akses ditolak. Anda tidak memiliki izin untuk melihat detail kasus ini.');
      } else if (err.response?.status === 404) {
        setDetailError('Data kasus DBD tidak ditemukan.');
      } else {
        setDetailError(
          err.response?.data?.message || 'Gagal mengambil rincian data kasus dari server.'
        );
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailCaseId(null);
    setDetailCaseData(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  };

  // System Feature 18: Create Case Form Handlers
  const handleOpenCreateModal = () => {
    setCreateFormData(initialCreateForm);
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
      const updated = { ...prev, [name]: value };

      // Auto-fill population when district is chosen and population is empty
      if (name === 'kecamatan_id' && value) {
        const found = districtsList.find((d) => String(d.id) === String(value));
        if (found && found.jumlah_penduduk && !prev.jumlah_penduduk) {
          updated.jumlah_penduduk = String(found.jumlah_penduduk);
        }
      }

      return updated;
    });

    if (createFormErrors[name]) {
      setCreateFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    // Client-side pre-validation
    const clientErrors = {};
    if (!createFormData.kecamatan_id) {
      clientErrors.kecamatan_id = 'Wilayah kecamatan wajib dipilih.';
    }
    if (!createFormData.periode_id) {
      clientErrors.periode_id = 'Periode waktu pemantauan wajib dipilih.';
    }
    if (createFormData.jumlah_kasus === '' || isNaN(parseInt(createFormData.jumlah_kasus, 10))) {
      clientErrors.jumlah_kasus = 'Jumlah kasus DBD wajib diisi.';
    } else if (parseInt(createFormData.jumlah_kasus, 10) < 0) {
      clientErrors.jumlah_kasus = 'Jumlah kasus DBD tidak boleh bernilai negatif.';
    }

    if (createFormData.jumlah_meninggal === '' || isNaN(parseInt(createFormData.jumlah_meninggal, 10))) {
      clientErrors.jumlah_meninggal = 'Jumlah kasus meninggal (DSS) wajib diisi.';
    } else if (parseInt(createFormData.jumlah_meninggal, 10) < 0) {
      clientErrors.jumlah_meninggal = 'Jumlah kasus meninggal tidak boleh bernilai negatif.';
    }

    if (createFormData.jumlah_penduduk === '' || isNaN(parseInt(createFormData.jumlah_penduduk, 10))) {
      clientErrors.jumlah_penduduk = 'Populasi wilayah wajib diisi.';
    } else if (parseInt(createFormData.jumlah_penduduk, 10) <= 0) {
      clientErrors.jumlah_penduduk = 'Populasi wilayah harus berupa bilangan bulat positif (minimal 1 jiwa).';
    }

    if (Object.keys(clientErrors).length > 0) {
      setCreateFormErrors(clientErrors);
      setCreateFormGeneralError('Data belum lengkap atau format tidak sesuai. Silakan periksa kolom yang ditandai.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);

    try {
      const payload = {
        kecamatan_id: parseInt(createFormData.kecamatan_id, 10),
        periode_id: parseInt(createFormData.periode_id, 10),
        jumlah_kasus: parseInt(createFormData.jumlah_kasus, 10),
        jumlah_meninggal: parseInt(createFormData.jumlah_meninggal, 10),
        jumlah_penduduk: parseInt(createFormData.jumlah_penduduk, 10),
        status_publikasi: createFormData.status_publikasi,
        keterangan: createFormData.keterangan.trim() || null,
        kasus_laki_laki: createFormData.kasus_laki_laki !== '' ? parseInt(createFormData.kasus_laki_laki, 10) : null,
        kasus_perempuan: createFormData.kasus_perempuan !== '' ? parseInt(createFormData.kasus_perempuan, 10) : null,
      };

      const res = await axios.post('/api/admin/cases', payload);

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setCreateFormData(initialCreateForm);
        setSuccessToast({
          title: 'Data Kasus DBD Berhasil Ditambahkan!',
          message: `Rekaman kasus untuk ${res.data.case?.kecamatan_nama} (${res.data.case?.periode_nama}) berhasil disimpan ke basis data.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Reset to page 1 and refresh list & metrics
        setCurrentPage(1);
        fetchCases(1, activeSearch, districtFilter, periodFilter);
      } else {
        throw new Error(res.data?.message || 'Gagal menambahkan data kasus DBD.');
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
          err.response.data?.message || 'Validasi data kasus DBD gagal. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/cases' } } });
      } else if (err.response?.status === 403) {
        setCreateFormGeneralError('Akses ditolak. Anda tidak memiliki izin untuk menambahkan data kasus.');
      } else {
        setCreateFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // System Feature 19: Edit Case Handlers
  const handleOpenEditModal = (caseItem) => {
    setEditingCaseId(caseItem.id);
    setEditFormData({
      kecamatan_id: caseItem.kecamatan_id,
      kecamatan_nama: caseItem.kecamatan_nama,
      kecamatan_kode: caseItem.kecamatan_kode,
      periode_id: caseItem.periode_id,
      periode_nama: caseItem.periode_nama,
      jumlah_kasus: caseItem.jumlah_kasus !== undefined && caseItem.jumlah_kasus !== null ? String(caseItem.jumlah_kasus) : '',
      jumlah_meninggal: caseItem.jumlah_meninggal !== undefined && caseItem.jumlah_meninggal !== null ? String(caseItem.jumlah_meninggal) : '0',
      jumlah_penduduk: caseItem.populasi !== undefined && caseItem.populasi !== null ? String(caseItem.populasi) : '',
      status_publikasi: caseItem.status_publikasi || 'DAPAT_DIPUBLIKASIKAN',
      keterangan: caseItem.keterangan || '',
      kasus_laki_laki: caseItem.kasus_laki_laki !== undefined && caseItem.kasus_laki_laki !== null ? String(caseItem.kasus_laki_laki) : '',
      kasus_perempuan: caseItem.kasus_perempuan !== undefined && caseItem.kasus_perempuan !== null ? String(caseItem.kasus_perempuan) : '',
    });
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCaseId(null);
    setEditFormData(initialEditForm);
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setIsSubmittingEdit(false);
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
    if (editFormGeneralError) {
      setEditFormGeneralError(null);
    }
  };

  const validateEditClientSide = () => {
    const errors = {};
    if (editFormData.jumlah_kasus === '' || editFormData.jumlah_kasus === null) {
      errors.jumlah_kasus = 'Jumlah kasus DBD wajib diisi.';
    } else if (parseInt(editFormData.jumlah_kasus, 10) < 0 || isNaN(parseInt(editFormData.jumlah_kasus, 10))) {
      errors.jumlah_kasus = 'Jumlah kasus DBD tidak boleh bernilai negatif.';
    }

    if (editFormData.jumlah_meninggal === '' || editFormData.jumlah_meninggal === null) {
      errors.jumlah_meninggal = 'Jumlah kasus meninggal (DSS) wajib diisi.';
    } else if (parseInt(editFormData.jumlah_meninggal, 10) < 0 || isNaN(parseInt(editFormData.jumlah_meninggal, 10))) {
      errors.jumlah_meninggal = 'Jumlah kasus meninggal tidak boleh bernilai negatif.';
    }

    if (editFormData.jumlah_penduduk === '' || editFormData.jumlah_penduduk === null) {
      errors.jumlah_penduduk = 'Populasi wilayah wajib diisi.';
    } else if (parseInt(editFormData.jumlah_penduduk, 10) <= 0 || isNaN(parseInt(editFormData.jumlah_penduduk, 10))) {
      errors.jumlah_penduduk = 'Populasi wilayah harus berupa bilangan bulat positif (minimal 1 jiwa).';
    }

    if (!editFormData.status_publikasi) {
      errors.status_publikasi = 'Status laporan kasus wajib dipilih.';
    }

    if (editFormData.keterangan && editFormData.keterangan.length > 255) {
      errors.keterangan = 'Catatan surveilans maksimal 255 karakter.';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setEditFormGeneralError(null);

    if (!validateEditClientSide()) {
      return;
    }

    setIsSubmittingEdit(true);

    try {
      const payload = {
        jumlah_kasus: parseInt(editFormData.jumlah_kasus, 10),
        jumlah_meninggal: parseInt(editFormData.jumlah_meninggal, 10),
        jumlah_penduduk: parseInt(editFormData.jumlah_penduduk, 10),
        status_publikasi: editFormData.status_publikasi,
        keterangan: editFormData.keterangan ? editFormData.keterangan.trim() : null,
        kasus_laki_laki: editFormData.kasus_laki_laki !== '' ? parseInt(editFormData.kasus_laki_laki, 10) : null,
        kasus_perempuan: editFormData.kasus_perempuan !== '' ? parseInt(editFormData.kasus_perempuan, 10) : null,
      };

      const res = await axios.put(`/api/admin/cases/${editingCaseId}`, payload);

      if (res.data?.success && res.data?.case) {
        setIsEditModalOpen(false);
        setEditingCaseId(null);
        setSuccessToast({
          title: 'Perubahan Data Kasus Berhasil Disimpan!',
          message: `Data kasus ${res.data.case.kecamatan_nama} (${res.data.case.periode_nama}) berhasil diperbarui dengan IR ${res.data.case.incidence_rate_formatted}.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Segarkan data kasus dan summary metrics
        fetchCases(currentPage, activeSearch, districtFilter, periodFilter);
      } else {
        throw new Error(res.data?.message || 'Gagal memperbarui data kasus DBD.');
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
          err.response.data?.message || 'Validasi data kasus DBD gagal. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/cases' } } });
      } else if (err.response?.status === 403) {
        setEditFormGeneralError('Akses ditolak. Anda tidak memiliki izin untuk memperbarui data kasus.');
      } else if (err.response?.status === 404) {
        setEditFormGeneralError('Data kasus DBD tidak ditemukan atau sudah dihapus sebelumnya.');
      } else {
        setEditFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // System Feature 20: Delete Case Handlers
  const handleOpenDeleteModal = (item) => {
    setDeletingCase(item);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmittingDelete) return;
    setIsDeleteModalOpen(false);
    setDeletingCase(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCase || !deletingCase.id) return;

    setIsSubmittingDelete(true);
    setDeleteModalError(null);

    try {
      const res = await axios.delete(`/api/admin/cases/${deletingCase.id}`);

      if (res.data?.success) {
        const deletedKecamatan = deletingCase.kecamatan_nama;
        const deletedPeriode = deletingCase.periode_nama;
        setIsDeleteModalOpen(false);
        setDeletingCase(null);

        setSuccessToast({
          title: 'Data Kasus DBD Berhasil Dihapus!',
          message: res.data.message || `Data kasus DBD untuk ${deletedKecamatan} (${deletedPeriode}) berhasil dihapus.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // If this was the only case on page > 1, decrement page; otherwise refetch
        if (casesList.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
        } else {
          fetchCases(currentPage, activeSearch, districtFilter, periodFilter);
        }
      } else {
        throw new Error(res.data?.message || 'Data kasus DBD gagal dihapus.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/cases' } } });
      } else if (err.response?.status === 403) {
        setDeleteModalError('Akses ditolak. Anda tidak memiliki izin untuk menghapus data kasus DBD.');
      } else if (err.response?.status === 404) {
        setDeleteModalError('Data kasus DBD tidak ditemukan atau sudah dihapus sebelumnya.');
      } else {
        setDeleteModalError(
          err.response?.data?.message || 'Data kasus DBD gagal dihapus. Terjadi kendala pada sistem.'
        );
      }
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const hasActiveFilters = activeSearch.trim() !== '' || districtFilter !== 'all' || periodFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Minimalist Page Header */}
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Administrator', to: '/admin/dashboard' },
          { label: 'Kelola Kasus DBD' },
        ]}
        title="Kelola Kasus DBD"
        description="Pengelolaan data kasus DBD berdasarkan kecamatan dan periode pemantauan."
        badge="Master Data Kasus Bulanan"
      >
        <button
          type="button"
          data-testid="btn-open-create-case"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          title="Buka formulir pencatatan kasus DBD baru"
        >
          <Plus className="w-4 h-4 text-emerald-200" />
          <span>Tambah Kasus Baru</span>
        </button>
      </AdminPageHeader>

      {/* Toast Notification Banner (Success) */}
      {successToast && (
        <div
          data-testid="toast-success-case"
          className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start justify-between gap-3 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">{successToast.title}</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{successToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md transition-colors"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Toast Notification Banner (Error) */}
      {errorToast && (
        <div
          data-testid="toast-error-case"
          className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start justify-between gap-3 text-rose-900 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-950">{errorToast.title}</h4>
              <p className="text-xs text-rose-800 mt-0.5">{errorToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            className="text-rose-700 hover:text-rose-950 p-1 rounded-md transition-colors"
            aria-label="Tutup notifikasi error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* =================================================================== */}
      {/* SYSTEM FEATURE 20: MODAL KONFIRMASI HAPUS DATA KASUS DBD           */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-case-title"
          data-testid="modal-delete-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-case-title"
                    data-testid="modal-delete-case-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Kasus DBD
                  </h2>
                  <p className="text-xs text-rose-700">
                    Konfirmasi penghapusan rekaman data kasus agregat DBD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Data Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus data kasus DBD ini? Data yang telah dihapus tidak lagi tersedia dalam tabel pengelolaan kasus.
              </p>

              {/* Target Case Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingCase.kecamatan_nama}{' '}
                    <span className="text-[10px] text-[#7d8f87] font-mono font-normal">
                      ({deletingCase.kecamatan_kode})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Periode:</span>
                  <span className="font-semibold text-[#123027] text-right">
                    {deletingCase.periode_nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kasus Terkonfirmasi:</span>
                  <span className="font-bold text-emerald-800 text-right">
                    {Number(deletingCase.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Kematian (DSS):</span>
                  <span className="font-bold text-rose-700 text-right">
                    {Number(deletingCase.jumlah_meninggal || 0).toLocaleString('id-ID')} jiwa
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Tindakan ini tidak dapat dibatalkan. Menghapus data kasus ini tidak akan menghapus data master kecamatan maupun periode terkait.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-case"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-case"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data Kasus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner (Error) */}
      {errorToast && (
        <div
          data-testid="toast-error-case"
          className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start justify-between gap-3 text-rose-900 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-950">{errorToast.title}</h4>
              <p className="text-xs text-rose-800 mt-0.5">{errorToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            className="text-rose-700 hover:text-rose-950 p-1 rounded-md transition-colors"
            aria-label="Tutup notifikasi error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 20: MODAL KONFIRMASI HAPUS DATA KASUS DBD           */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-case-title"
          data-testid="modal-delete-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-case-title"
                    data-testid="modal-delete-case-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Kasus DBD
                  </h2>
                  <p className="text-xs text-rose-700">
                    Konfirmasi penghapusan rekaman data kasus agregat DBD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Data Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus data kasus DBD ini? Data yang telah dihapus tidak lagi tersedia dalam tabel pengelolaan kasus.
              </p>

              {/* Target Case Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingCase.kecamatan_nama}{' '}
                    <span className="text-[10px] text-[#7d8f87] font-mono font-normal">
                      ({deletingCase.kecamatan_kode})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Periode:</span>
                  <span className="font-semibold text-[#123027] text-right">
                    {deletingCase.periode_nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kasus Terkonfirmasi:</span>
                  <span className="font-bold text-emerald-800 text-right">
                    {Number(deletingCase.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Kematian (DSS):</span>
                  <span className="font-bold text-rose-700 text-right">
                    {Number(deletingCase.jumlah_meninggal || 0).toLocaleString('id-ID')} jiwa
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Tindakan ini tidak dapat dibatalkan. Menghapus data kasus ini tidak akan menghapus data master kecamatan maupun periode terkait.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-case"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-case"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data Kasus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUMMARY STATISTIC METRIC CARDS                                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Rekaman */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Total Rekaman Kasus</span>
            <FileText className="w-4 h-4 text-[#123027]" />
          </div>
          <div className="text-2xl font-bold text-[#17221e]">
            {loading ? '-' : Number(summaryStats.total_records || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Rekaman agregat wilayah</p>
        </div>

        {/* Total Kasus */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Kasus Terkonfirmasi</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {loading ? '-' : Number(summaryStats.total_cases || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Total kasus DBD terdata</p>
        </div>

        {/* Total Kematian DSS */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Kematian (DSS)</span>
            <HeartCrack className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {loading ? '-' : Number(summaryStats.total_deaths || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Dengue Shock Syndrome</p>
        </div>

        {/* Rata-rata Incidence Rate */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Rata-rata IR</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#17221e]">
            {loading ? '-' : Number(summaryStats.average_ir || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs text-[#7d8f87] font-normal ml-1">/ 100k</span>
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Incidence Rate rata-rata</p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SEARCH, FILTER, AND ACTION TOOLBAR                                  */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-[#d8e2dd] shadow-xs mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#f1f5f3]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="w-4 h-4 text-[#7d8f87] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  data-testid="input-search-case"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari berdasarkan kecamatan atau catatan data kasus..."
                  className="w-full pl-9 pr-20 py-2 text-xs rounded-xl border border-[#d2ded8] bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-[#7d8f87] hover:text-[#17221e] p-1 rounded-md"
                    title="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  data-testid="btn-submit-search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#123027] hover:bg-[#194337] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Cari
                </button>
              </div>
            </form>

            {/* Filters & Actions Group */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Kecamatan */}
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7d8f87]" />
                <select
                  data-testid="select-filter-district"
                  value={districtFilter}
                  onChange={handleDistrictChange}
                  className="text-xs rounded-xl border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] cursor-pointer"
                >
                  <option value="all">Semua Kecamatan</option>
                  {districtsList.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Periode */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#7d8f87]" />
                <select
                  data-testid="select-filter-period"
                  value={periodFilter}
                  onChange={handlePeriodChange}
                  className="text-xs rounded-xl border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] cursor-pointer"
                >
                  <option value="all">Semua Periode</option>
                  {periodsList.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  data-testid="btn-reset-filters"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
                  title="Kembalikan seluruh filter dan pencarian ke kondisi awal"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
                  <span>Reset Filter</span>
                </button>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                data-testid="btn-refresh-cases"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-[#17221e] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Segarkan data dari basis data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#123027] ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Segarkan</span>
              </button>
            </div>
          </div>

          {/* Active Filters Badges Indicator */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#f1f5f3] text-xs">
              <span className="text-[#7d8f87] text-[11px] font-medium">Filter Aktif:</span>

              {activeSearch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef5f2] text-[#123027] border border-[#cbe1d8]">
                  <span>Kata kunci: "{activeSearch}"</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {districtFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>
                    Kecamatan: {districtsList.find((d) => String(d.id) === String(districtFilter))?.nama || districtFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDistrictFilter('all')}
                    className="hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {periodFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  <span>
                    Periode: {periodsList.find((p) => String(p.id) === String(periodFilter))?.nama || periodFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('all')}
                    className="hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* MASTER DATA TABLE                                                   */}
        {/* =================================================================== */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fbfbfa] border-b border-[#e2e8e5] text-[#4e6057]">
                <th scope="col" className="py-3 px-4 font-bold text-center w-12">
                  No.
                </th>
                <th scope="col" className="py-3 px-4 font-bold">
                  Kecamatan
                </th>
                <th scope="col" className="py-3 px-4 font-bold">
                  Periode
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Jumlah Kasus
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Populasi
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Incidence Rate (IR)
                </th>
                <th scope="col" className="py-3 px-4 font-bold">
                  Terakhir Diperbarui
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-center w-48">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f3]">
              {/* State 1: Loading */}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7d8f87]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#123027]" />
                      <span className="font-semibold text-xs text-[#17221e]">
                        Memuat Data Kasus DBD...
                      </span>
                      <span className="text-[11px] text-[#7d8f87]">
                        Menghubungi basis data MySQL untuk mengambil rekaman kasus.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 2: Error */}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-rose-600">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                      <p className="font-bold text-xs">{error}</p>
                      <p className="text-[11px] text-[#7d8f87]">
                        Pastikan server Laravel dan koneksi MySQL berjalan dengan baik.
                      </p>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123027] text-white text-xs font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 3: Empty State */}
              {!loading && !error && casesList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7d8f87]">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#f1f5f3] flex items-center justify-center mx-auto text-[#7d8f87]">
                        <Layers className="w-5 h-5" />
                      </div>
                      {activeSearch ? (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Data kasus DBD tidak ditemukan.
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Tidak ada rekaman kasus DBD yang cocok dengan kata kunci "{activeSearch}".
                          </p>
                        </>
                      ) : districtFilter !== 'all' || periodFilter !== 'all' ? (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Tidak terdapat data kasus DBD pada wilayah atau periode yang dipilih.
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Silakan sesuaikan pilihan dropdown filter wilayah kecamatan atau periode waktu pemantauan.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Belum Ada Data Kasus DBD
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Basis data belum memiliki rekaman kasus DBD bulanan per kecamatan.
                          </p>
                        </>
                      )}

                      {hasActiveFilters && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123027] text-white text-xs font-semibold cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Seluruh Filter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* State 4: Render Rows */}
              {!loading &&
                !error &&
                casesList.map((item, index) => {
                  const rowNumber = (pagination.current_page - 1) * pagination.per_page + index + 1;
                  return (
                    <tr
                      key={item.id}
                      data-testid={`row-case-${item.id}`}
                      className="hover:bg-[#fbfbfa] transition-colors"
                    >
                      {/* 1. No */}
                      <td className="py-3 px-4 text-center font-medium text-[#7d8f87]">
                        {rowNumber}
                      </td>

                      {/* 2. Kecamatan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#123027] shrink-0" />
                          <div>
                            <div className="font-bold text-[#17221e]">{item.kecamatan_nama}</div>
                            <div className="text-[10px] text-[#7d8f87] font-mono">
                              Kode: {item.kecamatan_kode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Periode */}
                      <td className="py-3 px-4 font-medium text-[#17221e]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#7d8f87] shrink-0" />
                          <span>{item.periode_nama}</span>
                        </div>
                      </td>

                      {/* 4. Jumlah Kasus */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-[#17221e] text-sm">
                          {Number(item.jumlah_kasus || 0).toLocaleString('id-ID')}
                          <span className="text-[10px] font-normal text-[#7d8f87] ml-1">kasus</span>
                        </div>
                        {item.jumlah_meninggal > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            <HeartCrack className="w-2.5 h-2.5" />
                            {item.jumlah_meninggal} meninggal
                          </span>
                        )}
                      </td>

                      {/* 5. Populasi */}
                      <td className="py-3 px-4 text-right font-medium text-[#4e6057]">
                        {item.populasi_formatted}
                      </td>

                      {/* 6. Incidence Rate (IR) */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef5f2] text-[#123027] border border-[#cbe1d8]">
                          <TrendingUp className="w-3 h-3 text-emerald-700" />
                          <span>{item.incidence_rate_formatted}</span>
                        </span>
                      </td>

                      {/* 7. Terakhir Diperbarui */}
                      <td className="py-3 px-4 text-[#4e6057]">
                        <span>{item.updated_at_formatted}</span>
                      </td>

                      {/* 8. Aksi (Detail, Edit & Hapus) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`btn-detail-case-${item.id}`}
                            onClick={() => handleOpenDetailModal(item.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Lihat rincian data kasus ${item.kecamatan_nama} (${item.periode_nama})`}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-edit-case-${item.id}`}
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-900 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Ubah data kasus ${item.kecamatan_nama} (${item.periode_nama})`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-delete-case-${item.id}`}
                            onClick={() => handleOpenDeleteModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 hover:border-rose-300 text-rose-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Hapus data kasus ${item.kecamatan_nama} (${item.periode_nama})`}
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
        {/* TABLE PAGINATION FOOTER                                             */}
        {/* =================================================================== */}
        {!loading && casesList.length > 0 && (
          <div
            data-testid="cases-pagination"
            className="p-4 sm:px-6 border-t border-[#f1f5f3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="text-[#7d8f87]">
              Menampilkan{' '}
              <span className="font-bold text-[#17221e]">{pagination.from || 1}</span> -{' '}
              <span className="font-bold text-[#17221e]">{pagination.to || casesList.length}</span>{' '}
              dari <span className="font-bold text-[#17221e]">{pagination.total}</span> data kasus
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="btn-prev-page"
                disabled={pagination.current_page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[#17221e] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-3 py-1.5 font-semibold text-[#123027] bg-[#eef5f2] rounded-lg border border-[#cbe1d8]">
                Halaman {pagination.current_page} dari {pagination.last_page}
              </span>

              <button
                type="button"
                data-testid="btn-next-page"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[#17221e] transition-colors cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 17: MODAL DETAIL DATA KASUS DBD (READ-ONLY)         */}
      {/* =================================================================== */}
      {isDetailModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-case-title"
          data-testid="modal-detail-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0c201a] text-white px-5 sm:px-6 py-4 border-b border-[#1b3d33] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#194337] flex items-center justify-center text-emerald-400 shrink-0 border border-[#24594a]">
                  <Eye className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="modal-detail-case-title" className="text-base font-bold text-white tracking-tight">
                    Detail Data Kasus DBD
                  </h2>
                  <p className="text-xs text-slate-300">
                    Informasi lengkap data kasus, populasi wilayah, dan indikator epidemiologi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup modal detail kasus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#17221e]">
              {/* State A: Loading */}
              {isLoadingDetail && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-[#123027] animate-spin" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#17221e]">Memuat Detail Data Kasus...</p>
                    <p className="text-[11px] text-[#7d8f87]">Mengambil data aktual langsung dari basis data MySQL.</p>
                  </div>
                </div>
              )}

              {/* State B: Error */}
              {!isLoadingDetail && detailError && (
                <div className="py-8 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-950">Gagal Mengambil Detail Kasus</h3>
                    <p data-testid="error-detail-case" className="text-xs text-rose-700 max-w-sm mx-auto">
                      {detailError}
                    </p>
                  </div>
                  {detailCaseId && (
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(detailCaseId)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                  )}
                </div>
              )}

              {/* State C: Loaded Detail */}
              {!isLoadingDetail && !detailError && detailCaseData && (
                <>
                  {/* Top Summary Banner */}
                  <div className="p-4 rounded-xl bg-[#f4f7f5] border border-[#dce6e1] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#7d8f87] text-[11px] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Kecamatan {detailCaseData.kecamatan_nama}</span>
                      </div>
                      <h3
                        data-testid="detail-case-title"
                        className="font-bold text-base text-[#17221e] mt-0.5"
                      >
                        Periode: {detailCaseData.periode_nama}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#7d8f87] font-medium block">Incidence Rate</span>
                      <span
                        data-testid="detail-case-ir"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#123027] text-white shadow-2xs mt-0.5"
                      >
                        {detailCaseData.incidence_rate_formatted}
                      </span>
                    </div>
                  </div>

                  {/* 4 Detail Sections */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Section 1: Wilayah Kecamatan */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <MapPin className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Wilayah Kecamatan</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Nama Kecamatan</p>
                          <p data-testid="detail-case-district" className="font-semibold text-xs text-[#17221e] mt-0.5">
                            {detailCaseData.kecamatan_nama}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Kode Kemendagri / Wilayah</p>
                          <p className="font-mono text-xs text-[#123027] mt-0.5">
                            {detailCaseData.kecamatan_kode}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Populasi Penduduk</p>
                          <p data-testid="detail-case-population" className="font-semibold text-xs text-[#17221e] mt-0.5">
                            {detailCaseData.populasi_formatted}
                          </p>
                        </div>
                        {detailCaseData.kecamatan_luas && (
                          <div>
                            <p className="text-[11px] text-[#7d8f87] font-medium">Luas Wilayah</p>
                            <p className="text-xs text-[#17221e] mt-0.5">
                              {detailCaseData.kecamatan_luas} km²
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Periode Pemantauan */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <Calendar className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Periode Pemantauan</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Nama Periode</p>
                          <p data-testid="detail-case-period" className="font-semibold text-xs text-[#17221e] mt-0.5">
                            {detailCaseData.periode_nama}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Tahun / Bulan</p>
                          <p className="text-xs text-[#17221e] mt-0.5">
                            Tahun {detailCaseData.periode_tahun}
                            {detailCaseData.periode_bulan ? ` (Bulan ke-${detailCaseData.periode_bulan})` : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Tipe Periode</p>
                          <p className="text-xs text-[#17221e] mt-0.5 capitalize">
                            {detailCaseData.periode_tipe || 'Bulanan'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Status Publikasi Periode</p>
                          <p className="text-xs text-[#17221e] mt-0.5">
                            {detailCaseData.status_publikasi}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Indikator Epidemiologi Kasus */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <Activity className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Indikator Epidemiologi DBD</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Total Kasus Terkonfirmasi</p>
                          <p data-testid="detail-case-count" className="font-bold text-base text-emerald-800 mt-0.5">
                            {Number(detailCaseData.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#f1f5f3]">
                          <div>
                            <p className="text-[10px] text-[#7d8f87] font-medium">Laki-laki</p>
                            <p className="text-xs font-semibold text-[#17221e]">
                              {detailCaseData.kasus_laki_laki} kasus
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#7d8f87] font-medium">Perempuan</p>
                            <p className="text-xs font-semibold text-[#17221e]">
                              {detailCaseData.kasus_perempuan} kasus
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Kasus Meninggal (DSS)</p>
                          <p className="font-semibold text-xs text-rose-700 mt-0.5">
                            {detailCaseData.jumlah_meninggal} jiwa
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Incidence Rate (IR)</p>
                          <p className="font-semibold text-xs text-[#123027] mt-0.5">
                            {detailCaseData.incidence_rate_formatted}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Riwayat & Catatan Kasus */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <FileText className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Riwayat & Catatan Kasus</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Terakhir Diperbarui</p>
                          <p data-testid="detail-case-updated-at" className="text-xs font-semibold text-[#17221e] mt-0.5">
                            {detailCaseData.updated_at_formatted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Tanggal Pencatatan Awal</p>
                          <p className="text-xs text-[#7d8f87] mt-0.5">
                            {detailCaseData.created_at_formatted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Catatan Surveilans / Keterangan</p>
                          <div
                            data-testid="detail-case-notes"
                            className="mt-1 text-xs text-[#17221e] leading-relaxed bg-[#fbfbfa] p-2.5 rounded-lg border border-[#f1f5f3] min-h-[50px] whitespace-pre-wrap"
                          >
                            {detailCaseData.keterangan || (
                              <span className="text-[#94a3b8] italic">Belum ada catatan surveilans</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer (Read-Only Close Button) */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end">
              <button
                type="button"
                data-testid="btn-close-detail-case"
                onClick={handleCloseDetailModal}
                className="px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =================================================================== */}
      {/* SYSTEM FEATURE 20: MODAL KONFIRMASI HAPUS DATA KASUS DBD           */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-case-title"
          data-testid="modal-delete-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-case-title"
                    data-testid="modal-delete-case-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Kasus DBD
                  </h2>
                  <p className="text-xs text-rose-700">
                    Konfirmasi penghapusan rekaman data kasus agregat DBD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Data Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus data kasus DBD ini? Data yang telah dihapus tidak lagi tersedia dalam tabel pengelolaan kasus.
              </p>

              {/* Target Case Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingCase.kecamatan_nama}{' '}
                    <span className="text-[10px] text-[#7d8f87] font-mono font-normal">
                      ({deletingCase.kecamatan_kode})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Periode:</span>
                  <span className="font-semibold text-[#123027] text-right">
                    {deletingCase.periode_nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kasus Terkonfirmasi:</span>
                  <span className="font-bold text-emerald-800 text-right">
                    {Number(deletingCase.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Kematian (DSS):</span>
                  <span className="font-bold text-rose-700 text-right">
                    {Number(deletingCase.jumlah_meninggal || 0).toLocaleString('id-ID')} jiwa
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Tindakan ini tidak dapat dibatalkan. Menghapus data kasus ini tidak akan menghapus data master kecamatan maupun periode terkait.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-case"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-case"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data Kasus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 18: MODAL FORM TAMBAH KASUS BARU                     */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-case-title"
          data-testid="modal-create-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0c201a] text-white px-5 sm:px-6 py-4 border-b border-[#1b3d33] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#194337] flex items-center justify-center text-emerald-400 shrink-0 border border-[#24594a]">
                  <Plus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="modal-create-case-title" className="text-base font-bold text-white tracking-tight">
                    Tambah Data Kasus DBD Baru
                  </h2>
                  <p className="text-xs text-slate-300">
                    Catat rekaman kasus agregat Demam Berdarah Dengue bulanan per kecamatan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup modal tambah kasus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCreate} className="flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-[#17221e]">
                {/* General Error Banner */}
                {createFormGeneralError && (
                  <div
                    data-testid="error-create-general"
                    className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-rose-950">Gagal Menyimpan Data Kasus</h4>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                        {createFormGeneralError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Lokasi & Waktu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Wilayah Kecamatan */}
                  <div className="space-y-1">
                    <label htmlFor="input-create-kecamatan" className="block text-xs font-bold text-[#17221e]">
                      Wilayah Kecamatan <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="input-create-kecamatan"
                      name="kecamatan_id"
                      data-testid="select-create-kecamatan"
                      value={createFormData.kecamatan_id}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:ring-1 transition-all ${createFormErrors.kecamatan_id
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    >
                      <option value="">-- Pilih Wilayah Kecamatan --</option>
                      {districtsList.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.nama} (Kode: {district.kode})
                        </option>
                      ))}
                    </select>
                    {createFormErrors.kecamatan_id && (
                      <p data-testid="error-create-kecamatan" className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.kecamatan_id}
                      </p>
                    )}
                  </div>

                  {/* Periode Waktu */}
                  <div className="space-y-1">
                    <label htmlFor="input-create-periode" className="block text-xs font-bold text-[#17221e]">
                      Periode Waktu Pemantauan <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="input-create-periode"
                      name="periode_id"
                      data-testid="select-create-periode"
                      value={createFormData.periode_id}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:ring-1 transition-all ${createFormErrors.periode_id
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    >
                      <option value="">-- Pilih Periode Waktu --</option>
                      {periodsList.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.nama}
                        </option>
                      ))}
                    </select>
                    {createFormErrors.periode_id && (
                      <p data-testid="error-create-periode" className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.periode_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 2: Angka Kasus, Kematian, dan Populasi */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Jumlah Kasus DBD */}
                  <div className="space-y-1">
                    <label htmlFor="input-create-cases" className="block text-xs font-bold text-[#17221e]">
                      Kasus Terkonfirmasi <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-create-cases"
                      type="number"
                      name="jumlah_kasus"
                      min="0"
                      step="1"
                      placeholder="0"
                      data-testid="input-create-cases"
                      value={createFormData.jumlah_kasus}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:ring-1 transition-all font-semibold ${createFormErrors.jumlah_kasus
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    {createFormErrors.jumlah_kasus && (
                      <p data-testid="error-create-cases" className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.jumlah_kasus}
                      </p>
                    )}
                  </div>

                  {/* Jumlah Kasus Meninggal (DSS) */}
                  <div className="space-y-1">
                    <label htmlFor="input-create-deaths" className="block text-xs font-bold text-[#17221e]">
                      Kasus Meninggal (DSS) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-create-deaths"
                      type="number"
                      name="jumlah_meninggal"
                      min="0"
                      step="1"
                      placeholder="0"
                      data-testid="input-create-deaths"
                      value={createFormData.jumlah_meninggal}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:ring-1 transition-all ${createFormErrors.jumlah_meninggal
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    {createFormErrors.jumlah_meninggal && (
                      <p data-testid="error-create-deaths" className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.jumlah_meninggal}
                      </p>
                    )}
                  </div>

                  {/* Populasi Wilayah */}
                  <div className="space-y-1">
                    <label htmlFor="input-create-population" className="block text-xs font-bold text-[#17221e]">
                      Populasi Wilayah (Jiwa) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-create-population"
                      type="number"
                      name="jumlah_penduduk"
                      min="1"
                      step="1"
                      placeholder="Contoh: 85000"
                      data-testid="input-create-population"
                      value={createFormData.jumlah_penduduk}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:ring-1 transition-all ${createFormErrors.jumlah_penduduk
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-[#123027]'
                        }`}
                    />
                    {createFormErrors.jumlah_penduduk && (
                      <p data-testid="error-create-population" className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.jumlah_penduduk}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 3: Incidence Rate Auto-Calculation Card */}
                <div
                  data-testid="display-create-ir"
                  className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-950">
                        Incidence Rate (IR) Terhitung Otomatis:
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        Rumus: (Jumlah Kasus / Populasi) × 100.000 penduduk
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {calculatedIR !== null ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#123027] text-emerald-300 border border-[#1b4337] shadow-2xs font-mono">
                        {calculatedIR} / 100k
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#7d8f87] italic">
                        Menunggu input kasus & populasi
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 4: Breakdown Gender (Opsional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label htmlFor="input-create-male" className="block text-xs font-medium text-[#4e6057]">
                      Kasus Laki-laki <span className="text-[10px] text-[#7d8f87]">(Opsional)</span>
                    </label>
                    <input
                      id="input-create-male"
                      type="number"
                      name="kasus_laki_laki"
                      min="0"
                      step="1"
                      placeholder="0"
                      data-testid="input-create-male"
                      value={createFormData.kasus_laki_laki}
                      onChange={handleCreateFormChange}
                      className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                    {createFormErrors.kasus_laki_laki && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.kasus_laki_laki}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-create-female" className="block text-xs font-medium text-[#4e6057]">
                      Kasus Perempuan <span className="text-[10px] text-[#7d8f87]">(Opsional)</span>
                    </label>
                    <input
                      id="input-create-female"
                      type="number"
                      name="kasus_perempuan"
                      min="0"
                      step="1"
                      placeholder="0"
                      data-testid="input-create-female"
                      value={createFormData.kasus_perempuan}
                      onChange={handleCreateFormChange}
                      className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                    {createFormErrors.kasus_perempuan && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {createFormErrors.kasus_perempuan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 5: Status Laporan Kasus */}
                <div className="space-y-1">
                  <label htmlFor="input-create-status" className="block text-xs font-bold text-[#17221e]">
                    Status Laporan Kasus <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="input-create-status"
                    name="status_publikasi"
                    data-testid="select-create-status"
                    value={createFormData.status_publikasi}
                    onChange={handleCreateFormChange}
                    className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                  >
                    <option value="DAPAT_DIPUBLIKASIKAN">
                      Dapat Dipublikasikan (Tampil pada Peta WebGIS & Dashboard Publik)
                    </option>
                    <option value="INTERNAL_BELUM_DIIZINKAN">
                      Internal / Belum Dipublikasikan (Hanya Akses Administrator)
                    </option>
                  </select>
                  {createFormErrors.status_publikasi && (
                    <p data-testid="error-create-status" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.status_publikasi}
                    </p>
                  )}
                </div>

                {/* Section 6: Catatan Surveilans (Opsional) */}
                <div className="space-y-1">
                  <label htmlFor="input-create-notes" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Catatan Surveilans Epidemiologi</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional (Maks. 255 Karakter)</span>
                  </label>
                  <textarea
                    id="input-create-notes"
                    name="keterangan"
                    rows={2}
                    maxLength={255}
                    placeholder="Contoh: Terjadi lonjakan kasus pasca banjir lokal di 2 desa, telah dilakukan pengasapan (fogging) dan intervensi PSN..."
                    data-testid="input-create-notes"
                    value={createFormData.keterangan}
                    onChange={handleCreateFormChange}
                    className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                  />
                  {createFormErrors.keterangan && (
                    <p data-testid="error-create-notes" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.keterangan}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="btn-cancel-create-case"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-create-case"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Kasus...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tambahkan Kasus</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 20: MODAL KONFIRMASI HAPUS DATA KASUS DBD           */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-case-title"
          data-testid="modal-delete-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-case-title"
                    data-testid="modal-delete-case-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Kasus DBD
                  </h2>
                  <p className="text-xs text-rose-700">
                    Konfirmasi penghapusan rekaman data kasus agregat DBD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Data Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus data kasus DBD ini? Data yang telah dihapus tidak lagi tersedia dalam tabel pengelolaan kasus.
              </p>

              {/* Target Case Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingCase.kecamatan_nama}{' '}
                    <span className="text-[10px] text-[#7d8f87] font-mono font-normal">
                      ({deletingCase.kecamatan_kode})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Periode:</span>
                  <span className="font-semibold text-[#123027] text-right">
                    {deletingCase.periode_nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kasus Terkonfirmasi:</span>
                  <span className="font-bold text-emerald-800 text-right">
                    {Number(deletingCase.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Kematian (DSS):</span>
                  <span className="font-bold text-rose-700 text-right">
                    {Number(deletingCase.jumlah_meninggal || 0).toLocaleString('id-ID')} jiwa
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Tindakan ini tidak dapat dibatalkan. Menghapus data kasus ini tidak akan menghapus data master kecamatan maupun periode terkait.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-case"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-case"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data Kasus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =================================================================== */}
      {/* SYSTEM FEATURE 19: MODAL FORM UBAH DATA KASUS DBD                   */}
      {/* =================================================================== */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-case-title"
          data-testid="modal-edit-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#0c201a] text-white flex items-center justify-between border-b border-[#193a30] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#194337] flex items-center justify-center text-emerald-400 shrink-0 shadow-2xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    id="modal-edit-case-title"
                    data-testid="modal-edit-case-title"
                    className="font-bold text-sm sm:text-base text-white tracking-tight"
                  >
                    Ubah Data Kasus DBD
                  </h3>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">
                    Perbarui rekaman epidemiologi wilayah dan hitung ulang Incidence Rate (IR).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#142f26] transition-colors cursor-pointer"
                aria-label="Tutup formulir ubah kasus"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEdit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* General Backend Error Banner */}
              {editFormGeneralError && (
                <div
                  data-testid="alert-error-edit-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-rose-950">Gagal Menyimpan Perubahan</h4>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      {editFormGeneralError}
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: Wilayah Kecamatan & Periode (READ-ONLY / DISABLED - KETENTUAN PENTING FITUR 19) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Identitas Rekaman Kasus (Terkunci)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90">
                  {/* Wilayah Kecamatan (Read-Only) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500">
                      Wilayah Kecamatan
                    </label>
                    <div
                      data-testid="display-edit-kecamatan"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 select-none shadow-2xs cursor-not-allowed flex items-center justify-between"
                    >
                      <span>{editFormData.kecamatan_nama || '-'}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        Kode: {editFormData.kecamatan_kode || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Periode Waktu (Read-Only) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500">
                      Periode Waktu Pemantauan
                    </label>
                    <div
                      data-testid="display-edit-periode"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 select-none shadow-2xs cursor-not-allowed flex items-center justify-between"
                    >
                      <span>{editFormData.periode_nama || '-'}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Wilayah kecamatan dan periode waktu pemantauan merupakan identitas rekaman yang tersimpan dan tidak dapat diubah.
                </p>
              </div>

              {/* Section 2: Angka Kasus, Kematian, dan Populasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Jumlah Kasus DBD */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-cases" className="block text-xs font-bold text-slate-900">
                    Jumlah Kasus DBD <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="input-edit-cases"
                    type="number"
                    name="jumlah_kasus"
                    min="0"
                    step="1"
                    placeholder="0"
                    data-testid="input-edit-cases"
                    value={editFormData.jumlah_kasus}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all font-semibold ${editFormErrors.jumlah_kasus
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                  />
                  {editFormErrors.jumlah_kasus && (
                    <p data-testid="error-edit-cases" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.jumlah_kasus}
                    </p>
                  )}
                </div>

                {/* Jumlah Kasus Meninggal (DSS) */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-deaths" className="block text-xs font-bold text-slate-900">
                    Kasus Meninggal (DSS) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="input-edit-deaths"
                    type="number"
                    name="jumlah_meninggal"
                    min="0"
                    step="1"
                    placeholder="0"
                    data-testid="input-edit-deaths"
                    value={editFormData.jumlah_meninggal}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${editFormErrors.jumlah_meninggal
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                  />
                  {editFormErrors.jumlah_meninggal && (
                    <p data-testid="error-edit-deaths" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.jumlah_meninggal}
                    </p>
                  )}
                </div>

                {/* Populasi Wilayah */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-population" className="block text-xs font-bold text-slate-900">
                    Populasi Wilayah (Jiwa) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="input-edit-population"
                    type="number"
                    name="jumlah_penduduk"
                    min="1"
                    step="1"
                    placeholder="Contoh: 85000"
                    data-testid="input-edit-population"
                    value={editFormData.jumlah_penduduk}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${editFormErrors.jumlah_penduduk
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                  />
                  {editFormErrors.jumlah_penduduk && (
                    <p data-testid="error-edit-population" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.jumlah_penduduk}
                    </p>
                  )}
                </div>
              </div>

              {/* Section 3: Incidence Rate Auto-Calculation Card */}
              <div
                data-testid="display-edit-ir"
                className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-950">
                      Incidence Rate (IR) Terhitung Ulang Otomatis:
                    </p>
                    <p className="text-[10px] text-emerald-800">
                      Rumus Epidemiologi: (Jumlah Kasus / Populasi Wilayah) × 100.000
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-base sm:text-lg text-emerald-900 font-mono">
                    {calculatedEditIR !== null ? `${calculatedEditIR} / 100k` : '-'}
                  </span>
                </div>
              </div>

              {/* Section 4: Status Laporan Kasus */}
              <div className="space-y-1">
                <label htmlFor="input-edit-status" className="block text-xs font-bold text-slate-900">
                  Status Laporan Kasus <span className="text-rose-600">*</span>
                </label>
                <select
                  id="input-edit-status"
                  name="status_publikasi"
                  data-testid="select-edit-status"
                  value={editFormData.status_publikasi}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                >
                  <option value="DAPAT_DIPUBLIKASIKAN">
                    Dapat Dipublikasikan (Tampil pada Peta WebGIS & Dashboard Publik)
                  </option>
                  <option value="INTERNAL_BELUM_DIIZINKAN">
                    Internal / Belum Dipublikasikan (Hanya Akses Administrator)
                  </option>
                </select>
                {editFormErrors.status_publikasi && (
                  <p data-testid="error-edit-status" className="text-[11px] text-rose-600 font-medium">
                    {editFormErrors.status_publikasi}
                  </p>
                )}
              </div>

              {/* Section 5: Catatan Surveilans (Opsional) */}
              <div className="space-y-1">
                <label htmlFor="input-edit-notes" className="block text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Catatan Surveilans Epidemiologi</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional (Maks. 255 Karakter)</span>
                </label>
                <textarea
                  id="input-edit-notes"
                  name="keterangan"
                  rows={2}
                  maxLength={255}
                  placeholder="Contoh: Dilakukan verifikasi lapangan tambahan, pemutakhiran data pasca audit..."
                  data-testid="input-edit-notes"
                  value={editFormData.keterangan}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                />
                {editFormErrors.keterangan && (
                  <p data-testid="error-edit-notes" className="text-[11px] text-rose-600 font-medium">
                    {editFormErrors.keterangan}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  data-testid="btn-cancel-edit-case"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-edit-case"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-emerald-200" />
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
      {/* SYSTEM FEATURE 20: MODAL KONFIRMASI HAPUS DATA KASUS DBD           */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingCase && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-case-title"
          data-testid="modal-delete-case"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-case-title"
                    data-testid="modal-delete-case-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Data Kasus DBD
                  </h2>
                  <p className="text-xs text-rose-700">
                    Konfirmasi penghapusan rekaman data kasus agregat DBD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-case"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Data Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus data kasus DBD ini? Data yang telah dihapus tidak lagi tersedia dalam tabel pengelolaan kasus.
              </p>

              {/* Target Case Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingCase.kecamatan_nama}{' '}
                    <span className="text-[10px] text-[#7d8f87] font-mono font-normal">
                      ({deletingCase.kecamatan_kode})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Periode:</span>
                  <span className="font-semibold text-[#123027] text-right">
                    {deletingCase.periode_nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kasus Terkonfirmasi:</span>
                  <span className="font-bold text-emerald-800 text-right">
                    {Number(deletingCase.jumlah_kasus || 0).toLocaleString('id-ID')} kasus
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Kematian (DSS):</span>
                  <span className="font-bold text-rose-700 text-right">
                    {Number(deletingCase.jumlah_meninggal || 0).toLocaleString('id-ID')} jiwa
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Tindakan ini tidak dapat dibatalkan. Menghapus data kasus ini tidak akan menghapus data master kecamatan maupun periode terkait.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-case"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-case"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data Kasus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus</span>
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

