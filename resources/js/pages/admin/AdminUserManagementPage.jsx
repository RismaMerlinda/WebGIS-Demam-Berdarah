import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  ShieldCheck,
  Users,
  Search,
  Filter,
  RefreshCw,
  X,
  AlertCircle,
  ExternalLink,
  LogOut,
  Loader2,
  Calendar,
  Mail,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  UserX,
  User,
  ArrowUpDown,
  RotateCcw,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  FileText,
  KeyRound,
  Pencil,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

export default function AdminUserManagementPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [summary, setSummary] = useState({
    total_users: 0,
    total_admins: 0,
    total_regular_users: 0,
    total_active: 0,
    total_inactive: 0,
  });

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Clipboard copy state for email
  const [copiedEmailId, setCopiedEmailId] = useState(null);

  const handleCopyEmail = (e, email, userId) => {
    e.stopPropagation();
    if (!email) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email);
    }
    setCopiedEmailId(userId);
    setTimeout(() => {
      setCopiedEmailId(null);
    }, 2000);
  };

  // System Feature 13: Create User Modal & Form States
  const initialCreateForm = {
    name: '',
    username: '',
    email: '',
    agency: '',
    phone: '',
    role: 'user',
    is_active: '1',
    password: '',
    password_confirmation: '',
    bio: '',
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialCreateForm);
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createFormGeneralError, setCreateFormGeneralError] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // System Feature 14: Edit User Modal & Form States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    email: '',
    agency: '',
    phone: '',
    role: 'user',
    is_active: '1',
    password: '',
    password_confirmation: '',
    bio: '',
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormGeneralError, setEditFormGeneralError] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPasswordConfirm, setShowEditPasswordConfirm] = useState(false);

  // System Feature 15: Delete User Confirmation Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);

  // System Feature 16: Detail User Modal States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);
  const [detailUserData, setDetailUserData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Helper initial generator
  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Fetch users master data from backend
  const fetchUsers = useCallback(async (page = 1, search = '', role = 'all', status = 'all') => {
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

      if (role && role !== 'all') {
        params.role = role;
      }

      if (status && status !== 'all') {
        params.status = status;
      }

      const res = await axios.get('/api/admin/users', { params });

      if (res.data?.success) {
        setUsersList(res.data.users?.data || []);
        setPagination({
          current_page: res.data.users?.current_page || 1,
          last_page: res.data.users?.last_page || 1,
          per_page: res.data.users?.per_page || 10,
          total: res.data.users?.total || 0,
          from: res.data.users?.from || 0,
          to: res.data.users?.to || 0,
        });
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      } else {
        throw new Error(res.data?.message || 'Gagal memuat master data pengguna.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/users' } } });
        return;
      }
      const msg =
        err.response?.data?.message ||
        'Terjadi kendala saat memuat data pengguna dari basis data MySQL.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchUsers(currentPage, activeSearch, roleFilter, statusFilter);
  }, [fetchUsers, currentPage, activeSearch, roleFilter, statusFilter]);

  // Debounced search input handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== activeSearch) {
        setActiveSearch(searchInput);
        setCurrentPage(1);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, activeSearch]);

  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // System Feature 13: Modal & Submission Handlers
  const handleOpenCreateModal = () => {
    setCreateFormData(initialCreateForm);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);
    setShowPassword(false);
    setShowPasswordConfirm(false);
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
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (createFormErrors[name]) {
      setCreateFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmitCreateUser = async (e) => {
    e.preventDefault();
    if (isSubmittingCreate) return;

    // Client-side pre-validation
    const clientErrors = {};
    if (!createFormData.name.trim()) {
      clientErrors.name = 'Nama lengkap wajib diisi.';
    }
    if (!createFormData.username.trim()) {
      clientErrors.username = 'Username wajib diisi.';
    } else if (createFormData.username.trim().length < 3) {
      clientErrors.username = 'Username minimal 3 karakter.';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(createFormData.username.trim())) {
      clientErrors.username = 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).';
    }

    if (!createFormData.email.trim()) {
      clientErrors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email.trim())) {
      clientErrors.email = 'Format alamat email tidak valid.';
    }

    if (!createFormData.password) {
      clientErrors.password = 'Kata sandi wajib diisi.';
    } else if (createFormData.password.length < 8) {
      clientErrors.password = 'Kata sandi minimal 8 karakter.';
    }

    if (createFormData.password && createFormData.password_confirmation !== createFormData.password) {
      clientErrors.password_confirmation = 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.';
    }

    if (Object.keys(clientErrors).length > 0) {
      setCreateFormErrors(clientErrors);
      setCreateFormGeneralError('Mohon periksa dan lengkapi data formulir yang diperlukan.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateFormErrors({});
    setCreateFormGeneralError(null);

    try {
      const payload = {
        name: createFormData.name.trim(),
        username: createFormData.username.trim(),
        email: createFormData.email.trim(),
        agency: createFormData.agency.trim() || null,
        phone: createFormData.phone.trim() || null,
        role: createFormData.role,
        is_active: createFormData.is_active === '1' || createFormData.is_active === true,
        password: createFormData.password,
        password_confirmation: createFormData.password_confirmation,
        bio: createFormData.bio.trim() || null,
      };

      const res = await axios.post('/api/admin/users', payload);

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setCreateFormData(initialCreateForm);
        setSuccessToast({
          title: 'Akun Pengguna Berhasil Dibuat!',
          message: `Akun ${res.data.user?.name} (@${res.data.user?.username}) telah tersimpan di basis data dan siap digunakan.`,
        });

        // Auto dismiss toast after 6 seconds
        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        // Reset to page 1 and fetch latest users so newly created account is immediately visible
        setCurrentPage(1);
        fetchUsers(1, activeSearch, roleFilter, statusFilter);
      } else {
        throw new Error(res.data?.message || 'Gagal menyimpan akun pengguna baru.');
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
          err.response.data?.message || 'Validasi formulir tidak terpenuhi. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/users' } } });
      } else if (err.response?.status === 403) {
        setCreateFormGeneralError('Akses ditolak. Hanya administrator aktif yang diizinkan membuat akun baru.');
      } else {
        setCreateFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem atau kendala jaringan saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // System Feature 14: Edit User Modal & Submission Handlers
  const handleOpenEditModal = (targetUser) => {
    setEditingUserId(targetUser.id);
    setEditFormData({
      name: targetUser.name || '',
      username: targetUser.username || '',
      email: targetUser.email || '',
      agency: targetUser.agency || '',
      phone: targetUser.phone || '',
      role: targetUser.role === 'super_admin' ? 'admin' : (targetUser.role || 'user'),
      is_active: targetUser.is_active ? '1' : '0',
      password: '',
      password_confirmation: '',
      bio: targetUser.bio || '',
    });
    setEditFormErrors({});
    setEditFormGeneralError(null);
    setShowEditPassword(false);
    setShowEditPasswordConfirm(false);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    setEditingUserId(null);
    setEditFormErrors({});
    setEditFormGeneralError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) {
      setEditFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmitEditUser = async (e) => {
    e.preventDefault();
    if (isSubmittingEdit || !editingUserId) return;

    // Client-side pre-validation
    const clientErrors = {};
    if (!editFormData.name.trim()) {
      clientErrors.name = 'Nama lengkap wajib diisi.';
    }
    if (!editFormData.username.trim()) {
      clientErrors.username = 'Username wajib diisi.';
    } else if (editFormData.username.trim().length < 3) {
      clientErrors.username = 'Username minimal 3 karakter.';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(editFormData.username.trim())) {
      clientErrors.username = 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).';
    }

    if (!editFormData.email.trim()) {
      clientErrors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email.trim())) {
      clientErrors.email = 'Format alamat email tidak valid.';
    }

    if (editFormData.password && editFormData.password.length < 8) {
      clientErrors.password = 'Kata sandi baru minimal 8 karakter.';
    }

    if (editFormData.password && editFormData.password_confirmation !== editFormData.password) {
      clientErrors.password_confirmation = 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.';
    }

    if (Object.keys(clientErrors).length > 0) {
      setEditFormErrors(clientErrors);
      setEditFormGeneralError('Mohon periksa dan lengkapi data formulir yang diperlukan.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditFormErrors({});
    setEditFormGeneralError(null);

    try {
      const payload = {
        name: editFormData.name.trim(),
        username: editFormData.username.trim(),
        email: editFormData.email.trim(),
        agency: editFormData.agency.trim() || null,
        phone: editFormData.phone.trim() || null,
        role: editFormData.role,
        is_active: editFormData.is_active === '1' || editFormData.is_active === true,
        bio: editFormData.bio.trim() || null,
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
        payload.password_confirmation = editFormData.password_confirmation;
      }

      const res = await axios.put(`/api/admin/users/${editingUserId}`, payload);

      if (res.data?.success) {
        setIsEditModalOpen(false);
        setEditingUserId(null);
        setSuccessToast({
          title: 'Perubahan Akun Berhasil Disimpan!',
          message: `Data akun ${res.data.user?.name} (@${res.data.user?.username}) telah diperbarui.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        fetchUsers(currentPage, activeSearch, roleFilter, statusFilter);
      } else {
        throw new Error(res.data?.message || 'Gagal memperbarui data akun pengguna.');
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
          err.response.data?.message || 'Validasi formulir tidak terpenuhi. Silakan periksa kolom yang ditandai.'
        );
      } else if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/users' } } });
      } else if (err.response?.status === 403) {
        setEditFormGeneralError('Akses ditolak. Anda tidak memiliki otoritas untuk memperbarui akun ini.');
      } else {
        setEditFormGeneralError(
          err.response?.data?.message || 'Terjadi kesalahan sistem saat menghubungi server.'
        );
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // System Feature 15: Delete User Handlers
  const handleOpenDeleteModal = (targetUser) => {
    setDeletingUser(targetUser);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmittingDelete) return;
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmittingDelete(true);
    setDeleteModalError(null);

    try {
      const res = await axios.delete(`/api/admin/users/${deletingUser.id}`);
      if (res.data?.success) {
        setIsDeleteModalOpen(false);
        const deletedUserName = deletingUser.name;
        const deletedUserUsername = deletingUser.username;
        setDeletingUser(null);
        setSuccessToast({
          title: 'Akun Pengguna Berhasil Dihapus!',
          message: `Akun ${deletedUserName} (@${deletedUserUsername}) telah berhasil dihapus dari sistem.`,
        });

        setTimeout(() => {
          setSuccessToast(null);
        }, 6000);

        fetchUsers(currentPage, activeSearch, roleFilter, statusFilter);
      } else {
        throw new Error(res.data?.message || 'Gagal menghapus akun pengguna.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/users' } } });
      } else if (err.response?.status === 403) {
        setDeleteModalError(
          err.response.data?.message || 'Akses ditolak. Anda tidak memiliki izin untuk menghapus akun ini.'
        );
      } else if (err.response?.status === 404) {
        setDeleteModalError(
          err.response.data?.message || 'Data pengguna tidak ditemukan atau sudah dihapus sebelumnya.'
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

  // System Feature 16: Detail User Handlers
  const handleOpenDetailModal = async (userId) => {
    setIsDetailModalOpen(true);
    setDetailUserId(userId);
    setDetailUserData(null);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await axios.get(`/api/admin/users/${userId}`);
      if (res.data?.success && res.data?.user) {
        setDetailUserData(res.data.user);
      } else {
        throw new Error(res.data?.message || 'Data akun pengguna tidak ditemukan.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: '/admin/users' } } });
      } else if (err.response?.status === 403) {
        setDetailError('Akses ditolak. Anda tidak memiliki izin untuk melihat detail akun ini.');
      } else if (err.response?.status === 404) {
        setDetailError('Data akun pengguna tidak ditemukan.');
      } else {
        setDetailError(
          err.response?.data?.message || 'Gagal mengambil data detail akun dari server.'
        );
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailUserId(null);
    setDetailUserData(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  };

  const hasActiveFilters = activeSearch.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Minimalist Page Header */}
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Administrator', to: '/admin/dashboard' },
          { label: 'Manajemen Pengguna' },
        ]}
        title="Manajemen Pengguna"
        description="Kelola dan pantau informasi akun pengguna yang terdaftar dalam sistem WebGIS Demam Berdarah."
      >
        <button
          type="button"
          data-testid="btn-refresh-users"
          onClick={() => fetchUsers(currentPage, activeSearch, roleFilter, statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title="Segarkan data dari server"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>

        <button
          type="button"
          data-testid="btn-add-user"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          title="Daftarkan akun pengguna atau administrator baru"
        >
          <UserPlus className="w-4 h-4 text-emerald-200" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </AdminPageHeader>

      {/* Success Notification Banner (System Feature 13) */}
      {successToast && (
        <div
          data-testid="toast-success-create-user"
          className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-4 shadow-2xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-900">{successToast.title}</p>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">{successToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md transition-colors cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUMMARY STAT CARDS (4 CARDS)                                        */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Pengguna */}
        <div className="bg-white border border-[#e2e8e5] rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#eef5f2] text-[#123027] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#7d8f87] uppercase tracking-wider">
              Total Pengguna
            </p>
            <p className="text-xl font-bold text-[#17221e] tracking-tight">
              {summary.total_users}
            </p>
          </div>
        </div>

        {/* Card 2: Administrator Terdaftar */}
        <div className="bg-white border border-[#e2e8e5] rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#7d8f87] uppercase tracking-wider">
              Administrator
            </p>
            <p className="text-xl font-bold text-[#17221e] tracking-tight">
              {summary.total_admins}
            </p>
          </div>
        </div>

        {/* Card 3: Pengguna Biasa */}
        <div className="bg-white border border-[#e2e8e5] rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#7d8f87] uppercase tracking-wider">
              Pengguna (User)
            </p>
            <p className="text-xl font-bold text-[#17221e] tracking-tight">
              {summary.total_regular_users}
            </p>
          </div>
        </div>

        {/* Card 4: Akun Aktif */}
        <div className="bg-white border border-[#e2e8e5] rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#7d8f87] uppercase tracking-wider">
              Akun Aktif
            </p>
            <p className="text-xl font-bold text-[#17221e] tracking-tight">
              {summary.total_active}
            </p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* PENCARIAN & FILTER CONTROLS BAR (SYSTEM FEATURE 12)                 */}
      {/* =================================================================== */}
      <div
        data-testid="user-filters-section"
        className="bg-white border border-[#e2e8e5] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Search Input Bar (5 Cols) */}
          <div className="md:col-span-4 lg:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              data-testid="input-search-user"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, username, atau email..."
              className="w-full text-xs rounded-lg border border-[#d2ded8] pl-9 pr-9 py-2.5 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
            />
            {searchInput && (
              <button
                type="button"
                data-testid="btn-clear-search"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Role (3 Cols) */}
          <div className="md:col-span-3 lg:col-span-3">
            <div className="relative">
              <select
                data-testid="select-filter-role"
                value={roleFilter}
                onChange={handleRoleChange}
                className="w-full text-xs rounded-lg border border-[#d2ded8] px-3 py-2.5 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all cursor-pointer font-medium"
              >
                <option value="all">Semua Role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          {/* Filter Status (3 Cols) */}
          <div className="md:col-span-3 lg:col-span-2">
            <div className="relative">
              <select
                data-testid="select-filter-status"
                value={statusFilter}
                onChange={handleStatusChange}
                className="w-full text-xs rounded-lg border border-[#d2ded8] px-3 py-2.5 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all cursor-pointer font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Reset Button (2 Cols) */}
          <div className="md:col-span-2 lg:col-span-2 flex justify-end">
            <button
              type="button"
              data-testid="btn-reset-filters"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Reset seluruh parameter pencarian dan filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f1f5f3] text-xs">
            <span className="text-[#7d8f87] text-[11px] font-semibold">Filter Aktif:</span>
            {activeSearch && (
              <span className="inline-flex items-center gap-1.5 bg-[#eef5f2] text-[#123027] px-2.5 py-0.5 rounded-md text-[11px] border border-[#cbe1d8]">
                <span>Pencarian: "{activeSearch}"</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {roleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-[#eef5f2] text-[#123027] px-2.5 py-0.5 rounded-md text-[11px] border border-[#cbe1d8]">
                <span>Role: {roleFilter === 'admin' ? 'Admin' : 'User'}</span>
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-[#eef5f2] text-[#123027] px-2.5 py-0.5 rounded-md text-[11px] border border-[#cbe1d8]">
                <span>Status: {statusFilter === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer ml-auto"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Error Alert Banner with Retry Button */}
      {error && (
        <div
          data-testid="users-error-banner"
          className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#991b1b]"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-[#991b1b]">Gagal Mengambil Data Pengguna</p>
              <p className="text-xs text-[#b91c1c] leading-relaxed mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchUsers(currentPage, activeSearch, roleFilter, statusFilter)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* MASTER DATA USERS TABLE (SYSTEM FEATURE 12)                         */}
      {/* =================================================================== */}
      <div className="bg-white border border-[#e2e8e5] rounded-xl shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#f1f5f3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#17221e]">
              Daftar Master Data Pengguna
            </h2>
            <p className="text-xs text-[#7d8f87]">
              Menampilkan data terverifikasi yang tersimpan di basis data sistem.
            </p>
          </div>

          <div className="text-xs text-[#4e6057] font-medium">
            Total Ditemukan:{' '}
            <span className="font-bold text-[#17221e]">{pagination.total}</span> akun
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table data-testid="table-users" className="w-full min-w-[1180px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8faf9] border-b border-[#e2e8e5] text-[#4e6057] uppercase text-[10.5px] font-bold tracking-wider">
                <th scope="col" className="py-3.5 px-4 sm:px-6 w-[185px] min-w-[170px] whitespace-nowrap">
                  Nama Lengkap
                </th>
                <th scope="col" className="py-3.5 px-4 w-[135px] min-w-[130px] whitespace-nowrap">
                  Identitas (Username)
                </th>
                <th scope="col" className="py-3.5 px-4 w-[210px] min-w-[190px] whitespace-nowrap">
                  Email
                </th>
                <th scope="col" className="py-3.5 px-4 w-[170px] min-w-[155px] whitespace-nowrap">
                  Instansi / Unit Kerja
                </th>
                <th scope="col" className="py-3.5 px-4 w-[95px] min-w-[90px] whitespace-nowrap">
                  Role
                </th>
                <th scope="col" className="py-3.5 px-4 w-[110px] min-w-[105px] whitespace-nowrap">
                  Status Akun
                </th>
                <th scope="col" className="py-3.5 px-4 sm:px-6 w-[155px] min-w-[145px] whitespace-nowrap">
                  Tanggal Terdaftar
                </th>
                <th scope="col" className="py-3.5 px-4 w-[220px] min-w-[215px] text-center whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f3]">
              {/* 1. Loading Skeleton */}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-[#7d8f87]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#123027]" />
                      <span className="text-xs font-medium">Memuat master data pengguna...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* 2. Empty State: No search results or empty table */}
              {!loading && usersList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div
                      data-testid="users-empty-state"
                      className="max-w-md mx-auto flex flex-col items-center justify-center gap-3 text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#f4f7f5] text-[#7d8f87] flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-[#17221e]">
                          {activeSearch
                            ? 'Data pengguna tidak ditemukan.'
                            : (roleFilter !== 'all' || statusFilter !== 'all')
                              ? 'Tidak terdapat pengguna yang sesuai dengan filter yang dipilih.'
                              : 'Belum ada data pengguna yang terdaftar di basis data.'}
                        </p>
                        <p className="text-xs text-[#7d8f87]">
                          {activeSearch
                            ? `Tidak ada akun yang cocok dengan kata kunci "${activeSearch}". Silakan periksa kembali ejaan atau gunakan kata kunci lain.`
                            : (roleFilter !== 'all' || statusFilter !== 'all')
                              ? 'Kombinasi filter role dan status saat ini tidak menghasilkan data akun.'
                              : 'Akun administrator atau pengguna akan muncul di tabel ini setelah didaftarkan.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* 3. Populated Rows */}
              {!loading &&
                usersList.map((item) => (
                  <tr
                    key={item.id}
                    data-testid={`user-row-${item.id}`}
                    className="hover:bg-[#fbfbfa] transition-colors border-b border-[#f1f5f3]"
                  >
                    {/* 1. Nama Lengkap */}
                    <td className="py-3.5 px-4 sm:px-6 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#123027] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs">
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-bold text-[#17221e] block line-clamp-2 break-normal text-xs leading-snug"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {item.id === user?.id && (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                              Akun Anda (Aktif)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Identitas (Username) */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="space-y-0.5 min-w-0">
                        <span
                          className="font-mono text-xs font-semibold text-[#123027] bg-[#f4f7f5] px-2 py-0.5 rounded border border-[#e2e8e5] truncate block max-w-full"
                          title={`@${item.username}`}
                        >
                          @{item.username}
                        </span>
                        <span className="text-[10px] text-[#7d8f87] block font-mono pl-0.5">
                          ID: #{item.id}
                        </span>
                      </div>
                    </td>

                    {/* 3. Email (PRIORITAS UTAMA: Satu baris horizontal, ellipsis, tooltip, no break-all) */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5 text-[#17221e] font-mono text-xs min-w-0">
                        <Mail className="w-3.5 h-3.5 text-[#7d8f87] shrink-0" />
                        <span
                          className="truncate whitespace-nowrap min-w-0 flex-1 text-xs text-[#17221e]"
                          title={item.email}
                        >
                          {item.email}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyEmail(e, item.email, item.id)}
                          className="p-1 rounded text-[#7d8f87] hover:text-[#123027] hover:bg-[#eef5f2] transition-colors shrink-0 cursor-pointer"
                          title={copiedEmailId === item.id ? 'Email disalin!' : `Salin ${item.email}`}
                          aria-label={`Salin email ${item.email}`}
                        >
                          {copiedEmailId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 4. Instansi / Unit Kerja */}
                    <td className="py-3.5 px-4 align-middle">
                      {item.agency ? (
                        <div className="flex items-start gap-1.5 text-[#17221e] min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-[#7d8f87] shrink-0 mt-0.5" />
                          <span
                            className="line-clamp-2 break-normal text-xs text-[#17221e] leading-snug"
                            title={item.agency}
                          >
                            {item.agency}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#94a3b8] italic text-xs">Belum diisi</span>
                      )}
                    </td>

                    {/* 5. Role */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {item.role === 'super_admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#122e25] text-emerald-300 border border-[#1b4337] whitespace-nowrap">
                          Super Admin
                        </span>
                      ) : item.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef5f2] text-[#123027] border border-[#cbe1d8] whitespace-nowrap">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          User
                        </span>
                      )}
                    </td>

                    {/* 6. Status Akun */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>

                    {/* 7. Tanggal Terdaftar */}
                    <td className="py-3.5 px-4 sm:px-6 align-middle text-[#4e6057] whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-[#7d8f87] shrink-0" />
                        <span>{item.created_at_formatted}</span>
                      </div>
                    </td>

                    {/* 8. Aksi (System Feature 14, 15, & 16) */}
                    <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5 justify-center flex-nowrap">
                        <button
                          type="button"
                          data-testid={`btn-detail-user-${item.id}`}
                          onClick={() => handleOpenDetailModal(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title={`Lihat detail akun ${item.name}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-edit-user-${item.id}`}
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#eef5f2] hover:border-[#123027] text-[#123027] font-semibold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title={`Edit akun ${item.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#123027] shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-delete-user-${item.id}`}
                          onClick={() => handleOpenDeleteModal(item)}
                          disabled={item.id === user?.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold text-xs shadow-2xs transition-colors shrink-0 ${item.id === user?.id
                              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                              : 'border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 cursor-pointer'
                            }`}
                          title={
                            item.id === user?.id
                              ? 'Anda tidak dapat menghapus akun Anda sendiri'
                              : `Hapus akun ${item.name}`
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {!loading && usersList.length > 0 && (
          <div
            data-testid="users-pagination"
            className="p-4 sm:px-6 border-t border-[#f1f5f3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="text-[#7d8f87]">
              Menampilkan{' '}
              <span className="font-bold text-[#17221e]">{pagination.from || 1}</span> -{' '}
              <span className="font-bold text-[#17221e]">
                {pagination.to || usersList.length}
              </span>{' '}
              dari <span className="font-bold text-[#17221e]">{pagination.total}</span> pengguna
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
      {/* SYSTEM FEATURE 13: MODAL FORM TAMBAH PENGGUNA BARU                 */}
      {/* =================================================================== */}
      {/* =================================================================== */}
      {/* SYSTEM FEATURE 14: MODAL FORM EDIT PENGGUNA                         */}
      {/* =================================================================== */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-user-title"
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
                  <Pencil className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="modal-edit-user-title" className="text-base font-bold text-white tracking-tight">
                    Ubah Data Akun Pengguna
                  </h2>
                  <p className="text-xs text-slate-300">
                    Perbarui profil, instansi, peran hak akses, atau status akun pengguna terpilih.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={isSubmittingEdit}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#142f26] transition-colors cursor-pointer disabled:opacity-50"
                title="Tutup formulir edit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEditUser} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* General Error Banner */}
              {editFormGeneralError && (
                <div
                  data-testid="edit-user-general-error"
                  className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-rose-900">Gagal Memperbarui Akun</p>
                    <p className="text-[11.5px] text-rose-700 leading-relaxed">{editFormGeneralError}</p>
                  </div>
                </div>
              )}

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Nama Lengkap */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-name" className="block text-xs font-bold text-[#17221e]">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-edit-name"
                    name="name"
                    type="text"
                    data-testid="input-edit-name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${editFormErrors.name
                      ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                      }`}
                  />
                  {editFormErrors.name && (
                    <p data-testid="error-edit-name" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.name}
                    </p>
                  )}
                </div>

                {/* 2. Username */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-username" className="block text-xs font-bold text-[#17221e]">
                    Username (Identitas Login) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87] font-mono">
                      @
                    </span>
                    <input
                      id="input-edit-username"
                      name="username"
                      type="text"
                      data-testid="input-edit-username"
                      value={editFormData.username}
                      onChange={handleEditFormChange}
                      className={`w-full rounded-lg border pl-8 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] font-mono focus:bg-white focus:outline-none transition-all ${editFormErrors.username
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                  </div>
                  {editFormErrors.username && (
                    <p data-testid="error-edit-username" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.username}
                    </p>
                  )}
                </div>

                {/* 3. Alamat Email */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-email" className="block text-xs font-bold text-[#17221e]">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-edit-email"
                      name="email"
                      type="email"
                      data-testid="input-edit-email"
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${editFormErrors.email
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                  </div>
                  {editFormErrors.email && (
                    <p data-testid="error-edit-email" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.email}
                    </p>
                  )}
                </div>

                {/* 4. Instansi / Afiliasi */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-agency" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Instansi / Afiliasi</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-edit-agency"
                      name="agency"
                      type="text"
                      data-testid="input-edit-agency"
                      value={editFormData.agency}
                      onChange={handleEditFormChange}
                      className="w-full rounded-lg border border-[#d2ded8] pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                  </div>
                  {editFormErrors.agency && (
                    <p data-testid="error-edit-agency" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.agency}
                    </p>
                  )}
                </div>

                {/* 5. Nomor Telepon */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-phone" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Nomor Telepon</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-edit-phone"
                      name="phone"
                      type="text"
                      data-testid="input-edit-phone"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      className="w-full rounded-lg border border-[#d2ded8] pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                  </div>
                  {editFormErrors.phone && (
                    <p data-testid="error-edit-phone" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.phone}
                    </p>
                  )}
                </div>

                {/* 6. Role Akun */}
                <div className="space-y-1">
                  <label htmlFor="select-edit-role" className="block text-xs font-bold text-[#17221e]">
                    Role Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="select-edit-role"
                    name="role"
                    data-testid="select-edit-role"
                    value={editFormData.role}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] font-medium focus:bg-white focus:outline-none transition-all cursor-pointer ${editFormErrors.role
                      ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                      }`}
                  >
                    <option value="user">User (Staf Puskesmas / Pengguna Biasa)</option>
                    <option value="admin">Admin (Administrator Dinas Kesehatan)</option>
                  </select>
                  {editFormErrors.role && (
                    <p data-testid="error-edit-role" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.role}
                    </p>
                  )}
                </div>

                {/* 7. Status Akun */}
                <div className="space-y-1">
                  <label htmlFor="select-edit-status" className="block text-xs font-bold text-[#17221e]">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="select-edit-status"
                    name="is_active"
                    data-testid="select-edit-status"
                    value={editFormData.is_active}
                    onChange={handleEditFormChange}
                    className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] font-medium focus:bg-white focus:outline-none transition-all cursor-pointer ${editFormErrors.is_active
                      ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                      }`}
                  >
                    <option value="1">Aktif (Dapat Login ke Sistem)</option>
                    <option value="0">Nonaktif (Akses Ditangguhkan)</option>
                  </select>
                  {editFormErrors.is_active && (
                    <p data-testid="error-edit-status" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.is_active}
                    </p>
                  )}
                </div>

                {/* 8. Kata Sandi Baru (Opsional) */}
                <div className="space-y-1">
                  <label htmlFor="input-edit-password" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Ubah Kata Sandi</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Kosongkan jika tidak diubah</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-edit-password"
                      name="password"
                      type={showEditPassword ? 'text' : 'password'}
                      data-testid="input-edit-password"
                      value={editFormData.password}
                      onChange={handleEditFormChange}
                      placeholder="Minimal 8 karakter baru"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${editFormErrors.password
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      title={showEditPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {editFormErrors.password && (
                    <p data-testid="error-edit-password" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.password}
                    </p>
                  )}
                </div>

                {/* 9. Konfirmasi Kata Sandi Baru */}
                {editFormData.password && (
                  <div className="space-y-1">
                    <label htmlFor="input-edit-password-confirmation" className="block text-xs font-bold text-[#17221e]">
                      Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="input-edit-password-confirmation"
                        name="password_confirmation"
                        type={showEditPasswordConfirm ? 'text' : 'password'}
                        data-testid="input-edit-password-confirmation"
                        value={editFormData.password_confirmation}
                        onChange={handleEditFormChange}
                        placeholder="Ketik ulang kata sandi baru"
                        className={`w-full rounded-lg border pl-9 pr-9 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${editFormErrors.password_confirmation
                          ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                          : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPasswordConfirm((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      >
                        {showEditPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {editFormErrors.password_confirmation && (
                      <p data-testid="error-edit-password-confirm" className="text-[11px] text-rose-600 font-medium">
                        {editFormErrors.password_confirmation}
                      </p>
                    )}
                  </div>
                )}

                {/* 10. Deskripsi / Bio */}
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="input-edit-bio" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Deskripsi / Bio Tugas</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <textarea
                    id="input-edit-bio"
                    name="bio"
                    rows={2}
                    data-testid="input-edit-bio"
                    value={editFormData.bio}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                  />
                  {editFormErrors.bio && (
                    <p data-testid="error-edit-bio" className="text-[11px] text-rose-600 font-medium">
                      {editFormErrors.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-[#f1f5f3] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  data-testid="btn-cancel-edit-user"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-edit-user"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-emerald-400" />
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
      {/* SYSTEM FEATURE 13: MODAL FORM TAMBAH PENGGUNA BARU                 */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-user-title"
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
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="modal-create-user-title" className="text-base font-bold text-white tracking-tight">
                    Tambah Pengguna Baru
                  </h2>
                  <p className="text-xs text-slate-300">
                    Daftarkan akun administrator atau staf surveilans baru ke sistem WebGIS.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isSubmittingCreate}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#142f26] transition-colors cursor-pointer disabled:opacity-50"
                title="Tutup formulir"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmitCreateUser} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* General Error Banner */}
              {createFormGeneralError && (
                <div
                  data-testid="create-user-general-error"
                  className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-rose-900">Gagal Menyimpan Akun</p>
                    <p className="text-[11.5px] text-rose-700 leading-relaxed">{createFormGeneralError}</p>
                  </div>
                </div>
              )}

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Nama Lengkap */}
                <div className="space-y-1">
                  <label htmlFor="input-create-name" className="block text-xs font-bold text-[#17221e]">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-create-name"
                    name="name"
                    type="text"
                    data-testid="input-create-name"
                    value={createFormData.name}
                    onChange={handleCreateFormChange}
                    placeholder="Contoh: Dr. Budi Santoso, M.Kes"
                    className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.name
                      ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                      }`}
                  />
                  {createFormErrors.name && (
                    <p data-testid="error-create-name" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.name}
                    </p>
                  )}
                </div>

                {/* 2. Username */}
                <div className="space-y-1">
                  <label htmlFor="input-create-username" className="block text-xs font-bold text-[#17221e]">
                    Username (Identitas Login) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87] font-mono">
                      @
                    </span>
                    <input
                      id="input-create-username"
                      name="username"
                      type="text"
                      data-testid="input-create-username"
                      value={createFormData.username}
                      onChange={handleCreateFormChange}
                      placeholder="budi_santoso"
                      className={`w-full rounded-lg border pl-8 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] font-mono focus:bg-white focus:outline-none transition-all ${createFormErrors.username
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                  </div>
                  {createFormErrors.username ? (
                    <p data-testid="error-create-username" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.username}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#7d8f87]">
                      Gunakan huruf kecil, angka, titik, atau garis bawah (_).
                    </p>
                  )}
                </div>

                {/* 3. Alamat Email */}
                <div className="space-y-1">
                  <label htmlFor="input-create-email" className="block text-xs font-bold text-[#17221e]">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-create-email"
                      name="email"
                      type="email"
                      data-testid="input-create-email"
                      value={createFormData.email}
                      onChange={handleCreateFormChange}
                      placeholder="budi.santoso@dinkes.banyumaskab.go.id"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.email
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                  </div>
                  {createFormErrors.email && (
                    <p data-testid="error-create-email" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.email}
                    </p>
                  )}
                </div>

                {/* 4. Instansi / Unit Kerja */}
                <div className="space-y-1">
                  <label htmlFor="input-create-agency" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Instansi / Afiliasi</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-create-agency"
                      name="agency"
                      type="text"
                      data-testid="input-create-agency"
                      value={createFormData.agency}
                      onChange={handleCreateFormChange}
                      placeholder="Contoh: Puskesmas Purwokerto Timur I"
                      className="w-full rounded-lg border border-[#d2ded8] pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                  </div>
                  {createFormErrors.agency && (
                    <p data-testid="error-create-agency" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.agency}
                    </p>
                  )}
                </div>

                {/* 5. Nomor Telepon */}
                <div className="space-y-1">
                  <label htmlFor="input-create-phone" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Nomor Telepon</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-create-phone"
                      name="phone"
                      type="text"
                      data-testid="input-create-phone"
                      value={createFormData.phone}
                      onChange={handleCreateFormChange}
                      placeholder="+62 812-3456-7890"
                      className="w-full rounded-lg border border-[#d2ded8] pl-9 pr-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                    />
                  </div>
                  {createFormErrors.phone && (
                    <p data-testid="error-create-phone" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.phone}
                    </p>
                  )}
                </div>

                {/* 6. Role Akun */}
                <div className="space-y-1">
                  <label htmlFor="select-create-role" className="block text-xs font-bold text-[#17221e]">
                    Role Akun <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="select-create-role"
                      name="role"
                      data-testid="select-create-role"
                      value={createFormData.role}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] font-medium focus:bg-white focus:outline-none transition-all cursor-pointer ${createFormErrors.role
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    >
                      <option value="user">User (Staf Puskesmas / Pengguna Biasa)</option>
                      <option value="admin">Admin (Administrator Dinas Kesehatan)</option>
                    </select>
                  </div>
                  {createFormErrors.role && (
                    <p data-testid="error-create-role" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.role}
                    </p>
                  )}
                </div>

                {/* 7. Status Akun */}
                <div className="space-y-1">
                  <label htmlFor="select-create-status" className="block text-xs font-bold text-[#17221e]">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="select-create-status"
                      name="is_active"
                      data-testid="select-create-status"
                      value={createFormData.is_active}
                      onChange={handleCreateFormChange}
                      className={`w-full rounded-lg border px-3 py-2 bg-[#fbfbfa] text-[#17221e] font-medium focus:bg-white focus:outline-none transition-all cursor-pointer ${createFormErrors.is_active
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    >
                      <option value="1">Aktif (Dapat Login ke Sistem)</option>
                      <option value="0">Nonaktif (Akses Ditangguhkan)</option>
                    </select>
                  </div>
                  {createFormErrors.is_active && (
                    <p data-testid="error-create-status" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.is_active}
                    </p>
                  )}
                </div>

                {/* 8. Kata Sandi */}
                <div className="space-y-1">
                  <label htmlFor="input-create-password" className="block text-xs font-bold text-[#17221e]">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-create-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      data-testid="input-create-password"
                      value={createFormData.password}
                      onChange={handleCreateFormChange}
                      placeholder="Minimal 8 karakter"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.password
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {createFormErrors.password ? (
                    <p data-testid="error-create-password" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.password}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#7d8f87]">Minimal 8 karakter kombinasi.</p>
                  )}
                </div>

                {/* 9. Konfirmasi Kata Sandi */}
                <div className="space-y-1">
                  <label htmlFor="input-create-password-confirmation" className="block text-xs font-bold text-[#17221e]">
                    Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                      <KeyRound className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="input-create-password-confirmation"
                      name="password_confirmation"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      data-testid="input-create-password-confirmation"
                      value={createFormData.password_confirmation}
                      onChange={handleCreateFormChange}
                      placeholder="Ketik ulang kata sandi"
                      className={`w-full rounded-lg border pl-9 pr-9 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none transition-all ${createFormErrors.password_confirmation
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-[#d2ded8] focus:border-[#123027] focus:ring-1 focus:ring-[#123027]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7d8f87] hover:text-[#17221e] cursor-pointer"
                      title={showPasswordConfirm ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {createFormErrors.password_confirmation && (
                    <p data-testid="error-create-password-confirm" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.password_confirmation}
                    </p>
                  )}
                </div>

                {/* 10. Deskripsi / Bio (Full Width) */}
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="input-create-bio" className="block text-xs font-bold text-[#17221e] flex items-center justify-between">
                    <span>Deskripsi / Bio Tugas</span>
                    <span className="text-[10px] text-[#7d8f87] font-normal">Opsional</span>
                  </label>
                  <textarea
                    id="input-create-bio"
                    name="bio"
                    rows={2}
                    data-testid="input-create-bio"
                    value={createFormData.bio}
                    onChange={handleCreateFormChange}
                    placeholder="Contoh: Petugas input laporan surveilans epidemiologi DBD Puskesmas Purwokerto Timur."
                    className="w-full rounded-lg border border-[#d2ded8] px-3 py-2 bg-[#fbfbfa] text-[#17221e] focus:bg-white focus:outline-none focus:border-[#123027] focus:ring-1 focus:ring-[#123027] transition-all"
                  />
                  {createFormErrors.bio && (
                    <p data-testid="error-create-bio" className="text-[11px] text-rose-600 font-medium">
                      {createFormErrors.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-[#f1f5f3] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  data-testid="btn-cancel-create-user"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-create-user"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Akun...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Buat Akun</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 15: MODAL KONFIRMASI HAPUS PENGGUNA                  */}
      {/* =================================================================== */}
      {isDeleteModalOpen && deletingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-user-title"
          data-testid="modal-delete-user"
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
                  <h2 id="modal-delete-user-title" className="text-base font-bold text-rose-950 tracking-tight">
                    Konfirmasi Hapus Akun
                  </h2>
                  <p className="text-xs text-rose-700">
                    Tindakan ini memerlukan konfirmasi administrator.
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
              {/* Error banner if deletion rejected by backend (e.g. self-delete or last admin) */}
              {deleteModalError && (
                <div
                  data-testid="error-delete-user"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-900">Penghapusan Akun Ditolak</p>
                    <p className="text-[11px] leading-relaxed">{deleteModalError}</p>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-[#17221e]">
                Apakah Anda yakin ingin menghapus akun pengguna ini?
              </p>

              {/* Target User Info Card */}
              <div className="rounded-xl border border-[#d8e2dd] bg-[#fbfbfa] p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Nama Lengkap:</span>
                  <span className="font-bold text-[#17221e] text-right">{deletingUser.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Username:</span>
                  <span className="font-mono font-semibold text-[#123027] text-right">@{deletingUser.username}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e9efe8]">
                  <span className="text-[#7d8f87] font-medium">Email:</span>
                  <span className="text-[#17221e] font-medium text-right break-all">{deletingUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7d8f87] font-medium">Role:</span>
                  <span>
                    {deletingUser.role === 'super_admin' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#122e25] text-emerald-300">
                        Super Admin
                      </span>
                    ) : deletingUser.role === 'admin' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#eef5f2] text-[#123027] border border-[#cbe1d8]">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        User
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  Akun yang dihapus tidak dapat digunakan untuk login kembali ke sistem.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-delete-user"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-lg border border-[#d2ded8] bg-white hover:bg-[#fbfbfa] text-xs font-semibold text-[#4e6057] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-user"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Akun...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Hapus Akun</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SYSTEM FEATURE 16: MODAL DETAIL AKUN PENGGUNA (READ-ONLY)           */}
      {/* =================================================================== */}
      {isDetailModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-user-title"
          data-testid="modal-detail-user"
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
                  <h2 id="modal-detail-user-title" className="text-base font-bold text-white tracking-tight">
                    Detail Akun Pengguna
                  </h2>
                  <p className="text-xs text-slate-300">
                    Informasi lengkap profil pengguna, hak akses, riwayat, dan afiliasi terdaftar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup modal detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#17221e]">
              {/* State A: Loading State */}
              {isLoadingDetail && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-[#123027] animate-spin" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#17221e]">Memuat Detail Akun Pengguna...</p>
                    <p className="text-[11px] text-[#7d8f87]">Mengambil data aktual langsung dari basis data MySQL.</p>
                  </div>
                </div>
              )}

              {/* State B: Error State */}
              {!isLoadingDetail && detailError && (
                <div className="py-8 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-950">Gagal Mengambil Detail Akun</h3>
                    <p data-testid="error-detail-user" className="text-xs text-rose-700 max-w-sm mx-auto">
                      {detailError}
                    </p>
                  </div>
                  {detailUserId && (
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(detailUserId)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                  )}
                </div>
              )}

              {/* State C: Loaded Data */}
              {!isLoadingDetail && !detailError && detailUserData && (
                <>
                  {/* Top Profile Summary Card */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#f4f7f5] border border-[#dce6e1]">
                    <div className="w-12 h-12 rounded-full bg-[#123027] text-white font-bold text-sm flex items-center justify-center shrink-0 border border-[#1e483b] shadow-2xs">
                      {getInitials(detailUserData.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          data-testid="detail-user-name"
                          className="font-bold text-sm text-[#17221e] truncate"
                        >
                          {detailUserData.name}
                        </h3>
                        <span
                          data-testid="detail-user-username"
                          className="font-mono text-xs text-[#7d8f87]"
                        >
                          @{detailUserData.username}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {/* Role Badge */}
                        <span data-testid="detail-user-role">
                          {detailUserData.role === 'super_admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#122e25] text-emerald-300 border border-[#1b4337]">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              Super Admin
                            </span>
                          ) : detailUserData.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#eef5f2] text-[#123027] border border-[#cbe1d8]">
                              <Shield className="w-3 h-3 text-[#123027]" />
                              Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <User className="w-3 h-3 text-blue-600" />
                              Pengguna (User)
                            </span>
                          )}
                        </span>

                        {/* Status Badge */}
                        <span data-testid="detail-user-status">
                          {detailUserData.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Nonaktif
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Information Sections Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* A. Identitas Pengguna */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <User className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Identitas Pengguna</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Nama Lengkap</p>
                          <p className="font-semibold text-xs text-[#17221e] mt-0.5">{detailUserData.name}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Username</p>
                          <p className="font-mono font-medium text-xs text-[#123027] mt-0.5">@{detailUserData.username}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Hak Akses / Peran</p>
                          <p className="font-semibold text-xs text-[#17221e] mt-0.5">{detailUserData.role_label || detailUserData.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* B. Informasi Kontak dan Afiliasi */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <Mail className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Kontak & Afiliasi</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Alamat Email</p>
                          <p data-testid="detail-user-email" className="font-semibold text-xs text-[#17221e] mt-0.5 break-all">
                            {detailUserData.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Nomor Kontak / Telepon</p>
                          <p data-testid="detail-user-phone" className="text-xs text-[#17221e] mt-0.5">
                            {detailUserData.phone || <span className="text-[#94a3b8] italic">Belum diisi</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Instansi / Unit Kerja</p>
                          <p data-testid="detail-user-agency" className="text-xs text-[#17221e] mt-0.5">
                            {detailUserData.agency || <span className="text-[#94a3b8] italic">Belum diisi</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* C. Informasi Status dan Riwayat Akun */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <Calendar className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Status & Riwayat Akun</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Status Operasional</p>
                          <p className="font-semibold text-xs text-[#17221e] mt-0.5">
                            {detailUserData.status_label || (detailUserData.is_active ? 'Aktif' : 'Nonaktif')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Tanggal Terdaftar</p>
                          <p data-testid="detail-user-created-at" className="text-xs text-[#17221e] mt-0.5">
                            {detailUserData.created_at_formatted || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d8f87] font-medium">Terakhir Diperbarui</p>
                          <p data-testid="detail-user-updated-at" className="text-xs text-[#17221e] mt-0.5">
                            {detailUserData.updated_at_formatted || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* D. Informasi Tambahan / Bio */}
                    <div className="space-y-3 p-3.5 rounded-xl border border-[#e2e8e5] bg-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f3]">
                        <FileText className="w-4 h-4 text-[#123027]" />
                        <h4 className="font-bold text-xs text-[#17221e]">Deskripsi & Catatan Tugas</h4>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#7d8f87] font-medium">Bio / Keterangan Penugasan</p>
                        <div
                          data-testid="detail-user-bio"
                          className="mt-1 text-xs text-[#17221e] leading-relaxed bg-[#fbfbfa] p-2.5 rounded-lg border border-[#f1f5f3] min-h-[56px] whitespace-pre-wrap"
                        >
                          {detailUserData.bio || <span className="text-[#94a3b8] italic">Belum diisi</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions (Read-Only Close Button) */}
            <div className="bg-[#fbfbfa] px-5 sm:px-6 py-3.5 border-t border-[#e2e8e5] flex items-center justify-end">
              <button
                type="button"
                data-testid="btn-close-detail-user"
                onClick={handleCloseDetailModal}
                className="px-5 py-2 rounded-lg bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

