<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PeriodManagementTest extends TestCase
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

    public function test_unauthenticated_guest_cannot_access_periods_endpoint(): void
    {
        $response = $this->getJson('/api/admin/periods');
        $response->assertStatus(401);
    }

    public function test_non_admin_user_cannot_access_periods_endpoint(): void
    {
        $response = $this->actingAs($this->regularUser)->getJson('/api/admin/periods');
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_access_periods_endpoint(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->getJson('/api/admin/periods');
        $response->assertStatus(403);
    }

    public function test_admin_can_retrieve_paginated_periods_list_with_summary_and_years(): void
    {
        Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        Periode::create([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
            'tipe_periode' => 'monthly',
            'is_published' => false,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        Periode::create([
            'nama' => 'Data Tahunan 2025',
            'tahun' => 2025,
            'bulan' => null,
            'tipe_periode' => 'annual',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'summary' => [
                    'total_periods' => 3,
                    'total_years' => 2,
                    'published_count' => 2,
                    'unpublished_count' => 1,
                ],
                'pagination' => [
                    'total' => 3,
                    'per_page' => 10,
                    'current_page' => 1,
                ],
            ]);

        $this->assertCount(3, $response->json('periods'));
        $this->assertEquals([2026, 2025], $response->json('years'));

        // Pastikan kode periode dan label terformat sesuai standar
        $firstItem = $response->json('periods.0');
        $this->assertArrayHasKey('kode_periode', $firstItem);
        $this->assertArrayHasKey('keterangan_musim', $firstItem);
        $this->assertArrayHasKey('label_singkat', $firstItem);
    }

    public function test_search_periods_by_label_name(): void
    {
        Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
        ]);

        Periode::create([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
        ]);

        Periode::create([
            'nama' => 'Maret 2026',
            'tahun' => 2026,
            'bulan' => 3,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=Januari');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('periods'));
        $this->assertEquals('Januari 2026', $response->json('periods.0.nama'));
    }

    public function test_search_periods_by_code_format(): void
    {
        Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
        ]);

        Periode::create([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
        ]);

        // Cari dengan format YYYY-MM
        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=2026-02');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('periods'));
        $this->assertEquals('Februari 2026', $response->json('periods.0.nama'));
        $this->assertEquals('2026-02', $response->json('periods.0.kode_periode'));
    }

    public function test_filter_periods_by_year(): void
    {
        Periode::create([
            'nama' => 'Desember 2025',
            'tahun' => 2025,
            'bulan' => 12,
        ]);

        Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
        ]);

        Periode::create([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
        ]);

        // Filter hanya tahun 2025
        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods?year=2025');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('periods'));
        $this->assertEquals('Desember 2025', $response->json('periods.0.nama'));
        $this->assertEquals(2025, $response->json('periods.0.tahun'));
    }

    public function test_combined_search_and_year_filter(): void
    {
        Periode::create([
            'nama' => 'Maret 2025',
            'tahun' => 2025,
            'bulan' => 3,
        ]);

        Periode::create([
            'nama' => 'Maret 2026',
            'tahun' => 2026,
            'bulan' => 3,
        ]);

        Periode::create([
            'nama' => 'April 2026',
            'tahun' => 2026,
            'bulan' => 4,
        ]);

        // Search "Maret" dan filter year "2026"
        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=Maret&year=2026');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('periods'));
        $this->assertEquals('Maret 2026', $response->json('periods.0.nama'));
        $this->assertEquals(2026, $response->json('periods.0.tahun'));
    }

    public function test_search_periods_not_found_returns_empty_list_gracefully(): void
    {
        Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=PeriodeTidakAda999');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('periods'));
        $this->assertEquals(0, $response->json('pagination.total'));
    }

    public function test_period_detail_endpoint_returns_complete_data(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Purwokerto Selatan',
            'kode' => '330202',
        ]);

        $period = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
            'sumber_data' => 'Dinkes Banyumas Resmi',
            'status_kelengkapan' => 'Lengkap (27 Kecamatan)',
            'keterangan' => 'Observasi awal tahun 2026',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 14,
            'jumlah_meninggal' => 1,
            'incidence_rate' => 12.5,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/admin/periods/{$period->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'period' => [
                    'id' => $period->id,
                    'nama' => 'Januari 2026',
                    'kode_periode' => '2026-01',
                    'tahun' => 2026,
                    'bulan' => 1,
                    'bulan_nama' => 'Januari',
                    'is_published' => true,
                    'status_publikasi_label' => 'Dipublikasikan',
                    'total_case_records' => 1,
                    'total_cases' => 14,
                    'total_deaths' => 1,
                ],
            ]);

        $this->assertNotEmpty($response->json('period.top_districts'));
        $this->assertEquals('Purwokerto Selatan', $response->json('period.top_districts.0.kecamatan_nama'));
    }

    public function test_period_detail_returns_404_when_not_found(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/periods/999999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_unauthenticated_guest_cannot_view_period_detail(): void
    {
        $period = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
        ]);

        $response = $this->getJson("/api/admin/periods/{$period->id}");
        $response->assertStatus(401);
    }

    // =========================================================================
    // SYSTEM FEATURE 26: MENGELOLA DATA PERIODE (MENAMBAH PERIODE)
    // =========================================================================

    public function test_unauthenticated_guest_cannot_create_period(): void
    {
        $response = $this->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 5,
            'nama' => 'Mei 2026',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_create_period(): void
    {
        $response = $this->actingAs($this->regularUser)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 5,
            'nama' => 'Mei 2026',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_create_period(): void
    {
        $response = $this->actingAs($this->inactiveAdmin)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 5,
            'nama' => 'Mei 2026',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_period_with_published_status(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 5,
            'nama' => 'Mei 2026',
            'label_singkat' => 'Mei 2026',
            'keterangan' => 'Periode pancaroba awal kemarau',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Periode pemantauan berhasil ditambahkan.',
                'period' => [
                    'nama' => 'Mei 2026',
                    'tahun' => 2026,
                    'bulan' => 5,
                    'kode_periode' => '2026-05',
                    'is_published' => true,
                    'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                    'status_publikasi_label' => 'Dipublikasikan',
                ],
            ]);

        $this->assertDatabaseHas('periodes', [
            'nama' => 'Mei 2026',
            'tahun' => 2026,
            'bulan' => 5,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Verifikasi periode berstatus published tersedia pada scopePublished
        $publishedCount = Periode::published()->where('nama', 'Mei 2026')->count();
        $this->assertEquals(1, $publishedCount);
    }

    public function test_admin_can_create_period_with_draft_status(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 6,
            'nama' => 'Juni 2026 (Internal)',
            'label_singkat' => 'Jun 2026',
            'keterangan' => 'Belum siap untuk publik',
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'period' => [
                    'nama' => 'Juni 2026 (Internal)',
                    'tahun' => 2026,
                    'bulan' => 6,
                    'kode_periode' => '2026-06',
                    'is_published' => false,
                    'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
                    'status_publikasi_label' => 'Draft / Internal',
                ],
            ]);

        $this->assertDatabaseHas('periodes', [
            'nama' => 'Juni 2026 (Internal)',
            'tahun' => 2026,
            'bulan' => 6,
            'is_published' => false,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        // Verifikasi periode berstatus draft tidak muncul pada scopePublished (filter publik terlindungi)
        $publishedCount = Periode::published()->where('nama', 'Juni 2026 (Internal)')->count();
        $this->assertEquals(0, $publishedCount);

        // Muncul pada scopeInternal
        $internalCount = Periode::internal()->where('nama', 'Juni 2026 (Internal)')->count();
        $this->assertEquals(1, $internalCount);
    }

    public function test_create_period_fails_when_required_fields_empty(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => '',
            'bulan' => '',
            'nama' => '',
            'status_publikasi' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun', 'bulan', 'nama', 'status_publikasi']);
    }

    public function test_create_period_fails_when_duplicate_year_and_month(): void
    {
        Periode::create([
            'nama' => 'Juli 2026 Asli',
            'tahun' => 2026,
            'bulan' => 7,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 7,
            'nama' => 'Juli 2026 Duplikat',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['bulan']);
    }

    public function test_create_period_fails_when_name_duplicate(): void
    {
        Periode::create([
            'nama' => 'Agustus 2026',
            'tahun' => 2026,
            'bulan' => 8,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => 2025, // Tahun berbeda tapi nama sama
            'bulan' => 8,
            'nama' => 'Agustus 2026',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama']);
    }

    public function test_newly_created_period_is_retrievable_via_index_search_and_show(): void
    {
        $responseCreate = $this->actingAs($this->admin)->postJson('/api/admin/periods', [
            'tahun' => 2026,
            'bulan' => 9,
            'nama' => 'September 2026 Verifikasi',
            'label_singkat' => 'Sep 2026',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $responseCreate->assertStatus(201);
        $newId = $responseCreate->json('period.id');

        // 1. Verifikasi pencarian index
        $responseIndex = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=September');
        $responseIndex->assertStatus(200);
        $this->assertCount(1, $responseIndex->json('periods'));
        $this->assertEquals('September 2026 Verifikasi', $responseIndex->json('periods.0.nama'));

        // 2. Verifikasi endpoint show
        $responseShow = $this->actingAs($this->admin)->getJson("/api/admin/periods/{$newId}");
        $responseShow->assertStatus(200);
        $this->assertEquals('September 2026 Verifikasi', $responseShow->json('period.nama'));
        $this->assertEquals('2026-09', $responseShow->json('period.kode_periode'));
    }

    // =========================================================================
    // SYSTEM FEATURE 27: Mengelola Data Periode (Mengedit Periode)
    // =========================================================================

    public function test_unauthenticated_guest_cannot_update_period(): void
    {
        $period = Periode::create([
            'nama' => 'Oktober 2026',
            'tahun' => 2026,
            'bulan' => 10,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2026,
            'bulan' => 10,
            'nama' => 'Oktober 2026 Diperbarui',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_update_period(): void
    {
        $period = Periode::create([
            'nama' => 'November 2026',
            'tahun' => 2026,
            'bulan' => 11,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->regularUser)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2026,
            'bulan' => 11,
            'nama' => 'November 2026 Diperbarui',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_update_period(): void
    {
        $period = Periode::create([
            'nama' => 'Desember 2026',
            'tahun' => 2026,
            'bulan' => 12,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->inactiveAdmin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2026,
            'bulan' => 12,
            'nama' => 'Desember 2026 Diperbarui',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_period_successfully_with_same_id(): void
    {
        $period = Periode::create([
            'nama' => 'Januari 2027 Lama',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
            'keterangan' => 'Keterangan lama',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $originalId = $period->id;

        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$originalId}", [
            'tahun' => 2027,
            'bulan' => 1,
            'nama' => 'Januari 2027 Baru',
            'label_singkat' => 'Jan 2027',
            'keterangan' => 'Keterangan diperbarui untuk tahun 2027.',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Informasi periode berhasil diperbarui.',
                'period' => [
                    'id' => $originalId,
                    'tahun' => 2027,
                    'bulan' => 1,
                    'kode_periode' => '2027-01',
                    'nama' => 'Januari 2027 Baru',
                    'label_singkat' => 'Jan 2027',
                    'is_published' => true,
                    'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                ],
            ]);

        // Verifikasi bahwa rekaman yang sama diperbarui di database (bukan rekaman baru)
        $this->assertDatabaseHas('periodes', [
            'id' => $originalId,
            'nama' => 'Januari 2027 Baru',
            'tahun' => 2027,
            'bulan' => 1,
            'keterangan' => 'Keterangan diperbarui untuk tahun 2027.',
        ]);

        $this->assertDatabaseMissing('periodes', [
            'nama' => 'Januari 2027 Lama',
        ]);
    }

    public function test_admin_can_update_period_status_from_published_to_draft(): void
    {
        $period = Periode::create([
            'nama' => 'Februari 2027 Publik',
            'tahun' => 2027,
            'bulan' => 2,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2027,
            'bulan' => 2,
            'nama' => 'Februari 2027 Publik',
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'period' => [
                    'is_published' => false,
                    'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
                    'status_publikasi_label' => 'Draft / Internal',
                ],
            ]);

        // Scope published harus 0 (tersembunyi dari publik)
        $this->assertEquals(0, Periode::published()->where('id', $period->id)->count());
        $this->assertEquals(1, Periode::internal()->where('id', $period->id)->count());
    }

    public function test_admin_can_update_period_status_from_draft_to_published(): void
    {
        $period = Periode::create([
            'nama' => 'Maret 2027 Internal',
            'tahun' => 2027,
            'bulan' => 3,
            'tipe_periode' => 'monthly',
            'is_published' => false,
            'status_publikasi' => 'INTERNAL_BELUM_DIIZINKAN',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2027,
            'bulan' => 3,
            'nama' => 'Maret 2027 Internal',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'period' => [
                    'is_published' => true,
                    'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                    'status_publikasi_label' => 'Dipublikasikan',
                ],
            ]);

        // Scope published harus 1 (tersedia untuk WebGIS & publik)
        $this->assertEquals(1, Periode::published()->where('id', $period->id)->count());
    }

    public function test_update_period_fails_when_required_fields_empty(): void
    {
        $period = Periode::create([
            'nama' => 'April 2027',
            'tahun' => 2027,
            'bulan' => 4,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => '',
            'bulan' => '',
            'nama' => '',
            'status_publikasi' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tahun', 'bulan', 'nama', 'status_publikasi']);
    }

    public function test_update_period_fails_when_duplicate_year_and_month_with_another_period(): void
    {
        $periodA = Periode::create([
            'nama' => 'Mei 2027',
            'tahun' => 2027,
            'bulan' => 5,
            'tipe_periode' => 'monthly',
        ]);

        $periodB = Periode::create([
            'nama' => 'Juni 2027',
            'tahun' => 2027,
            'bulan' => 6,
            'tipe_periode' => 'monthly',
        ]);

        // Coba ubah periodB agar memiliki tahun & bulan yang sama dengan periodA
        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$periodB->id}", [
            'tahun' => 2027,
            'bulan' => 5, // Bentrok dengan periodA
            'nama' => 'Juni 2027 Baru',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['bulan']);
    }

    public function test_update_period_fails_when_name_duplicate_with_another_period(): void
    {
        $periodA = Periode::create([
            'nama' => 'Juli 2027 Khusus',
            'tahun' => 2027,
            'bulan' => 7,
            'tipe_periode' => 'monthly',
        ]);

        $periodB = Periode::create([
            'nama' => 'Agustus 2027 Normal',
            'tahun' => 2027,
            'bulan' => 8,
            'tipe_periode' => 'monthly',
        ]);

        // Coba ubah nama periodB agar sama dengan periodA
        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$periodB->id}", [
            'tahun' => 2027,
            'bulan' => 8,
            'nama' => 'Juli 2027 Khusus', // Bentrok dengan periodA
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama']);
    }

    public function test_update_period_allows_keeping_own_name_and_year_month(): void
    {
        $period = Periode::create([
            'nama' => 'September 2027 Sendiri',
            'tahun' => 2027,
            'bulan' => 9,
            'tipe_periode' => 'monthly',
            'keterangan' => 'Catatan awal',
        ]);

        // Update keterangan tanpa mengubah tahun, bulan, atau nama
        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2027,
            'bulan' => 9,
            'nama' => 'September 2027 Sendiri',
            'keterangan' => 'Catatan diperbarui dengan sukses.',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'period' => [
                    'id' => $period->id,
                    'nama' => 'September 2027 Sendiri',
                    'keterangan' => 'Catatan diperbarui dengan sukses.',
                ],
            ]);
    }

    public function test_update_period_returns_404_when_period_not_found(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/admin/periods/999999', [
            'tahun' => 2027,
            'bulan' => 1,
            'nama' => 'Periode Fiktif',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Data periode waktu tidak ditemukan dalam sistem atau sudah dihapus.',
            ]);
    }

    public function test_update_period_preserves_associated_cases_foreign_key(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Purwokerto Timur',
            'kode' => '330211',
            'luas_wilayah' => 20.5,
            'jumlah_penduduk' => 50000,
        ]);

        $period = Periode::create([
            'nama' => 'Oktober 2027 Relasi',
            'tahun' => 2027,
            'bulan' => 10,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Buat data kasus agregat yang terikat dengan foreign key periode_id
        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 35,
            'jumlah_meninggal' => 2,
            'jumlah_sembuh' => 33,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Lakukan update pada periode
        $response = $this->actingAs($this->admin)->putJson("/api/admin/periods/{$period->id}", [
            'tahun' => 2027,
            'bulan' => 10,
            'nama' => 'Oktober 2027 Terverifikasi Dinkes',
            'label_singkat' => 'Okt 2027',
            'keterangan' => 'Peralihan cuaca',
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'period' => [
                    'id' => $period->id,
                    'total_cases' => 35,
                    'total_deaths' => 2,
                    'total_case_records' => 1,
                ],
            ]);

        // Pastikan relasi foreign key pada baris kasus DBD tidak terputus atau berubah
        $this->assertDatabaseHas('kasus_agregats', [
            'id' => $case->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 35,
        ]);
    }

    // =========================================================================
    // SYSTEM FEATURE 28: Mengelola Data Periode (Menghapus Periode)
    // =========================================================================

    public function test_unauthenticated_guest_cannot_delete_period(): void
    {
        $period = Periode::create([
            'nama' => 'November 2027 Hapus',
            'tahun' => 2027,
            'bulan' => 11,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->deleteJson("/api/admin/periods/{$period->id}");
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_delete_period(): void
    {
        $period = Periode::create([
            'nama' => 'Desember 2027 Hapus',
            'tahun' => 2027,
            'bulan' => 12,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->regularUser)->deleteJson("/api/admin/periods/{$period->id}");
        $response->assertStatus(403);
    }

    public function test_inactive_admin_cannot_delete_period(): void
    {
        $period = Periode::create([
            'nama' => 'Januari 2028 Hapus',
            'tahun' => 2028,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
        ]);

        $response = $this->actingAs($this->inactiveAdmin)->deleteJson("/api/admin/periods/{$period->id}");
        $response->assertStatus(403);
    }

    public function test_admin_can_delete_period_without_associated_cases(): void
    {
        $period = Periode::create([
            'nama' => 'Februari 2028 Tanpa Kasus',
            'tahun' => 2028,
            'bulan' => 2,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/periods/{$period->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Data periode pemantauan berhasil dihapus.',
                'deleted_id' => $period->id,
                'deleted_nama' => 'Februari 2028 Tanpa Kasus',
            ]);

        $this->assertDatabaseMissing('periodes', [
            'id' => $period->id,
        ]);
    }

    public function test_admin_cannot_delete_period_with_associated_cases(): void
    {
        $district = Kecamatan::create([
            'nama' => 'Purwokerto Barat',
            'kode' => '330212',
            'luas_wilayah' => 15.5,
            'jumlah_penduduk' => 45000,
        ]);

        $period = Periode::create([
            'nama' => 'Maret 2028 Dengan Kasus',
            'tahun' => 2028,
            'bulan' => 3,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $case = KasusAgregat::create([
            'kecamatan_id' => $district->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 20,
            'jumlah_meninggal' => 1,
            'jumlah_sembuh' => 19,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/periods/{$period->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'linked_cases_count' => 1,
            ]);

        // Verifikasi bahwa periode dan data kasus TIDAK terhapus
        $this->assertDatabaseHas('periodes', [
            'id' => $period->id,
            'nama' => 'Maret 2028 Dengan Kasus',
        ]);

        $this->assertDatabaseHas('kasus_agregats', [
            'id' => $case->id,
            'periode_id' => $period->id,
            'jumlah_kasus' => 20,
        ]);
    }

    public function test_delete_period_returns_404_when_period_not_found(): void
    {
        $response = $this->actingAs($this->admin)->deleteJson('/api/admin/periods/999999');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Data periode waktu tidak ditemukan dalam sistem atau sudah dihapus.',
            ]);
    }

    public function test_deleted_period_no_longer_retrievable_via_index_or_show(): void
    {
        $period = Periode::create([
            'nama' => 'April 2028 Terhapus',
            'tahun' => 2028,
            'bulan' => 4,
            'tipe_periode' => 'monthly',
        ]);

        // Hapus
        $responseDelete = $this->actingAs($this->admin)->deleteJson("/api/admin/periods/{$period->id}");
        $responseDelete->assertStatus(200);

        // Coba akses via show -> 404
        $responseShow = $this->actingAs($this->admin)->getJson("/api/admin/periods/{$period->id}");
        $responseShow->assertStatus(404);

        // Coba cari di index -> tidak ditemukan
        $responseIndex = $this->actingAs($this->admin)->getJson('/api/admin/periods?search=April 2028 Terhapus');
        $responseIndex->assertStatus(200);
        $this->assertCount(0, $responseIndex->json('periods'));
    }
}
