<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\EducationAdminController;
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
