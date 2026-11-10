<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\CaseManagementController;
use App\Http\Controllers\Admin\EducationAdminController;
use App\Http\Controllers\Admin\MetadataManagementController;
use App\Http\Controllers\Admin\PeriodManagementController;
use App\Http\Controllers\Admin\RegionManagementController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Public\ChatbotController;
use App\Http\Controllers\Public\DashboardController;
use App\Http\Controllers\Public\EducationController;
use App\Http\Controllers\Public\MapController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Backend API Routes for Administrator & System
|--------------------------------------------------------------------------
| Stateful web middleware (session, CSRF, cookie) is active for single-origin SPA.
*/

Route::prefix('api')->group(function () {
    // Public aggregate endpoints
    Route::get('/public/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/public/map/periods', [MapController::class, 'periods']);
    Route::get('/public/map', [MapController::class, 'index']);
    Route::get('/public/compare', [MapController::class, 'compare']);
    Route::get('/public/trends', [MapController::class, 'trends']);
    Route::get('/public/metadata', [MapController::class, 'metadata']);
    Route::get('/public/metadata/periods', [MapController::class, 'metadataPeriods']);
    Route::get('/public/metadata/sources', [MapController::class, 'metadataSources']);
    Route::get('/public/education', [EducationController::class, 'index']);
    Route::get('/public/education/faqs', [EducationController::class, 'faqs']);
    Route::get('/public/education/{slug}', [EducationController::class, 'show']);

    // Fitur 12: Public AI Chatbot Assistant (Asisten WebGIS DBD Banyumas)
    Route::get('/public/chatbot/status', [ChatbotController::class, 'status']);
    Route::post('/public/chatbot/message', [ChatbotController::class, 'sendMessage'])->middleware('throttle:20,1');

    // Auth endpoints
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Protected Administrator API Routes
    Route::middleware(['auth', 'admin'])->group(function () {
        // Fitur 8: Administrator Dashboard Summary & Recent Cases
        Route::get('/admin/dashboard/summary', [AdminDashboardController::class, 'summary']);

        // Fitur 9 & 10: Administrator Profile Access & Update
        Route::get('/admin/profile', [AdminProfileController::class, 'show']);
        Route::put('/admin/profile', [AdminProfileController::class, 'update']);

        // Fitur 11: Mengubah Kata Sandi Administrator
        Route::put('/admin/profile/password', [AdminProfileController::class, 'updatePassword']);

        // Fitur 12, 13, 14, 15, & 16: Manajemen Pengguna (Pencarian, Filter, Tambah, Edit, Hapus, & Detail Akun)
        Route::get('/admin/users', [UserManagementController::class, 'index']);
        Route::post('/admin/users', [UserManagementController::class, 'store']);
        Route::get('/admin/users/{id}', [UserManagementController::class, 'show']);
        Route::put('/admin/users/{id}', [UserManagementController::class, 'update']);
        Route::delete('/admin/users/{id}', [UserManagementController::class, 'destroy']);

        // Fitur 17, 18, 19 & 20: Pengelolaan Data Kasus DBD (Akses, Detail, Tambah, Edit, & Hapus Kasus)
        Route::get('/admin/cases', [CaseManagementController::class, 'index']);
        Route::post('/admin/cases', [CaseManagementController::class, 'store']);
        Route::get('/admin/cases/{id}', [CaseManagementController::class, 'show']);
        Route::put('/admin/cases/{id}', [CaseManagementController::class, 'update']);
        Route::delete('/admin/cases/{id}', [CaseManagementController::class, 'destroy']);
        Route::get('/admin/districts', [CaseManagementController::class, 'districts']);
        Route::get('/admin/case-periods', [CaseManagementController::class, 'periods']);

        // Fitur 21, 22, 23 & 24: Pengelolaan Data Wilayah Kecamatan (Akses, Detail, Tambah, Edit, & Hapus Wilayah)
        Route::get('/admin/regions', [RegionManagementController::class, 'index']);
        Route::post('/admin/regions', [RegionManagementController::class, 'store']);
        Route::get('/admin/regions/{id}', [RegionManagementController::class, 'show']);
        Route::put('/admin/regions/{id}', [RegionManagementController::class, 'update']);
        Route::post('/admin/regions/{id}', [RegionManagementController::class, 'update']);
        Route::delete('/admin/regions/{id}', [RegionManagementController::class, 'destroy']);

        // Fitur 25, 26, 27, & 28: Pengelolaan Data Periode Waktu (Akses, Detail, Tambah, Edit, & Hapus Periode)
        Route::get('/admin/periods', [PeriodManagementController::class, 'index']);
        Route::post('/admin/periods', [PeriodManagementController::class, 'store']);
        Route::get('/admin/periods/{id}', [PeriodManagementController::class, 'show']);
        Route::put('/admin/periods/{id}', [PeriodManagementController::class, 'update']);
        Route::post('/admin/periods/{id}', [PeriodManagementController::class, 'update']);
        Route::delete('/admin/periods/{id}', [PeriodManagementController::class, 'destroy']);

        // Fitur 29, 30, 31, & 32: Pengelolaan Metadata Dataset (Akses, Detail, Pencarian, Edit, Tambah, & Hapus Metadata)
        Route::get('/admin/metadata', [MetadataManagementController::class, 'index']);
        Route::post('/admin/metadata', [MetadataManagementController::class, 'store']);
        Route::get('/admin/metadata/{id}', [MetadataManagementController::class, 'show']);
        Route::put('/admin/metadata/{id}', [MetadataManagementController::class, 'update']);
        Route::post('/admin/metadata/{id}', [MetadataManagementController::class, 'update']);
        Route::delete('/admin/metadata/{id}', [MetadataManagementController::class, 'destroy']);

        Route::get('/admin/ping', function () {
            return response()->json([
                'success' => true,
                'message' => 'Administrator session is valid and authorized.',
                'user' => auth()->user()->only(['id', 'name', 'email', 'role']),
            ]);
        });

        // Fitur 11: Administrator Education Content Management
        Route::get('/admin/education', [EducationAdminController::class, 'index']);
        Route::post('/admin/education/categories', [EducationAdminController::class, 'storeCategory']);
        Route::put('/admin/education/categories/{id}', [EducationAdminController::class, 'updateCategory']);
        Route::delete('/admin/education/categories/{id}', [EducationAdminController::class, 'destroyCategory']);

        Route::post('/admin/education/contents', [EducationAdminController::class, 'storeContent']);
        Route::post('/admin/education/contents/{id}', [EducationAdminController::class, 'updateContent']);
        Route::put('/admin/education/contents/{id}', [EducationAdminController::class, 'updateContent']);
        Route::delete('/admin/education/contents/{id}', [EducationAdminController::class, 'destroyContent']);

        Route::post('/admin/education/faqs', [EducationAdminController::class, 'storeFaq']);
        Route::put('/admin/education/faqs/{id}', [EducationAdminController::class, 'updateFaq']);
        Route::delete('/admin/education/faqs/{id}', [EducationAdminController::class, 'destroyFaq']);
    });
});

/*
|--------------------------------------------------------------------------
| Web Routes - Single Page Application Entry Point
|--------------------------------------------------------------------------
| All web requests are routed to the main Blade layout hosting the React SPA.
| Any backend API routes with prefix 'api' are excluded from the SPA fallback.
*/

Route::get('/login', function () {
    return view('app');
})->name('login');

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
