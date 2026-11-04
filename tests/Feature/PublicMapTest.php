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
     * Test /api/public/map/periods returns available years and months without internal Dinkes data.
     */
    public function test_periods_endpoint_returns_only_published_periods_and_years(): void
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
        $this->assertContains(2026, $years);
        $this->assertContains(2025, $years);

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
     * Test filtering map API by year and specific month.
     */
    public function test_map_api_filters_by_year_and_month(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // Filter: Februari 2026 (Total 98 cases, 3 priority subdistricts)
        $response = $this->getJson('/api/public/map?tahun=2026&bulan=2');
        $response->assertStatus(200)
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

        // Filter: Maret 2026 (Total 64 cases, Cilongok priority with 11 cases)
        $responseMar = $this->getJson('/api/public/map?tahun=2026&bulan=3');
        $responseMar->assertStatus(200)
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

        // Filter: Year 2025 (Desember 2025)
        $response2025 = $this->getJson('/api/public/map?tahun=2025&bulan=12');
        $response2025->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Desember 2025',
                    'year' => 2025,
                    'month' => 12,
                ],
                'summary' => [
                    'total_cases' => 82,
                ],
            ]);
    }

    /**
     * Test 'Semua Bulan Tersedia' calculates correct accumulation across available months.
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
     * Test querying unrecorded month returns empty state, NOT zero cases.
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
                'period' => null,
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_count' => 0,
                ],
                'districts' => [],
            ]);

        $this->assertStringContainsString('Data kasus belum tersedia', $response->json('message'));
    }
}
