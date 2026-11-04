<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Public\DashboardController;
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

    // Auth endpoints
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Protected Administrator API Routes
    Route::middleware(['auth', 'admin'])->group(function () {
        Route::get('/admin/ping', function () {
            return response()->json([
                'success' => true,
                'message' => 'Administrator session is valid and authorized.',
                'user' => auth()->user()->only(['id', 'name', 'email', 'role']),
            ]);
        });
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
