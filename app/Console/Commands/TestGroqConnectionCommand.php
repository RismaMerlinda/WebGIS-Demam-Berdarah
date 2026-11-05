<?php

namespace App\Console\Commands;

use App\Services\Chatbot\GroqClientService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestGroqConnectionCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'chatbot:groq-test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Diagnosis and test live Groq API connectivity safely';

    /**
     * Execute the console command.
     */
    public function handle(GroqClientService $client): int
    {
        $this->info('====================================================');
        $this->info('   DIAGNOSIS KONEKSI GROQ API WEBGIS DBD BANYUMAS   ');
        $this->info('====================================================');

        // 1. Check API Key presence without printing it
        $isConfigured = $client->isConfigured();
        $this->line('1. Pemeriksaan Konfigurasi API Key:');
        if (! $isConfigured) {
            $this->error('   [FAIL] GROQ_API_KEY belum tersedia di file .env backend!');
            $this->line('   -> Silakan buka file D:\WebGIS Demam Berdarah\.env');
            $this->line('   -> Masukkan API Key Anda pada baris: GROQ_API_KEY=gsk_...');
            $this->line('   -> Dapatkan API Key resmi di: https://console.groq.com/keys');
            $this->line('');
            $this->warn('Pengujian dihentikan karena API Key belum dikonfigurasi.');
            return self::FAILURE;
        }

        $this->info('   [OK] GROQ_API_KEY terdeteksi (panjang valid, tersimpan aman).');

        $model = $client->getModel();
        $baseUrl = $client->getBaseUrl();
        $this->line("   Model dikonfigurasi: {$model}");
        $this->line("   Base URL: {$baseUrl}");

        // 2. Test GET /models to inspect available models & auth
        $this->line('');
        $this->line('2. Pengujian Autentikasi & Daftar Model (GET /models):');
        try {
            $health = $client->checkHealth(forceRefresh: true);

            if (! $health['is_online']) {
                $this->error("   [FAIL] Status: {$health['status_label']}");
                $this->line("   Pesan: {$health['message']}");
                return self::FAILURE;
            }

            $this->info('   [OK] Autentikasi Groq API berhasil!');
            $models = $health['available_models'] ?? [];
            $this->line('   Jumlah model dapat diakses: ' . count($models));

            $isModelFound = in_array($model, $models, true);
            if ($isModelFound) {
                $this->info("   [OK] Model '{$model}' TERSEDIA dan siap digunakan pada akun ini.");
            } else {
                $this->warn("   [CATATAN] Model '{$model}' TIDAK DITEMUKAN pada daftar model akun Groq ini.");
                $this->line('   Model populer yang tersedia di akun Anda:');
                foreach (array_slice($models, 0, 8) as $m) {
                    $this->line("     - {$m}");
                }
                $this->line("   Jika ingin menggunakan model yang tersedia, sesuaikan GROQ_MODEL pada .env.");
            }
        } catch (\Throwable $e) {
            $this->error('   [FAIL] Gagal menghubungi endpoint /models: ' . $e->getMessage());
            return self::FAILURE;
        }

        // 3. Test Chat Completion request
        $this->line('');
        $this->line('3. Pengujian Live Chat Completion:');
        $prompt = 'Halo, jelaskan secara singkat fungsi WebGIS DBD Kabupaten Banyumas.';
        $this->line("   Prompt: \"{$prompt}\"");

        $messages = [
            ['role' => 'system', 'content' => 'Anda adalah Asisten WebGIS DBD Banyumas yang ramah dan informatif.'],
            ['role' => 'user', 'content' => $prompt],
        ];

        $start = microtime(true);
        $result = $client->sendChatCompletion($messages, 200, 0.4);
        $elapsed = round(microtime(true) - $start, 2);

        if (! $result['success']) {
            $this->error("   [FAIL] HTTP {$result['status_code']} ({$result['error_type']})");
            $this->line("   Pesan: {$result['message']}");
            if (! empty($result['technical_detail'])) {
                $this->line("   Detail: {$result['technical_detail']}");
            }
            return self::FAILURE;
        }

        $this->info("   [OK] Respon berhasil diterima dalam {$elapsed} detik!");
        $this->line("   Model aktif: {$result['model']}");
        if (! empty($result['usage'])) {
            $u = $result['usage'];
            $this->line("   Token Usage: Prompt {$u['prompt_tokens']} | Completion {$u['completion_tokens']} | Total {$u['total_tokens']}");
        }

        $this->line('');
        $this->info('--- Jawaban Model (Groq API): ---');
        $this->line($result['content']);
        $this->info('---------------------------------');

        $this->info('Status: KONEKSI GROQ API SEPENUHNYA BERFUNGSI!');
        return self::SUCCESS;
    }
}

