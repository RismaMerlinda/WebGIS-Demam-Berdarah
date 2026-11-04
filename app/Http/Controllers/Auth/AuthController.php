<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    /**
     * Handle administrator login request.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');
        $throttleKey = strtolower((string) $request->input('email')).'|'.$request->ip();

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'success' => false,
                'message' => 'Email atau password yang Anda masukkan tidak sesuai.',
                'errors' => [
                    'email' => ['Kredensial tidak sesuai dengan data administrator.'],
                ],
            ], 422);
        }

        if (! $user->is_active) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'success' => false,
                'message' => 'Akun administrator Anda telah dinonaktifkan. Silakan hubungi super administrator.',
            ], 403);
        }

        if (! in_array($user->role, ['admin', 'super_admin'])) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Akun ini tidak memiliki hak akses administrator.',
            ], 403);
        }

        // Login success: clear rate limiter, log in user, regenerate session
        RateLimiter::clear($throttleKey);
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Autentikasi administrator berhasil.',
            'csrf_token' => csrf_token(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_admin' => true,
            ],
        ]);
    }

    /**
     * Handle administrator logout request.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Sesi administrator berhasil diakhiri.',
            'csrf_token' => csrf_token(),
        ]);
    }

    /**
     * Get current authenticated administrator information.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return response()->json([
                'authenticated' => false,
                'user' => null,
            ]);
        }

        return response()->json([
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_admin' => true,
            ],
        ]);
    }
}
