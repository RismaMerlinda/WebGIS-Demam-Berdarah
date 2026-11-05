<?php

namespace App\Services\Chatbot;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroqClientService
{
    protected ?string $apiKey;
    protected string $model;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key');
        $this->model = config('services.groq.model', 'openai/gpt-oss-120b');
        $this->baseUrl = rtrim(config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
    }

    /**
     * Check if Groq API Key is configured and non-empty.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->apiKey) && is_string($this->apiKey) && trim($this->apiKey) !== '';
    }

    /**
     * Get active configured model name.
     */
    public function getModel(): string
    {
        return $this->model;
    }

    /**
     * Get base URL for Groq API.
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Perform lightweight health check using GET /models (cached to preserve quota).
     */
    public function checkHealth(bool $forceRefresh = false): array
    {
        if (! $this->isConfigured()) {
            return [
                'is_online' => false,
                'is_configured' => false,
                'state' => 'UNCONFIGURED',
                'status_label' => 'Offline (Belum Dikonfigurasi)',
                'message' => 'Layanan Asisten AI belum dikonfigurasi dengan API Key yang aktif. Silakan tambahkan GROQ_API_KEY pada file .env backend.',
                'model' => $this->model,
                'available_models' => [],
            ];
        }

        // In test environment, bypass network calls for predictable testing
        if (app()->environment('testing')) {
            return [
                'is_online' => true,
                'is_configured' => true,
                'state' => 'ONLINE',
                'status_label' => 'Online',
                'message' => 'Layanan Asisten AI siap menerima pertanyaan.',
                'model' => $this->model,
                'available_models' => [$this->model],
            ];
        }

        $cacheKey = 'groq_api_health_' . md5($this->apiKey . '_' . $this->model);

        if (! $forceRefresh && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            $response = Http::timeout(8)
                ->withToken($this->apiKey)
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
                ->get("{$this->baseUrl}/models");

            $status = $response->status();

            if ($response->successful()) {
                $data = $response->json();
                $availableModels = array_column($data['data'] ?? [], 'id');
                $isModelPresent = in_array($this->model, $availableModels, true);

                $result = [
                    'is_online' => true,
                    'is_configured' => true,
                    'state' => 'ONLINE',
                    'status_label' => 'Online',
                    'message' => 'Layanan Asisten AI aktif dan terhubung ke Groq API.',
                    'model' => $this->model,
                    'model_verified' => $isModelPresent,
                    'available_models' => array_slice($availableModels, 0, 15),
                    'total_models' => count($availableModels),
                ];

                Cache::put($cacheKey, $result, now()->addMinutes(10));

                return $result;
            }

            if ($status === 401) {
                $result = [
                    'is_online' => false,
                    'is_configured' => true,
                    'state' => 'INVALID_KEY',
                    'status_label' => 'Offline (Autentikasi Gagal)',
                    'message' => 'Autentikasi gagal. GROQ_API_KEY pada file .env tidak valid atau sudah kedaluwarsa.',
                    'model' => $this->model,
                    'available_models' => [],
                ];
                Cache::put($cacheKey, $result, now()->addMinutes(3));

                return $result;
            }

            if ($status === 429) {
                $result = [
                    'is_online' => false,
                    'is_configured' => true,
                    'state' => 'QUOTA_EXCEEDED',
                    'status_label' => 'Gangguan Layanan',
                    'message' => 'Layanan asisten sementara mencapai batas kuota penggunaan (rate limit).',
                    'model' => $this->model,
                    'available_models' => [],
                ];
                Cache::put($cacheKey, $result, now()->addMinutes(1));

                return $result;
            }

            $result = [
                'is_online' => false,
                'is_configured' => true,
                'state' => 'UNAVAILABLE',
                'status_label' => 'Gangguan Layanan',
                'message' => "Penyedia layanan Groq sedang mengalami gangguan (HTTP {$status}).",
                'model' => $this->model,
                'available_models' => [],
            ];
            Cache::put($cacheKey, $result, now()->addMinutes(2));

            return $result;
        } catch (ConnectionException $e) {
            $result = [
                'is_online' => false,
                'is_configured' => true,
                'state' => 'UNAVAILABLE',
                'status_label' => 'Gangguan Layanan',
                'message' => 'Batas waktu koneksi ke api.groq.com tercapai.',
                'model' => $this->model,
                'available_models' => [],
            ];
            Cache::put($cacheKey, $result, now()->addMinutes(1));

            return $result;
        } catch (\Throwable $e) {
            return [
                'is_online' => false,
                'is_configured' => true,
                'state' => 'UNAVAILABLE',
                'status_label' => 'Gangguan Layanan',
                'message' => 'Terjadi kesalahan sistem saat menghubungi penyedia AI.',
                'model' => $this->model,
                'available_models' => [],
            ];
        }
    }

