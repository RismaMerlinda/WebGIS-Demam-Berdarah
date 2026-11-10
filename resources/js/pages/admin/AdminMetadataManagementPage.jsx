import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Database,
  Search,
  X,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  AlertCircle,
  FolderGit2,
  CheckCircle2,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Info,
  SquarePen,
  Save,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react';

export default function AdminMetadataManagementPage() {
  // State data utama
  const [metadataList, setMetadataList] = useState([]);
  const [summary, setSummary] = useState({
    total_datasets: 0,
    total_categories: 0,
    with_source_count: 0,
    with_update_date_count: 0,
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });

  // State filtering & pencarian
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // State loading & error
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // State modal detail (SF29)
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // State modal edit (SF30)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [editFormData, setEditFormData] = useState({
    dataset_name: '',
    source_category: 'published',
    indicator: '',
    description: '',
    source_name: '',
    reference_source: '',
    spatial_unit: '',
    period_start: '',
    period_end: '',
    observation_year: '',
    granularity: 'Tahunan',
    validation_status: '',
    publication_status: '',
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editGeneralError, setEditGeneralError] = useState(null);

  // State modal tambah metadata (SF31)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    dataset_name: '',
    source_category: 'published',
    indicator: '',
    description: '',
    source_name: '',
    reference_source: '',
    spatial_unit: '27 Kecamatan Kabupaten Banyumas',
    period_start: '',
    period_end: '',
    observation_year: '',
    granularity: 'Tahunan',
    validation_status: '',
    publication_status: '',
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createGeneralError, setCreateGeneralError] = useState(null);

  // State modal hapus metadata (SF32)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMetadata, setDeletingMetadata] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);

  // State toast notifikasi sukses
  const [successToast, setSuccessToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Debounce input pencarian
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset pagination saat kata kunci pencarian berubah
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch daftar metadata dataset
  const fetchMetadataList = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const params = {
        page: currentPage,
        per_page: 10,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const res = await axios.get('/api/admin/metadata', { params });

      if (res.data && res.data.success) {
        setMetadataList(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.categories) {
          setCategories(res.data.categories);
        }
        if (res.data.meta) {
          setPagination(res.data.meta);
        }
      } else {
        setFetchError(res.data?.message || 'Data metadata dataset gagal dimuat. Silakan coba kembali.');
      }
    } catch (err) {
      console.error('Error fetching admin metadata:', err);
      setFetchError('Data metadata dataset gagal dimuat. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchMetadataList();
  }, [fetchMetadataList]);

  // =========================================================================
  // HANDLERS DETAIL METADATA (SF29)
  // =========================================================================
  const handleOpenDetailModal = async (metadataItem) => {
    setSelectedMetadata(metadataItem);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await axios.get(`/api/admin/metadata/${metadataItem.id}`);
      if (res.data && res.data.success) {
        setSelectedMetadata(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching detail metadata:', err);
      setDetailError('Gagal memuat detail lengkap metadata.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMetadata(null);
    setDetailError(null);
  };

  // =========================================================================
  // HANDLERS EDIT METADATA (SF30)
  // =========================================================================
  const handleOpenEditModal = async (metadataItem) => {
    setEditingMetadata(metadataItem);
    setEditFormErrors({});
    setEditGeneralError(null);

    setEditFormData({
      dataset_name: metadataItem.dataset_name || '',
      source_category: metadataItem.source_category || metadataItem.kategori || 'published',
      indicator: metadataItem.indicator || '',
      description: metadataItem.description || metadataItem.deskripsi || '',
      source_name: metadataItem.source_name || metadataItem.sumber_data || '',
      reference_source: metadataItem.reference_source || '',
      spatial_unit: metadataItem.spatial_unit || metadataItem.cakupan_wilayah || 'Kabupaten Banyumas',
      period_start: metadataItem.period_start || '',
      period_end: metadataItem.period_end || '',
      observation_year: metadataItem.observation_year ? String(metadataItem.observation_year) : '',
      granularity: metadataItem.granularity || metadataItem.frekuensi_pembaruan || 'Tahunan',
      validation_status: metadataItem.validation_status || '',
      publication_status: metadataItem.publication_status || '',
    });

    setIsEditModalOpen(true);

    try {
      const res = await axios.get(`/api/admin/metadata/${metadataItem.id}`);
      if (res.data && res.data.success && res.data.data) {
        const item = res.data.data;
        setEditFormData({
          dataset_name: item.dataset_name || '',
          source_category: item.source_category || item.kategori || 'published',
          indicator: item.indicator || '',
          description: item.description || item.deskripsi || '',
          source_name: item.source_name || item.sumber_data || '',
          reference_source: item.reference_source || '',
          spatial_unit: item.spatial_unit || item.cakupan_wilayah || 'Kabupaten Banyumas',
          period_start: item.period_start || '',
          period_end: item.period_end || '',
          observation_year: item.observation_year ? String(item.observation_year) : '',
          granularity: item.granularity || item.frekuensi_pembaruan || 'Tahunan',
          validation_status: item.validation_status || '',
          publication_status: item.publication_status || '',
        });
      }
    } catch (err) {
      console.error('Error prefetching edit metadata:', err);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMetadata(null);
    setEditFormErrors({});
    setEditGeneralError(null);
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (editFormErrors[field]) {
      setEditFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingMetadata) return;

    const errors = {};
    if (!editFormData.dataset_name.trim()) {
      errors.dataset_name = 'Nama dataset wajib diisi.';
    }
    if (!editFormData.source_category) {
      errors.source_category = 'Kategori data wajib dipilih.';
    }
    if (!editFormData.description.trim()) {
      errors.description = 'Deskripsi dataset wajib diisi.';
    }
    if (!editFormData.source_name.trim()) {
      errors.source_name = 'Sumber data wajib diisi.';
    }
    if (!editFormData.spatial_unit.trim()) {
      errors.spatial_unit = 'Cakupan wilayah wajib diisi.';
    }
    if (!editFormData.granularity.trim()) {
      errors.granularity = 'Frekuensi pembaruan wajib dipilih atau diisi.';
    }
    if (
      editFormData.period_start &&
      editFormData.period_end &&
      editFormData.period_start > editFormData.period_end
    ) {
      errors.period_end = 'Tanggal akhir rentang periode tidak boleh lebih awal dari tanggal awal.';
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      setEditGeneralError('Informasi belum lengkap atau format tidak sesuai. Silakan periksa kembali formulir.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditGeneralError(null);
    setEditFormErrors({});

    try {
      const payload = {
        dataset_name: editFormData.dataset_name.trim(),
        source_category: editFormData.source_category,
        indicator: editFormData.indicator ? editFormData.indicator.trim() : null,
        description: editFormData.description.trim(),
        source_name: editFormData.source_name.trim(),
        reference_source: editFormData.reference_source ? editFormData.reference_source.trim() : null,
        spatial_unit: editFormData.spatial_unit.trim(),
        period_start: editFormData.period_start || null,
        period_end: editFormData.period_end || null,
        observation_year: editFormData.observation_year ? parseInt(editFormData.observation_year, 10) : null,
        granularity: editFormData.granularity.trim(),
        validation_status: editFormData.validation_status ? editFormData.validation_status.trim() : null,
        publication_status: editFormData.publication_status || null,
      };

      const res = await axios.put(`/api/admin/metadata/${editingMetadata.id}`, payload);

      if (res.data && res.data.success) {
        setSuccessToast('Informasi metadata berhasil diperbarui.');
        setIsEditModalOpen(false);
        setEditingMetadata(null);
        await fetchMetadataList();
      } else {
        setEditGeneralError(res.data?.message || 'Gagal memperbarui informasi metadata.');
      }
    } catch (err) {
      console.error('Error submitting edit metadata:', err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setEditFormErrors(err.response.data.errors);
        setEditGeneralError(
          err.response.data.message || 'Validasi gagal. Periksa kembali informasi yang Anda masukkan.'
        );
      } else {
        setEditGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan pada server saat memperbarui metadata dataset.'
        );
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // =========================================================================
  // HANDLERS TAMBAH METADATA BARU (SF31)
  // =========================================================================
  const handleOpenCreateModal = () => {
    setCreateFormData({
      dataset_name: '',
      source_category: 'published',
      indicator: '',
      description: '',
      source_name: '',
      reference_source: '',
      spatial_unit: '27 Kecamatan Kabupaten Banyumas',
      period_start: '',
      period_end: '',
      observation_year: '',
      granularity: 'Tahunan',
      validation_status: '',
      publication_status: '',
    });
    setCreateFormErrors({});
    setCreateGeneralError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateFormErrors({});
    setCreateGeneralError(null);
  };

  const handleCreateInputChange = (field, value) => {
    setCreateFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (createFormErrors[field]) {
      setCreateFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    // 1. Validasi Client-side
    const errors = {};
    if (!createFormData.dataset_name.trim()) {
      errors.dataset_name = 'Nama dataset wajib diisi.';
    }
    if (!createFormData.source_category) {
      errors.source_category = 'Kategori data wajib dipilih.';
    }
    if (!createFormData.description.trim()) {
      errors.description = 'Deskripsi dataset wajib diisi.';
    }
    if (!createFormData.source_name.trim()) {
      errors.source_name = 'Sumber data wajib diisi.';
    }
    if (!createFormData.spatial_unit.trim()) {
      errors.spatial_unit = 'Cakupan wilayah wajib diisi.';
    }
    if (!createFormData.granularity.trim()) {
      errors.granularity = 'Frekuensi pembaruan wajib dipilih atau diisi.';
    }
    if (
      createFormData.period_start &&
      createFormData.period_end &&
      createFormData.period_start > createFormData.period_end
    ) {
      errors.period_end = 'Tanggal akhir rentang periode tidak boleh lebih awal dari tanggal awal.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      setCreateGeneralError('Informasi belum lengkap atau format tidak sesuai. Silakan periksa kembali formulir.');
      return;
    }

    // 2. Submit ke Backend
    setIsSubmittingCreate(true);
    setCreateGeneralError(null);
    setCreateFormErrors({});

    try {
      const payload = {
        dataset_name: createFormData.dataset_name.trim(),
        source_category: createFormData.source_category,
        indicator: createFormData.indicator ? createFormData.indicator.trim() : null,
        description: createFormData.description.trim(),
        source_name: createFormData.source_name.trim(),
        reference_source: createFormData.reference_source ? createFormData.reference_source.trim() : null,
        spatial_unit: createFormData.spatial_unit.trim(),
        period_start: createFormData.period_start || null,
        period_end: createFormData.period_end || null,
        observation_year: createFormData.observation_year ? parseInt(createFormData.observation_year, 10) : null,
        granularity: createFormData.granularity.trim(),
        validation_status: createFormData.validation_status ? createFormData.validation_status.trim() : null,
        publication_status: createFormData.publication_status || null,
      };

      const res = await axios.post('/api/admin/metadata', payload);

      if (res.data && res.data.success) {
        setSuccessToast('Data metadata berhasil ditambahkan.');
        setIsCreateModalOpen(false);
        await fetchMetadataList();
      } else {
        setCreateGeneralError(res.data?.message || 'Gagal menambahkan metadata dataset.');
      }
    } catch (err) {
      console.error('Error submitting create metadata:', err);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setCreateFormErrors(err.response.data.errors);
        setCreateGeneralError(
          err.response.data.message || 'Validasi gagal. Periksa kembali informasi yang Anda masukkan.'
        );
      } else {
        setCreateGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan pada server saat menambahkan metadata dataset.'
        );
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // =========================================================================
  // HANDLERS HAPUS METADATA (SF32)
  // =========================================================================
  const handleOpenDeleteModal = (metadataItem) => {
    setDeletingMetadata(metadataItem);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmittingDelete) return;
    setIsDeleteModalOpen(false);
    setDeletingMetadata(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMetadata) return;
    setIsSubmittingDelete(true);
    setDeleteModalError(null);

    try {
      const res = await axios.delete(`/api/admin/metadata/${deletingMetadata.id}`);
      if (res.data && res.data.success) {
        setSuccessToast(res.data.message || 'Metadata dataset berhasil dihapus.');
        setIsDeleteModalOpen(false);
        setDeletingMetadata(null);

        // Jika baris terakhir pada halaman > 1 dihapus, mundurkan halaman
        if (metadataList.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          await fetchMetadataList();
        }
      } else {
        setDeleteModalError(res.data?.message || 'Gagal menghapus metadata dataset.');
      }
    } catch (err) {
      console.error('Error deleting metadata:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Terjadi kesalahan pada server saat menghapus metadata dataset.';
      setDeleteModalError(errorMsg);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Reset pencarian
  const handleResetSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  // Helper badge warna kategori
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'published':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-medium';
      case 'published_simulation':
        return 'bg-amber-50 text-amber-800 border-amber-200/80 font-medium';
      case 'reference':
        return 'bg-sky-50 text-sky-800 border-sky-200/80 font-medium';
      case 'internal_restricted':
        return 'bg-purple-50 text-purple-800 border-purple-200/80 font-medium';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 font-medium';
    }
  };

  const getCategoryLabel = (catKey) => {
    switch (catKey) {
      case 'published':
        return 'Resmi Dipublikasikan';
      case 'published_simulation':
        return 'Simulasi Pengembangan';
      case 'reference':
        return 'Referensi & Geospasial';
      case 'internal_restricted':
        return 'Internal Terbatas';
      default:
        return catKey || '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* NOTIFIKASI TOAST SUKSES                                             */}
      {/* =================================================================== */}
      {successToast && (
        <div
          data-testid="toast-success-metadata"
          className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-xl text-xs font-semibold animate-in slide-in-from-top-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="ml-2 hover:text-emerald-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. HEADER SECTION                                                  */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Administrator</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Metadata Dataset</span>
          </div>
          <h1
            data-testid="metadata-management-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
          >
            Pengelolaan Metadata Dataset
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola dan akses informasi metadata dataset yang digunakan dalam sistem WebGIS DBD Kabupaten Banyumas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tombol Segarkan */}
          <button
            type="button"
            data-testid="btn-refresh-metadata"
            onClick={fetchMetadataList}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            title="Muat ulang data metadata"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          {/* Tombol Tambah Metadata Baru (System Feature 31) */}
          <button
            type="button"
            data-testid="btn-add-metadata"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#194337] hover:bg-[#123027] text-white transition-colors shadow-2xs cursor-pointer"
            title="Tambah Definisi Metadata Baru"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Metadata Baru</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SUMMARY CARDS                                                   */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dataset */}
        <div
          data-testid="card-summary-total-datasets"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Dataset</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {summary.total_datasets}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Katalog data terdaftar</div>
          </div>
        </div>

        {/* Jumlah Kategori */}
        <div
          data-testid="card-summary-total-categories"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Jumlah Kategori</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {summary.total_categories}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Klasifikasi tata kelola</div>
          </div>
        </div>

        {/* Dataset Ber-Sumber Data */}
        <div
          data-testid="card-summary-with-sources"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Sumber Data Valid</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {summary.with_source_count}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Memiliki rujukan resmi</div>
          </div>
        </div>

        {/* Dataset dengan Tanggal Pembaruan */}
        <div
          data-testid="card-summary-with-updates"
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Info Pembaruan</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {summary.with_update_date_count}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tercatat tanggal revisi</div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TOOLBAR: PENCARIAN & FILTER KATEGORI                             */}
      {/* =================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              data-testid="input-search-metadata"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama dataset atau kategori..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                data-testid="btn-clear-search"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kategori Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-filter-category" className="text-xs font-medium text-slate-500 shrink-0">
              Kategori:
            </label>
            <select
              id="select-filter-category"
              data-testid="select-filter-category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent cursor-pointer font-medium"
            >
              <option value="all">Semua Kategori ({summary.total_datasets})</option>
              {categories
                .filter((cat) => cat.key !== 'all')
                .map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label} ({cat.count})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(debouncedSearch || selectedCategory !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Filter Aktif:</span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Pencarian: &ldquo;{debouncedSearch}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Kategori:{' '}
                {categories.find((c) => c.key === selectedCategory)?.label || selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              data-testid="btn-reset-filters"
              onClick={handleResetSearch}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2 ml-1 cursor-pointer"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. ERROR STATE                                                      */}
      {/* =================================================================== */}
      {fetchError && !isLoading && (
        <div
          data-testid="state-error-metadata"
          className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-4 shadow-2xs"
        >
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Gagal Memuat Metadata Dataset</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{fetchError}</p>
          </div>
          <button
            type="button"
            data-testid="btn-retry-fetch"
            onClick={fetchMetadataList}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#194337] text-white text-xs font-semibold hover:bg-[#123027] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. TABEL METADATA DATASET                                           */}
      {/* =================================================================== */}
      {!fetchError && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table Container dengan Horizontal Scroll Safety */}
          <div className="overflow-x-auto min-w-full">
            <table
              data-testid="table-metadata-dataset"
              className="w-full text-left border-collapse text-xs table-auto"
            >
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="px-3.5 py-3 text-center w-12 shrink-0">
                    #
                  </th>
                  <th
                    scope="col"
                    data-testid="th-dataset-name"
                    className="px-4 py-3 min-w-[240px] max-w-[320px]"
                  >
                    Nama Dataset
                  </th>
                  <th
                    scope="col"
                    data-testid="th-category"
                    className="px-4 py-3 min-w-[170px]"
                  >
                    Kategori
                  </th>
                  <th
                    scope="col"
                    data-testid="th-description"
                    className="px-4 py-3 min-w-[260px] max-w-[360px]"
                  >
                    Deskripsi Dataset
                  </th>
                  <th
                    scope="col"
                    data-testid="th-source"
                    className="px-4 py-3 min-w-[220px] max-w-[300px]"
                  >
                    Sumber Data
                  </th>
                  <th
                    scope="col"
                    data-testid="th-coverage"
                    className="px-4 py-3 min-w-[170px]"
                  >
                    Cakupan Wilayah
                  </th>
                  <th
                    scope="col"
                    data-testid="th-frequency"
                    className="px-4 py-3 min-w-[160px]"
                  >
                    Frekuensi Pembaruan
                  </th>
                  <th
                    scope="col"
                    data-testid="th-update-date"
                    className="px-4 py-3 min-w-[140px]"
                  >
                    Tanggal Pembaruan
                  </th>
                  <th
                    scope="col"
                    data-testid="th-actions"
                    className="px-4 py-3 text-center min-w-[210px] shrink-0 sticky right-0 bg-slate-50/90"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* SKELETON LOADING */}
                {isLoading && (
                  <>
                    {[...Array(5)].map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="animate-pulse">
                        <td className="px-3.5 py-3.5 text-center">
                          <div className="h-3 w-4 bg-slate-200 rounded mx-auto" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5" />
                          <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-5 bg-slate-200 rounded-full w-28" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3 bg-slate-200 rounded w-full mb-1" />
                          <div className="h-3 bg-slate-100 rounded w-4/5" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3 bg-slate-200 rounded w-3/4" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3 bg-slate-200 rounded w-28" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3 bg-slate-200 rounded w-24" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="h-3 bg-slate-200 rounded w-24" />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="h-7 w-20 bg-slate-200 rounded-lg mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* DATA ROWS */}
                {!isLoading &&
                  metadataList.length > 0 &&
                  metadataList.map((item, index) => {
                    const rowNumber = (pagination.current_page - 1) * pagination.per_page + (index + 1);
                    return (
                      <tr
                        key={item.id}
                        data-testid={`row-metadata-${item.id}`}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Nomor */}
                        <td className="px-3.5 py-3.5 text-center text-slate-400 font-mono text-[11px] shrink-0">
                          {rowNumber}
                        </td>

                        {/* 2. Nama Dataset */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 group-hover:text-[#194337] transition-colors leading-snug line-clamp-2">
                            {item.dataset_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.dataset_code}
                            </span>
                            {item.observation_year && (
                              <span className="text-[10px] text-slate-400">
                                • {item.observation_year}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Kategori */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${getCategoryBadgeClass(
                              item.source_category
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            <span>{item.kategori_label || item.source_category}</span>
                          </span>
                        </td>

                        {/* 4. Deskripsi Dataset */}
                        <td className="px-4 py-3.5 text-slate-600">
                          <p
                            className="line-clamp-2 leading-relaxed text-xs text-slate-600"
                            title={item.description || 'Tidak ada deskripsi rinci.'}
                          >
                            {item.description || '-'}
                          </p>
                        </td>

                        {/* 5. Sumber Data */}
                        <td className="px-4 py-3.5 text-slate-700">
                          <div
                            className="font-medium line-clamp-2 leading-relaxed text-xs"
                            title={item.source_name}
                          >
                            {item.source_name || '-'}
                          </div>
                          {item.reference_source && (
                            <div
                              className="text-[11px] text-slate-500 line-clamp-1 mt-0.5"
                              title={item.reference_source}
                            >
                              Ref: {item.reference_source}
                            </div>
                          )}
                        </td>

                        {/* 6. Cakupan Wilayah */}
                        <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs truncate max-w-[150px]" title={item.spatial_unit}>
                              {item.spatial_unit || 'Kabupaten Banyumas'}
                            </span>
                          </div>
                        </td>

                        {/* 7. Frekuensi Pembaruan */}
                        <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs truncate max-w-[150px]" title={item.granularity}>
                              {item.granularity || 'Sesuai Ketersediaan'}
                            </span>
                          </div>
                        </td>

                        {/* 8. Tanggal Pembaruan Terakhir */}
                        <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-medium">
                              {item.update_date_formatted || '-'}
                            </span>
                          </div>
                        </td>

                        {/* 9. Aksi: Detail & Edit (System Feature 29 & 30) */}
                        <td className="px-4 py-3.5 text-center shrink-0 sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Detail */}
                            <button
                              type="button"
                              data-testid={`btn-detail-metadata-${item.id}`}
                              onClick={() => handleOpenDetailModal(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
                              title="Lihat Rincian Metadata"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            {/* Tombol Edit Metadata (System Feature 30) */}
                            <button
                              type="button"
                              data-testid={`btn-edit-metadata-${item.id}`}
                              onClick={() => handleOpenEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-[#194337] border border-emerald-200 hover:border-transparent transition-all cursor-pointer shadow-2xs"
                              title="Edit Metadata"
                            >
                              <SquarePen className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Tombol Hapus Metadata (System Feature 32) */}
                            <button
                              type="button"
                              data-testid={`btn-delete-metadata-${item.id}`}
                              onClick={() => handleOpenDeleteModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-transparent transition-all cursor-pointer shadow-2xs"
                              title="Hapus Metadata"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {/* EMPTY STATE PENCARIAN ATAU DATA KOSONG */}
                {!isLoading && metadataList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div
                        data-testid="state-empty-metadata"
                        className="max-w-md mx-auto space-y-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">
                            {debouncedSearch || selectedCategory !== 'all'
                              ? 'Tidak Ditemukan Metadata'
                              : 'Belum Ada Metadata Dataset'}
                          </div>
                          <p className="text-xs text-slate-500">
                            {debouncedSearch || selectedCategory !== 'all'
                              ? 'Tidak ditemukan metadata dataset yang sesuai dengan kata kunci pencarian.'
                              : 'Katalog metadata dataset belum tersedia dalam sistem.'}
                          </p>
                        </div>
                        {(debouncedSearch || selectedCategory !== 'all') && (
                          <button
                            type="button"
                            data-testid="btn-reset-search"
                            onClick={handleResetSearch}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reset Pencarian</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================================== */}
          {/* PAGINATION BAR                                                      */}
          {/* =================================================================== */}
          {!isLoading && pagination.total > 0 && (
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan{' '}
                <span className="font-semibold text-slate-800">
                  {pagination.from || 1}
                </span>{' '}
                sampai{' '}
                <span className="font-semibold text-slate-800">
                  {pagination.to || metadataList.length}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-800">
                  {pagination.total}
                </span>{' '}
                dataset
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="btn-prev-page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <div className="px-2 font-medium text-slate-700 text-xs">
                  Halaman {pagination.current_page} dari {pagination.last_page || 1}
                </div>

                <button
                  type="button"
                  data-testid="btn-next-page"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={pagination.current_page >= pagination.last_page}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-2xs"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. MODAL DETAIL METADATA DATASET (SF29)                             */}
      {/* =================================================================== */}
      {isDetailModalOpen && selectedMetadata && (
        <div
          data-testid="modal-detail-metadata"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#194337] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    data-testid="modal-detail-metadata-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Detail Informasi Metadata Dataset
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Spesifikasi tata kelola data epidemiologi spasial WebGIS DBD Banyumas
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-detail-modal"
                onClick={handleCloseDetailModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {isLoadingDetail && (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#194337] mx-auto" />
                  <p className="text-slate-500 font-medium">Memuat rincian lengkap...</p>
                </div>
              )}

              {detailError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  {detailError}
                </div>
              )}

              {/* Title & Category Badge */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                    {selectedMetadata.dataset_code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${getCategoryBadgeClass(
                      selectedMetadata.source_category
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    <span>
                      {selectedMetadata.kategori_label || selectedMetadata.source_category}
                    </span>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {selectedMetadata.dataset_name}
                </h3>
              </div>

              {/* Grid 2 Kolom Spesifikasi Teknis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sumber Data Primer */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sumber Data Primer</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {selectedMetadata.source_name || '-'}
                  </div>
                </div>

                {/* Referensi / Rujukan */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dokumen Referensi / Pembanding</span>
                  </div>
                  <div className="text-xs text-slate-800">
                    {selectedMetadata.reference_source || '-'}
                  </div>
                </div>

                {/* Cakupan Wilayah */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cakupan Wilayah</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {selectedMetadata.spatial_unit || 'Kabupaten Banyumas'}
                  </div>
                </div>

                {/* Frekuensi Pembaruan */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Frekuensi Pembaruan</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {selectedMetadata.granularity || 'Sesuai Ketersediaan'}
                  </div>
                </div>

                {/* Tanggal Pembaruan Terakhir */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tanggal Pembaruan Terakhir</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {selectedMetadata.update_date_formatted || '-'}
                  </div>
                </div>

                {/* Rentang Periode Pengamatan */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rentang Waktu Observasi</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {selectedMetadata.period_range ||
                      (selectedMetadata.observation_year
                        ? `Tahun ${selectedMetadata.observation_year}`
                        : 'Lintas Periode')}
                  </div>
                </div>

                {/* Satuan Indikator */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Indikator / Satuan Pengukuran</span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium">
                    {selectedMetadata.indicator || '-'}
                  </div>
                </div>

                {/* Status Publikasi */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Status Publikasi</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {selectedMetadata.publication_status || '-'}
                  </div>
                </div>
              </div>

              {/* Status Validasi & Keterbatasan */}
              {selectedMetadata.validation_status && (
                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-1">
                  <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    <span>Catatan Validasi & Keterbatasan Data</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {selectedMetadata.validation_status}
                  </p>
                </div>
              )}

              {/* Deskripsi Lengkap */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Deskripsi Lengkap Dataset
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedMetadata.description || 'Tidak ada deskripsi rinci untuk dataset ini.'}
                </p>
              </div>

              {/* Relasi Periode WebGIS (jika terhubung) */}
              {selectedMetadata.periode && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">
                      Terhubung dengan Periode WebGIS
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {selectedMetadata.periode.nama_periode} (Tahun {selectedMetadata.periode.tahun})
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                    Terintegrasi
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end shrink-0">
              <button
                type="button"
                data-testid="btn-close-detail-footer"
                onClick={handleCloseDetailModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. MODAL FORMULIR UBAH INFORMASI METADATA (SF30)                    */}
      {/* =================================================================== */}
      {isEditModalOpen && editingMetadata && (
        <div
          data-testid="modal-edit-metadata"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header Formulir */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#194337] flex items-center justify-center shrink-0">
                  <SquarePen className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    data-testid="modal-edit-metadata-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Ubah Informasi Metadata
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Perbarui 9 atribut spesifikasi metadata dataset pada rekaman terdaftar (Kode: {editingMetadata.dataset_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-edit-modal"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Batal dan Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Formulir */}
            <form onSubmit={handleSubmitEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Pesan Kesalahan Global (jika ada) */}
              {editGeneralError && (
                <div
                  data-testid="alert-edit-metadata-error"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Kesalahan Validasi: </span>
                    <span>{editGeneralError}</span>
                  </div>
                </div>
              )}

              {/* GRUP 1: INFORMASI DASAR DATASET */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <Database className="w-4 h-4 text-[#194337]" />
                  <span>1. Informasi Dasar Dataset</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Dataset */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="input-edit-dataset-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nama Dataset <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-edit-dataset-name"
                      data-testid="input-edit-dataset-name"
                      value={editFormData.dataset_name}
                      onChange={(e) => handleEditInputChange('dataset_name', e.target.value)}
                      placeholder="Masukkan nama resmi dataset..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.dataset_name
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {editFormErrors.dataset_name && (
                      <p
                        data-testid="error-edit-dataset-name"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.dataset_name)
                          ? editFormErrors.dataset_name[0]
                          : editFormErrors.dataset_name}
                      </p>
                    )}
                  </div>

                  {/* Kategori Data */}
                  <div className="space-y-1">
                    <label
                      htmlFor="select-edit-category"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Kategori Data <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-edit-category"
                      data-testid="select-edit-category"
                      value={editFormData.source_category}
                      onChange={(e) => handleEditInputChange('source_category', e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.source_category
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent bg-white text-slate-800 font-medium`}
                    >
                      <option value="published">Resmi Dipublikasikan</option>
                      <option value="published_simulation">Simulasi Pengembangan</option>
                      <option value="reference">Referensi & Geospasial</option>
                      <option value="internal_restricted">Internal Terbatas</option>
                    </select>
                    {editFormErrors.source_category && (
                      <p
                        data-testid="error-edit-category"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.source_category)
                          ? editFormErrors.source_category[0]
                          : editFormErrors.source_category}
                      </p>
                    )}
                  </div>

                  {/* Satuan Pengukuran */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-indicator"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Satuan Pengukuran / Indikator
                    </label>
                    <input
                      type="text"
                      id="input-edit-indicator"
                      data-testid="input-edit-indicator"
                      value={editFormData.indicator}
                      onChange={(e) => handleEditInputChange('indicator', e.target.value)}
                      placeholder="Contoh: Kasus, Jiwa, IR per 100.000 Penduduk"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">
                      Indikator epidemiologi atau unit hitung data
                    </span>
                  </div>

                  {/* Deskripsi Dataset */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="textarea-edit-description"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Deskripsi Dataset <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="textarea-edit-description"
                      data-testid="textarea-edit-description"
                      rows={3}
                      value={editFormData.description}
                      onChange={(e) => handleEditInputChange('description', e.target.value)}
                      placeholder="Tuliskan deskripsi lengkap mengenai cakupan, konteks epidemiologi, dan karakteristik dataset..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.description
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800 leading-relaxed`}
                    />
                    {editFormErrors.description && (
                      <p
                        data-testid="error-edit-description"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.description)
                          ? editFormErrors.description[0]
                          : editFormErrors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* GRUP 2: INFORMASI SUMBER DAN CAKUPAN */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <MapPin className="w-4 h-4 text-[#194337]" />
                  <span>2. Informasi Sumber dan Cakupan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sumber Data Primer */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-source-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Sumber Data Primer <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-edit-source-name"
                      data-testid="input-edit-source-name"
                      value={editFormData.source_name}
                      onChange={(e) => handleEditInputChange('source_name', e.target.value)}
                      placeholder="Nama dokumen/workbook sumber primer..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.source_name
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {editFormErrors.source_name && (
                      <p
                        data-testid="error-edit-source-name"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.source_name)
                          ? editFormErrors.source_name[0]
                          : editFormErrors.source_name}
                      </p>
                    )}
                  </div>

                  {/* Dokumen Referensi / Rujukan */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-reference-source"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Dokumen Referensi / Pembanding Silang
                    </label>
                    <input
                      type="text"
                      id="input-edit-reference-source"
                      data-testid="input-edit-reference-source"
                      value={editFormData.reference_source}
                      onChange={(e) => handleEditInputChange('reference_source', e.target.value)}
                      placeholder="Contoh: Profil Kesehatan Kab. Banyumas 2022..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                  </div>

                  {/* Cakupan Wilayah */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-spatial-unit"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Cakupan Wilayah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-edit-spatial-unit"
                      data-testid="input-edit-spatial-unit"
                      value={editFormData.spatial_unit}
                      onChange={(e) => handleEditInputChange('spatial_unit', e.target.value)}
                      placeholder="Contoh: 27 Kecamatan Kabupaten Banyumas"
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.spatial_unit
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {editFormErrors.spatial_unit && (
                      <p
                        data-testid="error-edit-spatial-unit"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.spatial_unit)
                          ? editFormErrors.spatial_unit[0]
                          : editFormErrors.spatial_unit}
                      </p>
                    )}
                  </div>

                  {/* Tahun Observasi */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-observation-year"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tahun Observasi
                    </label>
                    <input
                      type="number"
                      id="input-edit-observation-year"
                      data-testid="input-edit-observation-year"
                      value={editFormData.observation_year}
                      onChange={(e) => handleEditInputChange('observation_year', e.target.value)}
                      placeholder="Contoh: 2022"
                      min="2000"
                      max="2100"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 font-mono"
                    />
                  </div>

                  {/* Rentang Periode: Tanggal Awal & Tanggal Akhir */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-period-start"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tanggal Mulai Observasi
                    </label>
                    <input
                      type="date"
                      id="input-edit-period-start"
                      data-testid="input-edit-period-start"
                      value={editFormData.period_start}
                      onChange={(e) => handleEditInputChange('period_start', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-period-end"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tanggal Akhir Observasi
                    </label>
                    <input
                      type="date"
                      id="input-edit-period-end"
                      data-testid="input-edit-period-end"
                      value={editFormData.period_end}
                      onChange={(e) => handleEditInputChange('period_end', e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.period_end
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800 font-mono`}
                    />
                    {editFormErrors.period_end && (
                      <p
                        data-testid="error-edit-period-end"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.period_end)
                          ? editFormErrors.period_end[0]
                          : editFormErrors.period_end}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* GRUP 3: INFORMASI PEMBARUAN DAN KETERBATASAN */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <Clock className="w-4 h-4 text-[#194337]" />
                  <span>3. Informasi Pembaruan dan Keterbatasan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Frekuensi Pembaruan */}
                  <div className="space-y-1">
                    <label
                      htmlFor="select-edit-granularity"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Frekuensi Pembaruan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="select-edit-granularity"
                      data-testid="input-edit-granularity"
                      list="granularity-options"
                      value={editFormData.granularity}
                      onChange={(e) => handleEditInputChange('granularity', e.target.value)}
                      placeholder="Pilih atau ketik frekuensi..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${editFormErrors.granularity
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    <datalist id="granularity-options">
                      <option value="Harian" />
                      <option value="Mingguan" />
                      <option value="Bulanan" />
                      <option value="Bulanan Parsial (Januari, Februari, Maret 2026 • 3 dari 12 Bulan)" />
                      <option value="Triwulanan" />
                      <option value="Semesteran" />
                      <option value="Tahunan (1 Tahun Penuh / 12 Bulan)" />
                      <option value="Tahunan" />
                      <option value="Batas Administrasi Kecamatan" />
                      <option value="Sesuai Ketersediaan" />
                    </datalist>
                    {editFormErrors.granularity && (
                      <p
                        data-testid="error-edit-granularity"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(editFormErrors.granularity)
                          ? editFormErrors.granularity[0]
                          : editFormErrors.granularity}
                      </p>
                    )}
                  </div>

                  {/* Status Publikasi */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-edit-publication-status"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Status Publikasi
                    </label>
                    <input
                      type="text"
                      id="input-edit-publication-status"
                      data-testid="input-edit-publication-status"
                      value={editFormData.publication_status}
                      onChange={(e) => handleEditInputChange('publication_status', e.target.value)}
                      placeholder="Contoh: Resmi Dipublikasikan"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                  </div>

                  {/* Catatan Keterbatasan Data */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="textarea-edit-validation-status"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Catatan Keterbatasan Data & Validasi
                    </label>
                    <textarea
                      id="textarea-edit-validation-status"
                      data-testid="textarea-edit-validation-status"
                      rows={2}
                      value={editFormData.validation_status}
                      onChange={(e) => handleEditInputChange('validation_status', e.target.value)}
                      placeholder="Catatan verifikasi silang, batasan izin publikasi, atau catatan metodologis khusus..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 leading-relaxed"
                    />
                    <span className="text-[10px] text-slate-400">
                      Opsional. Menjelaskan batasan atau keabsahan silang data sumber.
                    </span>
                  </div>
                </div>
              </div>

              {/* LIVE PREVIEW PERUBAHAN METADATA */}
              <div
                data-testid="card-preview-edit-metadata"
                className="bg-white rounded-xl border border-emerald-200 p-4 sm:p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Live Preview Perubahan Metadata</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    Pratinjau Sebelum Disimpan
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {editingMetadata.dataset_code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${getCategoryBadgeClass(
                        editFormData.source_category
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      <span>{getCategoryLabel(editFormData.source_category)}</span>
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">
                    {editFormData.dataset_name || '(Nama dataset belum diisi)'}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {editFormData.description || '(Belum ada deskripsi yang dimasukkan)'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sumber:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {editFormData.source_name || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cakupan:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {editFormData.spatial_unit || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Frekuensi:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {editFormData.granularity || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Satuan/Indikator:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {editFormData.indicator || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Aksi Formulir */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                data-testid="btn-cancel-edit-metadata"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                data-testid="btn-save-edit-metadata"
                onClick={handleSubmitEdit}
                disabled={isSubmittingEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#194337] hover:bg-[#123027] text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. MODAL FORMULIR TAMBAH METADATA BARU (SYSTEM FEATURE 31)          */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          data-testid="modal-create-metadata"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header Formulir */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#194337] flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    data-testid="modal-create-metadata-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Tambah Definisi Metadata Baru
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Daftarkan definisi metadata dataset baru ke dalam katalog sistem WebGIS DBD Kabupaten Banyumas
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-create-modal"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Batal dan Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Formulir */}
            <form onSubmit={handleSubmitCreate} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Pesan Kesalahan Global (jika ada) */}
              {createGeneralError && (
                <div
                  data-testid="alert-create-metadata-error"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Kesalahan Validasi: </span>
                    <span>{createGeneralError}</span>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* BAGIAN 1 — INFORMASI DASAR DATASET                            */}
              {/* ============================================================= */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <Database className="w-4 h-4 text-[#194337]" />
                  <span>Bagian 1 — Informasi Dasar Dataset</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Dataset */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="input-create-dataset-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nama Dataset <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-create-dataset-name"
                      data-testid="input-create-dataset-name"
                      value={createFormData.dataset_name}
                      onChange={(e) => handleCreateInputChange('dataset_name', e.target.value)}
                      placeholder="Masukkan nama dataset..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.dataset_name
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {createFormErrors.dataset_name && (
                      <p
                        data-testid="error-create-dataset-name"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.dataset_name)
                          ? createFormErrors.dataset_name[0]
                          : createFormErrors.dataset_name}
                      </p>
                    )}
                  </div>

                  {/* Kategori Data */}
                  <div className="space-y-1">
                    <label
                      htmlFor="select-create-category"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Kategori Data <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-create-category"
                      data-testid="select-create-category"
                      value={createFormData.source_category}
                      onChange={(e) => handleCreateInputChange('source_category', e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.source_category
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent bg-white text-slate-800 font-medium`}
                    >
                      <option value="published">Resmi Dipublikasikan</option>
                      <option value="published_simulation">Simulasi Pengembangan</option>
                      <option value="reference">Referensi & Geospasial</option>
                      <option value="internal_restricted">Internal Terbatas</option>
                    </select>
                    {createFormErrors.source_category && (
                      <p
                        data-testid="error-create-category"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.source_category)
                          ? createFormErrors.source_category[0]
                          : createFormErrors.source_category}
                      </p>
                    )}
                  </div>

                  {/* Satuan Pengukuran */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-indicator"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Satuan Pengukuran / Indikator
                    </label>
                    <input
                      type="text"
                      id="input-create-indicator"
                      data-testid="input-create-indicator"
                      value={createFormData.indicator}
                      onChange={(e) => handleCreateInputChange('indicator', e.target.value)}
                      placeholder="Contoh: Kasus, Jiwa, Orang, IR per 100k"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">
                      Indikator epidemiologi atau unit hitung data
                    </span>
                  </div>

                  {/* Deskripsi Dataset */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="textarea-create-description"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Deskripsi Dataset <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="textarea-create-description"
                      data-testid="textarea-create-description"
                      rows={3}
                      value={createFormData.description}
                      onChange={(e) => handleCreateInputChange('description', e.target.value)}
                      placeholder="Tuliskan tujuan dan penjelasan rinci mengenai dataset..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.description
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800 leading-relaxed`}
                    />
                    {createFormErrors.description && (
                      <p
                        data-testid="error-create-description"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.description)
                          ? createFormErrors.description[0]
                          : createFormErrors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* BAGIAN 2 — INFORMASI SUMBER DAN CAKUPAN                        */}
              {/* ============================================================= */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <MapPin className="w-4 h-4 text-[#194337]" />
                  <span>Bagian 2 — Informasi Sumber dan Cakupan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sumber Data Primer */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-source-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Sumber Data Primer <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-create-source-name"
                      data-testid="input-create-source-name"
                      value={createFormData.source_name}
                      onChange={(e) => handleCreateInputChange('source_name', e.target.value)}
                      placeholder="Instansi atau dokumen penyedia dataset..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.source_name
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {createFormErrors.source_name && (
                      <p
                        data-testid="error-create-source-name"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.source_name)
                          ? createFormErrors.source_name[0]
                          : createFormErrors.source_name}
                      </p>
                    )}
                  </div>

                  {/* Dokumen Referensi / Rujukan */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-reference-source"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Dokumen Referensi / Pembanding Silang
                    </label>
                    <input
                      type="text"
                      id="input-create-reference-source"
                      data-testid="input-create-reference-source"
                      value={createFormData.reference_source}
                      onChange={(e) => handleCreateInputChange('reference_source', e.target.value)}
                      placeholder="Contoh: Dokumen Profil Kesehatan Banyumas..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                  </div>

                  {/* Cakupan Wilayah */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-spatial-unit"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Cakupan Wilayah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-create-spatial-unit"
                      data-testid="input-create-spatial-unit"
                      value={createFormData.spatial_unit}
                      onChange={(e) => handleCreateInputChange('spatial_unit', e.target.value)}
                      placeholder="Contoh: 27 Kecamatan Kabupaten Banyumas"
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.spatial_unit
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    {createFormErrors.spatial_unit && (
                      <p
                        data-testid="error-create-spatial-unit"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.spatial_unit)
                          ? createFormErrors.spatial_unit[0]
                          : createFormErrors.spatial_unit}
                      </p>
                    )}
                  </div>

                  {/* Tahun Observasi */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-observation-year"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tahun Observasi
                    </label>
                    <input
                      type="number"
                      id="input-create-observation-year"
                      data-testid="input-create-observation-year"
                      value={createFormData.observation_year}
                      onChange={(e) => handleCreateInputChange('observation_year', e.target.value)}
                      placeholder="Contoh: 2026"
                      min="2000"
                      max="2100"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 font-mono"
                    />
                  </div>

                  {/* Rentang Periode: Tanggal Awal & Tanggal Akhir */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-period-start"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tanggal Mulai Observasi
                    </label>
                    <input
                      type="date"
                      id="input-create-period-start"
                      data-testid="input-create-period-start"
                      value={createFormData.period_start}
                      onChange={(e) => handleCreateInputChange('period_start', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-period-end"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tanggal Akhir Observasi
                    </label>
                    <input
                      type="date"
                      id="input-create-period-end"
                      data-testid="input-create-period-end"
                      value={createFormData.period_end}
                      onChange={(e) => handleCreateInputChange('period_end', e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.period_end
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800 font-mono`}
                    />
                    {createFormErrors.period_end && (
                      <p
                        data-testid="error-create-period-end"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.period_end)
                          ? createFormErrors.period_end[0]
                          : createFormErrors.period_end}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* BAGIAN 3 — INFORMASI PEMBARUAN DAN KETERBATASAN               */}
              {/* ============================================================= */}
              <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <Clock className="w-4 h-4 text-[#194337]" />
                  <span>Bagian 3 — Informasi Pembaruan dan Keterbatasan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Frekuensi Pembaruan */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-granularity"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Frekuensi Pembaruan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-create-granularity"
                      data-testid="input-create-granularity"
                      list="create-granularity-options"
                      value={createFormData.granularity}
                      onChange={(e) => handleCreateInputChange('granularity', e.target.value)}
                      placeholder="Pilih atau ketik frekuensi..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${createFormErrors.granularity
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-[#194337]'
                        } focus:outline-none focus:ring-2 focus:border-transparent text-slate-800`}
                    />
                    <datalist id="create-granularity-options">
                      <option value="Harian" />
                      <option value="Mingguan" />
                      <option value="Bulanan" />
                      <option value="Bulanan Parsial" />
                      <option value="Triwulanan" />
                      <option value="Semesteran" />
                      <option value="Tahunan" />
                      <option value="Sesuai Ketersediaan" />
                    </datalist>
                    {createFormErrors.granularity && (
                      <p
                        data-testid="error-create-granularity"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {Array.isArray(createFormErrors.granularity)
                          ? createFormErrors.granularity[0]
                          : createFormErrors.granularity}
                      </p>
                    )}
                  </div>

                  {/* Status Publikasi */}
                  <div className="space-y-1">
                    <label
                      htmlFor="input-create-publication-status"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Status Publikasi
                    </label>
                    <input
                      type="text"
                      id="input-create-publication-status"
                      data-testid="input-create-publication-status"
                      value={createFormData.publication_status}
                      onChange={(e) => handleCreateInputChange('publication_status', e.target.value)}
                      placeholder="Contoh: Resmi Dipublikasikan"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800"
                    />
                  </div>

                  {/* Catatan Keterbatasan Data */}
                  <div className="md:col-span-2 space-y-1">
                    <label
                      htmlFor="textarea-create-validation-status"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Catatan Keterbatasan Data
                    </label>
                    <textarea
                      id="textarea-create-validation-status"
                      data-testid="textarea-create-validation-status"
                      rows={2}
                      value={createFormData.validation_status}
                      onChange={(e) => handleCreateInputChange('validation_status', e.target.value)}
                      placeholder="Jelaskan keterbatasan cakupan wilayah, kelengkapan data, atau rentang waktu observasi..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#194337] focus:border-transparent text-slate-800 leading-relaxed"
                    />
                    <span className="text-[10px] text-slate-400">
                      Opsional. Dokumentasikan keterbatasan atau metodologi khusus dataset.
                    </span>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* LIVE PREVIEW METADATA (SF31)                                  */}
              {/* ============================================================= */}
              <div
                data-testid="card-preview-create-metadata"
                className="bg-white rounded-xl border border-emerald-200 p-4 sm:p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Live Preview Metadata Baru</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    Pratinjau Sebelum Disimpan
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Kode Otomatis Sistem
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${getCategoryBadgeClass(
                        createFormData.source_category
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      <span>{getCategoryLabel(createFormData.source_category)}</span>
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">
                    {createFormData.dataset_name || '(Nama dataset belum diisi)'}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {createFormData.description || '(Belum ada deskripsi yang dimasukkan)'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sumber:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {createFormData.source_name || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cakupan:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {createFormData.spatial_unit || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Frekuensi:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {createFormData.granularity || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Satuan/Indikator:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {createFormData.indicator || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Aksi Formulir */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              {/* Tombol Batal */}
              <button
                type="button"
                data-testid="btn-cancel-create-metadata"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              {/* Tombol Simpan */}
              <button
                type="button"
                data-testid="btn-submit-create-metadata"
                onClick={handleSubmitCreate}
                disabled={isSubmittingCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#194337] hover:bg-[#123027] text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isSubmittingCreate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL KONFIRMASI HAPUS METADATA (SF32) */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingMetadata && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-metadata-title"
          data-testid="modal-delete-metadata"
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
                    id="modal-delete-metadata-title"
                    data-testid="modal-delete-metadata-title"
                    className="text-base font-bold text-rose-950 tracking-tight"
                  >
                    Hapus Metadata Dataset
                  </h2>
                  <p className="text-xs text-rose-700/80">
                    Konfirmasi tindakan penghapusan informasi metadata dataset dari sistem WebGIS
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-delete-modal"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-900 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
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
                  data-testid="alert-delete-metadata-error"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-bold text-rose-900">Gagal Menghapus Metadata</p>
                    <p className="mt-0.5 leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              {/* Confirmation Prompt */}
              <p className="text-slate-700 text-xs leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus metadata dataset ini? Informasi metadata yang dipilih akan dihapus dari sistem WebGIS.
              </p>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Peringatan:</strong> Tindakan ini perlu dipastikan kembali sebelum dilanjutkan.
                </p>
              </div>

              {/* Selected Metadata Info Card */}
              <div className="rounded-xl border border-slate-200 bg-[#fbfbfa] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">ID / Kode Dataset:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{deletingMetadata.id} • {deletingMetadata.dataset_code || '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between pb-2 border-b border-slate-100 gap-2">
                  <span className="text-slate-500 font-medium shrink-0">Nama Dataset:</span>
                  <span className="font-bold text-slate-900 text-right">{deletingMetadata.dataset_name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Kategori:</span>
                  <span className="font-semibold text-slate-800">
                    {deletingMetadata.kategori_label || deletingMetadata.source_category}
                  </span>
                </div>
                {deletingMetadata.source_name && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Sumber Data:</span>
                    <span className="text-slate-800 font-medium text-right truncate max-w-[240px]">
                      {deletingMetadata.source_name}
                    </span>
                  </div>
                )}
                {deletingMetadata.spatial_unit && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Cakupan Wilayah:</span>
                    <span className="text-slate-800 font-medium">{deletingMetadata.spatial_unit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              {/* Tombol Batal */}
              <button
                type="button"
                data-testid="btn-cancel-delete-metadata"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              {/* Tombol Hapus */}
              <button
                type="button"
                data-testid="btn-confirm-delete-metadata"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
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
