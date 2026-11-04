<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Database\Seeders\KasusAgregatSeeder;
use Database\Seeders\KecamatanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDashboardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test public dashboard route is accessible without authentication.
     */
    public function test_dashboard_page_accessible_publicly(): void
    {
        $response = $this->get('/dashboard');

        $response->assertStatus(200);
        $response->assertSee('<div id="root"></div>', false);
    }

    /**
     * Test public dashboard summary API returns aggregated data correctly.
     */
    public function test_public_dashboard_summary_api_returns_aggregated_data(): void
    {
        // 1. Create subdistricts
        $kec1 = Kecamatan::create([
            'kode' => '330224',
            'nama' => 'Purwokerto Selatan',
            'luas_wilayah' => 13.75,
            'jumlah_penduduk' => 74800,
        ]);

        $kec2 = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);

        // 2. Create published period
        $period = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'sumber_data' => 'Simulasi Model Dinkes Banyumas',
            'status_kelengkapan' => 'Lengkap',
        ]);

        // 3. Create aggregate cases
        KasusAgregat::create([
            'kecamatan_id' => $kec1->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 19,
            'kasus_laki_laki' => 9,
            'kasus_perempuan' => 10,
            'jumlah_meninggal' => 0,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $kec2->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 0,
            'kasus_laki_laki' => 0,
            'kasus_perempuan' => 0,
            'jumlah_meninggal' => 0,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // 4. Test public endpoint
        $response = $this->getJson('/api/public/dashboard/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Januari 2026',
                    'year' => 2026,
                ],
                'summary' => [
                    'total_cases' => 19,
                    'subdistricts_with_data' => 2,
                    'subdistricts_with_cases' => 1,
                    'highest_case_subdistrict' => [
                        'name' => 'Purwokerto Selatan',
                        'cases' => 19,
                        'priority_status' => 'Wilayah Prioritas Pemantauan',
                    ],
                ],
            ]);

        $rankings = $response->json('rankings');
        $this->assertCount(2, $rankings);
        $this->assertEquals('Purwokerto Selatan', $rankings[0]['subdistrict_name']);
        $this->assertEquals(19, $rankings[0]['cases']);
        $this->assertEquals('Wilayah Prioritas Pemantauan', $rankings[0]['priority_status']);
        $this->assertEquals('Lumbir', $rankings[1]['subdistrict_name']);
        $this->assertEquals(0, $rankings[1]['cases']);
        $this->assertEquals('Nol Kasus', $rankings[1]['priority_status']);
    }

    /**
     * Test that unpublished (draft) periods and cases never leak into public API.
     */
    public function test_unpublished_internal_data_never_leaks_to_public(): void
    {
        $kec = Kecamatan::create([
            'kode' => '330224',
            'nama' => 'Purwokerto Selatan',
            'luas_wilayah' => 13.75,
            'jumlah_penduduk' => 74800,
        ]);

        // Create unpublished/draft period with secret data
        $draftPeriod = Periode::create([
            'nama' => 'Maret 2026 (Internal Draft)',
            'tahun' => 2026,
            'bulan' => 3,
            'is_published' => false,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
            'sumber_data' => 'Data Rahasia Internal',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $kec->id,
            'periode_id' => $draftPeriod->id,
            'jumlah_kasus' => 9999,
            'jumlah_meninggal' => 500,
            'is_published' => false,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        $response = $this->getJson('/api/public/dashboard/summary');

        // Should return empty has_data since no published period exists
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
            ]);

        $this->assertNull($response->json('summary.total_cases'));
        $this->assertStringNotContainsString('Data Rahasia Internal', $response->getContent());
        $this->assertStringNotContainsString('9999', $response->getContent());
    }

    /**
     * Test graceful handling when no published periods exist.
     */
    public function test_graceful_handling_when_no_data_available(): void
    {
        $response = $this->getJson('/api/public/dashboard/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
                'summary' => [
                    'total_cases' => null,
                    'subdistricts_with_data' => 0,
                    'highest_case_subdistrict' => null,
                    'subdistricts_with_cases' => 0,
                ],
                'rankings' => [],
            ]);
    }

    /**
     * Test reconciliation of 117 cases in Dinkes 2026 dataset and strict isolation from public API.
     */
    public function test_dinkes_2026_dataset_reconciliation_and_strict_public_isolation(): void
    {
        // 1. Seed full database with kecamatan and both published simulation & Dinkes internal data
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);

        // 2. Assert in database that internal Dinkes 2026 period exists with 117 cases
        $internalPeriod = Periode::where('status_publikasi', 'INTERNAL_BELUM_DIIZINKAN')->first();
        $this->assertNotNull($internalPeriod);
        $this->assertFalse($internalPeriod->is_published);
        $this->assertEquals('INTERNAL_BELUM_DIIZINKAN', $internalPeriod->status_publikasi);
        $this->assertEquals('Perlu Konfirmasi Kelengkapan (Oktober Berjalan)', $internalPeriod->status_kelengkapan);

        $internalCases = KasusAgregat::where('periode_id', $internalPeriod->id)->get();
        $this->assertCount(27, $internalCases, 'Must have aggregate records for all 27 subdistricts');
        $this->assertEquals(117, $internalCases->sum('jumlah_kasus'), 'Total cases must strictly equal 117');
        $this->assertEquals(56, $internalCases->sum('kasus_laki_laki'), 'Male cases must strictly equal 56');
        $this->assertEquals(61, $internalCases->sum('kasus_perempuan'), 'Female cases must strictly equal 61');
        $this->assertEquals(1, $internalCases->sum('jumlah_meninggal'), 'Deaths must strictly equal 1');

        // Verify death occurred in Ajibarang
        $ajibarang = Kecamatan::where('nama', 'Ajibarang')->first();
        $ajibarangCase = $internalCases->firstWhere('kecamatan_id', $ajibarang->id);
        $this->assertEquals(1, $ajibarangCase->jumlah_meninggal);

        // 3. Assert public summary endpoint returns ONLY published simulation data (143 cases), NEVER 117
        $response = $this->getJson('/api/public/dashboard/summary');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => true,
                'period' => [
                    'name' => 'Januari 2026',
                    'year' => 2026,
                ],
                'summary' => [
                    'total_cases' => 143, // Simulation total, NOT 117
                ],
                'metadata' => [
                    'is_simulation' => true,
                    'status' => 'Simulasi Pengembangan',
                ],
            ]);

        $content = $response->getContent();
        $this->assertStringNotContainsString('INTERNAL_BELUM_DIIZINKAN', $content);
        $this->assertStringNotContainsString('Data Dinkes Internal', $content);

        // 4. Assert direct request with internal period ID is rejected/hidden
        $directResponse = $this->getJson("/api/public/dashboard/summary?periode_id={$internalPeriod->id}");
        $directResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'has_data' => false,
                'message' => 'Data belum tersedia untuk periode publikasi.',
            ]);
    }

    /**
     * Test monthly CSV aggregate handles null vs zero correctly (Nov & Dec not zero).
     */
    public function test_monthly_csv_aggregate_integrity_and_null_treatment(): void
    {
        $csvPath = database_path('seeders/data/agregat_bulanan_dinkes_2026_internal.csv');
        $this->assertFileExists($csvPath);

        $rows = array_map('str_getcsv', file($csvPath));
        $header = array_shift($rows);

        $this->assertCount(12, $rows, 'Must contain 12 months');

        $janToOctCases = 0;
        $janToOctDeaths = 0;

        foreach ($rows as $row) {
            $data = array_combine($header, $row);
            $month = (int) $data['bulan'];

            if ($month <= 9) {
                $this->assertEquals('Lengkap', $data['status_kelengkapan']);
                $this->assertNotSame('', $data['total_kasus']);
                $janToOctCases += (int) $data['total_kasus'];
                $janToOctDeaths += (int) $data['total_meninggal'];
            } elseif ($month === 10) {
                $this->assertEquals('Perlu Konfirmasi Kelengkapan', $data['status_kelengkapan']);
                $this->assertEquals('1', $data['total_kasus']);
                $janToOctCases += (int) $data['total_kasus'];
                $janToOctDeaths += (int) $data['total_meninggal'];
            } else { // 11 and 12
                $this->assertEquals('Data Belum Tersedia', $data['status_kelengkapan']);
                // Crucial assertion: November and December are empty/NULL, NOT '0'
                $this->assertSame('', $data['total_kasus'], "Month {$month} must be empty/null, not 0");
                $this->assertSame('', $data['kasus_laki_laki'], "Month {$month} must be empty/null, not 0");
                $this->assertSame('', $data['kasus_perempuan'], "Month {$month} must be empty/null, not 0");
            }

            $this->assertEquals('INTERNAL_BELUM_DIIZINKAN', $data['status_publikasi']);
        }

        $this->assertEquals(117, $janToOctCases, 'Jan-Oct cumulative cases must be 117');
        $this->assertEquals(1, $janToOctDeaths, 'Jan-Oct cumulative deaths must be 1');
    }
}
