<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CaseManagementTest extends TestCase
{
    use RefreshDatabase;

    private static int $districtCounter = 1;
    private static int $periodCounter = 1;

    protected function setUp(): void
    {
        parent::setUp();
        self::$districtCounter = 1;
        self::$periodCounter = 1;
    }

    private function createAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'name' => 'Administrator Dinkes',
            'username' => 'admin_dinkes',
            'email' => 'admin@banyumas.go.id',
            'password' => Hash::make('AdminSecret123!'),
            'role' => 'admin',
            'is_active' => true,
        ], $overrides));
    }

    private function createDistrict(array $overrides = []): Kecamatan
    {
        $counter = self::$districtCounter++;

        return Kecamatan::create(array_merge([
            'kode' => '3302' . str_pad((string) $counter, 2, '0', STR_PAD_LEFT),
            'nama' => 'Kecamatan Test ' . $counter,
            'luas_wilayah' => 14.50,
            'jumlah_penduduk' => 85000,
        ], $overrides));
    }

    private function createPeriod(array $overrides = []): Periode
    {
        $counter = self::$periodCounter++;

        return Periode::create(array_merge([
            'nama' => 'Periode Test ' . $counter,
            'tahun' => 2026,
            'bulan' => (($counter - 1) % 12) + 1,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'sumber_data' => 'Dinas Kesehatan Kabupaten Banyumas',
            'status_kelengkapan' => 'Lengkap (27 Kecamatan)',
        ], $overrides));
    }

    /**
     * Test 1: Unauthenticated guest cannot access case management endpoint.
     */
    public function test_unauthenticated_guest_cannot_access_cases_endpoint(): void
    {
        $response = $this->getJson('/api/admin/cases');
        $response->assertStatus(401);
    }

    /**
     * Test 2: Non-admin regular user cannot access case management endpoint.
     */
    public function test_non_admin_user_cannot_access_cases_endpoint(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($regularUser)->getJson('/api/admin/cases');
        $response->assertStatus(403);
    }

    /**
     * Test 3: Inactive admin cannot access case management endpoint.
     */
    public function test_inactive_admin_cannot_access_cases_endpoint(): void
    {
        $inactiveAdmin = $this->createAdmin(['is_active' => false]);

        $response = $this->actingAs($inactiveAdmin)->getJson('/api/admin/cases');
        $response->assertStatus(403);
    }

    /**
     * Test 4: Authenticated admin can retrieve paginated cases list.
     */
    public function test_admin_can_retrieve_paginated_cases_list(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 15,
            'kasus_laki_laki' => 8,
            'kasus_perempuan' => 7,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 85000,
            'incidence_rate' => 17.65,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Laporan surveilans awal tahun',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Data kasus DBD berhasil dimuat.',
        ]);
        $response->assertJsonStructure([
            'success',
            'message',
            'cases' => [
                'data' => [
                    '*' => [
                        'id',
                        'kecamatan_id',
                        'kecamatan_nama',
                        'kecamatan_kode',
                        'periode_id',
                        'periode_nama',
                        'jumlah_kasus',
                        'populasi',
                        'populasi_formatted',
                        'incidence_rate',
                        'incidence_rate_formatted',
                        'updated_at_formatted',
                    ],
                ],
                'current_page',
                'last_page',
                'per_page',
                'total',
            ],
            'summary' => [
                'total_records',
                'total_cases',
                'total_deaths',
                'average_ir',
            ],
        ]);

        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertEquals(15, $response->json('summary.total_cases'));
        $this->assertEquals(1, $response->json('summary.total_deaths'));
    }

    /**
     * Test 5: Case data displays accurate kecamatan, periode, and IR.
     */
    public function test_case_data_includes_accurate_kecamatan_periode_and_ir(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict([
            'nama' => 'Purwokerto Selatan',
            'kode' => '330224',
            'jumlah_penduduk' => 74800,
        ]);
        $period = $this->createPeriod([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 19,
            'kasus_laki_laki' => 10,
            'kasus_perempuan' => 9,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 74800,
            'incidence_rate' => 25.40,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases');

        $response->assertStatus(200);
        $firstCase = $response->json('cases.data.0');

        $this->assertEquals('Purwokerto Selatan', $firstCase['kecamatan_nama']);
        $this->assertEquals('330224', $firstCase['kecamatan_kode']);
        $this->assertEquals('Februari 2026', $firstCase['periode_nama']);
        $this->assertEquals(19, $firstCase['jumlah_kasus']);
        $this->assertEquals(74800, $firstCase['populasi']);
        $this->assertEquals(25.40, $firstCase['incidence_rate']);
        $this->assertEquals('25,40 / 100k', $firstCase['incidence_rate_formatted']);
    }

    /**
     * Test 6: IR is calculated accurately via formula when stored incidence_rate is null.
     */
    public function test_ir_calculated_via_formula_when_stored_ir_is_null(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict(['jumlah_penduduk' => 100000]);
        $period = $this->createPeriod();

        // Cases = 25, Population = 100,000 -> IR = (25 / 100,000) * 100,000 = 25.0
        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 25,
            'jumlah_penduduk' => 100000,
            'incidence_rate' => null, // Not precalculated
            'is_published' => true,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases');

        $response->assertStatus(200);
        $firstCase = $response->json('cases.data.0');

        $this->assertEquals(25.0, $firstCase['incidence_rate']);
        $this->assertEquals('25,00 / 100k', $firstCase['incidence_rate_formatted']);
    }

    /**
     * Test 7: Search by kecamatan name filters cases accurately.
     */
    public function test_search_by_kecamatan_name(): void
    {
        $admin = $this->createAdmin();
        $period = $this->createPeriod();

        $districtA = $this->createDistrict(['nama' => 'Ajibarang', 'kode' => '330202']);
        $districtB = $this->createDistrict(['nama' => 'Banyumas', 'kode' => '330214']);

        KasusAgregat::create([
            'kecamatan_id' => $districtA->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 12,
            'jumlah_penduduk' => 90000,
            'incidence_rate' => 13.33,
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $districtB->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 8,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 16.00,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases?search=Ajibarang');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertEquals('Ajibarang', $response->json('cases.data.0.kecamatan_nama'));
    }

    /**
     * Test 8: Search by case surveillance notes (keterangan).
     */
    public function test_search_by_case_notes(): void
    {
        $admin = $this->createAdmin();
        $districtA = $this->createDistrict(['kode' => '330205']);
        $districtB = $this->createDistrict(['kode' => '330206']);
        $period = $this->createPeriod();

        KasusAgregat::create([
            'kecamatan_id' => $districtA->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 7,
            'jumlah_penduduk' => 80000,
            'keterangan' => 'Klaster baru ditemukan di RT 03 RW 02',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $districtB->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 3,
            'jumlah_penduduk' => 80000,
            'keterangan' => 'Situasi terkendali tanpa lonjakan',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases?search=Klaster+baru');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertStringContainsString('Klaster baru', $response->json('cases.data.0.keterangan'));
    }

    /**
     * Test 9: Filter cases by district id.
     */
    public function test_filter_cases_by_district(): void
    {
        $admin = $this->createAdmin();
        $period = $this->createPeriod();

        $district1 = $this->createDistrict(['nama' => 'Wangon', 'kode' => '330203']);
        $district2 = $this->createDistrict(['nama' => 'Jatilawang', 'kode' => '330204']);

        KasusAgregat::create([
            'kecamatan_id' => $district1->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_penduduk' => 80000,
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $district2->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 5,
            'jumlah_penduduk' => 60000,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/cases?district_id={$district1->id}");

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertEquals($district1->id, $response->json('cases.data.0.kecamatan_id'));
    }

    /**
     * Test 10: Filter cases by period id.
     */
    public function test_filter_cases_by_period(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();

        $period1 = $this->createPeriod(['nama' => 'Januari 2026', 'bulan' => 1]);
        $period2 = $this->createPeriod(['nama' => 'Februari 2026', 'bulan' => 2]);

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period1->id,
            'jumlah_kasus' => 14,
            'jumlah_penduduk' => 80000,
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period2->id,
            'jumlah_kasus' => 6,
            'jumlah_penduduk' => 80000,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/cases?period_id={$period2->id}");

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertEquals($period2->id, $response->json('cases.data.0.periode_id'));
        $this->assertEquals('Februari 2026', $response->json('cases.data.0.periode_nama'));
    }

    /**
     * Test 11: Combined search and filter parameters.
     */
    public function test_combined_search_and_filters(): void
    {
        $admin = $this->createAdmin();

        $districtA = $this->createDistrict(['nama' => 'Sokaraja', 'kode' => '330219']);
        $districtB = $this->createDistrict(['nama' => 'Kembaran', 'kode' => '330220']);

        $period1 = $this->createPeriod(['nama' => 'Januari 2026', 'bulan' => 1]);
        $period2 = $this->createPeriod(['nama' => 'Februari 2026', 'bulan' => 2]);

        KasusAgregat::create([
            'kecamatan_id' => $districtA->id,
            'periode_id' => $period1->id,
            'jumlah_kasus' => 20,
            'jumlah_penduduk' => 80000,
            'keterangan' => 'Laporan surveilans rutin',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $districtA->id,
            'periode_id' => $period2->id,
            'jumlah_kasus' => 15,
            'jumlah_penduduk' => 80000,
            'keterangan' => 'Laporan surveilans rutin',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $districtB->id,
            'periode_id' => $period1->id,
            'jumlah_kasus' => 5,
            'jumlah_penduduk' => 60000,
            'keterangan' => 'Kasus rendah',
        ]);

        $response = $this->actingAs($admin)->getJson(
            "/api/admin/cases?search=Sokaraja&district_id={$districtA->id}&period_id={$period1->id}"
        );

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('cases.total'));
        $this->assertEquals('Sokaraja', $response->json('cases.data.0.kecamatan_nama'));
        $this->assertEquals('Januari 2026', $response->json('cases.data.0.periode_nama'));
    }

    /**
     * Test 12: Search with no matching result returns empty list gracefully.
     */
    public function test_search_not_found_returns_empty_gracefully(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_penduduk' => 80000,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/cases?search=WilayahTidakDitemukan123');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('cases.total'));
        $this->assertEmpty($response->json('cases.data'));
    }

    /**
     * Test 13: Pagination divides records accurately.
     */
    public function test_pagination_divides_records_accurately(): void
    {
        $admin = $this->createAdmin();
        $period = $this->createPeriod();

        // Create 15 distinct districts so that (kecamatan_id, periode_id) unique constraint is preserved
        for ($i = 1; $i <= 15; $i++) {
            $district = $this->createDistrict();
            KasusAgregat::create([
                'kecamatan_id' => $district->id,
                'periode_id' => $period->id,
                'jumlah_kasus' => $i,
                'jumlah_penduduk' => 80000,
            ]);
        }

        // Page 1 with per_page = 10
        $responsePage1 = $this->actingAs($admin)->getJson('/api/admin/cases?page=1&per_page=10');
        $responsePage1->assertStatus(200);
        $this->assertEquals(15, $responsePage1->json('cases.total'));
        $this->assertEquals(2, $responsePage1->json('cases.last_page'));
        $this->assertCount(10, $responsePage1->json('cases.data'));

        // Page 2
        $responsePage2 = $this->actingAs($admin)->getJson('/api/admin/cases?page=2&per_page=10');
        $responsePage2->assertStatus(200);
        $this->assertCount(5, $responsePage2->json('cases.data'));
    }

    /**
     * Test 14: Districts endpoint returns list of all districts for dropdown.
     */
    public function test_districts_endpoint_returns_all_districts(): void
    {
        $admin = $this->createAdmin();

        $this->createDistrict(['nama' => 'Cilongok', 'kode' => '330207']);
        $this->createDistrict(['nama' => 'Karanglewas', 'kode' => '330208']);

        $response = $this->actingAs($admin)->getJson('/api/admin/districts');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Daftar wilayah kecamatan berhasil dimuat.',
        ]);
        $this->assertGreaterThanOrEqual(2, count($response->json('districts')));
    }

    /**
     * Test 15: Periods endpoint returns list of all periods for dropdown.
     */
    public function test_periods_endpoint_returns_all_periods(): void
    {
        $admin = $this->createAdmin();

        $this->createPeriod(['nama' => 'Januari 2026', 'tahun' => 2026, 'bulan' => 1]);
        $this->createPeriod(['nama' => 'Februari 2026', 'tahun' => 2026, 'bulan' => 2]);

        $response = $this->actingAs($admin)->getJson('/api/admin/periods');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Daftar periode waktu pemantauan berhasil dimuat.',
        ]);
        $this->assertGreaterThanOrEqual(2, count($response->json('periods')));
    }

    /**
     * Test 16: Case detail endpoint returns complete information for a specific record.
     */
    public function test_case_detail_endpoint_returns_complete_data(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict([
            'nama' => 'Banyumas',
            'kode' => '330214',
            'luas_wilayah' => 38.09,
            'jumlah_penduduk' => 54000,
        ]);
        $period = $this->createPeriod([
            'nama' => 'Maret 2026',
            'tahun' => 2026,
            'bulan' => 3,
            'tipe_periode' => 'monthly',
        ]);

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 22,
            'kasus_laki_laki' => 12,
            'kasus_perempuan' => 10,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 54000,
            'incidence_rate' => 40.74,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Peningkatan kasus pasca musim penghujan',
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/cases/{$case->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Detail data kasus DBD berhasil diambil.',
            'case' => [
                'id' => $case->id,
                'kecamatan_nama' => 'Banyumas',
                'kecamatan_kode' => '330214',
                'periode_nama' => 'Maret 2026',
                'jumlah_kasus' => 22,
                'kasus_laki_laki' => 12,
                'kasus_perempuan' => 10,
                'jumlah_meninggal' => 2,
                'populasi' => 54000,
                'incidence_rate' => 40.74,
                'keterangan' => 'Peningkatan kasus pasca musim penghujan',
            ],
        ]);
    }

    /**
     * Test 17: Case detail returns 404 when case id not found.
     */
    public function test_case_detail_returns_404_when_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->getJson('/api/admin/cases/999999');

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data kasus DBD tidak ditemukan.',
        ]);
    }

    /**
     * Test 18 (Feature 18): Unauthenticated guest cannot create new case.
     */
    public function test_unauthenticated_guest_cannot_create_case(): void
    {
        $response = $this->postJson('/api/admin/cases', [
            'kecamatan_id' => 1,
            'periode_id' => 1,
            'jumlah_kasus' => 10,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test 19 (Feature 18): Non-admin user cannot create new case.
     */
    public function test_non_admin_user_cannot_create_case(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $response = $this->actingAs($regularUser)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 80000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 20 (Feature 18): Inactive admin cannot create new case.
     */
    public function test_inactive_admin_cannot_create_case(): void
    {
        $inactiveAdmin = $this->createAdmin(['is_active' => false]);
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $response = $this->actingAs($inactiveAdmin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 80000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 21 (Feature 18): Authenticated admin can create case successfully with automatic IR calculation.
     */
    public function test_authenticated_admin_can_create_case_successfully(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict([
            'nama' => 'Purwokerto Utara',
            'kode' => '330225',
            'jumlah_penduduk' => 100000,
        ]);
        $period = $this->createPeriod([
            'nama' => 'April 2026',
            'tahun' => 2026,
            'bulan' => 4,
        ]);

        // Cases = 25, Population = 100,000 -> Expected IR = (25 / 100,000) * 100,000 = 25.0
        $response = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 25,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 100000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Pencatatan kasus baru bulan April',
            'kasus_laki_laki' => 13,
            'kasus_perempuan' => 12,
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Data kasus DBD berhasil ditambahkan ke dalam sistem.',
            'case' => [
                'kecamatan_id' => $district->id,
                'kecamatan_nama' => 'Purwokerto Utara',
                'periode_id' => $period->id,
                'periode_nama' => 'April 2026',
                'jumlah_kasus' => 25,
                'jumlah_meninggal' => 1,
                'populasi' => 100000,
                'incidence_rate' => 25.0,
                'incidence_rate_formatted' => '25,00 / 100k',
                'is_published' => true,
                'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                'keterangan' => 'Pencatatan kasus baru bulan April',
                'kasus_laki_laki' => 13,
                'kasus_perempuan' => 12,
            ],
        ]);

        $this->assertDatabaseHas('kasus_agregats', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 25,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 100000,
            'incidence_rate' => 25.0,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);
    }

    /**
     * Test 22 (Feature 18): Create case fails when required fields are missing.
     */
    public function test_create_case_fails_when_required_fields_empty(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/cases', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'kecamatan_id',
            'periode_id',
            'jumlah_kasus',
            'jumlah_meninggal',
            'jumlah_penduduk',
            'status_publikasi',
        ]);
    }

    /**
     * Test 23 (Feature 18): Create case fails when district or period does not exist.
     */
    public function test_create_case_fails_when_district_or_period_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => 999999,
            'periode_id' => 999999,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 80000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['kecamatan_id', 'periode_id']);
    }

    /**
     * Test 24 (Feature 18): Create case fails when values are negative.
     */
    public function test_create_case_fails_with_negative_values(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $response = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => -5,
            'jumlah_meninggal' => -1,
            'jumlah_penduduk' => 80000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['jumlah_kasus', 'jumlah_meninggal']);
    }

    /**
     * Test 25 (Feature 18): Create case fails when population is zero or negative.
     */
    public function test_create_case_fails_when_population_is_zero_or_negative(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $response = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['jumlah_penduduk']);
    }

    /**
     * Test 26 (Feature 18): Create case fails when duplicate district and period combination is submitted.
     */
    public function test_create_case_fails_when_duplicate_district_and_period(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        // First record already exists
        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 80000,
            'incidence_rate' => 12.50,
        ]);

        // Attempting to create duplicate for the same district and period
        $response = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 80000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Data kasus DBD untuk wilayah kecamatan dan periode waktu yang dipilih sudah tercatat dalam sistem.',
        ]);
        $response->assertJsonValidationErrors(['kecamatan_id']);
    }

    /**
     * Test 27 (Feature 18): Newly created case is immediately retrievable via Feature 17 list and detail endpoints.
     */
    public function test_newly_created_case_is_retrievable_via_feature_17_endpoints(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict([
            'nama' => 'Pekuncen',
            'kode' => '330210',
            'jumlah_penduduk' => 72000,
        ]);
        $period = $this->createPeriod([
            'nama' => 'Mei 2026',
            'tahun' => 2026,
            'bulan' => 5,
        ]);

        // 1. Create case via Feature 18
        $createRes = $this->actingAs($admin)->postJson('/api/admin/cases', [
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 18,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 72000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Kasus terkendali di Pekuncen',
        ]);
        $createRes->assertStatus(201);
        $newCaseId = $createRes->json('case.id');

        // 2. Fetch list via Feature 17
        $listRes = $this->actingAs($admin)->getJson("/api/admin/cases?search=Pekuncen");
        $listRes->assertStatus(200);
        $this->assertEquals(1, $listRes->json('cases.total'));
        $this->assertEquals('Pekuncen', $listRes->json('cases.data.0.kecamatan_nama'));

        // 3. Fetch detail via Feature 17
        $detailRes = $this->actingAs($admin)->getJson("/api/admin/cases/{$newCaseId}");
        $detailRes->assertStatus(200);
        $this->assertEquals(18, $detailRes->json('case.jumlah_kasus'));
        $this->assertEquals(25.0, $detailRes->json('case.incidence_rate'));
        $this->assertEquals('Kasus terkendali di Pekuncen', $detailRes->json('case.keterangan'));
    }

    /**
     * Test 28 (Feature 19): Unauthenticated guest cannot update case.
     */
    public function test_unauthenticated_guest_cannot_update_case(): void
    {
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test 29 (Feature 19): Non-admin user cannot update case.
     */
    public function test_non_admin_user_cannot_update_case(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($regularUser)->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 30 (Feature 19): Inactive admin cannot update case.
     */
    public function test_inactive_admin_cannot_update_case(): void
    {
        $inactiveAdmin = $this->createAdmin(['is_active' => false]);
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($inactiveAdmin)->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 31 (Feature 19): Update case returns 404 when case not found.
     */
    public function test_update_case_returns_404_when_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/cases/999999', [
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 60000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data kasus DBD tidak ditemukan atau sudah dihapus.',
        ]);
    }

    /**
     * Test 32 (Feature 19): Authenticated admin can update case successfully with recalculated IR.
     */
    public function test_authenticated_admin_can_update_case_successfully(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict(['nama' => 'Banyumas', 'kode' => '330201']);
        $period = $this->createPeriod(['nama' => 'Januari 2026']);

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Catatan awal',
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => 25,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
            'keterangan' => 'Pembaruan data pasca verifikasi lapangan',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Data kasus DBD berhasil diperbarui.',
            'case' => [
                'id' => $case->id,
                'jumlah_kasus' => 25,
                'jumlah_meninggal' => 2,
                'populasi' => 50000,
                'incidence_rate' => 50.0, // (25 / 50000) * 100000
                'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
                'is_published' => false,
                'keterangan' => 'Pembaruan data pasca verifikasi lapangan',
            ],
        ]);

        // Verifikasi ke database
        $case->refresh();
        $this->assertEquals(25, $case->jumlah_kasus);
        $this->assertEquals(2, $case->jumlah_meninggal);
        $this->assertEquals(50000, $case->jumlah_penduduk);
        $this->assertEquals(50.0, (float) $case->incidence_rate);
        $this->assertEquals('INTERNAL_BELUM_DIIZINKAN', $case->status_publikasi);
        $this->assertFalse($case->is_published);
        $this->assertEquals('Pembaruan data pasca verifikasi lapangan', $case->keterangan);
    }

    /**
     * Test 33 (Feature 19): Update case strictly preserves kecamatan_id and periode_id identity.
     */
    public function test_update_case_preserves_kecamatan_and_periode_identity(): void
    {
        $admin = $this->createAdmin();
        $districtOriginal = $this->createDistrict(['nama' => 'Kecamatan Asli']);
        $districtAttacker = $this->createDistrict(['nama' => 'Kecamatan Palsu']);
        $periodOriginal = $this->createPeriod(['nama' => 'Periode Asli']);
        $periodAttacker = $this->createPeriod(['nama' => 'Periode Palsu']);

        $case = KasusAgregat::create([
            'kecamatan_id' => $districtOriginal->id,
            'periode_id' => $periodOriginal->id,
            'jumlah_kasus' => 12,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 60000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Attacker attempts to change kecamatan_id and periode_id via PUT payload
        $response = $this->actingAs($admin)->putJson("/api/admin/cases/{$case->id}", [
            'kecamatan_id' => $districtAttacker->id,
            'periode_id' => $periodAttacker->id,
            'jumlah_kasus' => 18,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 60000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(200);

        // Pastikan kecamatan_id dan periode_id tetap milik data awal!
        $case->refresh();
        $this->assertEquals($districtOriginal->id, $case->kecamatan_id);
        $this->assertEquals($periodOriginal->id, $case->periode_id);
        $this->assertEquals(18, $case->jumlah_kasus);
        $this->assertEquals(30.0, (float) $case->incidence_rate);
    }

    /**
     * Test 34 (Feature 19): Update case fails when required fields are empty.
     */
    public function test_update_case_fails_when_required_fields_empty(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/cases/{$case->id}", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'jumlah_kasus',
            'jumlah_meninggal',
            'jumlah_penduduk',
            'status_publikasi',
        ]);
    }

    /**
     * Test 35 (Feature 19): Update case fails when numeric fields are invalid or negative.
     */
    public function test_update_case_fails_when_numeric_fields_invalid(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict();
        $period = $this->createPeriod();

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => -5,
            'jumlah_meninggal' => -1,
            'jumlah_penduduk' => 0,
            'status_publikasi' => 'STATUS_TIDAK_VALID',
            'keterangan' => str_repeat('A', 300),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'jumlah_kasus',
            'jumlah_meninggal',
            'jumlah_penduduk',
            'status_publikasi',
            'keterangan',
        ]);
    }

    /**
     * Test 36 (Feature 19): Updated case is immediately reflected in listing and summary metrics.
     */
    public function test_updated_case_is_reflected_in_listing_and_summary(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict(['nama' => 'Tambak', 'kode' => '330202']);
        $period = $this->createPeriod(['nama' => 'Februari 2026']);

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 5,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 10.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Update kasus dari 5 menjadi 20
        $updateRes = $this->actingAs($admin)->putJson("/api/admin/cases/{$case->id}", [
            'jumlah_kasus' => 20,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);
        $updateRes->assertStatus(200);

        // Fetch index summary
        $indexRes = $this->actingAs($admin)->getJson('/api/admin/cases');
        $indexRes->assertStatus(200);
        $this->assertEquals(20, $indexRes->json('summary.total_cases'));
        $this->assertEquals(2, $indexRes->json('summary.total_deaths'));
        $this->assertEquals(40.0, $indexRes->json('summary.average_ir'));
        $this->assertEquals(20, $indexRes->json('cases.data.0.jumlah_kasus'));
    }

    /**
     * Test 37 (Feature 20): Unauthenticated guest cannot delete case.
     */
    public function test_unauthenticated_guest_cannot_delete_case(): void
    {
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 8,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 45000,
            'incidence_rate' => 17.78,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->deleteJson("/api/admin/cases/{$case->id}");
        $response->assertStatus(401);
        $this->assertDatabaseHas('kasus_agregats', ['id' => $case->id]);
    }

    /**
     * Test 38 (Feature 20): Non-admin user cannot delete case.
     */
    public function test_non_admin_user_cannot_delete_case(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 8,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 45000,
            'incidence_rate' => 17.78,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($regularUser)->deleteJson("/api/admin/cases/{$case->id}");
        $response->assertStatus(403);
        $this->assertDatabaseHas('kasus_agregats', ['id' => $case->id]);
    }

    /**
     * Test 39 (Feature 20): Inactive admin cannot delete case.
     */
    public function test_inactive_admin_cannot_delete_case(): void
    {
        $inactiveAdmin = $this->createAdmin(['is_active' => false]);
        $district = $this->createDistrict();
        $period = $this->createPeriod();
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 8,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 45000,
            'incidence_rate' => 17.78,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($inactiveAdmin)->deleteJson("/api/admin/cases/{$case->id}");
        $response->assertStatus(403);
        $this->assertDatabaseHas('kasus_agregats', ['id' => $case->id]);
    }

    /**
     * Test 40 (Feature 20): Delete case returns 404 when case not found.
     */
    public function test_delete_case_returns_404_when_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->deleteJson('/api/admin/cases/999999');
        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data kasus DBD tidak ditemukan atau sudah dihapus.',
        ]);
    }

    /**
     * Test 41 (Feature 20): Authenticated admin can delete case successfully.
     */
    public function test_authenticated_admin_can_delete_case_successfully(): void
    {
        $admin = $this->createAdmin();
        $district = $this->createDistrict(['nama' => 'Somagede', 'kode' => '330215']);
        $period = $this->createPeriod(['nama' => 'Maret 2026']);

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 14,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 48000,
            'incidence_rate' => 29.17,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => 'Kasus di Somagede',
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/cases/{$case->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Data kasus DBD berhasil dihapus dari sistem.',
        ]);

        // Verifikasi bahwa rekaman kasus benar-benar dihapus dari database
        $this->assertDatabaseMissing('kasus_agregats', [
            'id' => $case->id,
        ]);

        // Verifikasi bahwa data master kecamatan dan periode TIDAK ikut terhapus
        $this->assertDatabaseHas('kecamatans', ['id' => $district->id]);
        $this->assertDatabaseHas('periodes', ['id' => $period->id]);
    }

    /**
     * Test 42 (Feature 20): Deleted case is no longer included in listing and summary metrics.
     */
    public function test_deleted_case_is_removed_from_listing_and_summary(): void
    {
        $admin = $this->createAdmin();
        $district1 = $this->createDistrict(['nama' => 'Kecamatan A']);
        $district2 = $this->createDistrict(['nama' => 'Kecamatan B']);
        $period = $this->createPeriod();

        $case1 = KasusAgregat::create([
            'kecamatan_id' => $district1->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 20.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $case2 = KasusAgregat::create([
            'kecamatan_id' => $district2->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 20,
            'jumlah_meninggal' => 2,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 40.0,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Total awal: 2 rekaman, 30 kasus, 3 meninggal
        $initialRes = $this->actingAs($admin)->getJson('/api/admin/cases');
        $initialRes->assertStatus(200);
        $this->assertEquals(2, $initialRes->json('summary.total_records'));
        $this->assertEquals(30, $initialRes->json('summary.total_cases'));
        $this->assertEquals(3, $initialRes->json('summary.total_deaths'));

        // Hapus case1
        $deleteRes = $this->actingAs($admin)->deleteJson("/api/admin/cases/{$case1->id}");
        $deleteRes->assertStatus(200);

        // Setelah dihapus: 1 rekaman tersisa, 20 kasus, 2 meninggal
        $afterRes = $this->actingAs($admin)->getJson('/api/admin/cases');
        $afterRes->assertStatus(200);
        $this->assertEquals(1, $afterRes->json('summary.total_records'));
        $this->assertEquals(20, $afterRes->json('summary.total_cases'));
        $this->assertEquals(2, $afterRes->json('summary.total_deaths'));
        $this->assertEquals($case2->id, $afterRes->json('cases.data.0.id'));
    }
}
