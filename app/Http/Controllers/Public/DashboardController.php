<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Indonesian month names dictionary.
     */
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /**
     * Get public aggregate epidemiological summary for Banyumas.
     * Uses period definitions and data strictly consistent with MapController.
     */
    public function summary(Request $request): JsonResponse
    {
        $year = $request->input('tahun', $request->input('year'));
        $month = $request->input('bulan', $request->input('month'));
        $periodId = $request->input('periode_id');

        // 1. Specific period_id passed directly
        if ($request->filled('periode_id')) {
            $period = Periode::published()->where('id', (int) $periodId)->first();
            if (! $period) {
                return $this->emptySummaryResponse('Data belum tersedia untuk periode publikasi.');
            }
            return $this->singlePeriodSummaryResponse($period);
        }

        // 2. Year provided with 'all' / 'semua' / omitted month
        $monthNormalized = strtolower(trim((string) $month));
        if ($year && ($month === null || $monthNormalized === '' || $monthNormalized === 'all' || $monthNormalized === 'semua')) {
            $monthlyPeriods = Periode::published()
                ->where('tahun', (int) $year)
                ->whereNotNull('bulan')
                ->orderBy('bulan')
                ->get();

            if ($monthlyPeriods->isNotEmpty()) {
                return $this->accumulatedYearSummaryResponse((int) $year, $monthlyPeriods);
            }

            $annualPeriod = Periode::published()
                ->where('tahun', (int) $year)
                ->whereNull('bulan')
                ->first();

            if ($annualPeriod) {
                return $this->singlePeriodSummaryResponse($annualPeriod);
            }

            return $this->emptySummaryResponse("Data publikasi belum tersedia untuk tahun {$year}.");
        }

        // 3. Both Year and specific Month (1..12) provided
        if ($year && $month !== null) {
            $period = Periode::published()
                ->where('tahun', (int) $year)
                ->where('bulan', (int) $month)
                ->first();

            if (! $period) {
                $monthName = self::MONTH_NAMES[(int) $month] ?? "Bulan {$month}";
                $annualPeriod = Periode::published()
                    ->where('tahun', (int) $year)
                    ->whereNull('bulan')
                    ->first();
                $hasMonthlyInYear = Periode::published()
                    ->where('tahun', (int) $year)
                    ->whereNotNull('bulan')
                    ->exists();

                if ($annualPeriod && ! $hasMonthlyInYear) {
                    return $this->emptySummaryResponse(
                        "Rincian bulanan tidak tersedia untuk periode {$monthName} {$year}. Data tahun {$year} hanya tersedia dalam bentuk agregat tahunan.",
                        'annual_only'
                    );
                }

                return $this->emptySummaryResponse(
                    "Data kasus belum tersedia untuk periode {$monthName} {$year}.",
                    'month_unavailable'
                );
            }

            return $this->singlePeriodSummaryResponse($period);
        }

        // 4. Default latest published period (Januari 2026 or earliest available)
        $periodQuery = Periode::published();
        $period = (clone $periodQuery)->where('tahun', 2026)->where('bulan', 1)->first()
            ?? $periodQuery->orderByDesc('tahun')->orderBy('bulan')->first();

        if (! $period) {
            return $this->emptySummaryResponse('Data belum tersedia untuk periode publikasi.');
        }

        return $this->singlePeriodSummaryResponse($period);
    }

    /**
     * Summary response for a single published period (monthly or annual).
     */
    private function singlePeriodSummaryResponse(Periode $period): JsonResponse
    {
        $isAnnual = ($period->tipe_periode === 'annual' || $period->bulan === null);

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
                    'month' => $isAnnual ? 'all' : $period->bulan,
                    'period_type' => $isAnnual ? 'annual' : 'monthly',
                    'is_annual' => $isAnnual,
                ],
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_with_data' => 0,
                    'highest_case_subdistrict' => null,
                    'subdistricts_with_cases' => 0,
                    'priority_count' => 0,
                ],
                'rankings' => [],
                'metadata' => [
                    'source' => $period->sumber_data,
                    'status' => $isAnnual ? 'Data Agregat Tahunan Terverifikasi' : 'Simulasi Pengembangan',
                    'completeness' => $period->status_kelengkapan,
                    'is_simulation' => ! $isAnnual,
                    'updated_at' => $period->updated_at?->format('d M Y H:i'),
                ],
            ]);
        }

        $totalCases = (int) $records->sum('jumlah_kasus');
        $subdistrictsWithData = (int) $records->count();
        $subdistrictsWithCases = (int) $records->where('jumlah_kasus', '>', 0)->count();
        $priorityCount = (int) $records->where('jumlah_kasus', '>=', 10)->count();

        $sorted = $records->sortByDesc('jumlah_kasus')->values();

        $rank = 1;
        $rankings = $sorted->map(function ($item) use (&$rank) {
            $cases = (int) $item->jumlah_kasus;
            $priority = $cases >= 10
                ? 'Wilayah Prioritas Pemantauan'
                : ($cases > 0 ? 'Pemantauan Rutin' : 'Nol Kasus');

            return [
                'rank' => $rank++,
                'subdistrict_id' => $item->kecamatan_id,
                'subdistrict_code' => $item->kecamatan?->kode,
                'subdistrict_name' => $item->kecamatan?->nama ?? 'Tidak Diketahui',
                'population' => $item->jumlah_penduduk ?: $item->kecamatan?->jumlah_penduduk,
                'cases' => $cases,
                'deaths' => (int) $item->jumlah_meninggal,
                'incidence_rate' => $item->incidence_rate,
                'priority_status' => $priority,
            ];
        });

        $highestRecord = $sorted->first();
        $highestSubdistrict = ($highestRecord && $highestRecord->jumlah_kasus > 0)
            ? [
                'name' => $highestRecord->kecamatan?->nama,
                'cases' => (int) $highestRecord->jumlah_kasus,
                'priority_status' => $highestRecord->jumlah_kasus >= 10
                    ? 'Wilayah Prioritas Pemantauan'
                    : 'Pemantauan Rutin',
            ]
            : null;

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => $period->id,
                'name' => $period->nama,
                'year' => $period->tahun,
                'month' => $isAnnual ? 'all' : $period->bulan,
                'range' => $period->rentang_waktu,
                'period_type' => $isAnnual ? 'annual' : 'monthly',
                'is_annual' => $isAnnual,
                'is_accumulation' => false,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_with_data' => $subdistrictsWithData,
                'highest_case_subdistrict' => $highestSubdistrict,
                'subdistricts_with_cases' => $subdistrictsWithCases,
                'priority_count' => $priorityCount,
            ],
            'rankings' => $rankings,
            'metadata' => [
                'source' => $period->sumber_data,
                'status' => $isAnnual ? 'Data Agregat Tahunan Terverifikasi' : 'Simulasi Pengembangan',
                'completeness' => $period->status_kelengkapan,
                'is_simulation' => ! $isAnnual,
                'updated_at' => $period->updated_at?->format('d M Y H:i'),
                'notes' => $period->keterangan,
            ],
        ]);
    }

    /**
     * Summary response for accumulated published months within a year.
     */
    private function accumulatedYearSummaryResponse(int $year, Collection $periods): JsonResponse
    {
        $periodIds = $periods->pluck('id')->all();
        $firstMonthName = self::MONTH_NAMES[$periods->first()->bulan] ?? 'Bulan ' . $periods->first()->bulan;
        $lastMonthName = self::MONTH_NAMES[$periods->last()->bulan] ?? 'Bulan ' . $periods->last()->bulan;
        $monthCount = $periods->count();

        $rangeText = ($monthCount === 1)
            ? "{$firstMonthName} {$year}"
            : "{$firstMonthName} – {$lastMonthName} {$year}";

        $allKecamatan = Kecamatan::orderBy('kode')->get();
        $allRecords = KasusAgregat::whereIn('periode_id', $periodIds)
            ->published()
            ->get()
            ->groupBy('kecamatan_id');

        $aggregated = [];
        foreach ($allKecamatan as $kec) {
            $recs = $allRecords->get($kec->id);
            if ($recs && $recs->isNotEmpty()) {
                $cases = (int) $recs->sum('jumlah_kasus');
                $deaths = (int) $recs->sum('jumlah_meninggal');
                $ir = ($kec->jumlah_penduduk && $kec->jumlah_penduduk > 0)
                    ? round(($cases / $kec->jumlah_penduduk) * 100000, 2)
                    : null;

                $aggregated[] = [
                    'subdistrict_id' => $kec->id,
                    'subdistrict_code' => $kec->kode,
                    'subdistrict_name' => $kec->nama,
                    'population' => $kec->jumlah_penduduk,
                    'cases' => $cases,
                    'deaths' => $deaths,
                    'incidence_rate' => $ir,
                    'priority_status' => $cases >= 10
                        ? 'Wilayah Prioritas Pemantauan'
                        : ($cases > 0 ? 'Pemantauan Rutin' : 'Nol Kasus'),
                ];
            }
        }

        $sorted = collect($aggregated)->sortByDesc('cases')->values();
        $rank = 1;
        $rankings = $sorted->map(function ($item) use (&$rank) {
            $item['rank'] = $rank++;
            return $item;
        });

        $totalCases = (int) $sorted->sum('cases');
        $subdistrictsWithData = $sorted->count();
        $subdistrictsWithCases = $sorted->where('cases', '>', 0)->count();
        $priorityCount = $sorted->where('cases', '>=', 10)->count();
        $first = $sorted->first();

        $highestSubdistrict = ($first && $first['cases'] > 0)
            ? [
                'name' => $first['subdistrict_name'],
                'cases' => $first['cases'],
                'priority_status' => $first['priority_status'],
            ]
            : null;

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => null,
                'name' => "Semua Bulan Tersedia {$year} ({$rangeText})",
                'year' => $year,
                'month' => 'all',
                'range' => $rangeText,
                'months_count' => $monthCount,
                'period_type' => 'monthly_accumulation',
                'is_annual' => false,
                'is_accumulation' => true,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_with_data' => $subdistrictsWithData,
                'highest_case_subdistrict' => $highestSubdistrict,
                'subdistricts_with_cases' => $subdistrictsWithCases,
                'priority_count' => $priorityCount,
            ],
            'rankings' => $rankings,
            'metadata' => [
                'source' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas',
                'status' => 'Simulasi Pengembangan',
                'completeness' => "Akumulasi {$monthCount} Bulan Terbit ({$rangeText})",
                'is_simulation' => true,
                'updated_at' => now()->format('d M Y H:i'),
                'notes' => "Data kumulatif dihitung dari penjumlahan {$monthCount} bulan yang telah terbit pada tahun {$year}.",
            ],
        ]);
    }

    /**
     * Standard empty summary response.
     */
    private function emptySummaryResponse(string $message, string $reason = 'unavailable'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'has_data' => false,
            'reason' => $reason,
            'message' => $message,
            'period' => null,
            'summary' => [
                'total_cases' => null,
                'subdistricts_with_data' => 0,
                'highest_case_subdistrict' => null,
                'subdistricts_with_cases' => 0,
                'priority_count' => 0,
            ],
            'rankings' => [],
            'metadata' => null,
        ]);
    }
}
