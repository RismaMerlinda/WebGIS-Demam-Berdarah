<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = strtolower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($throttleKey)->response(function (Request $request, array $headers) {
                $retryAfter = $headers['Retry-After'] ?? 60;

                return response()->json([
                    'success' => false,
                    'message' => "Terlalu banyak percobaan login. Silakan tunggu {$retryAfter} detik sebelum mencoba kembali.",
                    'retry_after' => (int) $retryAfter,
                ], 429, $headers);
            });
        });
    }
}
