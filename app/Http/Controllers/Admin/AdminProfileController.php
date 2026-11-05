<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminProfileController extends Controller
{
    /**
     * Get the authenticated administrator's profile information (System Feature 9).
     */
    public function show(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sesi autentikasi administrator tidak ditemukan atau telah kedaluwarsa.',
                ], 401);
            }

            return response()->json([
                'success' => true,
                'message' => 'Profil administrator berhasil dimuat.',
                'profile' => $this->formatProfileData($user),
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memuat profil administrator.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update the authenticated administrator's profile information (System Feature 10).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi autentikasi administrator tidak ditemukan atau telah kedaluwarsa.',
            ], 401);
        }

        // Validasi input pembaruan profil administrator
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
            'bio' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'name.min' => 'Nama lengkap minimal 2 karakter.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'username.required' => 'Username wajib diisi.',
            'username.min' => 'Username minimal 3 karakter.',
            'username.max' => 'Username maksimal 50 karakter.',
            'username.regex' => 'Username hanya boleh berisi huruf, angka, titik, atau garis bawah (_).',
            'username.unique' => 'Username tersebut sudah digunakan oleh akun lain.',
            'email.required' => 'Alamat email dinas wajib diisi.',
            'email.email' => 'Format alamat email tidak valid.',
            'email.unique' => 'Alamat email tersebut sudah terdaftar untuk akun lain.',
            'agency.max' => 'Instansi/unit kerja maksimal 120 karakter.',
            'phone.regex' => 'Nomor kontak hanya boleh berisi angka, spasi, tanda tambah (+), minus (-), atau kurung.',
            'phone.max' => 'Nomor kontak maksimal 25 karakter.',
            'bio.max' => 'Bio atau catatan tugas maksimal 1000 karakter.',
        ]);

        try {
            // Perbarui atribut yang diizinkan (strict assignment, role & password terlindungi)
            $user->name = trim($validated['name']);
            $user->username = trim($validated['username']);
            $user->email = strtolower(trim($validated['email']));

            $agency = isset($validated['agency']) ? trim((string) $validated['agency']) : null;
            $user->agency = ! empty($agency) ? $agency : null;

            $phone = isset($validated['phone']) ? trim((string) $validated['phone']) : null;
            $user->phone = ! empty($phone) ? $phone : null;

            $bio = isset($validated['bio']) ? trim((string) $validated['bio']) : null;
            $user->bio = ! empty($bio) ? $bio : null;

            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Perubahan profil administrator berhasil disimpan.',
                'profile' => $this->formatProfileData($user),
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan perubahan profil ke database.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Helper to format user profile data for consistent API response.
     */
    private function formatProfileData($user): array
    {
        $roleLabel = match ($user->role) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Administrator',
            default => ucfirst((string) $user->role),
        };

        $username = $user->username ?? (explode('@', (string) $user->email)[0] ?? null);

        $createdAtFormatted = $user->created_at
            ? $user->created_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
            : null;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $username,
            'email' => $user->email,
            'role' => $user->role,
            'role_label' => $roleLabel,
            'is_active' => (bool) $user->is_active,
            'avatar_url' => $user->avatar_url ?? null,
            'agency' => $user->agency ?? null,
            'phone' => $user->phone ?? null,
            'bio' => $user->bio ?? null,
            'created_at' => $user->created_at?->toISOString(),
            'created_at_formatted' => $createdAtFormatted,
        ];
    }
}