    /**
     * Test active connection to Groq API with a minimal ping.
     */
    public function testConnection(): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'status_code' => 503,
                'error_type' => 'API_KEY_NOT_CONFIGURED',
                'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi karena GROQ_API_KEY belum dikonfigurasi pada file .env backend.',
            ];
        }

        return $this->sendChatCompletion([
            ['role' => 'user', 'content' => 'ping'],
        ], 10, 0.1);
    }

    /**
     * Send chat completion request to Groq API.
     */
    public function sendChatCompletion(array $messages, int $maxTokens = 600, float $temperature = 0.4): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'status_code' => 503,
                'error_type' => 'API_KEY_NOT_CONFIGURED',
                'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi karena GROQ_API_KEY belum dikonfigurasi pada file .env backend. Silakan tambahkan API Key yang aktif.',
                'technical_detail' => 'GROQ_API_KEY belum dikonfigurasi di file .env backend.',
            ];
        }

        try {
            $response = Http::timeout(25)
                ->withToken($this->apiKey)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/chat/completions", [
                    'model' => $this->model,
                    'messages' => $messages,
                    'max_tokens' => $maxTokens,
                    'temperature' => $temperature,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? null;

                if (! empty($content)) {
                    return [
                        'success' => true,
                        'content' => trim($content),
                        'model' => $data['model'] ?? $this->model,
                        'usage' => $data['usage'] ?? [],
                    ];
                }
            }

            $status = $response->status();
            $body = $response->json();
            $rawErrorMessage = $body['error']['message'] ?? 'Terjadi kesalahan dari penyedia layanan AI.';

            // Safe diagnostic logging: NEVER log the actual API key or user query
            Log::warning('Groq API HTTP error', [
                'timestamp' => now()->toIso8601String(),
                'status_code' => $status,
                'model' => $this->model,
                'error_message' => $rawErrorMessage,
            ]);

            // Differentiated error handling per requirements
            if ($status === 401) {
                return [
                    'success' => false,
                    'status_code' => 401,
                    'error_type' => 'API_KEY_INVALID',
                    'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi. Autentikasi ke penyedia AI gagal: API Key tidak valid atau sudah kedaluwarsa.',
                    'technical_detail' => 'Koneksi ke penyedia AI gagal: API Key tidak valid.',
                ];
            }

            if ($status === 403) {
                return [
                    'success' => false,
                    'status_code' => 403,
                    'error_type' => 'ACCESS_FORBIDDEN',
                    'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi. Akses ke model AI ditolak oleh penyedia layanan (403 Forbidden).',
                    'technical_detail' => 'Akses ke model AI ditolak oleh penyedia layanan.',
                ];
            }

            if ($status === 404) {
                return [
                    'success' => false,
                    'status_code' => 404,
                    'error_type' => 'MODEL_OR_ENDPOINT_NOT_FOUND',
                    'message' => "Maaf, Kak, asisten sedang belum dapat dihubungi. Model '{$this->model}' atau endpoint tidak ditemukan pada penyedia Groq.",
                    'technical_detail' => "Model '{$this->model}' atau endpoint tidak ditemukan pada penyedia layanan.",
                ];
            }

            if ($status === 400) {
                return [
                    'success' => false,
                    'status_code' => 400,
                    'error_type' => 'INVALID_REQUEST',
                    'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi. Permintaan tidak valid: ' . $rawErrorMessage,
                    'technical_detail' => 'Parameter permintaan AI tidak valid: ' . $rawErrorMessage,
                ];
            }

            if ($status === 429) {
                return [
                    'success' => false,
                    'status_code' => 429,
                    'error_type' => 'QUOTA_EXCEEDED',
                    'message' => 'Maaf, layanan asisten sedang mencapai batas penggunaan sementara (429 Rate Limit). Silakan coba kembali nanti.',
                    'technical_detail' => 'Batas rate limit atau kuota tercapai: ' . $rawErrorMessage,
                ];
            }

            if ($status >= 500) {
                return [
                    'success' => false,
                    'status_code' => $status,
                    'error_type' => 'PROVIDER_SERVER_ERROR',
                    'message' => 'Maaf, Kak, layanan asisten sedang mengalami gangguan server dari penyedia AI (HTTP ' . $status . '). Silakan coba beberapa saat lagi.',
                    'technical_detail' => 'Gangguan pada server upstream Groq API (HTTP ' . $status . ').',
                ];
            }

            return [
                'success' => false,
                'status_code' => $status,
                'error_type' => 'UPSTREAM_ERROR',
                'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi. ' . $rawErrorMessage,
                'technical_detail' => $rawErrorMessage,
            ];
        } catch (ConnectionException $e) {
            Log::error('Groq connection timeout or network failure', [
                'timestamp' => now()->toIso8601String(),
                'model' => $this->model,
                'exception' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status_code' => 504,
                'error_type' => 'CONNECTION_TIMEOUT',
                'message' => 'Maaf, Kak, koneksi ke server asisten AI mengalami batas waktu (timeout). Silakan periksa jaringan dan coba lagi.',
                'technical_detail' => 'Masalah koneksi jaringan atau timeout ke api.groq.com.',
            ];
        } catch (\Throwable $e) {
            Log::error('Unexpected GroqClientService exception', [
                'timestamp' => now()->toIso8601String(),
                'model' => $this->model,
                'exception' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status_code' => 500,
                'error_type' => 'SYSTEM_EXCEPTION',
                'message' => 'Maaf, Kak, asisten sedang belum dapat dihubungi. Silakan coba kembali beberapa saat lagi.',
                'technical_detail' => $e->getMessage(),
            ];
        }
    }
}

