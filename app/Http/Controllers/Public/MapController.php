<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapController extends Controller
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
     * Get list of available published years and months for the filter dropdown.
     */
    public function periods(Request $request): JsonResponse
    {
        $publishedPeriods = Periode::published()
            ->whereNotNull('bulan')
            ->orderByDesc('tahun')
            ->orderBy('bulan')
            ->get();

        $years = $publishedPeriods->pluck('tahun')->unique()->values()->all();

        $periodsByYear = [];
        foreach ($years as $yr) {
            $periodsByYear[$yr] = $publishedPeriods->where('tahun', $yr)->map(function ($p) {
                return [
                    'id' => $p->id,
                    'year' => $p->tahun,
                    'month' => $p->bulan,
                    'month_name' => self::MONTH_NAMES[$p->bulan] ?? "Bulan {$p->bulan}",
                    'name' => $p->nama,
                ];
            })->values()->all();
        }

        $defaultYear = in_array(2026, $years) ? 2026 : ($years[0] ?? null);
        $defaultMonths = $defaultYear ? ($periodsByYear[$defaultYear] ?? []) : [];
        $defaultPeriodId = !empty($defaultMonths) ? $defaultMonths[0]['id'] : null;
        $defaultMonth = !empty($defaultMonths) ? $defaultMonths[0]['month'] : null;

        return response()->json([
            'success' => true,
            'years' => $years,
            'periods_by_year' => $periodsByYear,
            'default_selection' => [
                'year' => $defaultYear,
                'month' => $defaultMonth,
                'period_id' => $defaultPeriodId,
            ],
        ]);
    }

    /**
     * Get public choropleth map data for Banyumas subdistricts by period.
     */
    public function index(Request $request): JsonResponse
    {
        $year = $request->input('tahun', $request->input('year'));
        $month = $request->input('bulan', $request->input('month'));
        $periodId = $request->input('periode_id');

        // Case 1: Specific period_id passed directly
        if ($periodId) {
            $period = Periode::published()->where('id', (int) $periodId)->first();
            if (! $period) {
                return $this->emptyResponse('Data belum tersedia untuk periode publikasi.');
            }
            return $this->singlePeriodResponse($period);
        }

        // Case 2: Year provided and Month is 'all' / 'semua' (Accumulated Year)
        if ($year && (strtolower((string) $month) === 'all' || strtolower((string) $month) === 'semua' || ($month === null && $request->boolean('is_all_months')))) {
            return $this->accumulatedYearResponse((int) $year);
        }

        // Case 3: Both Year and Month provided
        if ($year && $month !== null) {
            $period = Periode::published()
                ->where('tahun', (int) $year)
                ->where('bulan', (int) $month)
                ->first();

            if (! $period) {
                $monthName = self::MONTH_NAMES[(int) $month] ?? "Bulan {$month}";
                return $this->emptyResponse("Data kasus belum tersedia untuk periode {$monthName} {$year}.");
            }
            return $this->singlePeriodResponse($period);
        }

        // Case 4: Default fallback (no filter params) -> default to January 2026 or earliest 2026
        $defaultPeriod = Periode::published()
            ->where('tahun', 2026)
            ->where('bulan', 1)
            ->first();

        if (! $defaultPeriod) {
            $defaultPeriod = Periode::published()
                ->whereNotNull('bulan')
                ->orderByDesc('tahun')
                ->orderBy('bulan')
                ->first();
        }

        if (! $defaultPeriod) {
            return $this->emptyResponse('Data belum tersedia untuk periode publikasi.');
        }

        return $this->singlePeriodResponse($defaultPeriod);
    }

    /**
     * Generate response for a single specific published period.
     */
    private function singlePeriodResponse(Periode $period): JsonResponse
    {
        $allKecamatan = Kecamatan::orderBy('kode')->get();
        $records = KasusAgregat::where('periode_id', $period->id)
            ->published()
            ->get()
            ->keyBy('kecamatan_id');

        $totalCases = 0;
        $priorityCount = 0;
        $activeCasesArray = [];

        $districts = $allKecamatan->map(function ($kec) use ($records, &$totalCases, &$priorityCount, &$activeCasesArray) {
            $record = $records->get($kec->id);

            if ($record) {
                $cases = (int) $record->jumlah_kasus;
                $totalCases += $cases;
                $activeCasesArray[] = $cases;

                $isPriority = ($cases >= 10);
                if ($isPriority) {
                    $priorityCount++;
                }

                $tier = $this->determineTier($cases);
                $priorityStatus = $this->getPriorityStatusLabel($tier);

                return [
                    'id' => $kec->id,
                    'code' => $kec->kode,
                    'name' => $kec->nama,
                    'has_data' => true,
                    'cases' => $cases,
                    'deaths' => (int) $record->jumlah_meninggal,
                    'incidence_rate' => $record->incidence_rate,
                    'tier' => $tier,
                    'priority_status' => $priorityStatus,
                    'is_priority' => $isPriority,
                    'population' => $kec->jumlah_penduduk,
                    'area_km2' => $kec->luas_wilayah,
                ];
            }

            // Subdistrict without aggregate data for this period (Null / Missing data)
            return [
                'id' => $kec->id,
                'code' => $kec->kode,
                'name' => $kec->nama,
                'has_data' => false,
                'cases' => null,
                'deaths' => null,
                'incidence_rate' => null,
                'tier' => null,
                'priority_status' => 'Data Belum Tersedia',
                'is_priority' => false,
                'population' => $kec->jumlah_penduduk,
                'area_km2' => $kec->luas_wilayah,
            ];
        });

        $maxCases = count($activeCasesArray) > 0 ? max($activeCasesArray) : 0;
        $minCases = count($activeCasesArray) > 0 ? min($activeCasesArray) : 0;

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => $period->id,
                'name' => $period->nama,
                'year' => $period->tahun,
                'month' => $period->bulan,
                'month_name' => self::MONTH_NAMES[$period->bulan] ?? null,
                'is_accumulation' => false,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_count' => $allKecamatan->count(),
                'subdistricts_with_data' => count($activeCasesArray),
                'priority_count' => $priorityCount,
                'max_cases' => $maxCases,
                'min_cases' => $minCases,
            ],
            'classification' => $this->getClassificationMeta($minCases, $maxCases),
            'districts' => $districts,
            'metadata' => [
                'source' => $period->sumber_data,
                'status' => 'Simulasi Pengembangan',
                'completeness' => $period->status_kelengkapan,
                'is_simulation' => true,
                'indicator' => 'Jumlah Kasus DBD Agregat per Kecamatan',
                'geojson_url' => '/geojson/banyumas_27_kecamatan.geojson',
                'updated_at' => $period->updated_at?->format('d M Y H:i'),
                'notes' => $period->keterangan,
            ],
        ]);
    }

    /**
     * Generate response for accumulated published months within a single year.
     */
    private function accumulatedYearResponse(int $year): JsonResponse
    {
        $periods = Periode::published()
            ->where('tahun', $year)
            ->whereNotNull('bulan')
            ->orderBy('bulan')
            ->get();

        if ($periods->isEmpty()) {
            return $this->emptyResponse("Data publikasi belum tersedia untuk tahun {$year}.");
        }

        $periodIds = $periods->pluck('id')->all();
        $firstMonthName = self::MONTH_NAMES[$periods->first()->bulan] ?? 'Bulan '.$periods->first()->bulan;
        $lastMonthName = self::MONTH_NAMES[$periods->last()->bulan] ?? 'Bulan '.$periods->last()->bulan;
        $monthCount = $periods->count();

        $rangeText = ($monthCount === 1)
            ? "{$firstMonthName} {$year}"
            : "{$firstMonthName} – {$lastMonthName} {$year}";

        $allKecamatan = Kecamatan::orderBy('kode')->get();

        // Query all published case records for these periods grouped by subdistrict
        $allRecords = KasusAgregat::whereIn('periode_id', $periodIds)
            ->published()
            ->get()
            ->groupBy('kecamatan_id');

        $totalCases = 0;
        $priorityCount = 0;
        $activeCasesArray = [];

        $districts = $allKecamatan->map(function ($kec) use ($allRecords, &$totalCases, &$priorityCount, &$activeCasesArray) {
            $records = $allRecords->get($kec->id);

            if (! $records || $records->isEmpty()) {
                return [
                    'id' => $kec->id,
                    'code' => $kec->kode,
                    'name' => $kec->nama,
                    'has_data' => false,
                    'cases' => null,
                    'deaths' => null,
                    'incidence_rate' => null,
                    'tier' => null,
                    'priority_status' => 'Data Belum Tersedia',
                    'is_priority' => false,
                    'population' => $kec->jumlah_penduduk,
                    'area_km2' => $kec->luas_wilayah,
                ];
            }

            $cases = (int) $records->sum('jumlah_kasus');
            $deaths = (int) $records->sum('jumlah_meninggal');
            $totalCases += $cases;
            $activeCasesArray[] = $cases;

            $isPriority = ($cases >= 10);
            if ($isPriority) {
                $priorityCount++;
            }

            $ir = ($kec->jumlah_penduduk && $kec->jumlah_penduduk > 0)
                ? round(($cases / $kec->jumlah_penduduk) * 100000, 2)
                : null;

            $tier = $this->determineTier($cases);
            $priorityStatus = $this->getPriorityStatusLabel($tier);

            return [
                'id' => $kec->id,
                'code' => $kec->kode,
                'name' => $kec->nama,
                'has_data' => true,
                'cases' => $cases,
                'deaths' => $deaths,
                'incidence_rate' => $ir,
                'tier' => $tier,
                'priority_status' => $priorityStatus,
                'is_priority' => $isPriority,
                'population' => $kec->jumlah_penduduk,
                'area_km2' => $kec->luas_wilayah,
            ];
        });

        $maxCases = count($activeCasesArray) > 0 ? max($activeCasesArray) : 0;
        $minCases = count($activeCasesArray) > 0 ? min($activeCasesArray) : 0;

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => null,
                'name' => "Semua Bulan Tersedia {$year} ({$rangeText})",
                'year' => $year,
                'month' => 'all',
                'month_name' => 'Semua Bulan Tersedia',
                'range' => $rangeText,
                'months_count' => $monthCount,
                'is_accumulation' => true,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_count' => $allKecamatan->count(),
                'subdistricts_with_data' => count($activeCasesArray),
                'priority_count' => $priorityCount,
                'max_cases' => $maxCases,
                'min_cases' => $minCases,
            ],
            'classification' => $this->getClassificationMeta($minCases, $maxCases),
            'districts' => $districts,
            'metadata' => [
                'source' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas',
                'status' => 'Simulasi Pengembangan',
                'completeness' => "Akumulasi {$monthCount} Bulan Terbit ({$rangeText})",
                'is_simulation' => true,
                'indicator' => 'Akumulasi Jumlah Kasus DBD Agregat per Kecamatan',
                'geojson_url' => '/geojson/banyumas_27_kecamatan.geojson',
                'updated_at' => now()->format('d M Y H:i'),
                'notes' => "Data kumulatif dihitung dari penjumlahan {$monthCount} bulan yang telah terbit pada tahun {$year}.",
            ],
        ]);
    }

    /**
     * Standard empty state response when period has no data.
     */
    private function emptyResponse(string $message): JsonResponse
    {
        return response()->json([
            'success' => true,
            'has_data' => false,
            'message' => $message,
            'period' => null,
            'summary' => [
                'total_cases' => null,
                'subdistricts_count' => 0,
                'subdistricts_with_data' => 0,
                'priority_count' => 0,
                'max_cases' => 0,
                'min_cases' => 0,
            ],
            'classification' => $this->getClassificationMeta(null, null),
            'districts' => [],
            'metadata' => null,
        ]);
    }

    /**
     * Calculate 4-tier choropleth classification based on cases.
     */
    private function determineTier(int $cases): int
    {
        if ($cases === 0) {
            return 0; // Nol Kasus
        }
        if ($cases <= 4) {
            return 1; // 1 - 4 Kasus (Pemantauan Rutin)
        }
        if ($cases <= 9) {
            return 2; // 5 - 9 Kasus (Peningkatan Kewaspadaan)
        }
        return 3; // >= 10 Kasus (Wilayah Prioritas Pemantauan)
    }

    /**
     * Get human-readable priority status string from tier.
     */
    private function getPriorityStatusLabel(int $tier): string
    {
        return match ($tier) {
            3 => 'Wilayah Prioritas Pemantauan',
            2 => 'Peningkatan Kewaspadaan',
            1 => 'Pemantauan Rutin',
            default => 'Nol Kasus',
        };
    }

    /**
     * Get classification metadata and thresholds.
     */
    private function getClassificationMeta(?int $min, ?int $max): array
    {
        return [
            'indicator' => 'Jumlah Kasus',
            'method' => 'Ambang Klasifikasi Interval Bertingkat Terstandarisasi',
            'tiers' => [
                [
                    'tier' => 0,
                    'label' => '0 Kasus (Nol Kasus)',
                    'color' => '#f1f5f9', // Slate-100 neutral
                    'border_color' => '#94a3b8',
                    'range' => '0',
                    'description' => 'Tidak terdapat laporan kejadian DBD pada periode ini.',
                ],
                [
                    'tier' => 1,
                    'label' => '1 – 4 Kasus',
                    'color' => '#fed7aa', // Orange-200 soft
                    'border_color' => '#fb923c',
                    'range' => '1 - 4',
                    'description' => 'Kejadian kasus rendah, pemantauan rutin.',
                ],
                [
                    'tier' => 2,
                    'label' => '5 – 9 Kasus',
                    'color' => '#fb923c', // Orange-400 medium
                    'border_color' => '#ea580c',
                    'range' => '5 - 9',
                    'description' => 'Kejadian kasus sedang, peningkatan kewaspadaan lingkungan.',
                ],
                [
                    'tier' => 3,
                    'label' => '≥ 10 Kasus (Prioritas Pemantauan)',
                    'color' => '#dc2626', // Red-600 prominent
                    'border_color' => '#991b1b',
                    'range' => '>= 10',
                    'description' => 'Wilayah dengan kejadian kasus relatif tinggi yang memerlukan prioritas pemantauan.',
                ],
            ],
            'nodata' => [
                'label' => 'Data Belum Tersedia',
                'color' => '#e2e8f0', // Neutral gray
                'border_color' => '#cbd5e1',
            ],
        ];
    }
}
