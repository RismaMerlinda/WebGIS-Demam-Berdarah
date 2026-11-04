<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Periode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Get public aggregate epidemiological summary for Banyumas.
     */
    public function summary(Request $request): JsonResponse
    {
        // 1. Get default latest published period (or specified period_id if valid & published)
        $periodQuery = Periode::published();

        if ($request->filled('periode_id')) {
            $period = $periodQuery->where('id', $request->integer('periode_id'))->first();
        } else {
            $period = (clone $periodQuery)->where('tahun', 2026)->where('bulan', 1)->first()
                ?? $periodQuery->orderByDesc('tahun')->orderBy('bulan')->first();
        }

        if (! $period) {
            return response()->json([
                'success' => true,
                'has_data' => false,
                'message' => 'Data belum tersedia untuk periode publikasi.',
                'period' => null,
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_with_data' => 0,
                    'highest_case_subdistrict' => null,
                    'subdistricts_with_cases' => 0,
                ],
                'rankings' => [],
                'metadata' => null,
            ]);
        }

        // 2. Fetch only published aggregate cases for the period
        $records = KasusAgregat::with('kecamatan')
            ->where('periode_id', $period->id)
            ->published()
            ->get();

        if ($records->isEmpty()) {
            return response()->json([
                'success' => true,
                'has_data' => false,
                'message' => 'Belum ada data kasus yang dipublikasikan untuk periode ini.',
                'period' => [
                    'id' => $period->id,
                    'name' => $period->nama,
                    'year' => $period->tahun,
                    'month' => $period->bulan,
                ],
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_with_data' => 0,
                    'highest_case_subdistrict' => null,
                    'subdistricts_with_cases' => 0,
                ],
                'rankings' => [],
                'metadata' => [
                    'source' => $period->sumber_data,
                    'completeness' => $period->status_kelengkapan,
                    'is_simulation' => true,
                    'updated_at' => $period->updated_at?->format('d M Y H:i'),
                ],
            ]);
        }

        // 3. Calculate summary metrics
        $totalCases = $records->sum('jumlah_kasus');
        $subdistrictsWithData = $records->count();
        $subdistrictsWithCases = $records->where('jumlah_kasus', '>', 0)->count();

        // 4. Sort and format subdistrict rankings
        $sorted = $records->sortByDesc('jumlah_kasus')->values();

        $rank = 1;
        $rankings = $sorted->map(function ($item) use (&$rank) {
            $cases = $item->jumlah_kasus;
            $priority = $cases >= 10
                ? 'Wilayah Prioritas Pemantauan'
                : ($cases > 0 ? 'Pemantauan Rutin' : 'Nol Kasus');

            return [
                'rank' => $rank++,
                'subdistrict_id' => $item->kecamatan_id,
                'subdistrict_code' => $item->kecamatan?->kode,
                'subdistrict_name' => $item->kecamatan?->nama ?? 'Tidak Diketahui',
                'population' => $item->kecamatan?->jumlah_penduduk,
                'cases' => $cases,
                'deaths' => $item->jumlah_meninggal,
                'incidence_rate' => $item->incidence_rate,
                'priority_status' => $priority,
            ];
        });

        $highestRecord = $sorted->first();
        $highestSubdistrict = ($highestRecord && $highestRecord->jumlah_kasus > 0)
            ? [
                'name' => $highestRecord->kecamatan?->nama,
                'cases' => $highestRecord->jumlah_kasus,
                'priority_status' => 'Wilayah Prioritas Pemantauan',
            ]
            : null;

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => $period->id,
                'name' => $period->nama,
                'year' => $period->tahun,
                'month' => $period->bulan,
            ],
            'summary' => [
                'total_cases' => (int) $totalCases,
                'subdistricts_with_data' => (int) $subdistrictsWithData,
                'highest_case_subdistrict' => $highestSubdistrict,
                'subdistricts_with_cases' => (int) $subdistrictsWithCases,
            ],
            'rankings' => $rankings,
            'metadata' => [
                'source' => $period->sumber_data,
                'status' => 'Simulasi Pengembangan',
                'completeness' => $period->status_kelengkapan,
                'is_simulation' => true,
                'updated_at' => $period->updated_at?->format('d M Y H:i'),
                'notes' => $period->keterangan,
            ],
        ]);
    }
}
