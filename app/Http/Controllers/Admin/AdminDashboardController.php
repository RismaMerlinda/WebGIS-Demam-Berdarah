<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AdminDashboardController extends Controller
{
    /**
     * Get summary metrics and recent aggregate cases for Administrator Dashboard (System Feature 8).
     */
    public function summary(Request $request): JsonResponse
    {
        try {
            // 1. Ringkasan Master Data (Data Aktual dari MySQL)
            // - Total kasus: jumlah catatan data kasus yang tersimpan (bukan penjumlahan angka kasus)
            // - Total wilayah: jumlah wilayah kecamatan yang terdaftar
            // - Total periode: jumlah periode yang tersimpan
            // - Jumlah pengguna: jumlah akun pengguna terdaftar
            $totalKasusRecords = KasusAgregat::count();
            $totalWilayahKecamatan = Kecamatan::count();
            $totalPeriode = Periode::count();
            $totalPenggunaTerdaftar = User::count();

            // 2. Tabel Kasus DBD Terbaru
            // Parameter pagination
            $perPage = max(1, min((int) $request->query('per_page', 10), 50));
            $page = max(1, (int) $request->query('page', 1));

            $recentCasesPaginator = KasusAgregat::with([
                'kecamatan:id,kode,nama,jumlah_penduduk',
                'periode:id,nama,tahun,bulan,tipe_periode',
            ])
                ->orderBy('updated_at', 'desc')
                ->orderBy('id', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            $transformedCases = collect($recentCasesPaginator->items())->map(function (KasusAgregat $item) {
                // Perhitungan / pengambilan Nilai Incidence Rate (IR)
                $irValue = null;
                $irFormatted = 'Belum tersedia';

                if ($item->incidence_rate !== null) {
                    $irValue = (float) $item->incidence_rate;
                    $irFormatted = number_format($irValue, 2, ',', '.') . ' / 100k';
                } elseif ($item->jumlah_penduduk && $item->jumlah_penduduk > 0 && $item->jumlah_kasus !== null) {
                    $calculated = round(($item->jumlah_kasus / $item->jumlah_penduduk) * 100000, 2);
                    $irValue = $calculated;
                    $irFormatted = number_format($calculated, 2, ',', '.') . ' / 100k';
                } elseif ($item->kecamatan && $item->kecamatan->jumlah_penduduk > 0 && $item->jumlah_kasus !== null) {
                    $calculated = round(($item->jumlah_kasus / $item->kecamatan->jumlah_penduduk) * 100000, 2);
                    $irValue = $calculated;
                    $irFormatted = number_format($calculated, 2, ',', '.') . ' / 100k';
                }

                $updatedAtFormatted = $item->updated_at
                    ? $item->updated_at->locale('id')->isoFormat('D MMM Y, HH:mm') . ' WIB'
                    : '-';

                return [
                    'id' => $item->id,
                    'kecamatan_id' => $item->kecamatan_id,
                    'kecamatan_nama' => $item->kecamatan?->nama ?? 'Tidak Diketahui',
                    'kecamatan_kode' => $item->kecamatan?->kode ?? '-',
                    'periode_id' => $item->periode_id,
                    'periode_nama' => $item->periode?->nama ?? ($item->periode ? 'Tahun ' . $item->periode->tahun : '-'),
                    'periode_tahun' => $item->periode?->tahun,
                    'periode_bulan' => $item->periode?->bulan,
                    'jumlah_kasus' => (int) $item->jumlah_kasus,
                    'jumlah_meninggal' => (int) $item->jumlah_meninggal,
                    'incidence_rate' => $irValue,
                    'incidence_rate_formatted' => $irFormatted,
                    'is_published' => (bool) $item->is_published,
                    'status_publikasi' => $item->status_publikasi ?? 'DAPAT_DIPUBLIKASIKAN',
                    'updated_at' => $item->updated_at?->toISOString(),
                    'updated_at_formatted' => $updatedAtFormatted,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Ringkasan dashboard administrator berhasil dimuat.',
                'summary' => [
                    'total_kasus' => $totalKasusRecords,
                    'total_kecamatan' => $totalWilayahKecamatan,
                    'total_periode' => $totalPeriode,
                    'total_pengguna' => $totalPenggunaTerdaftar,
                ],
                'recent_cases' => [
                    'data' => $transformedCases,
                    'current_page' => $recentCasesPaginator->currentPage(),
                    'last_page' => $recentCasesPaginator->lastPage(),
                    'per_page' => $recentCasesPaginator->perPage(),
                    'total' => $recentCasesPaginator->total(),
                    'from' => $recentCasesPaginator->firstItem(),
                    'to' => $recentCasesPaginator->lastItem(),
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memuat data dashboard administrator.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

