<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Database\Seeders\KasusAgregatSeeder;
use Database\Seeders\KecamatanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicMapTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test /peta route is publicly accessible without authentication.
     */
    public function test_map_page_accessible_publicly(): void
    {
        $response = $this->get('/peta');

        $response->assertStatus(200);
        $response->assertSee('<div id="root"></div>', false);
    }

    /**
     * Test public map API returns all 27 subdistricts with correct published data.
     */
    public function test_map_api_returns_all_27_subdistricts_with_correct_published_data(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        $response = $this->getJson('/api/public/map');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Januari 2026',
                    'year' => 2026,
                ],
                'summary' => [
                    'total_cases' => 143,
                    'subdistricts_count' => 27,
                    'priority_count' => 5, // Purwokerto Sel(19), Timur(16), Sokaraja(14), Ajibarang(12), Cilongok(11)
                ],
                'metadata' => [
                    'is_simulation' => true,
                    'status' => 'Simulasi Pengembangan',
                ],
            ]);

        $districts = $response->json('districts');
        $this->assertCount(27, $districts, 'Must return all 27 subdistricts');

        // Check high-priority subdistrict (Purwokerto Selatan)
        $pwtSelatan = collect($districts)->firstWhere('name', 'Purwokerto Selatan');
        $this->assertNotNull($pwtSelatan);
        $this->assertEquals(19, $pwtSelatan['cases']);
        $this->assertTrue($pwtSelatan['is_priority']);
        $this->assertEquals('Wilayah Prioritas Pemantauan', $pwtSelatan['priority_status']);
        $this->assertEquals(3, $pwtSelatan['tier']);

        // Check zero-cases subdistrict (Lumbir)
        $lumbir = collect($districts)->firstWhere('name', 'Lumbir');
        $this->assertNotNull($lumbir);
        $this->assertTrue($lumbir['has_data']);
        $this->assertSame(0, $lumbir['cases']);
        $this->assertFalse($lumbir['is_priority']);
        $this->assertEquals('Nol Kasus', $lumbir['priority_status']);
        $this->assertEquals(0, $lumbir['tier']);
    }

    /**
     * Test public map API strictly isolates internal unpublished Dinkes data.
     */
    public function test_map_api_strictly_isolates_internal_unauthorized_dinkes_data(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // Internal period exists with 117 cases in DB
        $internalPeriod = Periode::where('status_publikasi', 'INTERNAL_BELUM_DIIZINKAN')->first();
        $this->assertNotNull($internalPeriod);

        $response = $this->getJson('/api/public/map');
        $response->assertStatus(200);

        // Assert 117 cases or internal draft name does NOT appear
        $this->assertNotEquals(117, $response->json('summary.total_cases'));
        $this->assertEquals(143, $response->json('summary.total_cases'));

        $content = $response->getContent();
        $this->assertStringNotContainsString('INTERNAL_BELUM_DIIZINKAN', $content);
        $this->assertStringNotContainsString('Data Dinkes Internal', $content);

        // Assert direct request to internal period returns empty state
        $directResponse = $this->getJson("/api/public/map?periode_id={$internalPeriod->id}");
        $directResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
                'message' => 'Data belum tersedia untuk periode publikasi.',
            ]);
    }

    /**
     * Test map API handles graceful empty state when no published data exists.
     */
    public function test_map_api_handles_empty_state_when_no_published_data_exists(): void
    {
        $response = $this->getJson('/api/public/map');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
                'period' => null,
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_count' => 0,
                    'priority_count' => 0,
                ],
                'districts' => [],
            ]);
    }

    /**
     * Test map API distinguishes valid zero cases from missing data.
     */
    public function test_map_api_distinguishes_zero_cases_from_missing_data(): void
    {
        $kec1 = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);

        $kec2 = Kecamatan::create([
            'kode' => '330202',
            'nama' => 'Wangon',
            'luas_wilayah' => 60.78,
            'jumlah_penduduk' => 87000,
        ]);

        $period = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'sumber_data' => 'Simulasi',
        ]);

        // kec1 has valid 0 cases
        KasusAgregat::create([
            'kecamatan_id' => $kec1->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 0,
            'jumlah_meninggal' => 0,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // kec2 has NO record (missing data)

        $response = $this->getJson('/api/public/map');
        $districts = $response->json('districts');

        $lumbir = collect($districts)->firstWhere('code', '330201');
        $this->assertTrue($lumbir['has_data']);
        $this->assertSame(0, $lumbir['cases']);
        $this->assertEquals('Nol Kasus', $lumbir['priority_status']);

        $wangon = collect($districts)->firstWhere('code', '330202');
        $this->assertFalse($wangon['has_data']);
        $this->assertNull($wangon['cases']);
        $this->assertEquals('Data Belum Tersedia', $wangon['priority_status']);
    }

    /**
     * Test static GeoJSON file exists and contains all 27 subdistricts matching database.
     */
    public function test_geojson_file_integrity_and_27_subdistricts_match(): void
    {
        $this->seed(KecamatanSeeder::class);

        $geojsonPath = public_path('geojson/banyumas_27_kecamatan.geojson');
        $this->assertFileExists($geojsonPath);

        $content = json_decode(file_get_contents($geojsonPath), true);
        $this->assertEquals('FeatureCollection', $content['type']);
        $this->assertCount(27, $content['features']);

        $dbKecamatans = Kecamatan::orderBy('kode')->pluck('nama', 'kode')->toArray();

        foreach ($content['features'] as $feature) {
            $props = $feature['properties'];
            $code = $props['kode_kecamatan'];
            $name = $props['nama_kecamatan'];

            $this->assertArrayHasKey($code, $dbKecamatans, "GeoJSON code {$code} must exist in DB");
            $this->assertEquals($dbKecamatans[$code], $name, "GeoJSON name must match DB for code {$code}");
            $this->assertContains($feature['geometry']['type'], ['Polygon', 'MultiPolygon']);
        }
    }

    /**
     * Test /api/public/map/periods returns exact 5 years (2022, 2023, 2024, 2025, 2026) and excludes internal Dinkes data.
     */
    public function test_periods_endpoint_returns_exact_five_years_and_published_periods(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        $response = $this->getJson('/api/public/map/periods');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'default_selection' => [
                    'year' => 2026,
                    'month' => 1,
                ],
            ]);

        $years = $response->json('years');
        $this->assertSame([2022, 2023, 2024, 2025, 2026], $years, 'Must return exact 5 years: 2022, 2023, 2024, 2025, 2026');

        // Check year modes for 2022-2025 (annual only) vs 2026 (monthly)
        foreach ([2022, 2023, 2024, 2025] as $yr) {
            $this->assertEquals('annual', $response->json("year_modes.{$yr}.type"));
            $this->assertFalse($response->json("year_modes.{$yr}.has_monthly"));
            $this->assertTrue($response->json("year_modes.{$yr}.has_annual"));
            $this->assertEquals('all', $response->json("year_modes.{$yr}.default_month"));
        }

        $this->assertEquals('monthly', $response->json('year_modes.2026.type'));
        $this->assertTrue($response->json('year_modes.2026.has_monthly'));

        $periods2026 = $response->json('periods_by_year.2026');
        $months2026 = collect($periods2026)->pluck('month')->toArray();
        $this->assertContains(1, $months2026); // Januari
        $this->assertContains(2, $months2026); // Februari
        $this->assertContains(3, $months2026); // Maret
        $this->assertNotContains(11, $months2026); // November not available
        $this->assertNotContains(12, $months2026); // Desember not available

        // Ensure internal unpublished period is not listed
        $content = $response->getContent();
        $this->assertStringNotContainsString('INTERNAL_BELUM_DIIZINKAN', $content);
        $this->assertStringNotContainsString('Data Dinkes Internal', $content);
    }

    /**
     * Test filtering map API across all 5 years (2022, 2023, 2024, 2025, 2026) returns verified data.
     */
    public function test_map_api_returns_verified_data_for_all_five_years_2022_to_2026(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Year 2022 (307 cases, 13 priority subdistricts, max 27 in Wangon)
        $res2022 = $this->getJson('/api/public/map?tahun=2022&bulan=all');
        $res2022->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Data Tahunan 2022',
                    'year' => 2022,
                    'month' => 'all',
                    'period_type' => 'annual',
                    'is_annual' => true,
                ],
                'summary' => [
                    'total_cases' => 307,
                    'subdistricts_count' => 27,
                    'priority_count' => 13,
                    'max_cases' => 27,
                    'max_case_subdistrict' => 'Wangon',
                ],
                'metadata' => [
                    'is_simulation' => false,
                    'status' => 'Data Agregat Tahunan Terverifikasi',
                ],
            ]);

        // 2. Year 2023 (273 cases, 11 priority subdistricts, max 27 in Sokaraja)
        $res2023 = $this->getJson('/api/public/map?tahun=2023&bulan=all');
        $res2023->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Data Tahunan 2023',
                    'year' => 2023,
                    'month' => 'all',
                    'period_type' => 'annual',
                    'is_annual' => true,
                ],
                'summary' => [
                    'total_cases' => 273,
                    'subdistricts_count' => 27,
                    'priority_count' => 11,
                    'max_cases' => 27,
                    'max_case_subdistrict' => 'Sokaraja',
                ],
                'metadata' => [
                    'is_simulation' => false,
                    'status' => 'Data Agregat Tahunan Terverifikasi',
                ],
            ]);

        // 3. Year 2024 (2180 cases, 27 priority subdistricts, max 139 in Sokaraja)
        $res2024 = $this->getJson('/api/public/map?tahun=2024&bulan=all');
        $res2024->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Data Tahunan 2024',
                    'year' => 2024,
                    'month' => 'all',
                    'period_type' => 'annual',
                    'is_annual' => true,
                ],
                'summary' => [
                    'total_cases' => 2180,
                    'subdistricts_count' => 27,
                    'priority_count' => 27,
                    'max_cases' => 139,
                    'max_case_subdistrict' => 'Sokaraja',
                ],
                'metadata' => [
                    'is_simulation' => false,
                    'status' => 'Data Agregat Tahunan Terverifikasi',
                ],
            ]);

        // 4. Year 2025 (1062 cases, 25 priority subdistricts, max 83 in Sokaraja)
        $res2025 = $this->getJson('/api/public/map?tahun=2025&bulan=all');
        $res2025->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Data Tahunan 2025',
                    'year' => 2025,
                    'month' => 'all',
                    'period_type' => 'annual',
                    'is_annual' => true,
                ],
                'summary' => [
                    'total_cases' => 1062,
                    'subdistricts_count' => 27,
                    'priority_count' => 25,
                    'max_cases' => 83,
                    'max_case_subdistrict' => 'Sokaraja',
                ],
                'metadata' => [
                    'is_simulation' => false,
                    'status' => 'Data Agregat Tahunan Terverifikasi',
                ],
            ]);

        // 5. Year 2026 monthly filters (Februari = 98, Maret = 64)
        $resFeb2026 = $this->getJson('/api/public/map?tahun=2026&bulan=2');
        $resFeb2026->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Februari 2026',
                    'year' => 2026,
                    'month' => 2,
                    'month_name' => 'Februari',
                    'is_accumulation' => false,
                ],
                'summary' => [
                    'total_cases' => 98,
                    'subdistricts_count' => 27,
                    'priority_count' => 3,
                    'max_cases' => 15,
                ],
            ]);

        $resMar2026 = $this->getJson('/api/public/map?tahun=2026&bulan=3');
        $resMar2026->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Maret 2026',
                    'year' => 2026,
                    'month' => 3,
                ],
                'summary' => [
                    'total_cases' => 64,
                    'priority_count' => 1,
                    'max_cases' => 11,
                ],
            ]);
    }

    /**
     * Test selecting a specific month (1..12) on an annual-only year (2022-2025) returns 'Rincian bulanan tidak tersedia' and never 0 cases.
     */
    public function test_map_api_returns_rincian_bulanan_tidak_tersedia_for_specific_month_in_annual_only_years(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        foreach ([2022, 2023, 2024, 2025] as $year) {
            $response = $this->getJson("/api/public/map?tahun={$year}&bulan=1");
            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'has_data' => false,
                    'reason' => 'annual_only',
                    'period' => null,
                    'summary' => [
                        'total_cases' => null,
                        'subdistricts_count' => 0,
                    ],
                    'districts' => [],
                ]);

            $this->assertStringContainsString('Rincian bulanan tidak tersedia', $response->json('message'));
        }
    }

    /**
     * Test 'Semua Bulan Tersedia' calculates correct accumulation across available months in 2026.
     */
    public function test_map_api_calculates_all_months_accumulation_correctly(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // Accumulation for 2026: Jan (143) + Feb (98) + Mar (64) = 305 cases
        $response = $this->getJson('/api/public/map?tahun=2026&bulan=semua');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'year' => 2026,
                    'month' => 'all',
                    'month_name' => 'Semua Bulan Tersedia',
                    'range' => 'Januari – Maret 2026',
                    'months_count' => 3,
                    'is_accumulation' => true,
                ],
                'summary' => [
                    'total_cases' => 305,
                    'subdistricts_count' => 27,
                    'subdistricts_with_data' => 27,
                    'max_cases' => 35, // Purwokerto Timur: 16 + 15 + 4 = 35
                ],
            ]);

        $districts = $response->json('districts');

        // Check Purwokerto Timur cumulative
        $pwtTimur = collect($districts)->firstWhere('name', 'Purwokerto Timur');
        $this->assertNotNull($pwtTimur);
        $this->assertEquals(35, $pwtTimur['cases']);
        $this->assertTrue($pwtTimur['is_priority']);

        // Check Purwokerto Selatan cumulative: 19 + 8 + 5 = 32
        $pwtSelatan = collect($districts)->firstWhere('name', 'Purwokerto Selatan');
        $this->assertNotNull($pwtSelatan);
        $this->assertEquals(32, $pwtSelatan['cases']);

        // Check zero cases subdistrict remains 0: Lumbir (0 + 0 + 0 = 0)
        $lumbir = collect($districts)->firstWhere('name', 'Lumbir');
        $this->assertNotNull($lumbir);
        $this->assertSame(0, $lumbir['cases']);
        $this->assertTrue($lumbir['has_data']);
        $this->assertEquals('Nol Kasus', $lumbir['priority_status']);
    }

    /**
     * Test querying unrecorded month in 2026 returns empty state, NOT zero cases.
     */
    public function test_map_api_handles_unrecorded_future_months_as_empty_state_not_zero(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // November 2026 is unrecorded
        $response = $this->getJson('/api/public/map?tahun=2026&bulan=11');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
                'reason' => 'month_unavailable',
                'period' => null,
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_count' => 0,
                ],
                'districts' => [],
            ]);

        $this->assertStringContainsString('Data kasus belum tersedia', $response->json('message'));
    }

    /**
     * Test Dashboard Publik and Peta WebGIS return consistent totals and period definitions across all 5 years.
     */
    public function test_dashboard_and_map_consistency_across_all_five_years(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        $expectedTotals = [
            2022 => 307,
            2023 => 273,
            2024 => 2180,
            2025 => 1062,
            2026 => 305,
        ];

        foreach ($expectedTotals as $yr => $expectedTotal) {
            $mapRes = $this->getJson("/api/public/map?tahun={$yr}&bulan=all");
            $dashRes = $this->getJson("/api/public/dashboard/summary?tahun={$yr}&bulan=all");

            $mapRes->assertStatus(200);
            $dashRes->assertStatus(200);

            $this->assertSame($expectedTotal, $mapRes->json('summary.total_cases'), "Map total cases mismatch for {$yr}");
            $this->assertSame($expectedTotal, $dashRes->json('summary.total_cases'), "Dashboard total cases mismatch for {$yr}");
            $this->assertSame($mapRes->json('period.name'), $dashRes->json('period.name'), "Period name mismatch for {$yr}");
            $this->assertSame($mapRes->json('summary.priority_count'), $dashRes->json('summary.priority_count'), "Priority count mismatch for {$yr}");
        }
    }

    /**
     * Test Fitur 6: Subdistrict popup detail attributes (classification_label, fill_color, indicator, and IR validity rules).
     */
    public function test_subdistrict_popup_detail_attributes_and_ir_period_validity(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Check 2026 monthly simulation: IR must NOT be computed from mismatched period population
        $resJan2026 = $this->getJson('/api/public/map?tahun=2026&bulan=1');
        $resJan2026->assertStatus(200);
        $janDistricts = collect($resJan2026->json('districts'));

        $pwtSelatan2026 = $janDistricts->firstWhere('name', 'Purwokerto Selatan');
        $this->assertEquals(19, $pwtSelatan2026['cases']);
        $this->assertEquals('≥ 10 Kasus (Prioritas Pemantauan)', $pwtSelatan2026['classification_label']);
        $this->assertEquals('#dc2626', $pwtSelatan2026['fill_color']);
        $this->assertEquals('Wilayah Prioritas Pemantauan', $pwtSelatan2026['priority_status']);
        $this->assertFalse($pwtSelatan2026['ir_valid_for_period']);
        $this->assertNull($pwtSelatan2026['incidence_rate']);

        $lumbir2026 = $janDistricts->firstWhere('name', 'Lumbir');
        $this->assertSame(0, $lumbir2026['cases']);
        $this->assertEquals('0 Kasus (Nol Kasus)', $lumbir2026['classification_label']);
        $this->assertEquals('#f1f5f9', $lumbir2026['fill_color']);
        $this->assertEquals('Nol Kasus', $lumbir2026['priority_status']);

        // 2. Check 2024 verified annual aggregate: IR is valid for the exact same period
        $res2024 = $this->getJson('/api/public/map?tahun=2024&bulan=all');
        $res2024->assertStatus(200);
        $districts2024 = collect($res2024->json('districts'));

        $sokaraja2024 = $districts2024->firstWhere('name', 'Sokaraja');
        $this->assertEquals(139, $sokaraja2024['cases']);
        $this->assertTrue($sokaraja2024['ir_valid_for_period']);
        $this->assertNotNull($sokaraja2024['incidence_rate']);
        $this->assertEquals('≥ 10 Kasus (Prioritas Pemantauan)', $sokaraja2024['classification_label']);
        $this->assertEquals('#dc2626', $sokaraja2024['fill_color']);
        $this->assertEquals('Jumlah Kasus DBD Agregat Tahunan per Kecamatan', $res2024->json('metadata.indicator'));
    }

    /**
     * Test Fitur 7: Choropleth legend classification metadata matches polygon colors, range labels, and priority statuses.
     */
    public function test_choropleth_legend_classification_metadata_and_color_consistency(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        $response = $this->getJson('/api/public/map?tahun=2026&bulan=1');
        $response->assertStatus(200);

        $classification = $response->json('classification');
        $this->assertNotNull($classification);
        $this->assertEquals(
            'Klasifikasi interval bertingkat berdasarkan jumlah kasus DBD agregat per kecamatan.',
            $classification['method']
        );

        // Verify nodata color matches polygon slate-300 (#cbd5e1)
        $this->assertEquals('#cbd5e1', $classification['nodata']['color']);
        $this->assertEquals('#94a3b8', $classification['nodata']['border_color']);
        $this->assertEquals('Data Belum Tersedia', $classification['nodata']['label']);

        // Verify 4 tiers match exact polygon color thresholds and labels
        $tiers = collect($classification['tiers'])->keyBy('tier');
        $this->assertCount(4, $tiers);

        $this->assertEquals('#f1f5f9', $tiers[0]['color']);
        $this->assertEquals('0 Kasus', $tiers[0]['range_label']);
        $this->assertEquals('Nol Kasus', $tiers[0]['priority_status']);

        $this->assertEquals('#fed7aa', $tiers[1]['color']);
        $this->assertEquals('1–4 Kasus', $tiers[1]['range_label']);
        $this->assertEquals('Pemantauan Rutin', $tiers[1]['priority_status']);

        $this->assertEquals('#fb923c', $tiers[2]['color']);
        $this->assertEquals('5–9 Kasus', $tiers[2]['range_label']);
        $this->assertEquals('Peningkatan Kewaspadaan', $tiers[2]['priority_status']);

        $this->assertEquals('#dc2626', $tiers[3]['color']);
        $this->assertEquals('≥10 Kasus', $tiers[3]['range_label']);
        $this->assertEquals('Wilayah Prioritas Pemantauan', $tiers[3]['priority_status']);

        // Ensure forbidden statistical hotspot phrase does not appear in classification response
        $this->assertStringNotContainsString(
            'hotspot signifikan secara statistik',
            strtolower(json_encode($classification))
        );
    }

    /**
     * Test Fitur 8: Compare two full verified years (2023 vs 2024 and 2024 vs 2025).
     */
    public function test_compare_api_two_full_verified_years_calculates_diff_and_percentage(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Compare 2023 (273 cases) vs 2024 (2180 cases) -> diff = +1907, pct = +698.53%
        $res2324 = $this->getJson('/api/public/compare?year_a=2023&month_a=all&year_b=2024&month_b=all');
        $res2324->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparability' => [
                    'is_comparable' => true,
                    'status' => 'comparable_annual',
                ],
                'comparison' => [
                    'is_comparable' => true,
                    'summary' => [
                        'cases_a' => 273,
                        'cases_b' => 2180,
                        'diff_cases' => 1907,
                        'pct_change' => 698.53,
                        'pct_change_label' => '+698,53%',
                        'direction' => 'meningkat',
                        'status_label' => 'Meningkat',
                        'total_subdistricts' => 27,
                    ],
                ],
            ]);

        $this->assertCount(27, $res2324->json('comparison.districts'));

        // 2. Compare 2024 (2180 cases) vs 2025 (1062 cases) -> diff = -1118, pct = -51.28%
        $res2425 = $this->getJson('/api/public/compare?year_a=2024&month_a=all&year_b=2025&month_b=all');
        $res2425->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparability' => [
                    'is_comparable' => true,
                    'status' => 'comparable_annual',
                ],
                'comparison' => [
                    'is_comparable' => true,
                    'summary' => [
                        'cases_a' => 2180,
                        'cases_b' => 1062,
                        'diff_cases' => -1118,
                        'pct_change' => -51.28,
                        'pct_change_label' => '-51,28%',
                        'direction' => 'menurun',
                        'status_label' => 'Menurun',
                        'total_subdistricts' => 27,
                    ],
                ],
            ]);

        // Ensure no internal unpublished data leaks
        $this->assertStringNotContainsString('INTERNAL_BELUM_DIIZINKAN', $res2425->getContent());
    }

    /**
     * Test Fitur 8: Compare two available months (Januari 2026 vs Februari 2026) and zero-case Period A handling.
     */
    public function test_compare_api_two_available_months_and_zero_case_period_a(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // Januari 2026 (143 cases) vs Februari 2026 (98 cases) -> diff = -45, pct = -31.47%
        $res = $this->getJson('/api/public/compare?year_a=2026&month_a=1&year_b=2026&month_b=2');
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparability' => [
                    'is_comparable' => true,
                    'status' => 'comparable_monthly',
                ],
                'comparison' => [
                    'is_comparable' => true,
                    'summary' => [
                        'cases_a' => 143,
                        'cases_b' => 98,
                        'diff_cases' => -45,
                        'pct_change' => -31.47,
                        'pct_change_label' => '-31,47%',
                        'direction' => 'menurun',
                        'status_label' => 'Menurun',
                    ],
                ],
            ]);

        // Check a subdistrict with 0 cases in Period A (Lumbir has 0 cases in Jan 2026)
        $lumbir = collect($res->json('comparison.districts'))->firstWhere('name', 'Lumbir');
        $this->assertNotNull($lumbir);
        $this->assertSame(0, $lumbir['cases_a']);
        $this->assertNull($lumbir['pct_change']);
        $this->assertEquals('Persentase tidak dapat dihitung', $lumbir['pct_change_label']);

        // Also test when total cases of Period A is 0 (create a synthetic published month with 0 total cases)
        $zeroPeriod = Periode::create([
            'nama' => 'Bulan Nol 2026',
            'tahun' => 2026,
            'bulan' => 4,
            'tipe_periode' => 'monthly',
            'rentang_waktu' => 'April 2026',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'status_kelengkapan' => 'Lengkap 27 Kecamatan',
            'sumber_data' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas',
        ]);

        foreach (Kecamatan::all() as $kec) {
            KasusAgregat::create([
                'kecamatan_id' => $kec->id,
                'periode_id' => $zeroPeriod->id,
                'jumlah_kasus' => 0,
                'jumlah_meninggal' => 0,
                'is_published' => true,
                'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                'keterangan' => 'Simulasi Nol Kasus',
            ]);
        }

        $resZeroA = $this->getJson('/api/public/compare?year_a=2026&month_a=4&year_b=2026&month_b=1');
        $resZeroA->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparison' => [
                    'is_comparable' => true,
                    'summary' => [
                        'cases_a' => 0,
                        'cases_b' => 143,
                        'diff_cases' => 143,
                        'pct_change' => null,
                        'pct_change_label' => 'Persentase tidak dapat dihitung',
                        'direction' => 'meningkat',
                        'status_label' => 'Meningkat',
                    ],
                ],
            ]);
    }

    /**
     * Test Fitur 8: Unequal periods (e.g. Full Year 2025 vs Jan-Mar 2026 accumulation) and unavailable periods.
     */
    public function test_compare_api_unequal_granularity_and_empty_periods_do_not_conclude_trend(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Unequal granularity & mixed dataset status: Full Year 2025 (12 months verified) vs 2026 All Months (3 months simulation)
        $resUnequal = $this->getJson('/api/public/compare?year_a=2025&month_a=all&year_b=2026&month_b=all');
        $resUnequal->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparability' => [
                    'is_comparable' => false,
                    'status' => 'unequal_granularity',
                ],
                'comparison' => [
                    'is_comparable' => false,
                    'summary' => [
                        'cases_a' => 1062,
                        'cases_b' => 305,
                        'diff_cases' => null,
                        'pct_change' => null,
                        'pct_change_label' => 'Periode tidak setara',
                        'direction' => 'tidak_dapat_dibandingkan',
                        'status_label' => 'Periode tidak setara',
                        'incomparable_subdistricts' => 27,
                    ],
                ],
            ]);

        // 2. Empty / unavailable period: Januari 2026 vs Oktober 2026 (no data)
        $resEmpty = $this->getJson('/api/public/compare?year_a=2026&month_a=1&year_b=2026&month_b=10');
        $resEmpty->assertStatus(200)
            ->assertJson([
                'success' => true,
                'comparability' => [
                    'is_comparable' => false,
                    'status' => 'data_unavailable',
                ],
                'comparison' => [
                    'is_comparable' => false,
                    'summary' => [
                        'cases_a' => 143,
                        'cases_b' => null,
                        'diff_cases' => null,
                        'pct_change' => null,
                        'pct_change_label' => 'Data tidak tersedia',
                        'direction' => 'tidak_dapat_dibandingkan',
                        'status_label' => 'Data tidak tersedia',
                        'incomparable_subdistricts' => 27,
                    ],
                ],
            ]);

        // 3. Invalid parameter validation returns 422
        $resInvalid = $this->getJson('/api/public/compare?year_a=2024&month_a=99&year_b=2025&month_b=all');
        $resInvalid->assertStatus(422);
    }

    /**
     * Test Fitur 9: Annual trends endpoint (2022-2026) for Kabupaten and specific Kecamatan.
     */
    public function test_trends_api_annual_returns_ordered_years_and_marks_2026_as_partial(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        $res = $this->getJson('/api/public/trends?granularity=annual');
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'granularity' => 'annual',
                'has_data' => true,
                'summary' => [
                    'verified_years_count' => 4,
                    'peak_year' => 2024,
                    'peak_cases' => 2180,
                    'latest_full_year' => 2025,
                    'latest_full_year_cases' => 1062,
                    'latest_yoy_diff' => -1118,
                    'latest_yoy_pct' => -51.28,
                    'partial_year' => 2026,
                    'partial_cases' => 305,
                ],
            ]);

        $series = collect($res->json('series'));
        $this->assertSame([2022, 2023, 2024, 2025, 2026], $series->pluck('year')->all());
        $this->assertSame([307, 273, 2180, 1062, 305], $series->pluck('cases')->all());

        // Check 2022-2025 are full verified years, while 2026 is partial simulation and has null yoy_diff
        $pt2025 = $series->firstWhere('year', 2025);
        $this->assertFalse($pt2025['is_partial']);
        $this->assertFalse($pt2025['is_simulation']);
        $this->assertSame(-1118, $pt2025['yoy_diff']);

        $pt2026 = $series->firstWhere('year', 2026);
        $this->assertTrue($pt2026['is_partial']);
        $this->assertTrue($pt2026['is_simulation']);
        $this->assertNull($pt2026['yoy_diff']);
        $this->assertNull($pt2026['yoy_pct']);

        // Subdistrict filter: Kecamatan Kedungbanteng (330219)
        $resKedungbanteng = $this->getJson('/api/public/trends?granularity=annual&kecamatan_id=330219');
        $resKedungbanteng->assertStatus(200)
            ->assertJson([
                'success' => true,
                'scope' => [
                    'type' => 'kecamatan',
                    'kecamatan_code' => '330219',
                    'name' => 'Kecamatan Kedungbanteng',
                ],
            ]);
        $kbSeries = collect($resKedungbanteng->json('series'))->keyBy('year');
        $this->assertSame(94, $kbSeries[2024]['cases']);
        $this->assertSame(36, $kbSeries[2025]['cases']);

        // Ensure no internal unpublished data leaks
        $this->assertStringNotContainsString('INTERNAL_BELUM_DIIZINKAN', $res->getContent());
    }

    /**
     * Test Fitur 9: Monthly trends endpoint (Jan-Dec) handles 2026 gaps, valid zero cases, and annual-only years (2022-2025).
     */
    public function test_trends_api_monthly_handles_gaps_zero_cases_and_annual_only_years(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Monthly 2026 for Kabupaten: Jan (143), Feb (98), Mar (64), Apr-Dec (null / has_data=false)
        $res2026 = $this->getJson('/api/public/trends?granularity=monthly&year=2026');
        $res2026->assertStatus(200)
            ->assertJson([
                'success' => true,
                'granularity' => 'monthly',
                'year' => 2026,
                'has_data' => true,
                'summary' => [
                    'available_months_count' => 3,
                    'missing_months_count' => 9,
                    'total_cases_available_months' => 305,
                    'peak_month' => 'Januari',
                    'peak_cases' => 143,
                ],
            ]);

        $months2026 = collect($res2026->json('series'))->keyBy('month');
        $this->assertCount(12, $months2026);
        $this->assertSame(143, $months2026[1]['cases']);
        $this->assertSame(98, $months2026[2]['cases']);
        $this->assertSame(64, $months2026[3]['cases']);
        for ($m = 4; $m <= 12; $m++) {
            $this->assertFalse($months2026[$m]['has_data'], "Month {$m} must have has_data=false");
            $this->assertNull($months2026[$m]['cases'], "Month {$m} must have cases=null, not 0");
        }

        // 2. Valid 0 cases vs Missing Data: Kecamatan Lumbir (330201) in 2026 has 0 cases in Jan-Mar and null in Apr-Dec
        $resLumbir = $this->getJson('/api/public/trends?granularity=monthly&year=2026&kecamatan_id=330201');
        $lumbirMonths = collect($resLumbir->json('series'))->keyBy('month');
        $this->assertTrue($lumbirMonths[1]['has_data']);
        $this->assertSame(0, $lumbirMonths[1]['cases']);
        $this->assertFalse($lumbirMonths[4]['has_data']);
        $this->assertNull($lumbirMonths[4]['cases']);

        // 3. Annual-only year (e.g. 2024): must NOT divide annual total by 12, returns has_data=false and reason='annual_only'
        $res2024Monthly = $this->getJson('/api/public/trends?granularity=monthly&year=2024');
        $res2024Monthly->assertStatus(200)
            ->assertJson([
                'success' => true,
                'granularity' => 'monthly',
                'year' => 2024,
                'has_data' => false,
                'reason' => 'annual_only',
            ]);
        foreach ($res2024Monthly->json('series') as $mRow) {
            $this->assertFalse($mRow['has_data']);
            $this->assertNull($mRow['cases']);
        }
    }

    /**
     * Test Fitur 10: Public metadata endpoints (/api/public/metadata, /api/public/metadata/periods, /api/public/metadata/sources)
     * return complete database-driven metadata and strictly protect internal unpublished data and local paths.
     */
    public function test_public_metadata_endpoints_return_complete_governance_and_protect_internal_data(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 1. Main metadata endpoint
        $metaRes = $this->getJson('/api/public/metadata');
        $metaRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'coverage' => [
                    'region' => 'Kabupaten Banyumas',
                    'subdistricts_count' => 27,
                    'years_range' => '2022–2026',
                    'available_years' => [2022, 2023, 2024, 2025, 2026],
                ],
                'update_info' => [
                    'official_dataset_update_date' => '2025-10-15',
                    'simulation_dataset_update_date' => '2026-03-31',
                ],
            ]);

        // Verify 3 source groups exist and are populated
        $this->assertCount(5, $metaRes->json('sources.published_sources.items'));
        $this->assertCount(2, $metaRes->json('sources.reference_sources.items'));
        $this->assertCount(1, $metaRes->json('sources.restricted_internal_sources.items'));

        // Verify yearly coverage table matches actual database totals (307, 273, 2180, 1062, 305)
        $yearlyTable = collect($metaRes->json('coverage.yearly_table'))->keyBy('year');
        $this->assertCount(5, $yearlyTable);
        $this->assertSame(307, $yearlyTable[2022]['total_cases']);
        $this->assertSame(273, $yearlyTable[2023]['total_cases']);
        $this->assertSame(2180, $yearlyTable[2024]['total_cases']);
        $this->assertSame(1062, $yearlyTable[2025]['total_cases']);
        $this->assertSame(305, $yearlyTable[2026]['total_cases']);
        $this->assertFalse($yearlyTable[2024]['is_simulation']);
        $this->assertTrue($yearlyTable[2026]['is_simulation']);

        // 2. Metadata periods endpoint
        $periodsRes = $this->getJson('/api/public/metadata/periods');
        $periodsRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'subdistricts_total' => 27,
            ]);
        $this->assertCount(5, $periodsRes->json('years_summary'));
        $this->assertCount(7, $periodsRes->json('published_periods'));

        // 3. Metadata sources endpoint
        $sourcesRes = $this->getJson('/api/public/metadata/sources');
        $sourcesRes->assertStatus(200)
            ->assertJson(['success' => true]);

        // 4. Security assertions: never leak local filesystem paths or internal unpublished case numbers (117)
        $combinedPayload = $metaRes->getContent() . $periodsRes->getContent() . $sourcesRes->getContent();
        $this->assertStringNotContainsString('D:\\SEMESTER 7', $combinedPayload);
        $this->assertStringNotContainsString('D:/SEMESTER 7', $combinedPayload);
        $this->assertStringNotContainsString('EDBD Banyumas Oktober 2026(3).xlsm', $combinedPayload);
        $this->assertStringNotContainsString('117 kasus', strtolower($combinedPayload));
    }
}
