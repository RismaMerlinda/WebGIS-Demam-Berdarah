<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Administrator Uji',
            'username' => 'admin_uji',
            'email' => 'admin.uji@banyumas.go.id',
            'password' => Hash::make('PasswordAman123!'),
            'role' => 'admin',
            'is_active' => true,
            'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            'phone' => '081234567890',
            'bio' => 'Koordinator surveilans epidemiologi DBD.',
        ], $attributes));
    }

    /**
     * Skenario 1: Tamu (Guest tanpa login) tidak dapat memperbarui profil.
     */
    public function test_unauthenticated_guest_cannot_update_admin_profile(): void
    {
        $response = $this->putJson('/api/admin/profile', [
            'name' => 'Perubahan Ilegal',
            'username' => 'ilegal_user',
            'email' => 'ilegal@example.com',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Skenario 2: Pengguna reguler non-admin ditolak saat mencoba memperbarui profil admin.
     */
    public function test_non_admin_user_cannot_update_admin_profile(): void
    {
        $user = User::create([
            'name' => 'Pengguna Biasa',
            'username' => 'user_biasa',
            'email' => 'user@example.com',
            'password' => Hash::make('PasswordAman123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->putJson('/api/admin/profile', [
            'name' => 'Nama Baru',
            'username' => 'user_biasa',
            'email' => 'user@example.com',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Skenario Normal: Administrator aktif berhasil memperbarui seluruh informasi profil.
     */
    public function test_authenticated_admin_can_update_profile_successfully(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'name' => 'Rian Hidayat, S.Kep',
            'username' => 'rian.hidayat',
            'email' => 'rian.hidayat@banyumas.go.id',
            'agency' => 'Bidang P2P Dinkes Banyumas',
            'phone' => '+62 821-3456-7890',
            'bio' => 'Petugas teknis pemantauan wilayah fokus dan pengendalian vektor.',
        ];

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Perubahan profil administrator berhasil disimpan.',
                'profile' => [
                    'id' => $admin->id,
                    'name' => 'Rian Hidayat, S.Kep',
                    'username' => 'rian.hidayat',
                    'email' => 'rian.hidayat@banyumas.go.id',
                    'agency' => 'Bidang P2P Dinkes Banyumas',
                    'phone' => '+62 821-3456-7890',
                    'bio' => 'Petugas teknis pemantauan wilayah fokus dan pengendalian vektor.',
                    'role' => 'admin',
                    'role_label' => 'Administrator',
                ],
            ]);

        // Verifikasi perubahan tersimpan di database MySQL / SQLite
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'name' => 'Rian Hidayat, S.Kep',
            'username' => 'rian.hidayat',
            'email' => 'rian.hidayat@banyumas.go.id',
            'agency' => 'Bidang P2P Dinkes Banyumas',
            'phone' => '+62 821-3456-7890',
            'bio' => 'Petugas teknis pemantauan wilayah fokus dan pengendalian vektor.',
        ]);
    }

    /**
     * Skenario: Administrator dapat menyimpan kembali username dan email miliknya sendiri tanpa error duplikat.
     */
    public function test_admin_can_update_profile_keeping_own_email_and_username(): void
    {
        $admin = $this->createAdmin([
            'username' => 'admin_tetap',
            'email' => 'tetap@banyumas.go.id',
        ]);

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', [
            'name' => 'Nama Baru Saja',
            'username' => 'admin_tetap',
            'email' => 'tetap@banyumas.go.id',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'name' => 'Nama Baru Saja',
        ]);
    }

    /**
     * Skenario Gagal 1: Validasi kolom wajib (nama, username, email kosong).
     */
    public function test_update_profile_fails_when_required_fields_empty(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', [
            'name' => '',
            'username' => '',
            'email' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'username', 'email']);
    }

    /**
     * Skenario Gagal 2: Format email tidak valid ditolak.
     */
    public function test_update_profile_fails_with_invalid_email_format(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', [
            'name' => 'Admin Banyumas',
            'username' => 'admin.bms',
            'email' => 'bukan-email-valid',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Skenario Gagal 3: Format username mengandung karakter ilegal ditolak.
     */
    public function test_update_profile_fails_with_invalid_username_characters(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', [
            'name' => 'Admin Banyumas',
            'username' => 'admin spasi illegal!',
            'email' => 'admin@banyumas.go.id',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    /**
     * Skenario Gagal 4: Username atau email yang sudah digunakan oleh akun lain ditolak.
     */
    public function test_update_profile_fails_when_username_or_email_already_taken(): void
    {
        $admin1 = $this->createAdmin([
            'username' => 'admin_pertama',
            'email' => 'pertama@banyumas.go.id',
        ]);

        $admin2 = $this->createAdmin([
            'username' => 'admin_kedua',
            'email' => 'kedua@banyumas.go.id',
        ]);

        // Admin 2 mencoba memakai email dan username milik Admin 1
        $response = $this->actingAs($admin2)->putJson('/api/admin/profile', [
            'name' => 'Admin Kedua Berubah',
            'username' => 'admin_pertama',
            'email' => 'pertama@banyumas.go.id',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username', 'email']);
    }

    /**
     * Skenario Keamanan: Peran (role) dan kata sandi (password) terlindungi dari manipulasi payload.
     */
    public function test_admin_cannot_alter_role_or_password_via_profile_update(): void
    {
        $oldPasswordHash = Hash::make('PasswordLama123!');
        $admin = $this->createAdmin([
            'role' => 'admin',
            'password' => $oldPasswordHash,
        ]);

        $response = $this->actingAs($admin)->putJson('/api/admin/profile', [
            'name' => 'Admin Bertahan',
            'username' => 'admin.bertahan',
            'email' => 'bertahan@banyumas.go.id',
            'role' => 'super_admin',      // Upaya eskalasi hak akses
            'password' => 'PasswordBaru999!', // Upaya ganti password
        ]);

        $response->assertStatus(200);

        $admin->refresh();
        $this->assertEquals('admin', $admin->role);
        $this->assertEquals($oldPasswordHash, $admin->password);
    }
}

