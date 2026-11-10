<?php

namespace Tests\Feature;

use App\Models\DatasetMetadata;
use App\Models\Periode;
use App\Models\User;
use Database\Seeders\DatasetMetadataSeeder;
use Database\Seeders\KasusAgregatSeeder;
use Database\Seeders\KecamatanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MetadataManagementTest extends TestCase
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
            'password' => Hash::make('AdminBanyumas2026!'),
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

    public function test_unauthenticated_guest_cannot_access_metadata_endpoint(): void
    {
        $response = $this->getJson('/api/admin/metadata');
        $response->assertStatus(401);
    }

    public function test_non_admin_user_cannot_access_metadata_endpoint(): void
    {
        $response = $this->actingAs($this->regularUser)->getJson('/api/admin/metadata');
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_access_metadata_endpoint(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->getJson('/api/admin/metadata');
        $response->assertStatus(403);
    }

    private function seedMetadata(): void
    {
        $this->seed(KecamatanSeeder::class);
        $this->seed(KasusAgregatSeeder::class);
        $this->seed(DatasetMetadataSeeder::class);
    }

    public function test_admin_can_retrieve_paginated_metadata_list_with_summary_and_categories(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'summary' => [
                'total_datasets',
                'total_categories',
                'with_source_count',
                'with_update_date_count',
            ],
            'categories',
            'data' => [
                '*' => [
                    'id',
                    'dataset_code',
                    'dataset_name',
                    'kategori',
                    'kategori_label',
                    'source_category',
                    'source_type',
                    'description',
                    'source_name',
                    'reference_source',
                    'spatial_unit',
                    'granularity',
                    'frekuensi_pembaruan',
                    'update_date',
                    'update_date_formatted',
                    'observation_year',
                    'period_range',
                    'indicator',
                    'publication_status',
                    'validation_status',
                    'is_public_visible',
                ],
            ],
            'meta' => [
                'current_page',
                'last_page',
                'per_page',
                'total',
                'from',
                'to',
            ],
        ]);

        $this->assertTrue($response->json('success'));
        $this->assertEquals(8, $response->json('summary.total_datasets'));
        $this->assertGreaterThanOrEqual(3, $response->json('summary.total_categories'));
        $this->assertCount(8, $response->json('data'));
    }

    public function test_search_metadata_by_dataset_name(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=Simulasi');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $matched = str_contains(strtolower($item['dataset_name']), 'simulasi')
                || str_contains(strtolower($item['source_category']), 'simulasi')
                || str_contains(strtolower($item['source_type']), 'simulasi')
                || str_contains(strtolower($item['kategori_label']), 'simulasi');
            $this->assertTrue($matched, "Expected item {$item['dataset_name']} to match query 'Simulasi'");
        }
    }

    public function test_search_metadata_by_category(): void
    {
        $this->seedMetadata();

        // Search by category keyword 'reference'
        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=reference');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $this->assertEquals('reference', $item['source_category']);
        }
    }

    public function test_search_metadata_by_indonesian_category_keyword(): void
    {
        $this->seedMetadata();

        // Search by Indonesian term "Referensi"
        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=Referensi');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $matched = str_contains(strtolower($item['dataset_name']), 'referensi')
                || $item['source_category'] === 'reference'
                || str_contains(strtolower($item['source_name']), 'referensi')
                || str_contains(strtolower($item['reference_source'] ?? ''), 'referensi')
                || str_contains(strtolower($item['kategori_label']), 'referensi');
            $this->assertTrue($matched);
        }
    }

    public function test_search_metadata_not_found_returns_empty_list_gracefully(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=KatakunciTidakAdaSamaSekali12345');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertCount(0, $response->json('data'));
        $this->assertEquals(0, $response->json('meta.total'));
        // Summary stats must still reflect overall database totals
        $this->assertEquals(8, $response->json('summary.total_datasets'));
    }

    public function test_filter_metadata_by_category(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?category=internal_restricted');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('internal_restricted', $data[0]['source_category']);
        $this->assertEquals('INT-EDBD-BMS-2026', $data[0]['dataset_code']);
    }

    public function test_metadata_detail_endpoint_returns_complete_data(): void
    {
        $this->seedMetadata();

        $firstItem = DatasetMetadata::first();
        $this->assertNotNull($firstItem);

        $response = $this->actingAs($this->admin)->getJson("/api/admin/metadata/{$firstItem->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $firstItem->id,
                'dataset_code' => $firstItem->dataset_code,
                'dataset_name' => $firstItem->dataset_name,
                'source_name' => $firstItem->source_name,
                'source_category' => $firstItem->source_category,
            ],
        ]);
    }

    public function test_combined_search_and_category_filter(): void
    {
        $this->seedMetadata();

        // Search for '2024' within category 'published'
        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata?category=published&search=2024');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('DBD-BMS-ANNUAL-2024', $data[0]['dataset_code']);
        $this->assertEquals('published', $data[0]['source_category']);
    }

    public function test_summary_statistics_calculate_actual_database_records(): void
    {
        $this->seedMetadata();

        // Check initial summary
        $response1 = $this->actingAs($this->admin)->getJson('/api/admin/metadata');
        $this->assertEquals(8, $response1->json('summary.total_datasets'));

        // Create an additional metadata item
        DatasetMetadata::create([
            'dataset_code' => 'CUSTOM-TEST-2026',
            'dataset_name' => 'Dataset Uji Coba Kustom 2026',
            'source_name' => 'Sumber Uji Coba',
            'source_type' => 'Dokumen Pengujian',
            'source_category' => 'published',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Bulanan',
            'publication_status' => 'Resmi Dipublikasikan',
            'update_date' => '2026-05-01',
            'description' => 'Deskripsi dataset uji coba.',
            'is_public_visible' => true,
        ]);

        // Check updated summary
        $response2 = $this->actingAs($this->admin)->getJson('/api/admin/metadata');
        $this->assertEquals(9, $response2->json('summary.total_datasets'));
        $this->assertEquals(9, $response2->json('summary.with_source_count'));
        $this->assertEquals(9, $response2->json('summary.with_update_date_count'));
    }

    public function test_metadata_detail_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/metadata/999999');
        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data metadata dataset tidak ditemukan.',
        ]);
    }

    public function test_unauthenticated_guest_cannot_view_metadata_detail(): void
    {
        $response = $this->getJson('/api/admin/metadata/1');
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_view_metadata_detail(): void
    {
        $response = $this->actingAs($this->regularUser)->getJson('/api/admin/metadata/1');
        $response->assertStatus(403);
    }

    public function test_unauthenticated_guest_cannot_update_metadata(): void
    {
        $response = $this->putJson('/api/admin/metadata/1', [
            'dataset_name' => 'Nama Baru',
        ]);
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_update_metadata(): void
    {
        $response = $this->actingAs($this->regularUser)->putJson('/api/admin/metadata/1', [
            'dataset_name' => 'Nama Baru',
        ]);
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_update_metadata(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->putJson('/api/admin/metadata/1', [
            'dataset_name' => 'Nama Baru',
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_update_all_nine_metadata_fields_successfully(): void
    {
        $this->seedMetadata();

        $item = DatasetMetadata::first();
        $this->assertNotNull($item);
        $initialCount = DatasetMetadata::count();

        $payload = [
            'dataset_name' => 'Dataset Kasus DBD Terkoreksi Banyumas 2022',
            'source_category' => 'published',
            'indicator' => 'Kasus Terkonfirmasi Laboratorium & IR per 100k',
            'description' => 'Deskripsi hasil audit validasi epidemiologi terbaru yang telah diselaraskan.',
            'source_name' => 'Dinas Kesehatan Kabupaten Banyumas Bidang P2P',
            'reference_source' => 'Buku Laporan Tahunan Profil Kesehatan 2022 Revisi Final',
            'spatial_unit' => '27 Wilayah Kecamatan Terdaftar',
            'period_start' => '2022-01-01',
            'period_end' => '2022-12-31',
            'observation_year' => 2022,
            'granularity' => 'Tahunan Terverifikasi Penuh',
            'validation_status' => 'Data telah diaudit dan disinkronkan dengan data sensus penduduk terkini.',
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/admin/metadata/{$item->id}", $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Informasi metadata berhasil diperbarui.',
            'data' => [
                'id' => $item->id,
                'dataset_name' => 'Dataset Kasus DBD Terkoreksi Banyumas 2022',
                'source_category' => 'published',
                'indicator' => 'Kasus Terkonfirmasi Laboratorium & IR per 100k',
                'description' => 'Deskripsi hasil audit validasi epidemiologi terbaru yang telah diselaraskan.',
                'source_name' => 'Dinas Kesehatan Kabupaten Banyumas Bidang P2P',
                'spatial_unit' => '27 Wilayah Kecamatan Terdaftar',
                'granularity' => 'Tahunan Terverifikasi Penuh',
            ],
        ]);

        // Verifikasi tidak ada penambahan rekaman baru (ID sama)
        $this->assertEquals($initialCount, DatasetMetadata::count());

        // Verifikasi rekaman di basis data telah berubah
        $fresh = $item->fresh();
        $this->assertEquals('Dataset Kasus DBD Terkoreksi Banyumas 2022', $fresh->dataset_name);
        $this->assertEquals('Kasus Terkonfirmasi Laboratorium & IR per 100k', $fresh->indicator);
        $this->assertEquals('Dinas Kesehatan Kabupaten Banyumas Bidang P2P', $fresh->source_name);
        $this->assertEquals('27 Wilayah Kecamatan Terdaftar', $fresh->spatial_unit);
        $this->assertEquals('Tahunan Terverifikasi Penuh', $fresh->granularity);
        $this->assertEquals('Data telah diaudit dan disinkronkan dengan data sensus penduduk terkini.', $fresh->validation_status);

        // Verifikasi pencarian SF29 langsung mencerminkan data terbaru
        $searchRes = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=Terkoreksi');
        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));
        $this->assertEquals($item->id, $searchRes->json('data.0.id'));
    }

    public function test_update_metadata_fails_when_required_fields_empty(): void
    {
        $this->seedMetadata();

        $item = DatasetMetadata::first();

        $response = $this->actingAs($this->admin)->putJson("/api/admin/metadata/{$item->id}", [
            'dataset_name' => '',
            'source_category' => '',
            'description' => '',
            'source_name' => '',
            'spatial_unit' => '',
            'granularity' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'dataset_name',
            'source_category',
            'description',
            'source_name',
            'spatial_unit',
            'granularity',
        ]);
    }

    public function test_update_metadata_fails_when_period_end_before_period_start(): void
    {
        $this->seedMetadata();

        $item = DatasetMetadata::first();

        $response = $this->actingAs($this->admin)->putJson("/api/admin/metadata/{$item->id}", [
            'dataset_name' => 'Dataset Uji',
            'source_category' => 'published',
            'description' => 'Deskripsi valid',
            'source_name' => 'Sumber valid',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
            'period_start' => '2024-12-31',
            'period_end' => '2024-01-01',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_end']);
    }

    public function test_update_metadata_fails_when_category_invalid(): void
    {
        $this->seedMetadata();

        $item = DatasetMetadata::first();

        $response = $this->actingAs($this->admin)->putJson("/api/admin/metadata/{$item->id}", [
            'dataset_name' => 'Dataset Uji',
            'source_category' => 'kategori_palsu_tidak_ada',
            'description' => 'Deskripsi valid',
            'source_name' => 'Sumber valid',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['source_category']);
    }

    public function test_update_metadata_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/admin/metadata/999999', [
            'dataset_name' => 'Dataset Uji',
            'source_category' => 'published',
            'description' => 'Deskripsi valid',
            'source_name' => 'Sumber valid',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
        ]);

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data metadata dataset tidak ditemukan.',
        ]);
    }

    public function test_unauthenticated_guest_cannot_create_metadata(): void
    {
        $response = $this->postJson('/api/admin/metadata', [
            'dataset_name' => 'Dataset Baru',
        ]);
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_create_metadata(): void
    {
        $response = $this->actingAs($this->regularUser)->postJson('/api/admin/metadata', [
            'dataset_name' => 'Dataset Baru',
        ]);
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_create_metadata(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->postJson('/api/admin/metadata', [
            'dataset_name' => 'Dataset Baru',
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_create_metadata_successfully_with_all_fields(): void
    {
        $this->seedMetadata();

        $initialCount = DatasetMetadata::count();

        $payload = [
            'dataset_name' => 'Dataset Pemetaan Vektor Nyamuk Aedes Banyumas 2026',
            'source_category' => 'published',
            'indicator' => 'Kepadatan Larva (ABJ %) & Kasus',
            'description' => 'Definisi metadata pemantauan kepadatan vektor nyamuk Aedes aegypti terpadu.',
            'source_name' => 'Buku Surveilans Entomologi Dinkes Banyumas 2026',
            'reference_source' => 'Petunjuk Teknis Pengendalian Vektor Kemenkes RI',
            'spatial_unit' => '27 Wilayah Puskesmas & Kecamatan',
            'period_start' => '2026-01-01',
            'period_end' => '2026-12-31',
            'observation_year' => 2026,
            'granularity' => 'Bulanan Terjadwal',
            'validation_status' => 'Data entomologi terverifikasi berkala oleh tim surveilans lapangan.',
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/metadata', $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Data metadata berhasil ditambahkan.',
            'data' => [
                'dataset_name' => 'Dataset Pemetaan Vektor Nyamuk Aedes Banyumas 2026',
                'source_category' => 'published',
                'indicator' => 'Kepadatan Larva (ABJ %) & Kasus',
                'source_name' => 'Buku Surveilans Entomologi Dinkes Banyumas 2026',
                'spatial_unit' => '27 Wilayah Puskesmas & Kecamatan',
            ],
        ]);

        // Verifikasi record bertambah 1
        $this->assertEquals($initialCount + 1, DatasetMetadata::count());

        $newId = $response->json('data.id');
        $created = DatasetMetadata::find($newId);
        $this->assertNotNull($created);
        $this->assertEquals('Dataset Pemetaan Vektor Nyamuk Aedes Banyumas 2026', $created->dataset_name);
        $this->assertNotEmpty($created->dataset_code);

        // Verifikasi metadata baru langsung dapat dicari di index SF29
        $searchRes = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=Entomologi');
        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));
        $this->assertEquals($newId, $searchRes->json('data.0.id'));

        // Verifikasi metadata baru dapat dibuka di show
        $showRes = $this->actingAs($this->admin)->getJson("/api/admin/metadata/{$newId}");
        $showRes->assertStatus(200);
        $this->assertEquals('Dataset Pemetaan Vektor Nyamuk Aedes Banyumas 2026', $showRes->json('data.dataset_name'));
    }

    public function test_create_metadata_fails_when_required_fields_empty(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/metadata', [
            'dataset_name' => '',
            'source_category' => '',
            'description' => '',
            'source_name' => '',
            'spatial_unit' => '',
            'granularity' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'dataset_name',
            'source_category',
            'description',
            'source_name',
            'spatial_unit',
            'granularity',
        ]);
    }

    public function test_create_metadata_fails_when_dataset_name_duplicate(): void
    {
        $this->seedMetadata();

        $existing = DatasetMetadata::first();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/metadata', [
            'dataset_name' => $existing->dataset_name,
            'source_category' => 'published',
            'description' => 'Deskripsi acak',
            'source_name' => 'Sumber acak',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['dataset_name']);
    }

    public function test_create_metadata_fails_when_period_end_before_period_start(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/metadata', [
            'dataset_name' => 'Dataset Uji Rentang Salah',
            'source_category' => 'published',
            'description' => 'Deskripsi valid',
            'source_name' => 'Sumber valid',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
            'period_start' => '2026-12-31',
            'period_end' => '2026-01-01',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_end']);
    }

    public function test_create_metadata_fails_when_category_invalid(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/metadata', [
            'dataset_name' => 'Dataset Uji Kategori Salah',
            'source_category' => 'invalid_cat_123',
            'description' => 'Deskripsi valid',
            'source_name' => 'Sumber valid',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['source_category']);
    }

    // =========================================================================
    // SYSTEM FEATURE 32: MENGHAPUS METADATA TESTS
    // =========================================================================

    public function test_unauthenticated_guest_cannot_delete_metadata(): void
    {
        $this->seedMetadata();
        $item = DatasetMetadata::first();

        $response = $this->deleteJson("/api/admin/metadata/{$item->id}");
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_delete_metadata(): void
    {
        $this->seedMetadata();
        $item = DatasetMetadata::first();

        $response = $this->actingAs($this->regularUser)->deleteJson("/api/admin/metadata/{$item->id}");
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_delete_metadata(): void
    {
        $this->seedMetadata();
        $item = DatasetMetadata::first();

        $response = $this->actingAs($this->inactiveAdmin)->deleteJson("/api/admin/metadata/{$item->id}");
        $response->assertStatus(403);
    }

    public function test_delete_metadata_returns_404_when_not_found(): void
    {
        $this->seedMetadata();

        $response = $this->actingAs($this->admin)->deleteJson('/api/admin/metadata/999999');
        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data metadata dataset tidak ditemukan dalam sistem atau sudah dihapus.',
        ]);
    }

    public function test_admin_can_delete_metadata_without_dependencies_successfully(): void
    {
        $this->seedMetadata();

        // Buat metadata uji coba yang tidak memiliki relasi wajib atau kasus
        $testMetadata = DatasetMetadata::create([
            'dataset_code' => 'TEST-DEL-META-001',
            'dataset_name' => 'Dataset Uji Penghapusan Metadata 2026',
            'source_name' => 'Sumber Data Uji Coba',
            'source_category' => 'published_simulation',
            'source_type' => 'Data Pengujian',
            'description' => 'Deskripsi dataset yang siap untuk dihapus.',
            'spatial_unit' => 'Kabupaten Banyumas',
            'granularity' => 'Tahunan',
            'publication_status' => 'Data Simulasi',
            'is_public_visible' => true,
        ]);

        $id = $testMetadata->id;
        $name = $testMetadata->dataset_name;

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/metadata/{$id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Metadata dataset berhasil dihapus.',
            'deleted_id' => $id,
            'deleted_name' => $name,
            'deleted_code' => 'TEST-DEL-META-001',
        ]);

        // Pastikan rekaman benar-benar terhapus dari MySQL
        $this->assertDatabaseMissing('dataset_metadatas', [
            'id' => $id,
        ]);
    }

    public function test_delete_metadata_fails_when_metadata_is_mandatory_reference_for_period_with_cases(): void
    {
        $this->seedMetadata();

        // Temukan metadata resmi tahunan yang memiliki keterkaitan periode dan rekaman kasus DBD aktif
        $mandatoryMetadata = DatasetMetadata::where('dataset_code', 'like', 'DBD-BMS-ANNUAL-%')
            ->whereNotNull('periode_id')
            ->firstOrFail();

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/metadata/{$mandatoryMetadata->id}");

        $response->assertStatus(422);
        $response->assertJsonStructure([
            'success',
            'message',
            'linked_cases_count',
            'errors' => ['dependency'],
        ]);
        $response->assertJson(['success' => false]);

        // Pastikan metadata TIDAK terhapus dari MySQL
        $this->assertDatabaseHas('dataset_metadatas', [
            'id' => $mandatoryMetadata->id,
        ]);
    }

    public function test_delete_metadata_does_not_cascade_or_delete_operational_data(): void
    {
        $this->seedMetadata();

        $initialCasesCount = \App\Models\KasusAgregat::count();
        $initialDistrictsCount = \App\Models\Kecamatan::count();
        $initialPeriodsCount = \App\Models\Periode::count();

        // Buat metadata independen
        $tempMetadata = DatasetMetadata::create([
            'dataset_code' => 'SAFE-DEL-META-002',
            'dataset_name' => 'Dataset Uji Keamanan Data Operasional',
            'source_name' => 'Sumber Data Isolasi',
            'source_category' => 'internal_restricted',
            'source_type' => 'Data Isolasi',
            'description' => 'Memastikan penghapusan metadata tidak merusak rekaman operasional.',
            'spatial_unit' => 'Kecamatan Banyumas',
            'granularity' => 'Bulanan',
            'publication_status' => 'Internal',
            'is_public_visible' => false,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/metadata/{$tempMetadata->id}");
        $response->assertStatus(200);

        // Verifikasi bahwa seluruh data operasional (kasus, wilayah, periode) tetap utuh
        $this->assertEquals($initialCasesCount, \App\Models\KasusAgregat::count());
        $this->assertEquals($initialDistrictsCount, \App\Models\Kecamatan::count());
        $this->assertEquals($initialPeriodsCount, \App\Models\Periode::count());
    }

    public function test_deleted_metadata_is_not_returned_in_index_or_search(): void
    {
        $this->seedMetadata();

        $tempMetadata = DatasetMetadata::create([
            'dataset_code' => 'SEARCH-DEL-META-003',
            'dataset_name' => 'Dataset KataKunciUnikYangDihapus',
            'source_name' => 'Sumber Uji Index',
            'source_category' => 'reference',
            'source_type' => 'Data Uji',
            'description' => 'Dataset untuk menguji bahwa setelah dihapus tidak muncul di pencarian.',
            'spatial_unit' => 'Banyumas',
            'granularity' => 'Tahunan',
            'publication_status' => 'Referensi',
            'is_public_visible' => true,
        ]);

        // Verifikasi awal: dataset dapat ditemukan melalui pencarian
        $searchBefore = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=KataKunciUnikYangDihapus');
        $searchBefore->assertStatus(200);
        $this->assertCount(1, $searchBefore->json('data'));

        // Hapus metadata
        $deleteResponse = $this->actingAs($this->admin)->deleteJson("/api/admin/metadata/{$tempMetadata->id}");
        $deleteResponse->assertStatus(200);

        // Verifikasi akhir: dataset tidak lagi ditemukan pada pencarian
        $searchAfter = $this->actingAs($this->admin)->getJson('/api/admin/metadata?search=KataKunciUnikYangDihapus');
        $searchAfter->assertStatus(200);
        $this->assertCount(0, $searchAfter->json('data'));
    }
}
