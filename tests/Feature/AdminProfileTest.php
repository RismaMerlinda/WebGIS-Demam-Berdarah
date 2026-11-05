<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminProfileTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(string $name = 'Administrator Banyumas', string $email = 'admin-feature9@banyumas.go.id', string $role = 'admin', bool $isActive = true): User
    {
        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('PasswordAman123!'),
            'role' => $role,
            'is_active' => $isActive,
        ]);
    }

    /**
     * Skenario 1: Pengguna tamu tanpa autentikasi ditolak mengakses API profil admin.
     */
    public function test_unauthenticated_guest_cannot_access_admin_profile(): void
    {
        $response = $this->getJson('/api/admin/profile');

        $response->assertStatus(401);
    }

    /**
     * Skenario 2: Pengguna reguler (non-admin) ditolak mengakses profil admin.
     */
    public function test_non_admin_user_cannot_access_admin_profile(): void
    {
        $user = User::create([
            'name' => 'Pengguna Publik',
            'email' => 'user-publik@example.com',
            'password' => Hash::make('PasswordAman123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->getJson('/api/admin/profile');

        $response->assertStatus(403);
    }

    /**
     * Skenario 3: Administrator non-aktif ditolak mengakses profil admin.
     */
    public function test_inactive_admin_cannot_access_admin_profile(): void
    {
        $inactiveAdmin = $this->createAdmin('Admin Nonaktif', 'inactive@banyumas.go.id', 'admin', false);

        $response = $this->actingAs($inactiveAdmin)->getJson('/api/admin/profile');

        $response->assertStatus(403);
    }

    /**
     * Skenario 4: Administrator aktif dapat mengakses profil dengan data akurat dari database.
     */
    public function test_authenticated_admin_can_access_own_profile(): void
    {
        $admin = $this->createAdmin('Budi Santoso, S.Kom', 'budi.santoso@banyumas.go.id', 'super_admin');

        $response = $this->actingAs($admin)->getJson('/api/admin/profile');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'profile' => [
                    'id' => $admin->id,
                    'name' => 'Budi Santoso, S.Kom',
                    'username' => 'budi.santoso',
                    'email' => 'budi.santoso@banyumas.go.id',
                    'role' => 'super_admin',
                    'role_label' => 'Super Administrator',
                    'is_active' => true,
                    'agency' => null, // Belum diisi di database
                    'phone' => null,  // Belum diisi di database
                    'bio' => null,    // Belum diisi di database
                ],
            ]);

        $this->assertNotNull($response->json('profile.created_at_formatted'));
    }

    /**
     * Skenario 5: Endpoint selalu mengembalikan profil pengguna yang sedang login, bukan akun lain.
     */
    public function test_profile_endpoint_strictly_returns_currently_authenticated_admin(): void
    {
        $adminA = $this->createAdmin('Admin A', 'admin.a@banyumas.go.id', 'admin');
        $adminB = $this->createAdmin('Admin B', 'admin.b@banyumas.go.id', 'super_admin');

        // Login sebagai Admin A
        $responseA = $this->actingAs($adminA)->getJson('/api/admin/profile');
        $responseA->assertStatus(200);
        $this->assertEquals($adminA->id, $responseA->json('profile.id'));
        $this->assertEquals('admin.a@banyumas.go.id', $responseA->json('profile.email'));

        // Login sebagai Admin B
        $responseB = $this->actingAs($adminB)->getJson('/api/admin/profile');
        $responseB->assertStatus(200);
        $this->assertEquals($adminB->id, $responseB->json('profile.id'));
        $this->assertEquals('admin.b@banyumas.go.id', $responseB->json('profile.email'));
    }
}

