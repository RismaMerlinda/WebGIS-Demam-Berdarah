import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  MapPin,
  MapPinned,
  Search,
  RefreshCw,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  Info,
  TrendingUp,
  Maximize2,
  Calendar,
  Users,
  Plus,
  UploadCloud,
  FileCode,
  Trash2,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

/**
 * Helper component to auto-fit mini-map bounds around the district polygon geometry.
 */
function MiniMapBoundsFitter({ geometry }) {
  const map = useMap();

  useEffect(() => {
    if (map && geometry) {
      try {
        const geoLayer = L.geoJSON(geometry);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
        }
      } catch (err) {
        console.warn('MiniMap fitBounds error:', err);
      }
    }
  }, [map, geometry]);

  return null;
}

export default function AdminRegionManagementPage() {
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [regionsList, setRegionsList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [summaryStats, setSummaryStats] = useState({
    total_regions: 0,
    regions_with_geometry: 0,
    regions_without_geometry: 0,
    total_cases_all_regions: 0,
  });
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailRegionId, setDetailRegionId] = useState(null);
  const [detailRegionData, setDetailRegionData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // System Feature 22: Create Region States
  const initialCreateForm = {
    nama: '',
    kode: '',
    luas_wilayah: '',
    jumlah_penduduk: '',
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialCreateForm);
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createFormGeneralError, setCreateFormGeneralError] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [selectedGeoJsonFile, setSelectedGeoJsonFile] = useState(null);
  const [parsedGeometryPreview, setParsedGeometryPreview] = useState(null);
  const [geoJsonPreviewError, setGeoJsonPreviewError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fileInputRef = useRef(null);

  // =========================================================================
  // System Feature 23: Edit Region States
  // =========================================================================
  const initialEditForm = {
    nama: '',
    kode: '',
    luas_wilayah: '',
    jumlah_penduduk: '',
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [editFormData, setEditFormData] = useState(initialEditForm);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormGeneralError, setEditFormGeneralError] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editSelectedGeoJsonFile, setEditSelectedGeoJsonFile] = useState(null);
  const [editParsedGeometryPreview, setEditParsedGeometryPreview] = useState(null);
  const [editGeoJsonPreviewError, setEditGeoJsonPreviewError] = useState(null);
  const [editExistingGeometry, setEditExistingGeometry] = useState(null);
  const [isLoadingEditGeometry, setIsLoadingEditGeometry] = useState(false);

  const editFileInputRef = useRef(null);

  // =========================================================================
  // System Feature 24: Delete Region States
  // =========================================================================
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRegion, setDeletingRegion] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);

  // Fetch regions from API
  const fetchRegions = useCallback(async (page = 1, search = '') => {
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

      const res = await axios.get('/api/admin/regions', { params });

      if (res.data?.success) {
        setRegionsList(res.data.regions || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.summary) {
          setSummaryStats(res.data.summary);
        }
      } else {
        throw new Error(res.data?.message || 'Gagal memuat data wilayah kecamatan.');
      }
    } catch (err) {
      console.error('Error fetching regions:', err);
      const errMsg =
        err.response?.data?.message ||
        'Terjadi kendala saat memuat data wilayah kecamatan dari basis data MySQL.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger fetch when page or activeSearch changes
  useEffect(() => {
    fetchRegions(currentPage, activeSearch);
  }, [fetchRegions, currentPage, activeSearch]);

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

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  // Refresh current data
  const handleRefresh = () => {
    fetchRegions(currentPage, activeSearch);
  };

  // Detail Modal Handlers
  const handleOpenDetailModal = async (regionId) => {
    setDetailRegionId(regionId);
    setDetailRegionData(null);
    setDetailError(null);
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);

    try {
      const res = await axios.get(`/api/admin/regions/${regionId}`);
      if (res.data?.success && res.data.region) {
        setDetailRegionData(res.data.region);
      } else {
        throw new Error(res.data?.message || 'Gagal memuat rincian wilayah kecamatan.');
      }
    } catch (err) {
      console.error('Error loading region detail:', err);
      setDetailError(
        err.response?.data?.message ||
        'Terjadi kendala saat mengambil rincian data wilayah kecamatan.'
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailRegionId(null);
    setDetailRegionData(null);
    setDetailError(null);
  };

  // =========================================================================
  // SYSTEM FEATURE 22: CREATE REGION HANDLERS
  // =========================================================================

  const handleOpenCreateModal = () => {
    setCreateFormData(initialCreateForm);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);
    setSelectedGeoJsonFile(null);
    setParsedGeometryPreview(null);
    setGeoJsonPreviewError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isSubmittingCreate) return;
    setIsCreateModalOpen(false);
    setCreateFormData(initialCreateForm);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);
    setSelectedGeoJsonFile(null);
    setParsedGeometryPreview(null);
    setGeoJsonPreviewError(null);
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    if (createFormErrors[name]) {
      setCreateFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle GeoJSON File Selection & Client-Side Geometry Preview
  const handleGeoJsonFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateFormErrors((prev) => ({ ...prev, geojson_file: null }));
    setGeoJsonPreviewError(null);
    setParsedGeometryPreview(null);

    // Validasi ukuran berkas (Maks 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setGeoJsonPreviewError('Ukuran berkas GeoJSON melebihi batas maksimal 5 MB.');
      setSelectedGeoJsonFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['geojson', 'json'].includes(ext)) {
      setGeoJsonPreviewError('Format berkas tidak didukung. Harap pilih berkas .geojson atau .json.');
      setSelectedGeoJsonFile(null);
      return;
    }

    setSelectedGeoJsonFile(file);

    // Baca dan parse isi file untuk preview geometri pada peta mini
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        let geom = null;
        if (json.type === 'FeatureCollection' && Array.isArray(json.features) && json.features.length > 0) {
          geom = json.features[0].geometry;
        } else if (json.type === 'Feature' && json.geometry) {
          geom = json.geometry;
        } else if (['Polygon', 'MultiPolygon'].includes(json.type) && json.coordinates) {
          geom = json;
        }

        if (!geom || !geom.type || !geom.coordinates || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
          setGeoJsonPreviewError('Struktur berkas GeoJSON tidak memuat koordinat spasial polygon yang valid.');
          setParsedGeometryPreview(null);
          return;
        }

        setParsedGeometryPreview(geom);
        setGeoJsonPreviewError(null);
      } catch (err) {
        setGeoJsonPreviewError('Gagal membaca berkas GeoJSON. Pastikan berkas berformat JSON yang valid.');
        setParsedGeometryPreview(null);
      }
    };
    reader.onerror = () => {
      setGeoJsonPreviewError('Terjadi kesalahan saat membaca isi berkas.');
      setParsedGeometryPreview(null);
    };
    reader.readAsText(file);
  };

  const handleRemoveGeoJsonFile = () => {
    setSelectedGeoJsonFile(null);
    setParsedGeometryPreview(null);
    setGeoJsonPreviewError(null);
    setCreateFormErrors((prev) => ({ ...prev, geojson_file: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Create Region Form
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateFormErrors({});
    setCreateFormGeneralError(null);

    // Validasi Sisi Klien
    const errors = {};
    if (!createFormData.nama.trim()) {
      errors.nama = 'Nama kecamatan wajib diisi.';
    }
    if (!createFormData.kode.trim()) {
      errors.kode = 'Kode wilayah kecamatan wajib diisi.';
    }

    if (geoJsonPreviewError) {
      errors.geojson_file = geoJsonPreviewError;
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    setIsSubmittingCreate(true);

    try {
      const formData = new FormData();
      formData.append('nama', createFormData.nama.trim());
      formData.append('kode', createFormData.kode.trim());
      if (createFormData.luas_wilayah) {
        formData.append('luas_wilayah', createFormData.luas_wilayah);
      }
      if (createFormData.jumlah_penduduk) {
        formData.append('jumlah_penduduk', createFormData.jumlah_penduduk);
      }
      if (selectedGeoJsonFile) {
        formData.append('geojson_file', selectedGeoJsonFile);
      }

      const res = await axios.post('/api/admin/regions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setCreateFormData(initialCreateForm);
        setSelectedGeoJsonFile(null);
        setParsedGeometryPreview(null);
        setGeoJsonPreviewError(null);

        setSuccessToast({
          title: 'Wilayah Berhasil Ditambahkan!',
          message: res.data.message || 'Data wilayah kecamatan berhasil ditambahkan.',
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Reset ke halaman pertama dan perbarui daftar serta metrik
        setCurrentPage(1);
        fetchRegions(1, activeSearch);
      } else {
        throw new Error(res.data?.message || 'Gagal menambahkan data wilayah kecamatan.');
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
          err.response.data?.message || 'Validasi formulir gagal. Silakan periksa kembali data yang dimasukkan.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/regions' } } });
      } else if (err.response?.status === 403) {
        setCreateFormGeneralError('Akses ditolak. Anda tidak memiliki izin untuk menambahkan data wilayah.');
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
  // SYSTEM FEATURE 23: EDIT REGION HANDLERS
  // =========================================================================

  const handleOpenEditModal = async (region) => {
    setEditingRegion(region);
    setEditFormData({
      nama: region.nama || '',
      kode: region.kode || '',
      luas_wilayah:
        region.luas_wilayah !== null && region.luas_wilayah !== undefined
          ? String(region.luas_wilayah)
          : '',
      jumlah_penduduk:
        region.jumlah_penduduk !== null && region.jumlah_penduduk !== undefined
          ? String(region.jumlah_penduduk)
          : '',
    });
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setEditSelectedGeoJsonFile(null);
    setEditParsedGeometryPreview(null);
    setEditGeoJsonPreviewError(null);
    setEditExistingGeometry(null);
    setIsEditModalOpen(true);

    // Ambil detail geometri wilayah saat ini untuk pratinjau mini-map
    setIsLoadingEditGeometry(true);
    try {
      const res = await axios.get(`/api/admin/regions/${region.id}`);
      if (res.data?.success && res.data.region) {
        if (res.data.region.has_geometry && res.data.region.geometry) {
          const rawGeom =
            res.data.region.geometry.geometry || res.data.region.geometry;
          setEditExistingGeometry(rawGeom);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat batas geometri eksisting untuk edit:', err);
    } finally {
      setIsLoadingEditGeometry(false);
    }
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    setEditingRegion(null);
    setEditFormData(initialEditForm);
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setEditSelectedGeoJsonFile(null);
    setEditParsedGeometryPreview(null);
    setEditGeoJsonPreviewError(null);
    setEditExistingGeometry(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) {
      setEditFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleEditGeoJsonFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditFormErrors((prev) => ({ ...prev, geojson_file: null }));
    setEditGeoJsonPreviewError(null);
    setEditParsedGeometryPreview(null);

    // Validasi ukuran berkas (Maks 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setEditGeoJsonPreviewError('Ukuran berkas GeoJSON melebihi batas maksimal 5 MB.');
      setEditSelectedGeoJsonFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['geojson', 'json'].includes(ext)) {
      setEditGeoJsonPreviewError('Format berkas tidak didukung. Harap pilih berkas .geojson atau .json.');
      setEditSelectedGeoJsonFile(null);
      return;
    }

    setEditSelectedGeoJsonFile(file);

    // Baca dan parse isi file untuk preview geometri pada peta mini
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        let geom = null;
        if (json.type === 'FeatureCollection' && Array.isArray(json.features) && json.features.length > 0) {
          geom = json.features[0].geometry;
        } else if (json.type === 'Feature' && json.geometry) {
          geom = json.geometry;
        } else if (['Polygon', 'MultiPolygon'].includes(json.type) && json.coordinates) {
          geom = json;
        }

        if (!geom || !geom.type || !geom.coordinates || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
          setEditGeoJsonPreviewError('Struktur berkas GeoJSON tidak memuat koordinat spasial polygon yang valid.');
          setEditParsedGeometryPreview(null);
          return;
        }

        setEditParsedGeometryPreview(geom);
        setEditGeoJsonPreviewError(null);
      } catch (err) {
        setEditGeoJsonPreviewError('Gagal membaca berkas GeoJSON. Pastikan berkas berformat JSON yang valid.');
        setEditParsedGeometryPreview(null);
      }
    };
    reader.onerror = () => {
      setEditGeoJsonPreviewError('Terjadi kesalahan saat membaca isi berkas.');
      setEditParsedGeometryPreview(null);
    };
    reader.readAsText(file);
  };

  const handleRemoveEditGeoJsonFile = () => {
    setEditSelectedGeoJsonFile(null);
    setEditParsedGeometryPreview(null);
    setEditGeoJsonPreviewError(null);
    setEditFormErrors((prev) => ({ ...prev, geojson_file: null }));
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRegion) return;

    setEditFormErrors({});
    setEditFormGeneralError(null);

    // Validasi Sisi Klien
    const errors = {};
    if (!editFormData.nama.trim()) {
      errors.nama = 'Nama kecamatan wajib diisi.';
    }
    if (!editFormData.kode.trim()) {
      errors.kode = 'Kode wilayah kecamatan wajib diisi.';
    }

    if (editGeoJsonPreviewError) {
      errors.geojson_file = editGeoJsonPreviewError;
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsSubmittingEdit(true);

    try {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('nama', editFormData.nama.trim());
      formData.append('kode', editFormData.kode.trim());
      if (editFormData.luas_wilayah) {
        formData.append('luas_wilayah', editFormData.luas_wilayah);
      } else {
        formData.append('luas_wilayah', '');
      }
      if (editFormData.jumlah_penduduk) {
        formData.append('jumlah_penduduk', editFormData.jumlah_penduduk);
      } else {
        formData.append('jumlah_penduduk', '');
      }
      if (editSelectedGeoJsonFile) {
        formData.append('geojson_file', editSelectedGeoJsonFile);
      }

      const res = await axios.post(`/api/admin/regions/${editingRegion.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        setIsEditModalOpen(false);
        setEditingRegion(null);
        setEditFormData(initialEditForm);
        setEditSelectedGeoJsonFile(null);
        setEditParsedGeometryPreview(null);
        setEditGeoJsonPreviewError(null);

        setSuccessToast({
          title: 'Wilayah Berhasil Diperbarui!',
          message: res.data.message || 'Data wilayah kecamatan berhasil diperbarui.',
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Perbarui data daftar tabel
        fetchRegions(currentPage, activeSearch);
      } else {
        throw new Error(res.data?.message || 'Gagal memperbarui data wilayah kecamatan.');
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
          err.response.data?.message || 'Validasi formulir gagal. Silakan periksa kembali data yang dimasukkan.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/regions' } } });
      } else if (err.response?.status === 403) {
        setEditFormGeneralError('Akses ditolak. Anda tidak memiliki izin untuk mengedit data wilayah.');
      } else {
        setEditFormGeneralError(
          err.response.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // =========================================================================
  // SYSTEM FEATURE 24: DELETE REGION HANDLERS
  // =========================================================================

  const handleOpenDeleteModal = (region) => {
    setDeletingRegion(region);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmittingDelete) return;
    setIsDeleteModalOpen(false);
    setDeletingRegion(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRegion || !deletingRegion.id) return;

    setIsSubmittingDelete(true);
    setDeleteModalError(null);

    try {
      const res = await axios.delete(`/api/admin/regions/${deletingRegion.id}`);

      if (res.data?.success) {
        const deletedNama = deletingRegion.nama;
        setIsDeleteModalOpen(false);
        setDeletingRegion(null);

        setSuccessToast({
          title: 'Wilayah Berhasil Dihapus!',
          message:
            res.data.message ||
            `Data wilayah Kecamatan ${deletedNama} berhasil dihapus dari sistem.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Jika wilayah ini satu-satunya di halaman saat ini dan currentPage > 1, turunkan ke halaman sebelumnya
        if (regionsList.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
        } else {
          fetchRegions(currentPage, activeSearch);
        }
      } else {
        throw new Error(res.data?.message || 'Data wilayah kecamatan gagal dihapus.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/regions' } } });
      } else if (err.response?.status === 403) {
        setDeleteModalError('Akses ditolak. Anda tidak memiliki izin untuk menghapus data wilayah.');
      } else if (err.response?.status === 404) {
        setDeleteModalError('Data wilayah kecamatan tidak ditemukan atau sudah dihapus sebelumnya.');
      } else if (err.response?.status === 422) {
        setDeleteModalError(
          err.response?.data?.message ||
            'Wilayah tidak dapat dihapus karena masih digunakan oleh data kasus DBD. Periksa dan selesaikan keterkaitan data terlebih dahulu.'
        );
      } else {
        setDeleteModalError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. PAGE HEADER                                                      */}
      {/* =================================================================== */}
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Administrator', to: '/admin/dashboard' },
          { label: 'Kelola Wilayah' },
        ]}
        title="Pengelolaan Data Wilayah Kecamatan"
        description="Kelola dan akses informasi wilayah administrasi kecamatan di Kabupaten Banyumas."
        badge="Master Data Wilayah 27 Kecamatan"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="btn-open-create-region"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            title="Tambah data wilayah kecamatan baru"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>Tambah Wilayah Baru</span>
          </button>
          <button
            type="button"
            data-testid="btn-refresh-regions"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Segarkan data wilayah kecamatan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </AdminPageHeader>

      {/* Toast Notification Banner (Success) */}
      {successToast && (
        <div
          data-testid="toast-success-region"
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

      {/* =================================================================== */}
      {/* 2. SUMMARY STATISTIC METRIC CARDS                                   */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wilayah Kecamatan */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Total Wilayah</span>
            <MapPinned className="w-4 h-4 text-[#123027]" />
          </div>
          <div className="text-2xl font-bold text-[#17221e]">
            {loading ? '-' : Number(summaryStats.total_regions || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Kecamatan di Kab. Banyumas</p>
        </div>

        {/* Batas Administrasi Tersedia */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Batas Tersedia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {loading ? '-' : Number(summaryStats.regions_with_geometry || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Geometri polygon spasial aktif</p>
        </div>

        {/* Batas Belum Tersedia */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Batas Belum Ada</span>
            <Info className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {loading ? '-' : Number(summaryStats.regions_without_geometry || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Wilayah tanpa batas GeoJSON</p>
        </div>

        {/* Total Kasus Terkait */}
        <div className="bg-white rounded-xl border border-[#d8e2dd] p-4 shadow-2xs hover:border-[#123027]/30 transition-all">
          <div className="flex items-center justify-between text-[#7d8f87] mb-2">
            <span className="text-xs font-medium">Total Kasus DBD</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {loading ? '-' : Number(summaryStats.total_cases_all_regions || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-[#7d8f87] mt-1">Akumulasi kasus seluruh wilayah</p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TOOLBAR: PENCARIAN & RESET                                       */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-[#d8e2dd] shadow-xs p-4 sm:p-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7d8f87] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="input-search-region"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari berdasarkan nama kecamatan atau kode wilayah (contoh: Purwokerto, 330201)..."
              className="w-full pl-9 pr-20 py-2.5 text-xs rounded-xl border border-[#d2ded8] bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#123027] hover:bg-[#194337] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cari
            </button>
          </div>

          {activeSearch && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#fbfbfa] hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pencarian</span>
            </button>
          )}
        </form>

        {activeSearch && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#4e6057]">
            <span>Menampilkan hasil pencarian untuk kata kunci:</span>
            <span className="font-bold text-[#17221e] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md">
              "{activeSearch}"
            </span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. TABEL MASTER DATA WILAYAH KECAMATAN                              */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-[#d8e2dd] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="table-regions" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fbfbfa] border-b border-[#e2e8e5] text-[#4e6057]">
                <th scope="col" className="py-3 px-4 font-bold text-center w-12">
                  No.
                </th>
                <th scope="col" className="py-3 px-4 font-bold w-28">
                  Kode Wilayah
                </th>
                <th scope="col" className="py-3 px-4 font-bold">
                  Nama Kecamatan
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Luas Wilayah
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Jumlah Penduduk
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-center">
                  Batas Spasial
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-right">
                  Kasus Terkait
                </th>
                <th scope="col" className="py-3 px-4 font-bold">
                  Terakhir Diperbarui
                </th>
                <th scope="col" className="py-3 px-4 font-bold text-center w-24">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f3]">
              {/* State 1: Loading */}
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7d8f87]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#123027]" />
                      <span className="font-semibold text-xs text-[#17221e]">
                        Memuat Data Wilayah Kecamatan...
                      </span>
                      <span className="text-[11px] text-[#7d8f87]">
                        Mengambil master data wilayah dari basis data MySQL.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 2: Error */}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-rose-600">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                      <p className="font-bold text-xs">{error}</p>
                      <p className="text-[11px] text-[#7d8f87]">
                        Pastikan server backend Laravel dan MySQL aktif.
                      </p>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#123027] text-white text-xs font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* State 3: Empty State */}
              {!loading && !error && regionsList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7d8f87]">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#f1f5f3] flex items-center justify-center mx-auto text-[#7d8f87]">
                        <MapPinned className="w-5 h-5" />
                      </div>
                      {activeSearch ? (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Wilayah kecamatan tidak ditemukan.
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Tidak ada kecamatan yang sesuai dengan kata kunci "{activeSearch}".
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123027] text-white text-xs font-semibold cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Pencarian</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-[#17221e]">
                            Belum Ada Data Wilayah Kecamatan
                          </p>
                          <p className="text-xs text-[#7d8f87]">
                            Basis data belum memiliki master wilayah kecamatan.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* State 4: Render Data Rows */}
              {!loading &&
                !error &&
                regionsList.map((item, index) => {
                  const rowNumber = (pagination.current_page - 1) * pagination.per_page + index + 1;
                  return (
                    <tr
                      key={item.id}
                      data-testid={`row-region-${item.id}`}
                      className="hover:bg-[#fbfbfa] transition-colors"
                    >
                      {/* 1. No */}
                      <td className="py-3 px-4 text-center font-medium text-[#7d8f87]">
                        {rowNumber}
                      </td>

                      {/* 2. Kode Wilayah */}
                      <td className="py-3 px-4 font-mono font-semibold text-[#123027]">
                        {item.kode}
                      </td>

                      {/* 3. Nama Kecamatan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#123027] shrink-0" />
                          <span className="font-bold text-[#17221e]">{item.nama}</span>
                        </div>
                      </td>

                      {/* 4. Luas Wilayah */}
                      <td className="py-3 px-4 text-right font-medium text-[#4e6057]">
                        {item.luas_wilayah_formatted}
                      </td>

                      {/* 5. Jumlah Penduduk */}
                      <td className="py-3 px-4 text-right font-medium text-[#4e6057]">
                        {item.jumlah_penduduk_formatted}
                      </td>

                      {/* 6. Batas Spasial */}
                      <td className="py-3 px-4 text-center">
                        {item.has_geometry ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Batas Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Info className="w-3 h-3 text-slate-400" />
                            <span>Belum Tersedia</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Kasus Terkait */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-[#17221e]">
                          {Number(item.total_cases || 0).toLocaleString('id-ID')}
                          <span className="text-[10px] font-normal text-[#7d8f87] ml-1">kasus</span>
                        </div>
                        <div className="text-[10px] text-[#7d8f87]">
                          {item.total_case_records} rekaman agregat
                        </div>
                      </td>

                      {/* 8. Terakhir Diperbarui */}
                      <td className="py-3 px-4 text-[#4e6057]">
                        <span>{item.updated_at_formatted}</span>
                      </td>

                      {/* 9. Aksi (Detail, Edit & Hapus) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`btn-detail-region-${item.id}`}
                            onClick={() => handleOpenDetailModal(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Lihat detail wilayah Kecamatan ${item.nama}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-edit-region-${item.id}`}
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 hover:border-amber-300 text-amber-900 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Edit data wilayah Kecamatan ${item.nama}`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-delete-region-${item.id}`}
                            onClick={() => handleOpenDeleteModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 hover:border-rose-300 text-rose-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                            title={`Hapus wilayah Kecamatan ${item.nama}`}
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
        {!loading && regionsList.length > 0 && (
          <div
            data-testid="regions-pagination"
            className="p-4 sm:px-6 border-t border-[#f1f5f3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="text-[#7d8f87]">
              Menampilkan{' '}
              <span className="font-bold text-[#17221e]">{pagination.from || 1}</span> -{' '}
              <span className="font-bold text-[#17221e]">{pagination.to || regionsList.length}</span>{' '}
              dari <span className="font-bold text-[#17221e]">{pagination.total}</span> wilayah kecamatan
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

              <span className="px-3 py-1.5 font-bold text-[#123027] bg-[#f1f5f3] rounded-lg">
                {pagination.current_page} / {pagination.last_page || 1}
              </span>

              <button
                type="button"
                data-testid="btn-next-page"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[#17221e] transition-colors cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. MODAL FORM TAMBAH WILAYAH KECAMATAN (SYSTEM FEATURE 22)          */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-region-title"
          data-testid="modal-create-region"
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
                  <Plus className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2
                    id="modal-create-region-title"
                    data-testid="modal-create-region-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Tambah Wilayah Kecamatan
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Daftarkan master wilayah kecamatan baru beserta batas administrasi spasial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup formulir tambah wilayah"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
                {/* General Error Banner */}
                {createFormGeneralError && (
                  <div
                    data-testid="error-create-region"
                    className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <h4 className="font-bold text-xs">Gagal Menyimpan Data</h4>
                      <p className="text-[11px] leading-relaxed mt-0.5">{createFormGeneralError}</p>
                    </div>
                  </div>
                )}

                {/* Section A: Informasi Wilayah */}
                <div className="space-y-4">
                  <div className="border-b border-[#e9efe8] pb-1.5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-800" />
                    <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider">
                      A. Informasi Administratif Wilayah
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Kecamatan */}
                    <div className="space-y-1">
                      <label htmlFor="input-region-name" className="block text-xs font-bold text-slate-800">
                        Nama Kecamatan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="input-region-name"
                        name="nama"
                        data-testid="input-region-name"
                        value={createFormData.nama}
                        onChange={handleCreateFormChange}
                        placeholder="Contoh: Purwokerto Baru"
                        maxLength={60}
                        required
                        className={`w-full rounded-xl border px-3 py-2 bg-[#fbfbfa] text-xs text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.nama
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                          }`}
                      />
                      {createFormErrors.nama && (
                        <p data-testid="error-region-name" className="text-[11px] text-rose-600 font-medium">
                          {createFormErrors.nama}
                        </p>
                      )}
                    </div>

                    {/* Kode Wilayah */}
                    <div className="space-y-1">
                      <label htmlFor="input-region-code" className="block text-xs font-bold text-slate-800">
                        Kode Wilayah (Kemendagri/BPS) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="input-region-code"
                        name="kode"
                        data-testid="input-region-code"
                        value={createFormData.kode}
                        onChange={handleCreateFormChange}
                        placeholder="Contoh: 330228"
                        maxLength={10}
                        required
                        className={`w-full rounded-xl border px-3 py-2 bg-[#fbfbfa] text-xs font-mono text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.kode
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                          }`}
                      />
                      {createFormErrors.kode && (
                        <p data-testid="error-region-code" className="text-[11px] text-rose-600 font-medium">
                          {createFormErrors.kode}
                        </p>
                      )}
                    </div>

                    {/* Luas Wilayah (km2) */}
                    <div className="space-y-1">
                      <label htmlFor="input-region-area" className="block text-xs font-semibold text-slate-700">
                        Luas Wilayah (km²) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="number"
                        id="input-region-area"
                        name="luas_wilayah"
                        data-testid="input-region-area"
                        value={createFormData.luas_wilayah}
                        onChange={handleCreateFormChange}
                        placeholder="Contoh: 45.50"
                        step="0.01"
                        min="0"
                        className="w-full rounded-xl border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-xs text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                      />
                      {createFormErrors.luas_wilayah && (
                        <p data-testid="error-region-area" className="text-[11px] text-rose-600 font-medium">
                          {createFormErrors.luas_wilayah}
                        </p>
                      )}
                    </div>

                    {/* Jumlah Penduduk */}
                    <div className="space-y-1">
                      <label htmlFor="input-region-population" className="block text-xs font-semibold text-slate-700">
                        Estimasi Penduduk (Jiwa) <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="number"
                        id="input-region-population"
                        name="jumlah_penduduk"
                        data-testid="input-region-population"
                        value={createFormData.jumlah_penduduk}
                        onChange={handleCreateFormChange}
                        placeholder="Contoh: 54000"
                        min="0"
                        step="1"
                        className="w-full rounded-xl border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-xs text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                      />
                      {createFormErrors.jumlah_penduduk && (
                        <p data-testid="error-region-population" className="text-[11px] text-rose-600 font-medium">
                          {createFormErrors.jumlah_penduduk}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Data Batas Administrasi Wilayah (GeoJSON File Upload) */}
                <div className="space-y-3 pt-2">
                  <div className="border-b border-[#e9efe8] pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-800" />
                      <h3 className="font-bold text-xs text-[#17221e] uppercase tracking-wider">
                        B. Data Batas Administrasi Spasial (GeoJSON)
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400">Format: .geojson / .json (Maks 5 MB)</span>
                  </div>

                  {!selectedGeoJsonFile ? (
                    <div className="rounded-xl border-2 border-dashed border-[#d2ded8] hover:border-emerald-600 bg-[#fbfbfa] p-5 text-center transition-colors">
                      <UploadCloud className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                      <p className="font-bold text-xs text-[#17221e]">
                        Pilih Berkas Batas Administrasi (GeoJSON)
                      </p>
                      <p className="text-[11px] text-[#7d8f87] mt-1">
                        Unggah berkas spasial batas polygon kecamatan untuk integrasi peta WebGIS.
                      </p>
                      <label
                        htmlFor="input-region-geojson"
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Pilih Berkas GeoJSON</span>
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="input-region-geojson"
                        data-testid="input-region-geojson"
                        accept=".geojson,.json"
                        onChange={handleGeoJsonFileChange}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                          <FileCode className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-emerald-950 truncate">
                            {selectedGeoJsonFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-700">
                            {(selectedGeoJsonFile.size / 1024).toFixed(1)} KB &bull; Berkas GeoJSON Terpilih
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-remove-geojson"
                        onClick={handleRemoveGeoJsonFile}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Hapus / ganti berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* GeoJSON Error Message */}
                  {createFormErrors.geojson_file && (
                    <div data-testid="error-region-geojson" className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 flex items-start gap-2 text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <p className="text-[11px] leading-relaxed">{createFormErrors.geojson_file}</p>
                    </div>
                  )}
                </div>

                {/* Section C: Preview Batas Wilayah pada Peta */}
                {parsedGeometryPreview && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pratinjau Batas Spasial Wilayah (Leaflet)</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        Tipe: {parsedGeometryPreview.type}
                      </span>
                    </div>

                    <div className="h-56 w-full rounded-xl overflow-hidden border border-emerald-300 relative z-0">
                      <MapContainer
                        center={[-7.45, 109.18]}
                        zoom={11}
                        scrollWheelZoom={false}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <GeoJSON
                          key={selectedGeoJsonFile?.name || 'preview'}
                          data={parsedGeometryPreview}
                          style={{
                            color: '#047857',
                            weight: 2.5,
                            fillColor: '#10b981',
                            fillOpacity: 0.4,
                          }}
                        />
                        <MiniMapBoundsFitter geometry={parsedGeometryPreview} />
                      </MapContainer>
                    </div>
                    <p className="text-[10px] text-[#7d8f87] italic">
                      Koordinat batas wilayah telah tervalidasi dan siap disimpan ke basis data peta spasial.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="btn-cancel-create-region"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-create-region"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Wilayah...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Simpan Wilayah</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. MODAL EDIT DATA WILAYAH KECAMATAN (SYSTEM FEATURE 23)            */}
      {/* =================================================================== */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-region-title"
          data-testid="modal-edit-region"
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
                  <Edit3 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2
                    id="modal-edit-region-title"
                    data-testid="modal-edit-region-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Edit Data Wilayah Kecamatan
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Perbarui informasi atribut dan batas spasial wilayah {editingRegion ? `Kecamatan ${editingRegion.nama}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-edit-modal"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog edit wilayah"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* General Error Banner */}
                {editFormGeneralError && (
                  <div
                    data-testid="alert-edit-region-general-error"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <p className="font-bold">Gagal Menyimpan Perubahan Wilayah</p>
                      <p className="mt-0.5">{editFormGeneralError}</p>
                    </div>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Kecamatan */}
                  <div>
                    <label
                      htmlFor="input-edit-nama"
                      className="block text-xs font-bold text-[#17221e] mb-1.5"
                    >
                      Nama Kecamatan <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-edit-nama"
                      type="text"
                      name="nama"
                      data-testid="input-edit-region-nama"
                      value={editFormData.nama}
                      onChange={handleEditFormChange}
                      disabled={isSubmittingEdit}
                      placeholder="Contoh: Purwokerto Timur"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 ${editFormErrors.nama
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                        }`}
                    />
                    {editFormErrors.nama && (
                      <p
                        data-testid="error-edit-region-nama"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {editFormErrors.nama}
                      </p>
                    )}
                  </div>

                  {/* Kode Wilayah */}
                  <div>
                    <label
                      htmlFor="input-edit-kode"
                      className="block text-xs font-bold text-[#17221e] mb-1.5"
                    >
                      Kode Wilayah <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-edit-kode"
                      type="text"
                      name="kode"
                      data-testid="input-edit-region-kode"
                      value={editFormData.kode}
                      onChange={handleEditFormChange}
                      disabled={isSubmittingEdit}
                      placeholder="Contoh: 33.02.01"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] font-mono placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 ${editFormErrors.kode
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                        }`}
                    />
                    {editFormErrors.kode && (
                      <p
                        data-testid="error-edit-region-kode"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {editFormErrors.kode}
                      </p>
                    )}
                  </div>

                  {/* Luas Wilayah (km²) */}
                  <div>
                    <label
                      htmlFor="input-edit-luas"
                      className="block text-xs font-bold text-[#17221e] mb-1.5"
                    >
                      Luas Wilayah (km²)
                    </label>
                    <input
                      id="input-edit-luas"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999.99"
                      name="luas_wilayah"
                      data-testid="input-edit-region-luas"
                      value={editFormData.luas_wilayah}
                      onChange={handleEditFormChange}
                      disabled={isSubmittingEdit}
                      placeholder="Contoh: 45.28"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 ${editFormErrors.luas_wilayah
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                        }`}
                    />
                    {editFormErrors.luas_wilayah && (
                      <p
                        data-testid="error-edit-region-luas"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {editFormErrors.luas_wilayah}
                      </p>
                    )}
                  </div>

                  {/* Jumlah Penduduk */}
                  <div>
                    <label
                      htmlFor="input-edit-penduduk"
                      className="block text-xs font-bold text-[#17221e] mb-1.5"
                    >
                      Estimasi Jumlah Penduduk (jiwa)
                    </label>
                    <input
                      id="input-edit-penduduk"
                      type="number"
                      min="0"
                      name="jumlah_penduduk"
                      data-testid="input-edit-region-penduduk"
                      value={editFormData.jumlah_penduduk}
                      onChange={handleEditFormChange}
                      disabled={isSubmittingEdit}
                      placeholder="Contoh: 85200"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#17221e] placeholder-[#7d8f87] transition-all outline-hidden focus:ring-2 ${editFormErrors.jumlah_penduduk
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-[#d2ded8] bg-white focus:ring-emerald-200 focus:border-emerald-600'
                        }`}
                    />
                    {editFormErrors.jumlah_penduduk && (
                      <p
                        data-testid="error-edit-region-penduduk"
                        className="text-[11px] text-rose-600 font-medium mt-1"
                      >
                        {editFormErrors.jumlah_penduduk}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload GeoJSON Section */}
                <div className="pt-2 border-t border-[#e2e8e5]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[#17221e]">
                      Pembaruan Batas Administrasi Spasial (GeoJSON)
                    </label>
                    <span className="text-[11px] text-[#7d8f87]">
                      Opsional (Biarkan kosong jika mempertahankan batas saat ini)
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      data-testid="input-edit-region-geojson"
                      accept=".geojson,.json,application/geo+json,application/json"
                      onChange={handleEditGeoJsonFileChange}
                      disabled={isSubmittingEdit}
                      className="hidden"
                      id="edit-region-geojson-upload"
                    />

                    {!editSelectedGeoJsonFile ? (
                      <label
                        htmlFor="edit-region-geojson-upload"
                        className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#d2ded8] hover:border-amber-600 rounded-xl bg-[#fbfbfa] hover:bg-amber-50/30 transition-all cursor-pointer group"
                      >
                        <UploadCloud className="w-8 h-8 text-[#7d8f87] group-hover:text-amber-700 transition-colors mb-2" />
                        <span className="text-xs font-semibold text-[#17221e] group-hover:text-amber-800">
                          Klik untuk memilih berkas batas baru
                        </span>
                        <span className="text-[11px] text-[#7d8f87] mt-0.5">
                          Format didukung: .geojson atau .json (Maks. 5 MB)
                        </span>
                      </label>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                            <FileCode className="w-4 h-4 text-amber-700" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-amber-950 truncate">
                              {editSelectedGeoJsonFile.name}
                            </p>
                            <p className="text-[10px] text-amber-700">
                              {(editSelectedGeoJsonFile.size / 1024).toFixed(1)} KB &bull; Berkas Batas Baru Terpilih
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid="btn-remove-edit-geojson"
                          onClick={handleRemoveEditGeoJsonFile}
                          disabled={isSubmittingEdit}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-3"
                          title="Hapus berkas baru dan gunakan batas sebelumnya"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Batal Ganti</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {editGeoJsonPreviewError && (
                    <p
                      data-testid="error-edit-region-geojson"
                      className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{editGeoJsonPreviewError}</span>
                    </p>
                  )}
                  {editFormErrors.geojson_file && !editGeoJsonPreviewError && (
                    <p
                      data-testid="error-edit-region-geojson"
                      className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{editFormErrors.geojson_file}</span>
                    </p>
                  )}
                </div>

                {/* Pratinjau Peta Mini Geometri Wilayah */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#17221e] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Pratinjau Batas Spasial Mini-Map</span>
                    </span>
                    {editParsedGeometryPreview ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Batas Baru Terpilih</span>
                      </span>
                    ) : editExistingGeometry ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        <span>Batas Wilayah Eksisting</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Info className="w-3 h-3 text-amber-600" />
                        <span>Belum Ada Batas Spasial</span>
                      </span>
                    )}
                  </div>

                  {isLoadingEditGeometry ? (
                    <div className="h-52 w-full rounded-xl border border-slate-200 bg-[#fbfbfa] flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mb-1 text-slate-600" />
                      <span className="text-xs">Memuat pratinjau batas spasial...</span>
                    </div>
                  ) : editParsedGeometryPreview || editExistingGeometry ? (
                    <div className="space-y-1.5">
                      <div className="h-56 w-full rounded-xl overflow-hidden border border-emerald-300 relative z-0">
                        <MapContainer
                          center={[-7.45, 109.18]}
                          zoom={11}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <GeoJSON
                            key={
                              editParsedGeometryPreview
                                ? `new-${editSelectedGeoJsonFile?.name}`
                                : `existing-${editingRegion?.id}`
                            }
                            data={editParsedGeometryPreview || editExistingGeometry}
                            style={{
                              color: editParsedGeometryPreview ? '#047857' : '#0284c7',
                              weight: 2.5,
                              fillColor: editParsedGeometryPreview ? '#10b981' : '#38bdf8',
                              fillOpacity: 0.4,
                            }}
                          />
                          <MiniMapBoundsFitter
                            geometry={editParsedGeometryPreview || editExistingGeometry}
                          />
                        </MapContainer>
                      </div>
                      <p className="text-[10px] text-[#7d8f87] italic">
                        {editParsedGeometryPreview
                          ? 'Menampilkan pratinjau koordinat polygon dari berkas baru yang diunggah.'
                          : 'Menampilkan koordinat batas administratif eksisting yang aktif saat ini.'}
                      </p>
                    </div>
                  ) : (
                    <div className="h-32 rounded-xl border border-dashed border-[#d2ded8] bg-[#fbfbfa] flex flex-col items-center justify-center p-4 text-center text-[#7d8f87]">
                      <Info className="w-6 h-6 text-amber-500 mb-1" />
                      <p className="text-xs font-semibold text-[#17221e]">
                        Wilayah ini belum memiliki data batas polygon.
                      </p>
                      <p className="text-[11px] text-[#7d8f87] mt-0.5">
                        Anda dapat mengunggah berkas GeoJSON di atas untuk melengkapi data spasial wilayah ini.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="btn-cancel-edit-region"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-edit-region"
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
                      <Edit3 className="w-3.5 h-3.5 text-amber-100" />
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
      {/* 7. MODAL DETAIL WILAYAH KECAMATAN (SYSTEM FEATURE 21)               */}
      {/* =================================================================== */}
      {isDetailModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-region-title"
          data-testid="modal-detail-region"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] border-b border-[#e2e8e5] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                  <MapPinned className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2
                    id="modal-detail-region-title"
                    data-testid="modal-detail-region-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Detail Wilayah Kecamatan
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    {detailRegionData
                      ? `Kecamatan ${detailRegionData.nama} (Kode Wilayah: ${detailRegionData.kode})`
                      : 'Memuat informasi rincian wilayah...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-detail-modal"
                onClick={handleCloseDetailModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer"
                aria-label="Tutup dialog rincian wilayah"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* State A: Loading */}
              {isLoadingDetail && (
                <div className="py-16 text-center text-[#7d8f87]">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#123027] mb-2" />
                  <p className="font-semibold text-xs text-[#17221e]">
                    Memuat Rincian Wilayah Kecamatan...
                  </p>
                </div>
              )}

              {/* State B: Error */}
              {!isLoadingDetail && detailError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <h4 className="font-bold text-xs">Gagal Memuat Detail Wilayah</h4>
                    <p className="text-xs mt-0.5">{detailError}</p>
                  </div>
                </div>
              )}

              {/* State C: Content Ready */}
              {!isLoadingDetail && !detailError && detailRegionData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column (Info Cards): 6 cols */}
                  <div className="lg:col-span-6 space-y-4">
                    {/* Kartu Identitas Wilayah */}
                    <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#123027] border-b border-[#e9efe8] pb-2 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#123027]" />
                        <span>Identitas Administratif Wilayah</span>
                      </h3>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-[#7d8f87] block">Nama Kecamatan</span>
                          <span className="font-bold text-[#17221e] text-sm">
                            {detailRegionData.nama}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#7d8f87] block">Kode Wilayah</span>
                          <span className="font-mono font-bold text-[#123027]">
                            {detailRegionData.kode}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#7d8f87] block">Luas Wilayah</span>
                          <span className="font-medium text-[#17221e]">
                            {detailRegionData.luas_wilayah_formatted}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#7d8f87] block">Estimasi Penduduk</span>
                          <span className="font-medium text-[#17221e]">
                            {detailRegionData.jumlah_penduduk_formatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Kartu Ringkasan Surveilans Kasus DBD */}
                    <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#123027] border-b border-[#e9efe8] pb-2 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-rose-600" />
                        <span>Statistik Kasus DBD Terdata</span>
                      </h3>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e5]">
                          <span className="text-[11px] text-[#7d8f87] block">Total Kasus DBD</span>
                          <span className="text-lg font-bold text-rose-700">
                            {Number(detailRegionData.total_cases || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-[#7d8f87] block mt-0.5">
                            Dari {detailRegionData.total_case_records} rekaman bulanan
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e5]">
                          <span className="text-[11px] text-[#7d8f87] block">Kematian (DSS)</span>
                          <span className="text-lg font-bold text-slate-800">
                            {Number(detailRegionData.total_deaths || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-[#7d8f87] block mt-0.5">
                            Dengue Shock Syndrome
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e5] col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#7d8f87]">Rata-rata Incidence Rate</span>
                            <span className="text-sm font-bold text-[#123027]">
                              {detailRegionData.average_ir_formatted}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#7d8f87] mt-1">
                            Estimasi kasus per 100.000 penduduk berdasarkan data agregat terdata.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Update */}
                    <div className="text-[11px] text-[#7d8f87] px-1">
                      Terakhir diperbarui sistem: <span className="text-[#17221e] font-medium">{detailRegionData.updated_at_formatted}</span>
                    </div>
                  </div>

                  {/* Right Column (Mini-Map & Boundary Status): 6 cols */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="rounded-xl border border-[#d8e2dd] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#f1f5f3] pb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-700" />
                          <h3 className="text-xs font-bold text-[#17221e]">
                            Visualisasi Batas Spasial Wilayah
                          </h3>
                        </div>
                        {detailRegionData.has_geometry ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Polygon Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Info className="w-3 h-3 text-amber-600" />
                            <span>Batas Belum Ada</span>
                          </span>
                        )}
                      </div>

                      {/* Mini Map Visualizer */}
                      {detailRegionData.has_geometry && detailRegionData.geometry ? (
                        <div className="space-y-2">
                          <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-[#d2ded8] relative z-0">
                            <MapContainer
                              center={[-7.45, 109.18]}
                              zoom={11}
                              scrollWheelZoom={false}
                              className="h-full w-full"
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <GeoJSON
                                key={`geom-${detailRegionData.id}`}
                                data={detailRegionData.geometry}
                                style={{
                                  color: '#047857',
                                  weight: 2.5,
                                  fillColor: '#10b981',
                                  fillOpacity: 0.35,
                                }}
                              />
                              <MiniMapBoundsFitter geometry={detailRegionData.geometry} />
                            </MapContainer>
                          </div>
                          <p className="text-[10px] text-[#7d8f87] italic">
                            Batas polygon administratif WGS84 dari file resmi GeoJSON Kabupaten Banyumas.
                          </p>
                        </div>
                      ) : (
                        <div className="h-64 rounded-xl border border-dashed border-[#d2ded8] bg-[#fbfbfa] flex flex-col items-center justify-center p-6 text-center text-[#7d8f87]">
                          <Info className="w-8 h-8 text-amber-500 mb-2" />
                          <h4 className="text-xs font-bold text-[#17221e]">
                            Data Batas Administrasi Belum Tersedia
                          </h4>
                          <p className="text-[11px] max-w-xs mt-1 text-[#7d8f87]">
                            Wilayah kecamatan ini belum memiliki rekaman geometri spasial (polygon GeoJSON) pada basis data peta.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-between">
              <div>
                {!isLoadingDetail && !detailError && detailRegionData && (
                  <button
                    type="button"
                    data-testid="btn-detail-edit-region"
                    onClick={() => {
                      const target = detailRegionData;
                      handleCloseDetailModal();
                      handleOpenEditModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Wilayah Ini</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-modal-close"
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
      {/* 9. MODAL KONFIRMASI HAPUS WILAYAH KECAMATAN (SYSTEM FEATURE 24)     */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingRegion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-region-title"
          data-testid="modal-delete-region"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-2xl border border-[#d8e2dd] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] border-b border-[#e2e8e5] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2
                    id="modal-delete-region-title"
                    data-testid="modal-delete-region-title"
                    className="text-base font-bold text-[#17221e] tracking-tight"
                  >
                    Hapus Data Wilayah Kecamatan
                  </h2>
                  <p className="text-xs text-[#7d8f87]">
                    Konfirmasi penghapusan data master wilayah Kecamatan {deletingRegion.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-delete-modal"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7d8f87] hover:text-[#17221e] hover:bg-[#f1f5f3] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Tutup dialog konfirmasi hapus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Error banner if deletion rejected by backend */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-region"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Wilayah Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-xs font-medium text-[#17221e] leading-relaxed">
                Apakah Anda yakin ingin menghapus data wilayah kecamatan ini? Tindakan ini akan menghapus data wilayah dari pengelolaan WebGIS apabila tidak terdapat ketergantungan data yang menghalangi proses penghapusan.
              </p>

              {/* Target Region Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Nama Kecamatan:</span>
                  <span className="font-bold text-[#17221e] text-right">
                    {deletingRegion.nama}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Kode Wilayah:</span>
                  <span className="font-mono font-semibold text-[#123027] text-right">
                    {deletingRegion.kode}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Batas Administrasi:</span>
                  <span className="text-right">
                    {deletingRegion.has_geometry ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Batas Tersedia</span>
                      </span>
                    ) : (
                      <span className="text-[#7d8f87] font-medium text-[11px]">Belum Tersedia</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Data Kasus Terhubung:</span>
                  <span className="font-bold text-right">
                    {Number(deletingRegion.total_case_records || 0) > 0 ? (
                      <span className="text-amber-800 font-bold">
                        {deletingRegion.total_case_records} rekaman ({Number(deletingRegion.total_cases || 0).toLocaleString('id-ID')} kasus)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">0 rekaman (Bebas Ketergantungan)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Warning on Linked Case Records */}
              {Number(deletingRegion.total_case_records || 0) > 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Peringatan Ketergantungan Data:</strong> Wilayah ini masih memiliki data kasus DBD yang terhubung. Sistem akan menolak penghapusan ini untuk mencegah kerusakan integritas relasi data surveilans.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-slate-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                  <p className="text-[11px] leading-relaxed">
                    Tindakan ini akan menghapus data wilayah dari basis data dan batas spasial GeoJSON terkait. Pastikan Anda telah memeriksa kembali sebelum melanjutkan.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                data-testid="btn-cancel-delete-region"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-region"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Wilayah...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-rose-200" />
                    <span>Hapus Wilayah</span>
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
