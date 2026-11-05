<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\DatasetMetadata;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
     * Get list of available published years (2022-2026) and periods for the filter dropdown.
     */
    public function periods(Request $request): JsonResponse
    {
        $publishedPeriods = Periode::published()
            ->whereBetween('tahun', [2022, 2026])
            ->orderBy('tahun')
            ->orderBy('bulan')
            ->get();

        $years = $publishedPeriods->pluck('tahun')->unique()->sort()->values()->all();

        $periodsByYear = [];
        $yearModes = [];

        foreach ($years as $yr) {
            $yearPeriods = $publishedPeriods->where('tahun', $yr);
            $monthlyPeriods = $yearPeriods->whereNotNull('bulan')->sortBy('bulan')->values();
            $annualPeriod = $yearPeriods->whereNull('bulan')->first();

            if ($monthlyPeriods->isNotEmpty()) {
                $periodsByYear[$yr] = $monthlyPeriods->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'year' => $p->tahun,
                        'month' => $p->bulan,
                        'month_name' => self::MONTH_NAMES[$p->bulan] ?? "Bulan {$p->bulan}",
                        'name' => $p->nama,
                        'type' => 'monthly',
                    ];
                })->values()->all();

                $yearModes[$yr] = [
                    'type' => 'monthly',
                    'has_monthly' => true,
                    'has_annual' => (bool) $annualPeriod,
                    'default_month' => $monthlyPeriods->first()->bulan,
                    'available_months' => $monthlyPeriods->pluck('bulan')->values()->all(),
                    'label' => $monthlyPeriods->first()->nama,
                ];
            } elseif ($annualPeriod) {
                $periodsByYear[$yr] = [
                    [
                        'id' => $annualPeriod->id,
                        'year' => $annualPeriod->tahun,
                        'month' => null,
                        'month_name' => 'Semua Bulan Tersedia (Agregat Tahunan)',
                        'name' => $annualPeriod->nama,
                        'type' => 'annual',
                        'range' => $annualPeriod->rentang_waktu,
                    ],
                ];

                $yearModes[$yr] = [
                    'type' => 'annual',
                    'has_monthly' => false,
                    'has_annual' => true,
                    'default_month' => 'all',
                    'available_months' => [],
                    'label' => $annualPeriod->nama,
                ];
            }
        }

        $defaultYear = in_array(2026, $years, true) ? 2026 : (! empty($years) ? end($years) : null);
        $defaultMonths = $defaultYear ? ($periodsByYear[$defaultYear] ?? []) : [];
        $defaultPeriodId = ! empty($defaultMonths) ? $defaultMonths[0]['id'] : null;
        $defaultMonth = ! empty($defaultMonths) ? ($defaultMonths[0]['month'] ?? 'all') : null;

        return response()->json([
            'success' => true,
            'years' => $years,
            'periods_by_year' => $periodsByYear,
            'year_modes' => $yearModes,
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

        return $this->resolvePeriodByYearMonth(
            $year !== null ? (int) $year : null,
            $month,
            $periodId !== null ? (int) $periodId : null,
            $request->boolean('is_all_months')
        );
    }

    /**
     * Compare two periods (Period A vs Period B) with strict granularity, data availability,
     * and publication status validation (Fitur 8).
     */
    public function compare(Request $request): JsonResponse
    {
        $rawYearA = $request->input('year_a', $request->input('tahun_a', 2024));
        $rawMonthA = $request->input('month_a', $request->input('bulan_a', 'all'));
        $rawYearB = $request->input('year_b', $request->input('tahun_b', 2025));
        $rawMonthB = $request->input('month_b', $request->input('bulan_b', 'all'));

        $validator = Validator::make(
            [
                'year_a' => $rawYearA,
                'month_a' => $rawMonthA,
                'year_b' => $rawYearB,
                'month_b' => $rawMonthB,
            ],
            [
                'year_a' => ['required', 'integer', 'min:2020', 'max:2030'],
                'year_b' => ['required', 'integer', 'min:2020', 'max:2030'],
                'month_a' => [
                    'nullable',
                    function (string $attribute, mixed $value, \Closure $fail) {
                        $norm = strtolower(trim((string) $value));
                        if ($norm === '' || $norm === 'all' || $norm === 'semua') {
                            return;
                        }
                        if (! ctype_digit($norm) || (int) $norm < 1 || (int) $norm > 12) {
                            $fail("Parameter {$attribute} harus bernilai 'all' atau angka bulan 1 sampai 12.");
                        }
                    },
                ],
                'month_b' => [
                    'nullable',
                    function (string $attribute, mixed $value, \Closure $fail) {
                        $norm = strtolower(trim((string) $value));
                        if ($norm === '' || $norm === 'all' || $norm === 'semua') {
                            return;
                        }
                        if (! ctype_digit($norm) || (int) $norm < 1 || (int) $norm > 12) {
                            $fail("Parameter {$attribute} harus bernilai 'all' atau angka bulan 1 sampai 12.");
                        }
                    },
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter periode perbandingan tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $yearA = (int) $rawYearA;
        $yearB = (int) $rawYearB;
        $monthA = ($rawMonthA === null || trim((string) $rawMonthA) === '') ? 'all' : $rawMonthA;
        $monthB = ($rawMonthB === null || trim((string) $rawMonthB) === '') ? 'all' : $rawMonthB;

        $dataA = $this->resolvePeriodByYearMonth($yearA, $monthA)->getData(true);
        $dataB = $this->resolvePeriodByYearMonth($yearB, $monthB)->getData(true);

        $comparability = $this->evaluatePeriodComparability($dataA, $dataB, $yearA, $monthA, $yearB, $monthB);
        $isComparable = $comparability['is_comparable'];

        $hasDataA = (bool) ($dataA['has_data'] ?? false);
        $hasDataB = (bool) ($dataB['has_data'] ?? false);
        $casesA = $hasDataA ? (int) ($dataA['summary']['total_cases'] ?? 0) : null;
        $casesB = $hasDataB ? (int) ($dataB['summary']['total_cases'] ?? 0) : null;

        $diffCases = null;
        $pctChange = null;
        $pctChangeLabel = 'Data tidak tersedia';
        $direction = 'tidak_dapat_dibandingkan';
        $statusLabel = 'Tidak dapat dibandingkan';

        if (! $hasDataA || ! $hasDataB) {
            $pctChangeLabel = 'Data tidak tersedia';
            $statusLabel = 'Data tidak tersedia';
        } elseif (! $isComparable) {
            $pctChangeLabel = 'Periode tidak setara';
            $statusLabel = 'Periode tidak setara';
        } else {
            $diffCases = $casesB - $casesA;
            if ($casesA > 0) {
                $pctChange = round(($diffCases / $casesA) * 100, 2);
                $pctChangeLabel = ($diffCases > 0 ? '+' : '') . number_format($pctChange, 2, ',', '.') . '%';
            } else {
                $pctChange = null;
                $pctChangeLabel = 'Persentase tidak dapat dihitung';
            }

            if ($diffCases > 0) {
                $direction = 'meningkat';
                $statusLabel = 'Meningkat';
            } elseif ($diffCases < 0) {
                $direction = 'menurun';
                $statusLabel = 'Menurun';
            } else {
                $direction = 'tetap';
                $statusLabel = 'Tetap';
            }
        }

        // Build per-subdistrict comparison across all 27 subdistricts
        $allKecamatan = Kecamatan::orderBy('kode')->get();
        $districtsA = collect($dataA['districts'] ?? [])->keyBy('code');
        $districtsB = collect($dataB['districts'] ?? [])->keyBy('code');

        $increasedCount = 0;
        $decreasedCount = 0;
        $unchangedCount = 0;
        $incomparableCount = 0;

        $districtComparisons = $allKecamatan->map(function ($kec) use (
            $districtsA,
            $districtsB,
            $hasDataA,
            $hasDataB,
            $isComparable,
            &$increasedCount,
            &$decreasedCount,
            &$unchangedCount,
            &$incomparableCount
        ) {
            $dA = $districtsA->get($kec->kode);
            $dB = $districtsB->get($kec->kode);

            $subHasA = $hasDataA && ! empty($dA['has_data']) && isset($dA['cases']) && $dA['cases'] !== null;
            $subHasB = $hasDataB && ! empty($dB['has_data']) && isset($dB['cases']) && $dB['cases'] !== null;

            $valA = $subHasA ? (int) $dA['cases'] : null;
            $valB = $subHasB ? (int) $dB['cases'] : null;

            $subComparable = false;
            $subDiff = null;
            $subPct = null;
            $subPctLabel = 'Tidak dapat dibandingkan';
            $subStatus = 'tidak_dapat_dibandingkan';
            $subStatusLabel = 'Tidak dapat dibandingkan';

            if (! $subHasA || ! $subHasB) {
                $incomparableCount++;
                $subPctLabel = 'Tidak dapat dibandingkan';
                $subStatus = 'tidak_dapat_dibandingkan';
                $subStatusLabel = 'Tidak dapat dibandingkan';
            } elseif (! $isComparable) {
                $incomparableCount++;
                $subPctLabel = 'Periode tidak setara';
                $subStatus = 'periode_tidak_setara';
                $subStatusLabel = 'Periode tidak setara';
            } else {
                $subComparable = true;
                $subDiff = $valB - $valA;

                if ($valA > 0) {
                    $subPct = round(($subDiff / $valA) * 100, 2);
                    $subPctLabel = ($subDiff > 0 ? '+' : '') . number_format($subPct, 1, ',', '.') . '%';
                } else {
                    $subPct = null;
                    $subPctLabel = 'Persentase tidak dapat dihitung';
                }

                if ($subDiff > 0) {
                    $subStatus = 'meningkat';
                    $subStatusLabel = 'Meningkat';
                    $increasedCount++;
                } elseif ($subDiff < 0) {
                    $subStatus = 'menurun';
                    $subStatusLabel = 'Menurun';
                    $decreasedCount++;
                } else {
                    $subStatus = 'tetap';
                    $subStatusLabel = 'Tetap';
                    $unchangedCount++;
                }
            }

            return [
                'id' => $kec->id,
                'code' => $kec->kode,
                'name' => $kec->nama,
                'has_data_a' => $subHasA,
                'cases_a' => $valA,
                'fill_color_a' => $subHasA ? ($dA['fill_color'] ?? '#cbd5e1') : '#cbd5e1',
                'classification_label_a' => $subHasA ? ($dA['classification_label'] ?? 'Data Belum Tersedia') : 'Data Belum Tersedia',
                'priority_status_a' => $subHasA ? ($dA['priority_status'] ?? 'Data Belum Tersedia') : 'Data Belum Tersedia',
                'has_data_b' => $subHasB,
                'cases_b' => $valB,
                'fill_color_b' => $subHasB ? ($dB['fill_color'] ?? '#cbd5e1') : '#cbd5e1',
                'classification_label_b' => $subHasB ? ($dB['classification_label'] ?? 'Data Belum Tersedia') : 'Data Belum Tersedia',
                'priority_status_b' => $subHasB ? ($dB['priority_status'] ?? 'Data Belum Tersedia') : 'Data Belum Tersedia',
                'comparable' => $subComparable,
                'diff' => $subDiff,
                'pct_change' => $subPct,
                'pct_change_label' => $subPctLabel,
                'status' => $subStatus,
                'status_label' => $subStatusLabel,
            ];
        })->values()->all();

        return response()->json([
            'success' => true,
            'selection' => [
                'year_a' => $yearA,
                'month_a' => is_numeric($monthA) ? (int) $monthA : 'all',
                'year_b' => $yearB,
                'month_b' => is_numeric($monthB) ? (int) $monthB : 'all',
            ],
            'comparability' => $comparability,
            'period_a' => $dataA,
            'period_b' => $dataB,
            'comparison' => [
                'is_comparable' => $isComparable,
                'summary' => [
                    'cases_a' => $casesA,
                    'cases_b' => $casesB,
                    'diff_cases' => $diffCases,
                    'pct_change' => $pctChange,
                    'pct_change_label' => $pctChangeLabel,
                    'direction' => $direction,
                    'status_label' => $statusLabel,
                    'priority_count_a' => $hasDataA ? (int) ($dataA['summary']['priority_count'] ?? 0) : null,
                    'priority_count_b' => $hasDataB ? (int) ($dataB['summary']['priority_count'] ?? 0) : null,
                    'increased_subdistricts' => $increasedCount,
                    'decreased_subdistricts' => $decreasedCount,
                    'unchanged_subdistricts' => $unchangedCount,
                    'incomparable_subdistricts' => $incomparableCount,
                    'total_subdistricts' => $allKecamatan->count(),
                ],
                'districts' => $districtComparisons,
            ],
            'classification' => $this->getClassificationMeta(null, null),
        ]);
    }

    /**
     * Get time-series trend data (annual 2022-2026 or monthly Jan-Dec) for Banyumas or a specific subdistrict (Fitur 9).
     */
    public function trends(Request $request): JsonResponse
    {
        $rawGranularity = strtolower(trim((string) $request->input('granularity', 'annual')));
        $rawYear = $request->input('year', $request->input('tahun', 2026));
        $rawKecamatan = $request->input('kecamatan_id', $request->input('kecamatan', 'all'));

        $validator = Validator::make(
            [
                'granularity' => $rawGranularity,
                'year' => $rawYear,
            ],
            [
                'granularity' => ['required', 'in:annual,monthly,tahunan,bulanan'],
                'year' => ['nullable', 'integer', 'min:2020', 'max:2030'],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter grafik tren tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $granularity = in_array($rawGranularity, ['monthly', 'bulanan'], true) ? 'monthly' : 'annual';
        $selectedYear = $rawYear !== null ? (int) $rawYear : 2026;

        // Resolve optional subdistrict scope (all vs 1 of 27 subdistricts)
        $allKecamatan = Kecamatan::orderBy('kode')->get();
        $targetKecamatan = null;
        $kecNormalized = strtolower(trim((string) $rawKecamatan));

        if ($kecNormalized !== '' && $kecNormalized !== 'all' && $kecNormalized !== 'semua') {
            $targetKecamatan = $allKecamatan->first(function ($k) use ($rawKecamatan, $kecNormalized) {
                return (string) $k->id === (string) $rawKecamatan
                    || strtolower($k->kode) === $kecNormalized
                    || strtolower($k->nama) === $kecNormalized;
            });

            if (! $targetKecamatan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wilayah kecamatan tidak ditemukan.',
                ], 422);
            }
        }

        $scopeMeta = [
            'type' => $targetKecamatan ? 'kecamatan' : 'kabupaten',
            'kecamatan_id' => $targetKecamatan?->id,
            'kecamatan_code' => $targetKecamatan?->kode,
            'name' => $targetKecamatan
                ? "Kecamatan {$targetKecamatan->nama}"
                : 'Seluruh Kabupaten Banyumas (27 Kecamatan)',
        ];

        $subdistrictOptions = $allKecamatan->map(fn ($k) => [
            'id' => $k->id,
            'code' => $k->kode,
            'name' => $k->nama,
        ])->values()->all();

        $publishedPeriods = Periode::published()
            ->whereBetween('tahun', [2022, 2026])
            ->orderBy('tahun')
            ->orderBy('bulan')
            ->get();

        $availableYears = [2022, 2023, 2024, 2025, 2026];

        if ($granularity === 'annual') {
            return $this->buildAnnualTrendsResponse(
                $availableYears,
                $publishedPeriods,
                $targetKecamatan,
                $scopeMeta,
                $subdistrictOptions
            );
        }

        return $this->buildMonthlyTrendsResponse(
            $selectedYear,
            $availableYears,
            $publishedPeriods,
            $targetKecamatan,
            $scopeMeta,
            $subdistrictOptions
        );
    }

    /**
     * Build Annual Trends response across 2022-2026.
     */
    private function buildAnnualTrendsResponse(
        array $years,
        Collection $publishedPeriods,
        ?Kecamatan $targetKecamatan,
        array $scopeMeta,
        array $subdistrictOptions
    ): JsonResponse {
        $periodIds = $publishedPeriods->pluck('id')->all();
        $query = KasusAgregat::whereIn('periode_id', $periodIds)->published();
        if ($targetKecamatan) {
            $query->where('kecamatan_id', $targetKecamatan->id);
        }
        $recordsByPeriod = $query->get()->groupBy('periode_id');

        $series = [];
        $prevFullYearCases = null;
        $peakYear = null;
        $peakCases = -1;
        $latestFullYear = null;
        $latestFullYearCases = null;
        $latestYoy = null;
        $partial2026Cases = null;
        $partial2026Range = null;
        $hasAnyData = false;

        foreach ($years as $yr) {
            $yearPeriods = $publishedPeriods->where('tahun', $yr);
            $annualPeriod = $yearPeriods->whereNull('bulan')->first();
            $monthlyPeriods = $yearPeriods->whereNotNull('bulan')->sortBy('bulan')->values();

            if ($annualPeriod) {
                $pRecords = $recordsByPeriod->get($annualPeriod->id, collect());
                $hasData = $pRecords->isNotEmpty();
                $cases = $hasData ? (int) $pRecords->sum('jumlah_kasus') : null;
                $deaths = $hasData ? (int) $pRecords->sum('jumlah_meninggal') : null;

                $yoyDiff = null;
                $yoyPct = null;
                $yoyLabel = null;

                if ($hasData) {
                    $hasAnyData = true;
                    if ($cases > $peakCases) {
                        $peakCases = $cases;
                        $peakYear = $yr;
                    }
                    if ($prevFullYearCases !== null) {
                        $yoyDiff = $cases - $prevFullYearCases;
                        if ($prevFullYearCases > 0) {
                            $yoyPct = round(($yoyDiff / $prevFullYearCases) * 100, 2);
                            $yoyLabel = ($yoyDiff > 0 ? '+' : '') . number_format($yoyPct, 2, ',', '.') . '%';
                        } else {
                            $yoyLabel = 'Persentase tidak dapat dihitung';
                        }
                    }
                    $prevFullYearCases = $cases;
                    $latestFullYear = $yr;
                    $latestFullYearCases = $cases;
                    $latestYoy = [
                        'diff' => $yoyDiff,
                        'pct' => $yoyPct,
                        'label' => $yoyLabel,
                    ];
                }

                $series[] = [
                    'key' => (string) $yr,
                    'year' => $yr,
                    'label' => (string) $yr,
                    'has_data' => $hasData,
                    'cases' => $cases,
                    'deaths' => $deaths,
                    'is_partial' => false,
                    'is_simulation' => false,
                    'period_type' => 'annual',
                    'months_covered' => 12,
                    'coverage_label' => $annualPeriod->rentang_waktu ?: "Tahun Penuh (Januari – Desember {$yr})",
                    'status_label' => 'Resmi Terverifikasi (Tahun Penuh)',
                    'source' => $annualPeriod->sumber_data,
                    'yoy_diff' => $yoyDiff,
                    'yoy_pct' => $yoyPct,
                    'yoy_label' => $yoyLabel,
                ];
            } elseif ($monthlyPeriods->isNotEmpty()) {
                $mIds = $monthlyPeriods->pluck('id')->all();
                $mRecords = collect();
                foreach ($mIds as $mId) {
                    $mRecords = $mRecords->concat($recordsByPeriod->get($mId, collect()));
                }

                $hasData = $mRecords->isNotEmpty();
                $cases = $hasData ? (int) $mRecords->sum('jumlah_kasus') : null;
                $deaths = $hasData ? (int) $mRecords->sum('jumlah_meninggal') : null;
                $monthCount = $monthlyPeriods->count();
                $firstM = self::MONTH_NAMES[$monthlyPeriods->first()->bulan] ?? 'Bulan 1';
                $lastM = self::MONTH_NAMES[$monthlyPeriods->last()->bulan] ?? "Bulan {$monthCount}";
                $rangeText = $monthCount === 1 ? "{$firstM} {$yr}" : "{$firstM} – {$lastM} {$yr}";
                $isPartial = $monthCount < 12;

                if ($hasData) {
                    $hasAnyData = true;
                    $partial2026Cases = $cases;
                    $partial2026Range = "{$rangeText} ({$monthCount} Bulan)";
                }

                $series[] = [
                    'key' => (string) $yr,
                    'year' => $yr,
                    'label' => "{$yr}*",
                    'has_data' => $hasData,
                    'cases' => $cases,
                    'deaths' => $deaths,
                    'is_partial' => $isPartial,
                    'is_simulation' => true,
                    'period_type' => 'monthly_accumulation',
                    'months_covered' => $monthCount,
                    'coverage_label' => "Data Parsial ({$rangeText} • {$monthCount} dari 12 Bulan)",
                    'status_label' => 'Data Simulasi Pengembangan (Parsial)',
                    'source' => $monthlyPeriods->first()->sumber_data,
                    'yoy_diff' => null,
                    'yoy_pct' => null,
                    'yoy_label' => 'Tidak dibandingkan langsung (Cakupan tahun parsial & simulasi)',
                ];
            } else {
                $series[] = [
                    'key' => (string) $yr,
                    'year' => $yr,
                    'label' => (string) $yr,
                    'has_data' => false,
                    'cases' => null,
                    'deaths' => null,
                    'is_partial' => false,
                    'is_simulation' => false,
                    'period_type' => 'unavailable',
                    'months_covered' => 0,
                    'coverage_label' => 'Data Belum Tersedia',
                    'status_label' => 'Data Belum Tersedia',
                    'source' => null,
                    'yoy_diff' => null,
                    'yoy_pct' => null,
                    'yoy_label' => null,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'granularity' => 'annual',
            'year' => null,
            'scope' => $scopeMeta,
            'available_years' => $years,
            'subdistricts' => $subdistrictOptions,
            'has_data' => $hasAnyData,
            'reason' => $hasAnyData ? null : 'unavailable',
            'message' => $hasAnyData
                ? 'Menampilkan tren kasus DBD tahunan 2022–2025 (agregat tahunan resmi terverifikasi) dan 2026 (data parsial simulasi pengembangan Januari–Maret 2026).'
                : 'Data tren tahunan belum tersedia untuk wilayah yang dipilih.',
            'summary' => [
                'verified_years_count' => collect($series)->where('has_data', true)->where('is_simulation', false)->count(),
                'peak_year' => $peakYear,
                'peak_cases' => $peakCases >= 0 ? $peakCases : null,
                'latest_full_year' => $latestFullYear,
                'latest_full_year_cases' => $latestFullYearCases,
                'latest_yoy_diff' => $latestYoy['diff'] ?? null,
                'latest_yoy_pct' => $latestYoy['pct'] ?? null,
                'latest_yoy_label' => $latestYoy['label'] ?? null,
                'partial_year' => 2026,
                'partial_cases' => $partial2026Cases,
                'partial_range' => $partial2026Range,
            ],
            'series' => $series,
            'metadata' => [
                'unit' => 'Kasus',
                'indicator' => 'Jumlah Kasus DBD Agregat per Periode Tahunan',
                'source_official' => 'DATA DEMAM BERDARAH KABUPATEN BANYUMAS.xlsx & Profil Kesehatan Kab. Banyumas 2022–2025',
                'source_partial' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas (Januari–Maret 2026)',
                'completeness_note' => 'Tahun 2022–2025 mencakup 1 tahun penuh (12 bulan) terverifikasi. Tahun 2026 baru mencakup 3 bulan (Januari–Maret 2026, simulasi pengembangan) dan dipisahkan secara visual dengan garis putus-putus agar tidak disimpulkan sebagai penurunan/peningkatan tahunan langsung.',
            ],
        ]);
    }

    /**
     * Build Monthly Trends response (Januari - Desember) for a selected year.
     */
    private function buildMonthlyTrendsResponse(
        int $year,
        array $availableYears,
        Collection $publishedPeriods,
        ?Kecamatan $targetKecamatan,
        array $scopeMeta,
        array $subdistrictOptions
    ): JsonResponse {
        $yearPeriods = $publishedPeriods->where('tahun', $year);
        $monthlyPeriods = $yearPeriods->whereNotNull('bulan')->keyBy('bulan');
        $annualPeriod = $yearPeriods->whereNull('bulan')->first();

        $shortMonths = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
            9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
        ];

        // If this year only has annual aggregate data (e.g. 2022-2025), never divide annual total into 12 months
        if ($monthlyPeriods->isEmpty() && $annualPeriod) {
            $emptySeries = [];
            foreach (self::MONTH_NAMES as $mNum => $mName) {
                $emptySeries[] = [
                    'key' => sprintf('%d-%02d', $year, $mNum),
                    'year' => $year,
                    'month' => $mNum,
                    'label' => $mName,
                    'short_label' => $shortMonths[$mNum],
                    'has_data' => false,
                    'cases' => null,
                    'deaths' => null,
                    'is_partial' => false,
                    'is_simulation' => false,
                    'coverage_label' => 'Rincian bulanan tidak tersedia',
                    'status_label' => 'Hanya Tersedia Agregat Tahunan',
                    'source' => $annualPeriod->sumber_data,
                    'mom_diff' => null,
                    'mom_pct' => null,
                    'mom_label' => null,
                ];
            }

            return response()->json([
                'success' => true,
                'granularity' => 'monthly',
                'year' => $year,
                'scope' => $scopeMeta,
                'available_years' => $availableYears,
                'subdistricts' => $subdistrictOptions,
                'has_data' => false,
                'reason' => 'annual_only',
                'message' => "Rincian data bulanan belum tersedia untuk tahun {$year}. Sumber resmi tahun {$year} hanya menyediakan data agregat tahunan (tidak dibagi menjadi angka bulanan sintetis).",
                'summary' => [
                    'year' => $year,
                    'available_months_count' => 0,
                    'missing_months_count' => 12,
                    'total_cases_available_months' => null,
                    'peak_month' => null,
                    'peak_cases' => null,
                    'coverage_range' => "Hanya Agregat Tahunan {$year}",
                ],
                'series' => $emptySeries,
                'metadata' => [
                    'unit' => 'Kasus',
                    'indicator' => "Jumlah Kasus DBD Bulanan Tahun {$year}",
                    'source' => $annualPeriod->sumber_data,
                    'status' => 'Rincian Bulanan Tidak Tersedia (Hanya Agregat Tahunan)',
                    'is_simulation' => false,
                    'completeness_note' => "Silakan gunakan tampilan Tren Tahunan untuk mengamati data agregat tahun {$year}.",
                ],
            ]);
        }

        $periodIds = $monthlyPeriods->pluck('id')->all();
        $recordsByPeriod = collect();
        if (! empty($periodIds)) {
            $q = KasusAgregat::whereIn('periode_id', $periodIds)->published();
            if ($targetKecamatan) {
                $q->where('kecamatan_id', $targetKecamatan->id);
            }
            $recordsByPeriod = $q->get()->groupBy('periode_id');
        }

        $series = [];
        $availableMonthsCount = 0;
        $totalCases = 0;
        $peakMonthName = null;
        $peakCases = -1;
        $prevMonthCases = null;
        $firstAvailableMonth = null;
        $lastAvailableMonth = null;
        $sourceLabel = null;
        $isSimulationYear = false;

        foreach (self::MONTH_NAMES as $mNum => $mName) {
            $period = $monthlyPeriods->get($mNum);
            if ($period) {
                $pRecords = $recordsByPeriod->get($period->id, collect());
                $hasData = $pRecords->isNotEmpty();

                if ($hasData) {
                    $cases = (int) $pRecords->sum('jumlah_kasus');
                    $deaths = (int) $pRecords->sum('jumlah_meninggal');
                    $availableMonthsCount++;
                    $totalCases += $cases;
                    $sourceLabel = $sourceLabel ?: $period->sumber_data;
                    $isSimulationYear = true;

                    if ($firstAvailableMonth === null) {
                        $firstAvailableMonth = $mName;
                    }
                    $lastAvailableMonth = $mName;

                    if ($cases > $peakCases) {
                        $peakCases = $cases;
                        $peakMonthName = $mName;
                    }

                    $momDiff = null;
                    $momPct = null;
                    $momLabel = null;
                    if ($prevMonthCases !== null) {
                        $momDiff = $cases - $prevMonthCases;
                        if ($prevMonthCases > 0) {
                            $momPct = round(($momDiff / $prevMonthCases) * 100, 2);
                            $momLabel = ($momDiff > 0 ? '+' : '') . number_format($momPct, 1, ',', '.') . '%';
                        } else {
                            $momLabel = 'Persentase tidak dapat dihitung';
                        }
                    }
                    $prevMonthCases = $cases;

                    $series[] = [
                        'key' => sprintf('%d-%02d', $year, $mNum),
                        'year' => $year,
                        'month' => $mNum,
                        'label' => $mName,
                        'short_label' => $shortMonths[$mNum],
                        'has_data' => true,
                        'cases' => $cases,
                        'deaths' => $deaths,
                        'is_partial' => false,
                        'is_simulation' => true,
                        'coverage_label' => "{$mName} {$year}",
                        'status_label' => 'Data Simulasi Pengembangan',
                        'source' => $period->sumber_data,
                        'mom_diff' => $momDiff,
                        'mom_pct' => $momPct,
                        'mom_label' => $momLabel,
                    ];
                    continue;
                }
            }

            // Month has no published record -> gap (null), never fake 0
            $prevMonthCases = null;
            $series[] = [
                'key' => sprintf('%d-%02d', $year, $mNum),
                'year' => $year,
                'month' => $mNum,
                'label' => $mName,
                'short_label' => $shortMonths[$mNum],
                'has_data' => false,
                'cases' => null,
                'deaths' => null,
                'is_partial' => false,
                'is_simulation' => false,
                'coverage_label' => "{$mName} {$year} (Data Belum Tersedia)",
                'status_label' => 'Data Belum Tersedia',
                'source' => null,
                'mom_diff' => null,
                'mom_pct' => null,
                'mom_label' => null,
            ];
        }

        $hasAnyData = $availableMonthsCount > 0;
        $coverageRange = $hasAnyData
            ? ($availableMonthsCount === 1
                ? "{$firstAvailableMonth} {$year} (1 dari 12 Bulan)"
                : "{$firstAvailableMonth} – {$lastAvailableMonth} {$year} ({$availableMonthsCount} dari 12 Bulan)")
            : "Belum Ada Data Bulanan {$year}";

        return response()->json([
            'success' => true,
            'granularity' => 'monthly',
            'year' => $year,
            'scope' => $scopeMeta,
            'available_years' => $availableYears,
            'subdistricts' => $subdistrictOptions,
            'has_data' => $hasAnyData,
            'reason' => $hasAnyData ? null : 'unavailable',
            'message' => $hasAnyData
                ? "Menampilkan tren bulanan tahun {$year} ({$coverageRange}). Bulan yang belum memiliki laporan ditampilkan sebagai ruang kosong (Data Belum Tersedia), bukan 0 kasus."
                : "Data kasus bulanan belum tersedia untuk tahun {$year}.",
            'summary' => [
                'year' => $year,
                'available_months_count' => $availableMonthsCount,
                'missing_months_count' => 12 - $availableMonthsCount,
                'total_cases_available_months' => $hasAnyData ? $totalCases : null,
                'peak_month' => $peakMonthName,
                'peak_cases' => $peakCases >= 0 ? $peakCases : null,
                'coverage_range' => $coverageRange,
            ],
            'series' => $series,
            'metadata' => [
                'unit' => 'Kasus',
                'indicator' => "Jumlah Kasus DBD Agregat Bulanan ({$year})",
                'source' => $sourceLabel ?: 'Data Belum Tersedia untuk Periode Ini',
                'status' => $hasAnyData
                    ? ($isSimulationYear ? 'Data Simulasi Pengembangan' : 'Data Resmi Terverifikasi')
                    : 'Data Belum Tersedia',
                'is_simulation' => $isSimulationYear,
                'completeness_note' => $hasAnyData
                    ? "Tersedia {$availableMonthsCount} bulan ({$firstAvailableMonth}–{$lastAvailableMonth} {$year}); " . (12 - $availableMonthsCount) . " bulan lainnya belum memiliki data publikasi."
                    : "Belum ada laporan bulanan publik pada tahun {$year}.",
            ],
        ]);
    }

    /**
     * Evaluate whether Period A and Period B have equal granularity, data availability, and dataset status.
     */
    private function evaluatePeriodComparability(
        array $dataA,
        array $dataB,
        int $yearA,
        mixed $monthA,
        int $yearB,
        mixed $monthB
    ): array {
        $hasDataA = (bool) ($dataA['has_data'] ?? false);
        $hasDataB = (bool) ($dataB['has_data'] ?? false);

        $labelA = $this->formatRequestedPeriodLabel($dataA, $yearA, $monthA);
        $labelB = $this->formatRequestedPeriodLabel($dataB, $yearB, $monthB);

        if (! $hasDataA || ! $hasDataB) {
            $missingParts = [];
            if (! $hasDataA) {
                $reasonA = ($dataA['reason'] ?? '') === 'annual_only'
                    ? "Periode A ({$labelA}) hanya memiliki data agregat tahunan (rincian bulanan tidak tersedia)"
                    : "Periode A ({$labelA}) belum memiliki data kasus yang tersedia";
                $missingParts[] = $reasonA;
            }
            if (! $hasDataB) {
                $reasonB = ($dataB['reason'] ?? '') === 'annual_only'
                    ? "Periode B ({$labelB}) hanya memiliki data agregat tahunan (rincian bulanan tidak tersedia)"
                    : "Periode B ({$labelB}) belum memiliki data kasus yang tersedia";
                $missingParts[] = $reasonB;
            }

            return [
                'is_comparable' => false,
                'status' => 'data_unavailable',
                'granularity_a' => $dataA['period']['period_type'] ?? 'unavailable',
                'granularity_b' => $dataB['period']['period_type'] ?? 'unavailable',
                'label_a' => $labelA,
                'label_b' => $labelB,
                'title' => 'Data Periode Belum Tersedia untuk Dibandingkan',
                'message' => implode('; ', $missingParts) . '. Selisih dan persentase perubahan tidak dihitung agar tidak menimbulkan kesan nol kasus palsu.',
            ];
        }

        $typeA = $dataA['period']['period_type'] ?? 'unknown';
        $typeB = $dataB['period']['period_type'] ?? 'unknown';
        $isSimA = (bool) ($dataA['metadata']['is_simulation'] ?? false);
        $isSimB = (bool) ($dataB['metadata']['is_simulation'] ?? false);
        $monthsCountA = $typeA === 'annual' ? 12 : (int) ($dataA['period']['months_count'] ?? 1);
        $monthsCountB = $typeB === 'annual' ? 12 : (int) ($dataB['period']['months_count'] ?? 1);

        // Check granularity equality (e.g. annual 12 months vs partial-year accumulation or single month)
        if ($typeA !== $typeB || $monthsCountA !== $monthsCountB) {
            $descA = $this->describeGranularity($typeA, $monthsCountA, $dataA['period']['range'] ?? $labelA);
            $descB = $this->describeGranularity($typeB, $monthsCountB, $dataB['period']['range'] ?? $labelB);

            $simWarning = ($isSimA !== $isSimB)
                ? ' Selain itu, data resmi terverifikasi tidak dapat dicampur dengan data simulasi pengembangan dalam kesimpulan yang sama.'
                : '';

            return [
                'is_comparable' => false,
                'status' => 'unequal_granularity',
                'granularity_a' => $typeA,
                'granularity_b' => $typeB,
                'label_a' => $labelA,
                'label_b' => $labelB,
                'title' => 'Perbandingan Periode Tidak Setara',
                'message' => "Periode A ({$labelA} — {$descA}) tidak setara secara granularitas waktu dengan Periode B ({$labelB} — {$descB}).{$simWarning} Peningkatan atau penurunan epidemiologi tidak disimpulkan secara langsung.",
            ];
        }

        // Check dataset publication status consistency (Official Verified vs Simulation)
        if ($isSimA !== $isSimB) {
            return [
                'is_comparable' => false,
                'status' => 'mixed_source_status',
                'granularity_a' => $typeA,
                'granularity_b' => $typeB,
                'label_a' => $labelA,
                'label_b' => $labelB,
                'title' => 'Status Sumber Dataset Berbeda (Resmi vs Simulasi)',
                'message' => "Periode A ({$labelA}) dan Periode B ({$labelB}) berasal dari status dataset yang berbeda (Data Resmi Terverifikasi vs Data Simulasi Pengembangan) sehingga tidak dapat disimpulkan sebagai tren peningkatan/penurunan epidemiologi langsung.",
            ];
        }

        $granularityText = $typeA === 'annual'
            ? 'Agregat Tahunan Penuh (12 Bulan)'
            : ($typeA === 'monthly_accumulation'
                ? "Akumulasi {$monthsCountA} Bulan"
                : 'Agregat Bulanan (1 Bulan)');

        $datasetStatusText = $isSimA
            ? 'Data Simulasi Pengembangan'
            : 'Data Agregat Tahunan Terverifikasi';

        return [
            'is_comparable' => true,
            'status' => $typeA === 'annual' ? 'comparable_annual' : 'comparable_monthly',
            'granularity_a' => $typeA,
            'granularity_b' => $typeB,
            'label_a' => $labelA,
            'label_b' => $labelB,
            'title' => 'Perbandingan Periode Setara',
            'message' => "Kedua periode menggunakan indikator dan granularitas yang setara ({$granularityText} • {$datasetStatusText}).",
        ];
    }

    /**
     * Format human-readable label for a requested period.
     */
    private function formatRequestedPeriodLabel(array $data, int $year, mixed $month): string
    {
        if (! empty($data['period']['name'])) {
            return (string) $data['period']['name'];
        }
        $norm = strtolower(trim((string) $month));
        if ($norm === '' || $norm === 'all' || $norm === 'semua') {
            return "Semua Bulan Tersedia {$year}";
        }
        $monthName = self::MONTH_NAMES[(int) $month] ?? "Bulan {$month}";
        return "{$monthName} {$year}";
    }

    /**
     * Describe period granularity in Indonesian.
     */
    private function describeGranularity(string $type, int $monthsCount, string $range): string
    {
        return match ($type) {
            'annual' => 'Agregat 1 Tahun Penuh / 12 Bulan',
            'monthly_accumulation' => "Akumulasi Berjalan {$monthsCount} Bulan ({$range})",
            'monthly' => 'Agregat Bulanan (1 Bulan)',
            default => $range,
        };
    }

    /**
     * Core resolver for a single period request by year/month/periodId.
     */
    private function resolvePeriodByYearMonth(
        ?int $year,
        mixed $month,
        ?int $periodId = null,
        bool $isAllMonths = false
    ): JsonResponse {
        // Case 1: Specific period_id passed directly
        if ($periodId) {
            $period = Periode::published()->where('id', $periodId)->first();
            if (! $period) {
                return $this->emptyResponse('Data belum tersedia untuk periode publikasi.');
            }
            return $this->singlePeriodResponse($period);
        }

        // Case 2: Year provided and Month is 'all' / 'semua' / omitted (Full Year or All Available Months)
        $monthNormalized = strtolower(trim((string) $month));
        if ($year && ($month === null || $monthNormalized === '' || $monthNormalized === 'all' || $monthNormalized === 'semua' || $isAllMonths)) {
            return $this->resolveYearAllMonthsResponse($year);
        }

        // Case 3: Both Year and specific Month (1..12) provided
        if ($year && $month !== null) {
            $period = Periode::published()
                ->where('tahun', $year)
                ->where('bulan', (int) $month)
                ->first();

            if (! $period) {
                $monthName = self::MONTH_NAMES[(int) $month] ?? "Bulan {$month}";

                // Check if this year only has verified annual aggregate data
                $annualPeriod = Periode::published()
                    ->where('tahun', $year)
                    ->whereNull('bulan')
                    ->first();

                $hasMonthlyInYear = Periode::published()
                    ->where('tahun', $year)
                    ->whereNotNull('bulan')
                    ->exists();

                if ($annualPeriod && ! $hasMonthlyInYear) {
                    return $this->emptyResponse(
                        "Rincian bulanan tidak tersedia untuk periode {$monthName} {$year}. Data tahun {$year} hanya tersedia dalam bentuk agregat tahunan (pilih Semua Bulan Tersedia).",
                        'annual_only',
                        $annualPeriod
                    );
                }

                return $this->emptyResponse(
                    "Data kasus belum tersedia untuk periode {$monthName} {$year}.",
                    'month_unavailable'
                );
            }

            return $this->singlePeriodResponse($period);
        }

        // Case 4: Default fallback (no filter params) -> default to January 2026 or earliest available
        $defaultPeriod = Periode::published()
            ->where('tahun', 2026)
            ->where('bulan', 1)
            ->first();

        if (! $defaultPeriod) {
            $defaultPeriod = Periode::published()
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
     * Resolve 'Semua Bulan Tersedia' / full-year request for a given year.
     * - If the year has published monthly periods (e.g. 2026), accumulate them.
     * - If the year has a verified annual aggregate period (e.g. 2022-2025), return the annual period directly without dividing into fake months.
     */
    private function resolveYearAllMonthsResponse(int $year): JsonResponse
    {
        $monthlyPeriods = Periode::published()
            ->where('tahun', $year)
            ->whereNotNull('bulan')
            ->orderBy('bulan')
            ->get();

        if ($monthlyPeriods->isNotEmpty()) {
            return $this->accumulatedYearResponse($year, $monthlyPeriods);
        }

        $annualPeriod = Periode::published()
            ->where('tahun', $year)
            ->whereNull('bulan')
            ->first();

        if ($annualPeriod) {
            return $this->singlePeriodResponse($annualPeriod);
        }

        return $this->emptyResponse("Data publikasi belum tersedia untuk tahun {$year}.");
    }

    /**
     * Generate response for a single specific published period (either monthly or annual).
     */
    private function singlePeriodResponse(Periode $period): JsonResponse
    {
        $isAnnual = ($period->tipe_periode === 'annual' || $period->bulan === null);
        $allKecamatan = Kecamatan::orderBy('kode')->get();
        $records = KasusAgregat::where('periode_id', $period->id)
            ->published()
            ->get()
            ->keyBy('kecamatan_id');

        $totalCases = 0;
        $priorityCount = 0;
        $activeCasesArray = [];
        $maxCaseSubdistrict = null;
        $maxCaseVal = -1;

        $districts = $allKecamatan->map(function ($kec) use ($records, $isAnnual, &$totalCases, &$priorityCount, &$activeCasesArray, &$maxCaseSubdistrict, &$maxCaseVal) {
            $record = $records->get($kec->id);

            if ($record) {
                $cases = (int) $record->jumlah_kasus;
                $totalCases += $cases;
                $activeCasesArray[] = $cases;

                if ($cases > $maxCaseVal) {
                    $maxCaseVal = $cases;
                    $maxCaseSubdistrict = $kec->nama;
                }

                $isPriority = ($cases >= 10);
                if ($isPriority) {
                    $priorityCount++;
                }

                $tier = $this->determineTier($cases);
                $priorityStatus = $this->getPriorityStatusLabel($tier);
                $classificationLabel = $this->getClassificationTierLabel($tier);
                $fillColor = $this->getClassificationTierColor($tier);

                // Only expose IR when calculated from the verified population of the exact same period
                $irValidForPeriod = $isAnnual && $record->incidence_rate !== null && $record->jumlah_penduduk !== null;
                $irValue = $irValidForPeriod ? (float) $record->incidence_rate : null;
                $pop = $isAnnual ? $record->jumlah_penduduk : null;

                return [
                    'id' => $kec->id,
                    'code' => $kec->kode,
                    'name' => $kec->nama,
                    'has_data' => true,
                    'cases' => $cases,
                    'deaths' => (int) $record->jumlah_meninggal,
                    'incidence_rate' => $irValue,
                    'ir_valid_for_period' => $irValidForPeriod,
                    'tier' => $tier,
                    'classification_label' => $classificationLabel,
                    'fill_color' => $fillColor,
                    'priority_status' => $priorityStatus,
                    'is_priority' => $isPriority,
                    'population' => $pop,
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
                'ir_valid_for_period' => false,
                'tier' => null,
                'classification_label' => 'Data Belum Tersedia',
                'fill_color' => '#cbd5e1',
                'priority_status' => 'Data Belum Tersedia',
                'is_priority' => false,
                'population' => null,
                'area_km2' => $kec->luas_wilayah,
            ];
        });

        $maxCases = count($activeCasesArray) > 0 ? max($activeCasesArray) : 0;
        $minCases = count($activeCasesArray) > 0 ? min($activeCasesArray) : 0;

        $rangeText = $period->rentang_waktu
            ?: ($isAnnual
                ? "1 Tahun Penuh (Januari – Desember {$period->tahun})"
                : ((self::MONTH_NAMES[$period->bulan] ?? "Bulan {$period->bulan}") . " {$period->tahun}"));

        return response()->json([
            'success' => true,
            'has_data' => true,
            'period' => [
                'id' => $period->id,
                'name' => $period->nama,
                'year' => $period->tahun,
                'month' => $isAnnual ? 'all' : $period->bulan,
                'month_name' => $isAnnual
                    ? 'Semua Bulan Tersedia (Agregat Tahunan)'
                    : (self::MONTH_NAMES[$period->bulan] ?? null),
                'range' => $rangeText,
                'period_type' => $isAnnual ? 'annual' : 'monthly',
                'is_accumulation' => false,
                'is_annual' => $isAnnual,
                'monthly_available' => ! $isAnnual,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_count' => $allKecamatan->count(),
                'subdistricts_with_data' => count($activeCasesArray),
                'priority_count' => $priorityCount,
                'max_cases' => $maxCases,
                'min_cases' => $minCases,
                'max_case_subdistrict' => $maxCases > 0 ? $maxCaseSubdistrict : null,
            ],
            'classification' => $this->getClassificationMeta($minCases, $maxCases),
            'districts' => $districts,
            'metadata' => [
                'source' => $period->sumber_data,
                'status' => $isAnnual ? 'Data Agregat Tahunan Terverifikasi' : 'Simulasi Pengembangan',
                'completeness' => $period->status_kelengkapan,
                'is_simulation' => ! $isAnnual,
                'indicator' => $isAnnual
                    ? 'Jumlah Kasus DBD Agregat Tahunan per Kecamatan'
                    : 'Jumlah Kasus DBD Agregat per Kecamatan',
                'geojson_url' => '/geojson/banyumas_27_kecamatan.geojson',
                'updated_at' => $period->updated_at?->format('d M Y H:i'),
                'notes' => $period->keterangan,
            ],
        ]);
    }

    /**
     * Generate response for accumulated published months within a single year.
     */
    private function accumulatedYearResponse(int $year, ?Collection $periods = null): JsonResponse
    {
        if (! $periods) {
            $periods = Periode::published()
                ->where('tahun', $year)
                ->whereNotNull('bulan')
                ->orderBy('bulan')
                ->get();
        }

        if ($periods->isEmpty()) {
            return $this->emptyResponse("Data publikasi belum tersedia untuk tahun {$year}.");
        }

        $periodIds = $periods->pluck('id')->all();
        $firstMonthName = self::MONTH_NAMES[$periods->first()->bulan] ?? 'Bulan ' . $periods->first()->bulan;
        $lastMonthName = self::MONTH_NAMES[$periods->last()->bulan] ?? 'Bulan ' . $periods->last()->bulan;
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
        $maxCaseSubdistrict = null;
        $maxCaseVal = -1;

        $districts = $allKecamatan->map(function ($kec) use ($allRecords, &$totalCases, &$priorityCount, &$activeCasesArray, &$maxCaseSubdistrict, &$maxCaseVal) {
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
                    'ir_valid_for_period' => false,
                    'tier' => null,
                    'classification_label' => 'Data Belum Tersedia',
                    'fill_color' => '#cbd5e1',
                    'priority_status' => 'Data Belum Tersedia',
                    'is_priority' => false,
                    'population' => null,
                    'area_km2' => $kec->luas_wilayah,
                ];
            }

            $cases = (int) $records->sum('jumlah_kasus');
            $deaths = (int) $records->sum('jumlah_meninggal');
            $totalCases += $cases;
            $activeCasesArray[] = $cases;

            if ($cases > $maxCaseVal) {
                $maxCaseVal = $cases;
                $maxCaseSubdistrict = $kec->nama;
            }

            $isPriority = ($cases >= 10);
            if ($isPriority) {
                $priorityCount++;
            }

            $tier = $this->determineTier($cases);
            $priorityStatus = $this->getPriorityStatusLabel($tier);
            $classificationLabel = $this->getClassificationTierLabel($tier);
            $fillColor = $this->getClassificationTierColor($tier);

            return [
                'id' => $kec->id,
                'code' => $kec->kode,
                'name' => $kec->nama,
                'has_data' => true,
                'cases' => $cases,
                'deaths' => $deaths,
                'incidence_rate' => null,
                'ir_valid_for_period' => false,
                'tier' => $tier,
                'classification_label' => $classificationLabel,
                'fill_color' => $fillColor,
                'priority_status' => $priorityStatus,
                'is_priority' => $isPriority,
                'population' => null,
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
                'period_type' => 'monthly_accumulation',
                'is_accumulation' => true,
                'is_annual' => false,
                'monthly_available' => true,
            ],
            'summary' => [
                'total_cases' => $totalCases,
                'subdistricts_count' => $allKecamatan->count(),
                'subdistricts_with_data' => count($activeCasesArray),
                'priority_count' => $priorityCount,
                'max_cases' => $maxCases,
                'min_cases' => $minCases,
                'max_case_subdistrict' => $maxCases > 0 ? $maxCaseSubdistrict : null,
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
     * Standard empty state response when period has no data or monthly breakdown is unavailable.
     */
    private function emptyResponse(string $message, string $reason = 'unavailable', ?Periode $referencePeriod = null): JsonResponse
    {
        $metadata = [
            'source' => $referencePeriod?->sumber_data,
            'status' => $reason === 'annual_only'
                ? 'Rincian Bulanan Tidak Tersedia (Hanya Agregat Tahunan)'
                : 'Data Belum Tersedia',
            'completeness' => $referencePeriod?->status_kelengkapan,
            'is_simulation' => false,
            'indicator' => 'Jumlah Kasus DBD Agregat per Kecamatan',
            'updated_at' => $referencePeriod?->updated_at?->format('d M Y H:i'),
            'notes' => $referencePeriod?->keterangan,
        ];

        return response()->json([
            'success' => true,
            'has_data' => false,
            'reason' => $reason,
            'message' => $message,
            'period' => null,
            'summary' => [
                'total_cases' => null,
                'subdistricts_count' => 0,
                'subdistricts_with_data' => 0,
                'priority_count' => 0,
                'max_cases' => 0,
                'min_cases' => 0,
                'max_case_subdistrict' => null,
            ],
            'classification' => $this->getClassificationMeta(null, null),
            'districts' => [],
            'metadata' => $metadata,
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
     * Get choropleth classification legend label from tier.
     */
    private function getClassificationTierLabel(int $tier): string
    {
        return match ($tier) {
            3 => '≥ 10 Kasus (Prioritas Pemantauan)',
            2 => '5 – 9 Kasus',
            1 => '1 – 4 Kasus',
            default => '0 Kasus (Nol Kasus)',
        };
    }

    /**
     * Get choropleth fill color hex from tier.
     */
    private function getClassificationTierColor(int $tier): string
    {
        return match ($tier) {
            3 => '#dc2626',
            2 => '#fb923c',
            1 => '#fed7aa',
            default => '#f1f5f9',
        };
    }

    /**
     * Get classification metadata and thresholds.
     */
    private function getClassificationMeta(?int $min, ?int $max): array
    {
        return [
            'indicator' => 'Jumlah Kasus DBD Agregat per Kecamatan',
            'method' => 'Klasifikasi interval bertingkat berdasarkan jumlah kasus DBD agregat per kecamatan.',
            'tiers' => [
                [
                    'tier' => 0,
                    'label' => '0 Kasus (Nol Kasus)',
                    'range_label' => '0 Kasus',
                    'priority_status' => 'Nol Kasus',
                    'color' => '#f1f5f9', // Slate-100 neutral
                    'border_color' => '#94a3b8',
                    'range' => '0',
                    'description' => 'Tidak terdapat laporan kejadian DBD pada periode aktif.',
                ],
                [
                    'tier' => 1,
                    'label' => '1 – 4 Kasus',
                    'range_label' => '1–4 Kasus',
                    'priority_status' => 'Pemantauan Rutin',
                    'color' => '#fed7aa', // Orange-200 soft
                    'border_color' => '#fb923c',
                    'range' => '1 - 4',
                    'description' => 'Kejadian kasus rendah, pemantauan rutin wilayah.',
                ],
                [
                    'tier' => 2,
                    'label' => '5 – 9 Kasus',
                    'range_label' => '5–9 Kasus',
                    'priority_status' => 'Peningkatan Kewaspadaan',
                    'color' => '#fb923c', // Orange-400 medium
                    'border_color' => '#ea580c',
                    'range' => '5 - 9',
                    'description' => 'Kejadian kasus sedang, peningkatan kewaspadaan lingkungan.',
                ],
                [
                    'tier' => 3,
                    'label' => '≥ 10 Kasus (Prioritas Pemantauan)',
                    'range_label' => '≥10 Kasus',
                    'priority_status' => 'Wilayah Prioritas Pemantauan',
                    'color' => '#dc2626', // Red-600 prominent
                    'border_color' => '#991b1b',
                    'range' => '>= 10',
                    'description' => 'Wilayah Prioritas Pemantauan penanganan dan pengendalian vektor.',
                ],
            ],
            'nodata' => [
                'label' => 'Data Belum Tersedia',
                'range_label' => 'Tidak Tersedia',
                'priority_status' => 'Data Belum Tersedia',
                'color' => '#cbd5e1', // Slate-300 matching polygon nodata fill
                'border_color' => '#94a3b8',
            ],
        ];
    }

    /**
     * Get comprehensive public dataset metadata, methodology, indicator definitions,
     * data governance, and update information dynamically from MySQL (Fitur 10).
     */
    public function metadata(Request $request): JsonResponse
    {
        $metadataRecords = DatasetMetadata::publicVisible()
            ->orderBy('id')
            ->get();

        $publishedPeriods = Periode::published()
            ->orderBy('tahun')
            ->orderByRaw('bulan IS NOT NULL ASC')
            ->orderBy('bulan')
            ->get();

        $kecamatanCount = Kecamatan::count() ?: 27;

        // Calculate actual database statistics per year for published periods
        $periodIds = $publishedPeriods->pluck('id')->all();
        $recordsByPeriod = collect();
        if (! empty($periodIds)) {
            $recordsByPeriod = KasusAgregat::whereIn('periode_id', $periodIds)
                ->published()
                ->get()
                ->groupBy('periode_id');
        }

        $coverageSummary = $this->buildCoverageSummary($publishedPeriods, $recordsByPeriod, $metadataRecords, $kecamatanCount);
        $sourceGroups = $this->buildSourceGroups($metadataRecords);
        $updateInfo = $this->buildUpdateInformation($metadataRecords, $publishedPeriods);

        return response()->json([
            'success' => true,
            'general_info' => [
                'dataset_name' => 'Dataset Spasial-Temporal Kasus Demam Berdarah Dengue (DBD) Kabupaten Banyumas',
                'topic' => 'Epidemiologi dan Sebaran Wilayah Kasus Demam Berdarah Dengue (DBD)',
                'research_region' => 'Kabupaten Banyumas, Provinsi Jawa Tengah',
                'analysis_unit' => "{$kecamatanCount} Kecamatan Administratif (Kode Wilayah 330201–330227)",
                'observation_years' => '2022–2026 (5 Tahun Pengamatan)',
                'primary_indicator' => 'Jumlah Kasus DBD Terlapor per Kecamatan & Incidence Rate (IR) per 100.000 Penduduk',
                'data_format' => 'Data Agregat Spasial-Temporal Terstruktur (MySQL RDBMS & GeoJSON Polygon WGS84)',
                'visualization_method' => 'Peta Choropleth Interaktif (Leaflet.js), Perbandingan Dua Periode, dan Grafik Tren (Recharts)',
            ],
            'sources' => $sourceGroups,
            'coverage' => [
                'region' => 'Kabupaten Banyumas',
                'subdistricts_count' => $kecamatanCount,
                'years_range' => '2022–2026',
                'available_years' => [2022, 2023, 2024, 2025, 2026],
                'annual_granularity_years' => [2022, 2023, 2024, 2025],
                'monthly_granularity_years' => [2026],
                'completeness_summary' => 'Data tahun 2022–2025 lengkap untuk seluruh 27 kecamatan pada tingkat agregat tahunan resmi. Data tahun 2026 tersedia secara parsial pada bulan Januari–Maret 2026 (data simulasi pengembangan terlabel), sedangkan bulan April–Desember 2026 belum tersedia.',
                'yearly_table' => $coverageSummary,
            ],
            'indicators' => [
                [
                    'code' => 'jumlah_kasus',
                    'name' => 'Jumlah Kasus DBD',
                    'unit' => 'Kasus',
                    'formula' => 'Σ Kasus DBD Terlapor di Wilayah Kerja Puskesmas dalam Satu Kecamatan',
                    'definition' => 'Total kasus Demam Berdarah Dengue (DBD) yang tercatat secara agregat pada suatu kecamatan dalam periode waktu tertentu (tahunan untuk 2022–2025, atau bulanan untuk periode yang tersedia).',
                    'usage_note' => 'Indikator utama yang ditampilkan pada Dashboard Publik, Peta Choropleth, Popup Detail Kecamatan, Perbandingan Periode, dan Grafik Tren.',
                ],
                [
                    'code' => 'incidence_rate',
                    'name' => 'Incidence Rate (IR) / Angka Kesakitan DBD',
                    'unit' => 'Per 100.000 Penduduk',
                    'formula' => 'IR = (Jumlah Kasus DBD / Jumlah Penduduk) × 100.000',
                    'definition' => 'Ukuran epidemiologi yang menyatakan jumlah kasus DBD baru per 100.000 penduduk di wilayah dan periode waktu yang bersangkutan.',
                    'usage_note' => 'Hanya dihitung apabila data jumlah kasus dan jumlah penduduk berasal dari tahun dan cakupan wilayah pengamatan yang sepadan (tersedia terverifikasi pada rekapitulasi tahunan 2022–2025).',
                ],
                [
                    'code' => 'wilayah_prioritas',
                    'name' => 'Wilayah Prioritas Pemantauan',
                    'unit' => 'Klasifikasi Visual (≥ 10 Kasus)',
                    'formula' => 'Jumlah Kasus DBD Kecamatan ≥ 10 Kasus pada Periode Aktif',
                    'definition' => 'Penandaan visual bagi kecamatan yang memiliki jumlah kasus DBD tertinggi atau mencapai ambang batas klasifikasi peta tertinggi (≥ 10 kasus) pada periode yang sedang diamati.',
                    'usage_note' => 'Merupakan indikator klasifikasi visual untuk membantu pemantauan kewaspadaan dini, BUKAN hasil uji klaster spasial inferensial (seperti Moran\'s I atau Getis-Ord Gi*) sehingga tidak disebut sebagai hotspot signifikan secara statistik.',
                ],
            ],
            'methodology' => [
                'flow_steps' => [
                    [
                        'step' => 1,
                        'title' => 'Sumber Data',
                        'subtitle' => 'Inventarisasi Dokumen Resmi',
                        'description' => 'Pengumpulan workbook rekapitulasi DBD Kabupaten Banyumas (2022–2025), dokumen PDF Profil Kesehatan Kabupaten Banyumas (2021–2025), serta batas administrasi GeoJSON 27 kecamatan.',
                    ],
                    [
                        'step' => 2,
                        'title' => 'Pemeriksaan dan Validasi',
                        'subtitle' => 'Verifikasi Silang & Izin Publikasi',
                        'description' => 'Pemeriksaan kesesuaian total kasus, rincian jenis kelamin (L/P), kematian, jumlah penduduk, dan status izin publikasi setiap sumber data.',
                    ],
                    [
                        'step' => 3,
                        'title' => 'Agregasi Data Wilayah',
                        'subtitle' => '40 Puskesmas ke 27 Kecamatan',
                        'description' => 'Pemetaan dan penjumlahan data kasus DBD dari 40 unit kerja Puskesmas ke dalam 27 unit administrasi Kecamatan di Kabupaten Banyumas secara konsisten.',
                    ],
                    [
                        'step' => 4,
                        'title' => 'Penyimpanan MySQL',
                        'subtitle' => 'Basis Data Relasional Terstruktur',
                        'description' => 'Penyimpanan data agregat kecamatan, periode pengamatan, dan metadata tata kelola ke dalam tabel MySQL dengan pemisahan ketat terhadap data internal.',
                    ],
                    [
                        'step' => 5,
                        'title' => 'API Laravel',
                        'subtitle' => 'Layanan Endpoint Publik Terfilter',
                        'description' => 'Penyediaan endpoint REST API publik melalui Laravel yang hanya menayangkan periode berstatus DAPAT_DIPUBLIKASIKAN serta menyertakan label sumber dan status.',
                    ],
                    [
                        'step' => 6,
                        'title' => 'Visualisasi React dan Leaflet',
                        'subtitle' => 'Peta Choropleth & Analitik Tren',
                        'description' => 'Penyajian interaktif pada antarmuka React berupa Peta Choropleth Leaflet 27 kecamatan, Perbandingan Dua Periode, dan Grafik Tren Recharts.',
                    ],
                ],
                'aggregation_notes' => [
                    'Data sumber tahun 2022–2025 tercatat pada tingkat 40 Puskesmas di Kabupaten Banyumas, kemudian diagregasikan secara administratif menjadi 27 Kecamatan sesuai peta wilayah kerja Dinas Kesehatan.',
                    'Contoh agregasi multi-puskesmas ke satu kecamatan: Kecamatan Purwokerto Selatan (Puskesmas Purwokerto Selatan), Kecamatan Purwokerto Barat (Puskesmas Purwokerto Barat), Kecamatan Purwokerto Timur (Puskesmas Purwokerto Timur I & II), Kecamatan Purwokerto Utara (Puskesmas Purwokerto Utara I & II), Kecamatan Sokaraja (Puskesmas Sokaraja I & II), Kecamatan Kembaran (Puskesmas Kembaran I & II), Kecamatan Sumbang (Puskesmas Sumbang I & II), Kecamatan Baturraden (Puskesmas Baturraden I & II), Kecamatan Cilongok (Puskesmas Cilongok I & II), Kecamatan Pekuncen (Puskesmas Pekuncen I & II), Kecamatan Wangon (Puskesmas Wangon I & II), Kecamatan Jatilawang (Puskesmas Jatilawang), serta kecamatan lainnya hingga genap 27 kecamatan.',
                    'Data tahunan resmi 2022–2025 disajikan apa adanya sebagai agregat 1 tahun penuh dan tidak pernah dibagi secara artifisial menjadi angka bulanan.',
                    'Catatan transparansi rekonsiliasi historis: apabila masih terdapat proses verifikasi lanjutan pada rincian historis tertentu, sistem secara jujur menampilkan cakupan dan status verifikasi yang berlaku tanpa memalsukan nilai.',
                ],
            ],
            'mapping_method' => [
                'map_type' => 'Peta Choropleth (Gradasi Warna Wilayah Administratif)',
                'spatial_unit' => 'Polygon Batas Administrasi 27 Kecamatan Kabupaten Banyumas',
                'map_library' => 'Leaflet.js (React-Leaflet) dengan Basemap OpenStreetMap',
                'geometry_format' => 'GeoJSON FeatureCollection (Sistem Koordinat WGS 84 / EPSG:4326)',
                'classification_method' => 'Klasifikasi Interval Bertingkat Berdasarkan Jumlah Kasus DBD',
                'legend_classes' => $this->getClassificationMeta(null, null),
                'interpretation_disclaimer' => 'Warna polygon pada peta choropleth merepresentasikan jumlah kasus DBD relatif pada tingkat kecamatan berdasarkan klasifikasi interval visual. Gradasi warna ini ditujukan untuk keterbacaan informasi publik dan pemantauan wilayah, bukan diagnosis medis individual maupun penetapan status darurat klinis resmi.',
            ],
            'status_and_limitations' => [
                'statuses' => [
                    [
                        'code' => 'RESMI_DIPUBLIKASIKAN',
                        'label' => 'Resmi Dipublikasikan',
                        'badge_tone' => 'emerald',
                        'meaning' => 'Data berasal dari rekapitulasi resmi yang telah diverifikasi dan diizinkan untuk ditampilkan secara terbuka kepada masyarakat (Tahun 2022, 2023, 2024, dan 2025).',
                    ],
                    [
                        'code' => 'SIMULASI_PENGEMBANGAN',
                        'label' => 'Data Simulasi Pengembangan',
                        'badge_tone' => 'amber',
                        'meaning' => 'Data agregat sintetis terlabel yang digunakan untuk pengujian fitur visualisasi bulanan (Januari–Maret 2026) selama data tahun berjalan belum memperoleh izin publikasi.',
                    ],
                    [
                        'code' => 'INTERNAL_BELUM_DIIZINKAN',
                        'label' => 'Data Internal Belum Diizinkan',
                        'badge_tone' => 'rose',
                        'meaning' => 'Data surveilans tahun berjalan dari instansi terkait yang belum memiliki izin rilis publik, sehingga diisolasi dan tidak ditampilkan pada halaman publik.',
                    ],
                    [
                        'code' => 'DATA_BELUM_TERSEDIA',
                        'label' => 'Data Belum Tersedia',
                        'badge_tone' => 'slate',
                        'meaning' => 'Periode atau rincian waktu yang datanya belum tercatat dalam basis data publik (misalnya rincian bulanan 2022–2025 atau bulan April–Desember 2026). Ditampilkan sebagai null/kosong, bukan 0 kasus.',
                    ],
                    [
                        'code' => 'DATA_PARSIAL',
                        'label' => 'Data Parsial',
                        'badge_tone' => 'blue',
                        'meaning' => 'Kondisi ketika suatu tahun pengamatan baru memiliki sebagian bulan yang tercatat (contoh: tahun 2026 hanya mencakup 3 bulan, yaitu Januari–Maret 2026).',
                    ],
                ],
                'limitations' => [
                    'Data surveilans tahun 2026 dari Dinas Kesehatan Kabupaten Banyumas masih bersifat internal dan belum memperoleh izin publikasi terbuka, sehingga angka dari sumber internal tersebut tidak ditayangkan di halaman publik.',
                    'Tampilan publik untuk tahun 2026 (Januari–Maret) menggunakan data simulasi pengembangan yang diberi label secara eksplisit agar tidak disalahartikan sebagai laporan resmi.',
                    'Data resmi tahun 2022–2025 dari sumber rekapitulasi hanya tersedia dalam granularitas agregat tahunan (12 bulan penuh) dan tidak memiliki rincian per bulan per kecamatan.',
                    'Sistem membedakan secara tegas antara wilayah dengan 0 kasus terverifikasi dan periode yang datanya belum tersedia (null). Data yang tidak tersedia tidak pernah diubah menjadi angka 0.',
                ],
            ],
            'ethics_and_privacy' => [
                'principle_summary' => 'WebGIS DBD Kabupaten Banyumas menerapkan prinsip perlindungan privasi data kesehatan masyarakat dan kepatuhan terhadap izin publikasi instansi.',
                'commitments' => [
                    'Seluruh visualisasi hanya menampilkan data agregat pada tingkat administrasi Kecamatan (27 Kecamatan).',
                    'Sistem sama sekali tidak menyimpan, memproses, maupun menampilkan data pribadi atau rekam medis pasien di antarmuka maupun endpoint publik.',
                    'Dataset internal yang belum mendapatkan izin publikasi resmi dari Dinas Kesehatan Kabupaten Banyumas tidak ditampilkan dan tidak dapat diunduh melalui sistem publik.',
                ],
                'excluded_personal_data' => [
                    'Nama Pasien',
                    'Nomor Induk Kependudukan (NIK)',
                    'Alamat Rumah / Koordinat Domisili Pasien',
                    'Nomor Rekam Medis & Riwayat Klinis Rumah Sakit',
                    'Identitas Individu / Kontak Pribadi Lainnya',
                ],
            ],
            'update_info' => $updateInfo,
        ]);
    }

    /**
     * Get structured period coverage metadata dynamically from MySQL (Fitur 10).
     */
    public function metadataPeriods(Request $request): JsonResponse
    {
        $metadataRecords = DatasetMetadata::publicVisible()
            ->orderBy('id')
            ->get();

        $publishedPeriods = Periode::published()
            ->orderBy('tahun')
            ->orderByRaw('bulan IS NOT NULL ASC')
            ->orderBy('bulan')
            ->get();

        $kecamatanCount = Kecamatan::count() ?: 27;

        $periodIds = $publishedPeriods->pluck('id')->all();
        $recordsByPeriod = collect();
        if (! empty($periodIds)) {
            $recordsByPeriod = KasusAgregat::whereIn('periode_id', $periodIds)
                ->published()
                ->get()
                ->groupBy('periode_id');
        }

        $yearlyCoverage = $this->buildCoverageSummary($publishedPeriods, $recordsByPeriod, $metadataRecords, $kecamatanCount);

        $periodDetails = $publishedPeriods->map(function (Periode $p) use ($recordsByPeriod, $kecamatanCount) {
            $recs = $recordsByPeriod->get($p->id, collect());
            $totalCases = (int) $recs->sum('jumlah_kasus');
            $totalDeaths = (int) $recs->sum('jumlah_meninggal');
            $isSim = $p->tahun === 2026 || str_contains(strtolower((string) $p->sumber_data), 'simulasi');

            return [
                'id' => $p->id,
                'year' => $p->tahun,
                'month' => $p->bulan,
                'month_name' => $p->bulan ? (self::MONTH_NAMES[$p->bulan] ?? null) : null,
                'period_label' => $p->nama_periode,
                'granularity' => $p->bulan === null ? 'Tahunan' : 'Bulanan',
                'subdistricts_covered' => $recs->count(),
                'expected_subdistricts' => $kecamatanCount,
                'total_cases' => $totalCases,
                'total_deaths' => $totalDeaths,
                'source' => $p->sumber_data,
                'publication_status' => $isSim ? 'Data Simulasi Pengembangan' : 'Resmi Dipublikasikan',
                'is_simulation' => $isSim,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'subdistricts_total' => $kecamatanCount,
            'years_summary' => $yearlyCoverage,
            'published_periods' => $periodDetails,
        ]);
    }

    /**
     * Get structured data source catalogue grouped by governance status (Fitur 10).
     */
    public function metadataSources(Request $request): JsonResponse
    {
        $metadataRecords = DatasetMetadata::publicVisible()
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'sources' => $this->buildSourceGroups($metadataRecords),
        ]);
    }

    /**
     * Build yearly coverage summary table for 2022–2026 from database records.
     */
    private function buildCoverageSummary(
        Collection $publishedPeriods,
        \Illuminate\Support\Collection $recordsByPeriod,
        Collection $metadataRecords,
        int $kecamatanCount
    ): array {
        $metaByYear = $metadataRecords->whereNotNull('observation_year')->groupBy('observation_year');
        $targetYears = [2022, 2023, 2024, 2025, 2026];
        $summary = [];

        foreach ($targetYears as $yr) {
            $yearPeriods = $publishedPeriods->where('tahun', $yr);
            $annualPeriod = $yearPeriods->whereNull('bulan')->first();
            $monthlyPeriods = $yearPeriods->whereNotNull('bulan')->sortBy('bulan')->values();

            if ($annualPeriod) {
                $recs = $recordsByPeriod->get($annualPeriod->id, collect());
                $totalCases = (int) $recs->sum('jumlah_kasus');
                $totalDeaths = (int) $recs->sum('jumlah_meninggal');
                $coveredCount = $recs->count();
                $meta = $metaByYear->get($yr)?->firstWhere('source_category', 'published');

                $summary[] = [
                    'year' => $yr,
                    'granularity' => 'Tahunan (1 Tahun Penuh)',
                    'months_available' => 'Agregat 12 Bulan (Tanpa Rincian Bulanan)',
                    'subdistricts_covered' => "{$coveredCount} / {$kecamatanCount} Kecamatan",
                    'total_cases' => $totalCases,
                    'total_deaths' => $totalDeaths,
                    'status_label' => 'Data Resmi Dipublikasikan',
                    'status_code' => 'RESMI_DIPUBLIKASIKAN',
                    'is_simulation' => false,
                    'is_partial' => false,
                    'source_name' => $meta?->source_name ?? $annualPeriod->sumber_data,
                    'reference_source' => $meta?->reference_source ?? "Profil Kesehatan Kabupaten Banyumas Tahun {$yr}",
                    'update_date' => $meta?->update_date?->format('Y-m-d') ?? '2025-10-15',
                    'notes' => "Data agregat tahunan resmi terverifikasi ({$totalCases} kasus, {$totalDeaths} meninggal) untuk seluruh {$coveredCount} kecamatan.",
                ];
            } elseif ($monthlyPeriods->isNotEmpty()) {
                $monthNames = $monthlyPeriods->map(fn ($p) => self::MONTH_NAMES[$p->bulan] ?? $p->bulan)->all();
                $totalCases = 0;
                $totalDeaths = 0;
                $coveredMax = 0;
                foreach ($monthlyPeriods as $mp) {
                    $recs = $recordsByPeriod->get($mp->id, collect());
                    $totalCases += (int) $recs->sum('jumlah_kasus');
                    $totalDeaths += (int) $recs->sum('jumlah_meninggal');
                    $coveredMax = max($coveredMax, $recs->count());
                }
                $metaSim = $metaByYear->get($yr)?->firstWhere('source_category', 'published_simulation');
                $monthRange = count($monthNames) > 1
                    ? $monthNames[0] . '–' . $monthNames[count($monthNames) - 1] . ' ' . $yr
                    : ($monthNames[0] ?? '') . ' ' . $yr;

                $summary[] = [
                    'year' => $yr,
                    'granularity' => 'Bulanan Parsial (' . count($monthNames) . ' dari 12 Bulan)',
                    'months_available' => $monthRange . ' (April–Desember Belum Tersedia)',
                    'subdistricts_covered' => "{$coveredMax} / {$kecamatanCount} Kecamatan",
                    'total_cases' => $totalCases,
                    'total_deaths' => $totalDeaths,
                    'status_label' => 'Data Simulasi Pengembangan (Parsial)',
                    'status_code' => 'SIMULASI_PENGEMBANGAN',
                    'is_simulation' => true,
                    'is_partial' => true,
                    'source_name' => $metaSim?->source_name ?? ($monthlyPeriods->first()->sumber_data ?? 'Dataset Simulasi Pengembangan'),
                    'reference_source' => $metaSim?->reference_source ?? 'Data Asli 2026 Dinkes Banyumas Belum Diizinkan Publikasi',
                    'update_date' => $metaSim?->update_date?->format('Y-m-d') ?? '2026-03-31',
                    'notes' => "Tersedia untuk bulan {$monthRange} (akumulasi {$totalCases} kasus simulasi). Data surveilans asli tahun {$yr} dari Dinkes Kabupaten Banyumas bersifat internal dan belum memperoleh izin publikasi.",
                ];
            } else {
                $summary[] = [
                    'year' => $yr,
                    'granularity' => 'Belum Tersedia',
                    'months_available' => 'Belum Tersedia',
                    'subdistricts_covered' => "0 / {$kecamatanCount} Kecamatan",
                    'total_cases' => null,
                    'total_deaths' => null,
                    'status_label' => 'Data Belum Tersedia',
                    'status_code' => 'DATA_BELUM_TERSEDIA',
                    'is_simulation' => false,
                    'is_partial' => false,
                    'source_name' => '-',
                    'reference_source' => '-',
                    'update_date' => null,
                    'notes' => "Belum terdapat periode publikasi aktif untuk tahun {$yr}.",
                ];
            }
        }

        return $summary;
    }

    /**
     * Format metadata records into the 3 required governance groups without exposing local paths or internal numbers.
     */
    private function buildSourceGroups(Collection $metadataRecords): array
    {
        $formatItem = function (DatasetMetadata $item): array {
            return [
                'dataset_code' => $item->dataset_code,
                'dataset_name' => $item->dataset_name,
                'source_name' => $item->source_name,
                'reference_source' => $item->reference_source,
                'source_type' => $item->source_type,
                'source_category' => $item->source_category,
                'observation_year' => $item->observation_year,
                'period_range' => ($item->period_start && $item->period_end)
                    ? $item->period_start->format('Y-m-d') . ' s.d. ' . $item->period_end->format('Y-m-d')
                    : 'Lintas Periode Administratif',
                'spatial_unit' => $item->spatial_unit,
                'indicator' => $item->indicator,
                'granularity' => $item->granularity,
                'publication_status' => $item->publication_status,
                'validation_status' => $item->validation_status,
                'update_date' => $item->update_date?->format('Y-m-d'),
                'description' => $item->description,
            ];
        };

        $publishedItems = $metadataRecords
            ->whereIn('source_category', ['published', 'published_simulation'])
            ->map($formatItem)
            ->values()
            ->all();

        $referenceItems = $metadataRecords
            ->where('source_category', 'reference')
            ->map($formatItem)
            ->values()
            ->all();

        $restrictedItems = $metadataRecords
            ->where('source_category', 'internal_restricted')
            ->map($formatItem)
            ->values()
            ->all();

        return [
            'published_sources' => [
                'group_title' => '1. Sumber Data yang Dipublikasikan pada WebGIS',
                'group_description' => 'Dataset yang secara aktif divisualisasikan pada Dashboard Publik, Peta Choropleth, Perbandingan Periode, dan Grafik Tren sesuai status publikasinya.',
                'items' => $publishedItems,
            ],
            'reference_sources' => [
                'group_title' => '2. Sumber Referensi Pembanding & Geospasial',
                'group_description' => 'Dokumen publikasi resmi daerah dan data batas wilayah administrasi yang digunakan untuk validasi silang angka agregat serta pemetaan poligon kecamatan.',
                'items' => $referenceItems,
            ],
            'restricted_internal_sources' => [
                'group_title' => '3. Sumber Internal yang Belum Mendapatkan Izin Publikasi',
                'group_description' => 'Sumber data internal instansi yang telah diaudit ketersediaannya namun diisolasi dari tampilan publik demi mematuhi kebijakan izin publikasi resmi.',
                'items' => $restrictedItems,
            ],
        ];
    }

    /**
     * Build authentic dataset update information from stored metadata dates (never fabricated now()).
     */
    private function buildUpdateInformation(Collection $metadataRecords, Collection $publishedPeriods): array
    {
        $officialMeta = $metadataRecords->where('source_category', 'published')->sortByDesc('observation_year')->first();
        $simMeta = $metadataRecords->where('source_category', 'published_simulation')->first();

        $latestOfficialPeriod = $publishedPeriods->where('tahun', '<=', 2025)->sortByDesc('tahun')->first();
        $latestSimPeriod = $publishedPeriods->where('tahun', 2026)->sortByDesc('bulan')->first();

        return [
            'official_dataset_update_date' => $officialMeta?->update_date?->format('Y-m-d') ?? '2025-10-15',
            'official_dataset_update_label' => '15 Oktober 2025 (Sinkronisasi Rekapitulasi Tahunan 2022–2025)',
            'simulation_dataset_update_date' => $simMeta?->update_date?->format('Y-m-d') ?? '2026-03-31',
            'simulation_dataset_update_label' => '31 Maret 2026 (Dataset Simulasi Pengembangan Januari–Maret 2026)',
            'latest_official_period' => $latestOfficialPeriod?->nama_periode ?? 'Tahun 2025 (Agregat Tahunan)',
            'latest_available_period_overall' => $latestSimPeriod
                ? ($latestSimPeriod->nama_periode . ' (Simulasi Pengembangan)')
                : ($latestOfficialPeriod?->nama_periode ?? 'Tahun 2025'),
            'update_source' => 'Dinas Kesehatan Kabupaten Banyumas (Rekapitulasi Resmi 2022–2025) & Skema Simulasi Spasial Terlabel (2026 Q1)',
            'update_status' => 'Terverifikasi untuk Agregat Tahunan 2022–2025; Menunggu Izin Publikasi Resmi untuk Data Surveilans Tahun Berjalan 2026',
            'update_policy_note' => 'Tanggal pemutakhiran di atas mencerminkan tanggal aktual pencatatan metadata dataset di dalam basis data MySQL, bukan waktu akses halaman saat ini.',
        ];
    }
}
