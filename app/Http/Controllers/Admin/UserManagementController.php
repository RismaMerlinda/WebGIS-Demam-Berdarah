<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Throwable;

class UserManagementController extends Controller
{
    /**
     * Display a listing of system users with search, role filter, and status filter (System Feature 12).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = User::query();

            // 1. Pencarian kata kunci (nama lengkap, username, atau email)
            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // 2. Filter berdasarkan Role (Semua, Admin, User)
            if ($request->filled('role') && $request->input('role') !== 'all') {
                $role = strtolower(trim((string) $request->input('role')));
                if ($role === 'admin') {
                    $query->whereIn('role', ['admin', 'super_admin']);
                } elseif ($role === 'user') {
                    $query->where('role', 'user');
                }
            }

            // 3. Filter berdasarkan Status Akun (Semua, Aktif, Nonaktif)
            if ($request->filled('status') && $request->input('status') !== 'all') {
                $status = strtolower(trim((string) $request->input('status')));
                if ($status === 'active' || $status === '1') {
                    $query->where('is_active', true);
                } elseif ($status === 'inactive' || $status === '0') {
                    $query->where('is_active', false);
                }
            }

            // 4. Pengurutan data (terbaru di awal secara default)
            $sortBy = in_array($request->input('sort_by'), ['name', 'username', 'email', 'role', 'created_at'], true)
                ? $request->input('sort_by')
                : 'created_at';
            $sortDirection = strtolower((string) $request->input('sort_direction')) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortDirection);

            // 5. Paginasi data (default 10 per halaman)
            $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
            $paginated = $query->paginate($perPage);

            // 6. Transformasi data tanpa mengekspos kata sandi atau hash
            $data = $paginated->getCollection()->map(function (User $user) {
                return $this->formatUserData($user);
            });

            // 7. Ringkasan agregat seluruh master data pengguna
            $summary = [
                'total_users' => User::count(),
                'total_admins' => User::whereIn('role', ['admin', 'super_admin'])->count(),
                'total_regular_users' => User::where('role', 'user')->count(),
                'total_active' => User::where('is_active', true)->count(),
                'total_inactive' => User::where('is_active', false)->count(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Data pengguna berhasil dimuat.',
                'users' => [
                    'data' => $data,
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem(),
                    'to' => $paginated->lastItem(),
                ],
                'summary' => $summary,
                'filters_applied' => [
                    'search' => $request->input('search'),
                    'role' => $request->input('role', 'all'),
                    'status' => $request->input('status', 'all'),
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat mengambil data pengguna.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a newly created user in storage (System Feature 13).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-zA-Z0-9_.]+$/',
                Rule::unique('users', 'username'),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:150',
                Rule::unique('users', 'email'),
            ],
            'agency' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:25', 'regex:/^[0-9+\-\s()]+$/'],
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
            'is_active' => ['required', 'boolean'],
            'password' => ['required', 'string', 'min:8'],
            'password_confirmation' => ['nullable', 'string', 'same:password'],
            'bio' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'name.min' => 'Nama lengkap minimal 2 karakter.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'username.required' => 'Username wajib diisi.',
            'username.min' => 'Username minimal 3 karakter.',
            'username.max' => 'Username maksimal 50 karakter.',
            'username.regex' => 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).',
            'username.unique' => 'Username sudah digunakan. Silakan gunakan username lain.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format alamat email tidak valid.',
            'email.max' => 'Alamat email maksimal 150 karakter.',
            'email.unique' => 'Email sudah terdaftar. Silakan gunakan alamat email lain.',
            'agency.max' => 'Instansi/afiliasi maksimal 120 karakter.',
            'phone.regex' => 'Nomor telepon hanya boleh berisi angka, spasi, tanda tambah (+), minus (-), atau kurung.',
            'phone.max' => 'Nomor telepon maksimal 25 karakter.',
            'role.required' => 'Role akun wajib dipilih.',
            'role.in' => 'Role akun yang dipilih tidak valid.',
            'is_active.required' => 'Status akun wajib dipilih.',
            'is_active.boolean' => 'Status akun tidak valid.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'password_confirmation.same' => 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.',
            'bio.max' => 'Deskripsi atau bio maksimal 1000 karakter.',
        ]);

        try {
            $user = new User();
            $user->name = trim($validated['name']);
            $user->username = trim($validated['username']);
            $user->email = strtolower(trim($validated['email']));
            $user->password = Hash::make($validated['password']);
            $user->role = $validated['role'];
            $user->is_active = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

            $agency = isset($validated['agency']) ? trim((string) $validated['agency']) : null;
            $user->agency = ! empty($agency) ? $agency : null;

            $phone = isset($validated['phone']) ? trim((string) $validated['phone']) : null;
            $user->phone = ! empty($phone) ? $phone : null;

            $bio = isset($validated['bio']) ? trim((string) $validated['bio']) : null;
            $user->bio = ! empty($bio) ? $bio : null;

            $user->email_verified_at = now();
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Akun pengguna baru berhasil dibuat.',
                'user' => $this->formatUserData($user),
            ], 201);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menyimpan akun pengguna baru.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update an existing user's information (System Feature 14).
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Data pengguna tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-zA-Z0-9_.]+$/',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:150',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'agency' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:25', 'regex:/^[0-9+\-\s()]+$/'],
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', 'string', 'min:8'],
            'password_confirmation' => ['nullable', 'required_with:password', 'same:password'],
            'bio' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'name.min' => 'Nama lengkap minimal 2 karakter.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'username.required' => 'Username wajib diisi.',
            'username.min' => 'Username minimal 3 karakter.',
            'username.max' => 'Username maksimal 50 karakter.',
            'username.regex' => 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).',
            'username.unique' => 'Username sudah digunakan oleh akun lain.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format alamat email tidak valid.',
            'email.max' => 'Alamat email maksimal 150 karakter.',
            'email.unique' => 'Email sudah digunakan oleh akun lain.',
            'agency.max' => 'Instansi/afiliasi maksimal 120 karakter.',
            'phone.regex' => 'Nomor telepon hanya boleh berisi angka, spasi, tanda tambah (+), minus (-), atau kurung.',
            'phone.max' => 'Nomor telepon maksimal 25 karakter.',
            'role.required' => 'Role akun wajib dipilih.',
            'role.in' => 'Role akun yang dipilih tidak valid.',
            'is_active.required' => 'Status akun wajib dipilih.',
            'is_active.boolean' => 'Status akun tidak valid.',
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password_confirmation.required_with' => 'Konfirmasi kata sandi baru wajib diisi jika memperbarui kata sandi.',
            'password_confirmation.same' => 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.',
            'bio.max' => 'Deskripsi atau bio maksimal 1000 karakter.',
        ]);

        $currentUser = $request->user();
        $targetIsActive = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        // Proteksi 1: Administrator tidak dapat menonaktifkan akun miliknya sendiri
        if ($currentUser && $currentUser->id === $user->id && ! $targetIsActive) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menonaktifkan akun administrator Anda sendiri.',
                'errors' => [
                    'is_active' => ['Anda tidak dapat menonaktifkan akun administrator Anda sendiri demi mencegah kehilangan akses.'],
                ],
            ], 422);
        }

        // Proteksi 2: Administrator tidak dapat menurunkan perannya sendiri ke user biasa
        if ($currentUser && $currentUser->id === $user->id && $validated['role'] === 'user') {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menurunkan role akun administrator Anda sendiri.',
                'errors' => [
                    'role' => ['Anda tidak dapat menurunkan role akun administrator Anda sendiri demi mencegah kehilangan akses.'],
                ],
            ], 422);
        }

        // Proteksi 3: Mencegah sistem kehilangan seluruh administrator aktif
        if (in_array($user->role, ['admin', 'super_admin']) && (! $targetIsActive || $validated['role'] === 'user')) {
            $otherActiveAdminsCount = User::whereIn('role', ['admin', 'super_admin'])
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($otherActiveAdminsCount < 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Operasi ditolak. Sistem wajib memiliki setidaknya satu administrator aktif.',
                    'errors' => [
                        'role' => ['Sistem wajib memiliki setidaknya satu administrator aktif yang dapat mengelola WebGIS.'],
                    ],
                ], 422);
            }
        }

        try {
            $user->name = trim($validated['name']);
            $user->username = trim($validated['username']);
            $user->email = strtolower(trim($validated['email']));
            $user->role = $validated['role'];
            $user->is_active = $targetIsActive;

            $agency = isset($validated['agency']) ? trim((string) $validated['agency']) : null;
            $user->agency = ! empty($agency) ? $agency : null;

            $phone = isset($validated['phone']) ? trim((string) $validated['phone']) : null;
            $user->phone = ! empty($phone) ? $phone : null;

            $bio = isset($validated['bio']) ? trim((string) $validated['bio']) : null;
            $user->bio = ! empty($bio) ? $bio : null;

            // Perbarui kata sandi jika diinput oleh administrator
            if (! empty($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }

            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Data pengguna berhasil diperbarui.',
                'user' => $this->formatUserData($user),
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memperbarui akun pengguna.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Remove the specified user from storage (System Feature 15).
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request, $id) {
                $user = User::lockForUpdate()->find($id);

                if (! $user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Data pengguna tidak ditemukan.',
                    ], 404);
                }

                $currentAdmin = $request->user();

                // 1. Proteksi: Administrator tidak boleh menghapus akunnya sendiri
                if ($currentAdmin && (int) $currentAdmin->id === (int) $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda tidak dapat menghapus akun administrator yang sedang digunakan.',
                    ], 403);
                }

                // 2. Proteksi: Administrator terakhir tidak boleh dihapus
                if ($user->isAdmin()) {
                    $otherActiveAdminsCount = User::whereIn('role', ['admin', 'super_admin'])
                        ->where('is_active', true)
                        ->where('id', '!=', $user->id)
                        ->lockForUpdate()
                        ->count();

                    if ($otherActiveAdminsCount < 1) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Akun administrator terakhir tidak dapat dihapus. Sistem harus memiliki minimal satu administrator aktif.',
                        ], 403);
                    }
                }

                // 3. Bersihkan sesi terkait jika tabel sessions ada
                if (Schema::hasTable('sessions')) {
                    DB::table('sessions')->where('user_id', $user->id)->delete();
                }

                // 4. Hapus pengguna dari basis data MySQL
                $user->delete();

                return response()->json([
                    'success' => true,
                    'message' => 'Akun pengguna berhasil dihapus.',
                ], 200);
            });
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Penghapusan akun gagal. Silakan coba kembali.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Display the specified user detail (System Feature 16).
     */
    public function show(int|string $id): JsonResponse
    {
        try {
            $user = User::find($id);

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data akun pengguna tidak ditemukan.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Detail akun berhasil diambil.',
                'user' => $this->formatUserData($user),
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail akun pengguna. Terjadi kesalahan pada server.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Format user model into standardized public presentation without exposing password/hash.
     */
    private function formatUserData(User $user): array
    {
        $roleLabel = match ($user->role) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Administrator',
            'user' => 'Pengguna (User)',
            default => ucfirst((string) $user->role),
        };

        $username = $user->username ?? (explode('@', (string) $user->email)[0] ?? null);

        $createdAtFormatted = $user->created_at
            ? $user->created_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
            : '-';

        $updatedAtFormatted = $user->updated_at
            ? $user->updated_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
            : '-';

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $username,
            'email' => $user->email,
            'agency' => $user->agency ?? null,
            'phone' => $user->phone ?? null,
            'role' => $user->role,
            'role_label' => $roleLabel,
            'is_active' => (bool) $user->is_active,
            'status_label' => $user->is_active ? 'Aktif' : 'Nonaktif',
            'created_at' => $user->created_at?->toISOString(),
            'created_at_formatted' => $createdAtFormatted,
            'updated_at' => $user->updated_at?->toISOString(),
            'updated_at_formatted' => $updatedAtFormatted,
            'bio' => $user->bio ?? null,
        ];
    }
}

