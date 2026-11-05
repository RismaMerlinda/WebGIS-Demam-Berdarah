<?php

namespace Tests\Feature;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(string $role = 'admin', bool $isActive = true): User
    {
        return User::create([
            'name' => 'Administrator Test',
            'email' => 'admin-feature8@banyumas.go.id',
            'password' => Hash::make('PasswordAman123!'),
            'role' => $role,
            'is_active' => $isActive,
        ]);
    }

    /**
     * Skenario Gagal 1: Tamu (Guest tanpa login) tidak dapat mengakses API summary dashboard admin.
     */
    public function test_unauthenticated_guest_cannot_access_admin_dashboard_summary(): void
    {
        $response = $this->getJson('/api/admin/dashboard/summary');

        // Middleware auth me-reject permintaan guest
        $response->assertStatus(401);
    }

    /**
     * Skenario Gagal 2: Pengguna non-admin ditolak saat mengakses endpoint admin.
     */
    public function test_non_admin_user_cannot_access_admin_dashboard_summary(): void
    {
        $user = User::create([
            'name' => 'Pengguna Biasa',
            'email' => 'user-biasa@example.com',
            'password' => Hash::make('PasswordAman123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->getJson('/api/admin/dashboard/summary');

        $response->assertStatus(403);
    }

    /**
     * Skenario Gagal 3: Admin yang statusnya non-aktif (is_active = false) ditolak.
     */
    public function test_inactive_admin_cannot_access_admin_dashboard_summary(): void
    {
        $inactiveAdmin = $this->createAdmin('admin', false);

        $response = $this->actingAs($inactiveAdmin)->getJson('/api/admin/dashboard/summary');

        $response->assertStatus(403);
    }

    /**
     * Skenario Normal 1: Admin aktif berhasil mengakses ringkasan master data dan tabel kasus.
     */
    public function test_authenticated_admin_can_access_dashboard_summary_with_accurate_counts(): void
    {
        $admin = $this->createAdmin();

        // Siapkan master data
        $kecamatan1 = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 102.66,
            'jumlah_penduduk' => 52000,
        ]);

        $kecamatan2 = Kecamatan::create([
            'kode' => '330202',
            'nama' => 'Wangon',
            'luas_wilayah' => 60.78,
            'jumlah_penduduk' => 84000,
        ]);

        $periode1 = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $periode2 = Periode::create([
            'nama' => 'Februari 2026',
            'tahun' => 2026,
            'bulan' => 2,
            'tipe_periode' => 'monthly',
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        // Catatan kasus (3 records)
        KasusAgregat::create([
            'kecamatan_id' => $kecamatan1->id,
            'periode_id' => $periode1->id,
            'jumlah_kasus' => 10,
            'jumlah_meninggal' => 1,
            'jumlah_penduduk' => 52000,
            'incidence_rate' => 19.23,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $kecamatan2->id,
            'periode_id' => $periode1->id,
            'jumlah_kasus' => 5,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 84000,
            'incidence_rate' => 5.95,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        KasusAgregat::create([
            'kecamatan_id' => $kecamatan1->id,
            'periode_id' => $periode2->id,
            'jumlah_kasus' => 2,
            'jumlah_meninggal' => 0,
            'jumlah_penduduk' => 52000,
            'incidence_rate' => 3.85,
            'is_published' => true,
            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'summary' => [
                    'total_kasus' => 3, // Jumlah catatan kasus yang tersimpan (bukan sum(10+5+2=17))
                    'total_kecamatan' => 2,
                    'total_periode' => 2,
                    'total_pengguna' => 1,
                ],
            ]);

        // Verifikasi tabel kasus terbaru
        $recentCases = $response->json('recent_cases.data');
        $this->assertCount(3, $recentCases);
        $this->assertArrayHasKey('kecamatan_nama', $recentCases[0]);
        $this->assertArrayHasKey('periode_nama', $recentCases[0]);
        $this->assertArrayHasKey('jumlah_kasus', $recentCases[0]);
        $this->assertArrayHasKey('incidence_rate_formatted', $recentCases[0]);
        $this->assertArrayHasKey('updated_at_formatted', $recentCases[0]);
    }

    /**
     * Skenario Urutan: Tabel diurutkan berdasarkan tanggal pembaruan (updated_at) terbaru.
     */
    public function test_recent_cases_are_ordered_by_updated_at_desc(): void
    {
        $admin = $this->createAdmin();

        $kecamatan1 = Kecamatan::create([
            'kode' => '330201',
            'nama' => 'Lumbir',
            'luas_wilayah' => 100,
            'jumlah_penduduk' => 50000,
        ]);

        $kecamatan2 = Kecamatan::create([
            'kode' => '330202',
            'nama' => 'Wangon',
            'luas_wilayah' => 60,
            'jumlah_penduduk' => 60000,
        ]);

        $periode = Periode::create([
            'nama' => 'Januari 2026',
            'tahun' => 2026,
            'bulan' => 1,
            'tipe_periode' => 'monthly',
        ]);

        $caseOld = KasusAgregat::create([
            'kecamatan_id' => $kecamatan1->id,
            'periode_id' => $periode->id,
            'jumlah_kasus' => 3,
            'jumlah_penduduk' => 50000,
            'incidence_rate' => 6.00,
        ]);
        $caseOld->updated_at = now()->subDays(5);
        $caseOld->saveQuietly();

        $caseNew = KasusAgregat::create([
            'kecamatan_id' => $kecamatan2->id,
            'periode_id' => $periode->id,
            'jumlah_kasus' => 12,
            'jumlah_penduduk' => 60000,
            'incidence_rate' => 20.00,
        ]);
        $caseNew->updated_at = now();
        $caseNew->saveQuietly();

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard/summary');

        $response->assertStatus(200);
        $data = $response->json('recent_cases.data');
        $this->assertEquals($caseNew->id, $data[0]['id']);
        $this->assertEquals($caseOld->id, $data[1]['id']);
    }

    /**
     * Skenario Empty State: Saat database belum memiliki data kasus, respon tetap sukses dan empty state informatif.
     */
    public function test_dashboard_summary_handles_empty_database_gracefully(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'summary' => [
                    'total_kasus' => 0,
                    'total_kecamatan' => 0,
                    'total_periode' => 0,
                    'total_pengguna' => 1,
                ],
                'recent_cases' => [
                    'data' => [],
                    'total' => 0,
                ],
            ]);
    }
}
