<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegionManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $regularUser;
    private User $inactiveAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $this->inactiveAdmin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);
    }

    protected function tearDown(): void
    {
        $backupPath = public_path('geojson/banyumas_27_kecamatan.backup.geojson');
        $masterPath = public_path('geojson/banyumas_27_kecamatan.geojson');
        if (file_exists($backupPath)) {
            @copy($backupPath, $masterPath);
        }

        $testDistricts = ['330228', '330229', '330230', '330231', '330232', '330299'];
        foreach ($testDistricts as $code) {
            $testFile = public_path("geojson/districts/{$code}.geojson");
            if (file_exists($testFile)) {
                @unlink($testFile);
            }
        }

        parent::tearDown();
    }

    public function test_unauthenticated_guest_cannot_access_regions_endpoint(): void
    {
        $response = $this->getJson('/api/admin/regions');
        $response->assertStatus(401);
    }

    public function test_non_admin_user_cannot_access_regions_endpoint(): void
    {
        $response = $this->actingAs($this->regularUser)->getJson('/api/admin/regions');
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_access_regions_endpoint(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->getJson('/api/admin/regions');
        $response->assertStatus(403);
    }

    public function test_admin_can_retrieve_paginated_regions_list_with_summary(): void
    {
        // Buat 15 kecamatan dummy
        for ($i = 1; $i <= 15; $i++) {
            Kecamatan::create([
                'kode' => sprintf('3302%02d', $i),
                'nama' => 'Kecamatan Test ' . $i,
                'luas_wilayah' => 50.5 + $i,
                'jumlah_penduduk' => 50000 + ($i * 1000),
            ]);
        }

        $response = $this->actingAs($this->admin)->getJson('/api/admin/regions?page=1&per_page=10');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'regions' => [
                    '*' => [
                        'id',
                        'kode',
                        'nama',
                        'luas_wilayah',
                        'luas_wilayah_formatted',
                        'jumlah_penduduk',
                        'jumlah_penduduk_formatted',
                        'has_geometry',
                        'geometry_status',
                        'total_case_records',
                        'total_cases',
                        'total_deaths',
                        'updated_at_formatted',
                    ],
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                    'from',
                    'to',
                ],
                'summary' => [
                    'total_regions',
                    'regions_with_geometry',
                    'regions_without_geometry',
                    'total_cases_all_regions',
                    'total_deaths_all_regions',
                ],
            ]);

        $this->assertEquals(10, count($response->json('regions')));
        $this->assertEquals(15, $response->json('pagination.total'));
        $this->assertEquals(2, $response->json('pagination.last_page'));
        $this->assertEquals(15, $response->json('summary.total_regions'));
    }

    public function test_search_regions_by_name(): void
    {
        Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);
        Kecamatan::create([
            'kode' => '330202',
            'nama' => 'Wangon',
            'luas_wilayah' => 60.78,
            'jumlah_penduduk' => 84100,
        ]);
        Kecamatan::create([
            'kode' => '330224',
            'nama' => 'Purwokerto Selatan',
            'luas_wilayah' => 13.75,
            'jumlah_penduduk' => 74800,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/regions?search=Purwokerto');

        $response->assertStatus(200);
        $regions = $response->json('regions');
        $this->assertCount(1, $regions);
        $this->assertEquals('Purwokerto Selatan', $regions[0]['nama']);
    }

    public function test_search_regions_by_code(): void
    {
        Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);
        Kecamatan::create([
            'kode' => '330202',
            'nama' => 'Wangon',
            'luas_wilayah' => 60.78,
            'jumlah_penduduk' => 84100,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/regions?search=330202');

        $response->assertStatus(200);
        $regions = $response->json('regions');
        $this->assertCount(1, $regions);
        $this->assertEquals('Wangon', $regions[0]['nama']);
    }

    public function test_search_not_found_returns_empty_list_gracefully(): void
    {
        Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/regions?search=WilayahTidakAda');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('regions'));
        $this->assertEquals(0, $response->json('pagination.total'));
    }

    public function test_region_detail_endpoint_returns_complete_data(): void
    {
        $district = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 51200,
        ]);

        $periode = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
            'is_published' => true,
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $periode->id,
            'jumlah_kasus' => 15,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 51200,
            'incidence_rate' => 29.30,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'region' => [
                    'id',
                    'kode',
                    'nama',
                    'luas_wilayah',
                    'luas_wilayah_formatted',
                    'jumlah_penduduk',
                    'jumlah_penduduk_formatted',
                    'total_case_records',
                    'total_cases',
                    'total_deaths',
                    'average_ir',
                    'average_ir_formatted',
                    'has_geometry',
                    'recent_cases',
                ],
            ]);

        $region = $response->json('region');
        $this->assertEquals('Lumbir', $region['nama']);
        $this->assertEquals('330201', $region['kode']);
        $this->assertEquals(1, $region['total_case_records']);
        $this->assertEquals(15, $region['total_cases']);
        $this->assertEquals(1, $region['total_deaths']);
        $this->assertEquals(true, $region['has_geometry']);
        $this->assertNotEmpty($region['geometry']);
    }

    public function test_region_detail_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/regions/999999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Data wilayah kecamatan tidak ditemukan dalam basis data.',
            ]);
    }

    public function test_unauthenticated_guest_cannot_view_region_detail(): void
    {
        $district = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
        ]);

        $response = $this->getJson("/api/admin/regions/{$district->id}");
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_view_region_detail(): void
    {
        $district = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
        ]);

        $response = $this->actingAs($this->regularUser)->getJson("/api/admin/regions/{$district->id}");
        $response->assertStatus(403);
    }

    // =========================================================================
    // SYSTEM FEATURE 22: MENAMBAH DATA WILAYAH KECAMATAN
    // =========================================================================

    public function test_unauthenticated_guest_cannot_create_region(): void
    {
        $response = $this->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Baru',
            'kode' => '330299',
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_create_region(): void
    {
        $response = $this->actingAs($this->regularUser)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Baru',
            'kode' => '330299',
        ]);

        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_create_region(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Baru',
            'kode' => '330299',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_region_successfully(): void
    {
        $payload = [
            'nama' => 'Kecamatan Banyumas Baru',
            'kode' => '330228',
            'luas_wilayah' => 45.75,
            'jumlah_penduduk' => 52000,
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil ditambahkan.',
                'region' => [
                    'nama' => 'Kecamatan Banyumas Baru',
                    'kode' => '330228',
                    'luas_wilayah' => 45.75,
                    'jumlah_penduduk' => 52000,
                ],
            ]);

        $this->assertDatabaseHas('kecamatans', [
            'nama' => 'Kecamatan Banyumas Baru',
            'kode' => '330228',
        ]);
    }

    public function test_admin_can_create_region_with_uploaded_geojson_file(): void
    {
        $validPolygonGeojson = json_encode([
            'type' => 'Feature',
            'properties' => ['name' => 'Banyumas Baru'],
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => [
                    [
                        [109.10, -7.40],
                        [109.15, -7.40],
                        [109.15, -7.45],
                        [109.10, -7.45],
                        [109.10, -7.40],
                    ],
                ],
            ],
        ]);

        $file = UploadedFile::fake()->createWithContent('banyumas_baru.geojson', $validPolygonGeojson);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Spasial Baru',
            'kode' => '330229',
            'luas_wilayah' => 38.20,
            'jumlah_penduduk' => 47000,
            'geojson_file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'region' => [
                    'nama' => 'Kecamatan Spasial Baru',
                    'kode' => '330229',
                    'has_geometry' => true,
                    'geometry_status' => 'Batas Tersedia',
                ],
            ]);

        $this->assertDatabaseHas('kecamatans', [
            'nama' => 'Kecamatan Spasial Baru',
            'kode' => '330229',
        ]);
    }

    public function test_create_region_fails_when_required_fields_empty(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => '',
            'kode' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'kode']);
    }

    public function test_create_region_fails_when_name_or_code_duplicate(): void
    {
        Kecamatan::create([
            'nama' => 'Lumbir',
            'kode' => '330201',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => 'Lumbir',
            'kode' => '330201',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'kode']);
    }

    public function test_create_region_fails_when_geojson_format_corrupt(): void
    {
        $corruptFile = UploadedFile::fake()->createWithContent('corrupt.geojson', 'INI_BUKAN_JSON_VALID');

        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Corrupt',
            'kode' => '330230',
            'geojson_file' => $corruptFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['geojson_file']);
    }

    public function test_create_region_fails_when_geojson_coordinates_invalid(): void
    {
        $invalidCoordsGeojson = json_encode([
            'type' => 'Feature',
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => [
                    [
                        ['invalid_lng', 'invalid_lat'],
                    ],
                ],
            ],
        ]);

        $file = UploadedFile::fake()->createWithContent('invalid_coords.geojson', $invalidCoordsGeojson);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Invalid Coords',
            'kode' => '330231',
            'geojson_file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['geojson_file']);
    }

    public function test_newly_created_region_is_retrievable_via_index_and_show(): void
    {
        $responseCreate = $this->actingAs($this->admin)->postJson('/api/admin/regions', [
            'nama' => 'Kecamatan Verifikasi',
            'kode' => '330232',
            'luas_wilayah' => 62.15,
            'jumlah_penduduk' => 58000,
        ]);

        $responseCreate->assertStatus(201);
        $newId = $responseCreate->json('region.id');

        // Verify index
        $responseIndex = $this->actingAs($this->admin)->getJson('/api/admin/regions?search=Verifikasi');
        $responseIndex->assertStatus(200);
        $this->assertCount(1, $responseIndex->json('regions'));
        $this->assertEquals('Kecamatan Verifikasi', $responseIndex->json('regions.0.nama'));

        // Verify show
        $responseShow = $this->actingAs($this->admin)->getJson("/api/admin/regions/{$newId}");
        $responseShow->assertStatus(200);
        $this->assertEquals('Kecamatan Verifikasi', $responseShow->json('region.nama'));
        $this->assertEquals('330232', $responseShow->json('region.kode'));
    }

    // =========================================================================
    // SYSTEM FEATURE 23: MENGELOLA DATA WILAYAH (MENGEDIT WILAYAH)
    // =========================================================================

    public function test_unauthenticated_guest_cannot_update_region(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Tamu',
            'kode' => '330233',
        ]);

        $response = $this->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Tamu Diperbarui',
            'kode' => '330233',
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_update_region(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'USER',
            'is_active' => true,
        ]);

        $district = Kecamatan::create([
            'nama' => 'Kecamatan User Biasa',
            'kode' => '330234',
        ]);

        $response = $this->actingAs($regularUser)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Hacking Attempt',
            'kode' => '330234',
        ]);

        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_update_region(): void
    {
        $inactiveAdmin = User::factory()->create([
            'role' => 'SUPER_ADMIN',
            'is_active' => false,
        ]);

        $district = Kecamatan::create([
            'nama' => 'Kecamatan Nonaktif',
            'kode' => '330235',
        ]);

        $response = $this->actingAs($inactiveAdmin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Edit Gagal',
            'kode' => '330235',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_region_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/admin/regions/999999', [
            'nama' => 'Wilayah Tidak Ditemukan',
            'kode' => '330299',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_admin_can_update_region_attributes_keeping_own_code_and_name(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Pertahankan Diri',
            'kode' => '330236',
            'luas_wilayah' => 25.50,
            'jumlah_penduduk' => 30000,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Pertahankan Diri',
            'kode' => '330236',
            'luas_wilayah' => 28.75,
            'jumlah_penduduk' => 34500,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil diperbarui.',
                'region' => [
                    'id' => $district->id,
                    'nama' => 'Kecamatan Pertahankan Diri',
                    'kode' => '330236',
                    'luas_wilayah' => 28.75,
                    'jumlah_penduduk' => 34500,
                ],
            ]);

        $this->assertDatabaseHas('kecamatans', [
            'id' => $district->id,
            'nama' => 'Kecamatan Pertahankan Diri',
            'kode' => '330236',
            'luas_wilayah' => 28.75,
            'jumlah_penduduk' => 34500,
        ]);
    }

    public function test_admin_can_update_region_name_and_code(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Lama',
            'kode' => '330237',
            'luas_wilayah' => 40.00,
            'jumlah_penduduk' => 50000,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Baru Berganti',
            'kode' => '330238',
            'luas_wilayah' => 42.50,
            'jumlah_penduduk' => 52000,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'region' => [
                    'id' => $district->id,
                    'nama' => 'Kecamatan Baru Berganti',
                    'kode' => '330238',
                    'luas_wilayah' => 42.50,
                    'jumlah_penduduk' => 52000,
                ],
            ]);

        $this->assertDatabaseHas('kecamatans', [
            'id' => $district->id,
            'nama' => 'Kecamatan Baru Berganti',
            'kode' => '330238',
        ]);
        $this->assertDatabaseMissing('kecamatans', [
            'nama' => 'Kecamatan Lama',
            'kode' => '330237',
        ]);
    }

    public function test_update_region_fails_when_name_or_code_taken_by_another_district(): void
    {
        $districtA = Kecamatan::create([
            'nama' => 'Kecamatan Alpha',
            'kode' => '330239',
        ]);

        $districtB = Kecamatan::create([
            'nama' => 'Kecamatan Beta',
            'kode' => '330240',
        ]);

        // Attempt to update district B to use district A's name and code
        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$districtB->id}", [
            'nama' => 'Kecamatan Alpha',
            'kode' => '330239',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'kode']);
    }

    public function test_update_region_fails_when_required_fields_empty(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Uji Kosong',
            'kode' => '330241',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => '',
            'kode' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'kode']);
    }

    public function test_admin_can_update_region_with_new_geojson_file(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Spasial Edit',
            'kode' => '330242',
            'luas_wilayah' => 30.00,
            'jumlah_penduduk' => 35000,
        ]);

        $newValidGeojson = json_encode([
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'properties' => [
                        'nama_kecamatan' => 'Kecamatan Spasial Edit',
                    ],
                    'geometry' => [
                        'type' => 'Polygon',
                        'coordinates' => [
                            [
                                [109.25, -7.45],
                                [109.27, -7.45],
                                [109.27, -7.47],
                                [109.25, -7.47],
                                [109.25, -7.45],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $file = UploadedFile::fake()->createWithContent('updated_boundary.geojson', $newValidGeojson);

        $response = $this->actingAs($this->admin)->postJson("/api/admin/regions/{$district->id}", [
            '_method' => 'PUT',
            'nama' => 'Kecamatan Spasial Edit',
            'kode' => '330242',
            'luas_wilayah' => 32.10,
            'jumlah_penduduk' => 36200,
            'geojson_file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'region' => [
                    'id' => $district->id,
                    'nama' => 'Kecamatan Spasial Edit',
                    'has_geometry' => true,
                    'geometry_status' => 'Batas Tersedia',
                ],
            ]);
    }

    public function test_update_region_fails_when_new_geojson_is_corrupt(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Corrupt Edit',
            'kode' => '330243',
        ]);

        $corruptFile = UploadedFile::fake()->createWithContent('bad.geojson', '{invalid_json:true');

        $response = $this->actingAs($this->admin)->postJson("/api/admin/regions/{$district->id}", [
            '_method' => 'PUT',
            'nama' => 'Kecamatan Corrupt Edit',
            'kode' => '330243',
            'geojson_file' => $corruptFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['geojson_file']);
    }

    public function test_update_region_fails_when_numeric_values_invalid(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Angka Negatif',
            'kode' => '330244',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Angka Negatif',
            'kode' => '330244',
            'luas_wilayah' => -15.5,
            'jumlah_penduduk' => -500,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['luas_wilayah', 'jumlah_penduduk']);
    }

    public function test_update_preserves_foreign_key_relationships_with_case_aggregates(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Relasi Kasus',
            'kode' => '330245',
        ]);

        $periode = Periode::firstOrCreate(
            ['nama' => 'Januari 2026'],
            ['tahun' => 2026, 'bulan' => 1]
        );

        $kasus = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $periode->id,
            'jumlah_kasus' => 18,
            'jumlah_meninggal' => 2,
            'incidence_rate' => 15.4,
        ]);

        // Update district name and code
        $response = $this->actingAs($this->admin)->putJson("/api/admin/regions/{$district->id}", [
            'nama' => 'Kecamatan Relasi Kasus Diperbarui',
            'kode' => '330246',
            'luas_wilayah' => 50.0,
            'jumlah_penduduk' => 60000,
        ]);

        $response->assertStatus(200);

        // Kasus agregat should still be linked to the same kecamatan_id
        $this->assertDatabaseHas('kasus_agregats', [
            'id' => $kasus->id,
            'kecamatan_id' => $district->id,
            'jumlah_kasus' => 18,
            'jumlah_meninggal' => 2,
        ]);

        $reloadedKasus = KasusAgregat::find($kasus->id);
        $this->assertEquals('Kecamatan Relasi Kasus Diperbarui', $reloadedKasus->kecamatan->nama);
        $this->assertEquals('330246', $reloadedKasus->kecamatan->kode);
    }

    // =========================================================================
    // SYSTEM FEATURE 24: MENGELOLA DATA WILAYAH (MENGHAPUS WILAYAH)
    // =========================================================================

    public function test_unauthenticated_guest_cannot_delete_region(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Tamu Hapus',
            'kode' => '330247',
        ]);

        $response = $this->deleteJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(401);
        $this->assertDatabaseHas('kecamatans', ['id' => $district->id]);
    }

    public function test_non_admin_cannot_delete_region(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'USER',
            'is_active' => true,
        ]);

        $district = Kecamatan::create([
            'nama' => 'Kecamatan User Biasa Hapus',
            'kode' => '330248',
        ]);

        $response = $this->actingAs($regularUser)->deleteJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('kecamatans', ['id' => $district->id]);
    }

    public function test_inactive_admin_cannot_delete_region(): void
    {
        $inactiveAdmin = User::factory()->create([
            'role' => 'SUPER_ADMIN',
            'is_active' => false,
        ]);

        $district = Kecamatan::create([
            'nama' => 'Kecamatan Nonaktif Hapus',
            'kode' => '330249',
        ]);

        $response = $this->actingAs($inactiveAdmin)->deleteJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('kecamatans', ['id' => $district->id]);
    }

    public function test_delete_region_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->deleteJson('/api/admin/regions/999999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_delete_region_rejected_when_district_has_linked_case_records(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Dengan Kasus',
            'kode' => '330250',
            'luas_wilayah' => 45.0,
            'jumlah_penduduk' => 50000,
        ]);

        $periode = Periode::firstOrCreate(
            ['nama' => 'Februari 2026'],
            ['tahun' => 2026, 'bulan' => 2]
        );

        $kasus = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $periode->id,
            'jumlah_kasus' => 25,
            'jumlah_meninggal' => 3,
            'incidence_rate' => 20.0,
        ]);

        // Attempt deletion of district that has linked cases
        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Wilayah tidak dapat dihapus karena masih digunakan oleh data kasus DBD. Periksa dan selesaikan keterkaitan data terlebih dahulu.',
                'linked_cases_count' => 1,
            ]);

        // PENTING: Pastikan data wilayah dan data kasus DBD tidak ikut terhapus!
        $this->assertDatabaseHas('kecamatans', [
            'id' => $district->id,
            'nama' => 'Kecamatan Dengan Kasus',
        ]);

        $this->assertDatabaseHas('kasus_agregats', [
            'id' => $kasus->id,
            'kecamatan_id' => $district->id,
            'jumlah_kasus' => 25,
            'jumlah_meninggal' => 3,
        ]);
    }

    public function test_admin_can_delete_region_without_linked_cases(): void
    {
        // 1. Buat wilayah kecamatan baru tanpa data kasus
        $district = Kecamatan::create([
            'nama' => 'Kecamatan Bebas Relasi',
            'kode' => '330251',
            'luas_wilayah' => 33.5,
            'jumlah_penduduk' => 41000,
        ]);

        // 2. Tambahkan feature dummy ke master GeoJSON dan folder districts
        $feature = [
            'type' => 'Feature',
            'properties' => [
                'kode_kecamatan' => '330251',
                'nama_kecamatan' => 'Kecamatan Bebas Relasi',
            ],
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => [
                    [
                        [109.1, -7.4],
                        [109.2, -7.4],
                        [109.2, -7.5],
                        [109.1, -7.5],
                        [109.1, -7.4],
                    ],
                ],
            ],
        ];

        $districtsDir = public_path('geojson/districts');
        if (!File::exists($districtsDir)) {
            File::makeDirectory($districtsDir, 0755, true);
        }
        File::put("{$districtsDir}/330251.geojson", json_encode($feature));

        // 3. Jalankan DELETE endpoint
        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/regions/{$district->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil dihapus.',
                'deleted_id' => $district->id,
                'deleted_nama' => 'Kecamatan Bebas Relasi',
            ]);

        // 4. Pastikan kecamatan terhapus dari MySQL
        $this->assertDatabaseMissing('kecamatans', [
            'id' => $district->id,
            'nama' => 'Kecamatan Bebas Relasi',
        ]);

        // 5. Pastikan berkas individual geojson terhapus
        $this->assertFalse(File::exists("{$districtsDir}/330251.geojson"));

        // 6. Pastikan endpoint show mengembalikan 404
        $showResponse = $this->actingAs($this->admin)->getJson("/api/admin/regions/{$district->id}");
        $showResponse->assertStatus(404);
    }
}
