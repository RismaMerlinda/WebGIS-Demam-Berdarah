<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'name' => 'Administrator Dinkes',
            'username' => 'admin_dinkes',
            'email' => 'admin@banyumas.go.id',
            'password' => Hash::make('AdminSecret123!'),
            'role' => 'admin',
            'is_active' => true,
            'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            'phone' => '081234567890',
            'bio' => 'Koordinator surveilans.',
        ], $overrides));
    }

    /**
     * Test 1: Unauthenticated guest cannot access user management endpoint.
     */
    public function test_unauthenticated_guest_cannot_access_user_management(): void
    {
        $response = $this->getJson('/api/admin/users');
        $response->assertStatus(401);
    }

    /**
     * Test 2: Non-admin user cannot access user management endpoint.
     */
    public function test_non_admin_user_cannot_access_user_management(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($regularUser)->getJson('/api/admin/users');
        $response->assertStatus(403);
    }

    /**
     * Test 3: Inactive admin cannot access user management endpoint.
     */
    public function test_inactive_admin_cannot_access_user_management(): void
    {
        $inactiveAdmin = $this->createAdmin([
            'is_active' => false,
        ]);

        $response = $this->actingAs($inactiveAdmin)->getJson('/api/admin/users');
        $response->assertStatus(403);
    }

    /**
     * Test 4: Authenticated admin can retrieve master data of users.
     */
    public function test_authenticated_admin_can_retrieve_users_list(): void
    {
        $admin = $this->createAdmin();

        User::factory()->create([
            'name' => 'Budi Santoso',
            'username' => 'budi_san',
            'email' => 'budi@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
            'agency' => 'Puskesmas Purwokerto Timur',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/users');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Data pengguna berhasil dimuat.',
        ]);
        $response->assertJsonStructure([
            'success',
            'message',
            'users' => [
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'username',
                        'email',
                        'agency',
                        'phone',
                        'role',
                        'role_label',
                        'is_active',
                        'status_label',
                        'created_at',
                        'created_at_formatted',
                    ],
                ],
                'current_page',
                'last_page',
                'per_page',
                'total',
            ],
            'summary' => [
                'total_users',
                'total_admins',
                'total_regular_users',
                'total_active',
                'total_inactive',
            ],
        ]);

        $this->assertEquals(2, $response->json('users.total'));
    }

    /**
     * Test 5: Passwords and password hashes are never exposed.
     */
    public function test_passwords_are_never_exposed_in_response(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->getJson('/api/admin/users');
        $response->assertStatus(200);

        $firstUser = $response->json('users.data.0');
        $this->assertArrayNotHasKey('password', $firstUser);
        $this->assertArrayNotHasKey('remember_token', $firstUser);
        $this->assertStringNotContainsString('AdminSecret123!', $response->getContent());
    }

    /**
     * Test 6: Search by full name successfully filters users.
     */
    public function test_search_by_name_filters_users(): void
    {
        $admin = $this->createAdmin(['name' => 'Dr. Hendra Wijaya']);
        User::factory()->create(['name' => 'Siti Nurhaliza', 'username' => 'siti_n', 'email' => 'siti@mail.id']);
        User::factory()->create(['name' => 'Ahmad Dahlan', 'username' => 'ahmad_d', 'email' => 'ahmad@mail.id']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=Nurhaliza');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('users.total'));
        $this->assertEquals('Siti Nurhaliza', $response->json('users.data.0.name'));
    }

    /**
     * Test 7: Search by username successfully filters users.
     */
    public function test_search_by_username_filters_users(): void
    {
        $admin = $this->createAdmin(['username' => 'super_admin_banyumas']);
        User::factory()->create(['name' => 'User Satu', 'username' => 'petugas_surveilans_01', 'email' => 'user1@mail.id']);
        User::factory()->create(['name' => 'User Dua', 'username' => 'petugas_lapangan_02', 'email' => 'user2@mail.id']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=surveilans');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('users.total'));
        $this->assertEquals('petugas_surveilans_01', $response->json('users.data.0.username'));
    }

    /**
     * Test 8: Search by email successfully filters users.
     */
    public function test_search_by_email_filters_users(): void
    {
        $admin = $this->createAdmin(['email' => 'admin@dinkes.banyumaskab.go.id']);
        User::factory()->create(['name' => 'Petugas Dinkes', 'email' => 'surveilans_dinkes@banyumas.go.id']);
        User::factory()->create(['name' => 'Warga Masyarakat', 'email' => 'warga_banyumas@gmail.com']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=gmail.com');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('users.total'));
        $this->assertEquals('warga_banyumas@gmail.com', $response->json('users.data.0.email'));
    }

    /**
     * Test 9: Filter by role Admin returns only admins.
     */
    public function test_filter_by_role_admin(): void
    {
        $admin = $this->createAdmin(['role' => 'admin']);
        User::factory()->create(['name' => 'Super Admin', 'role' => 'super_admin']);
        User::factory()->create(['name' => 'Regular User 1', 'role' => 'user']);
        User::factory()->create(['name' => 'Regular User 2', 'role' => 'user']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?role=admin');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('users.total'));
        foreach ($response->json('users.data') as $u) {
            $this->assertContains($u['role'], ['admin', 'super_admin']);
        }
    }

    /**
     * Test 10: Filter by role User returns only regular users.
     */
    public function test_filter_by_role_user(): void
    {
        $admin = $this->createAdmin(['role' => 'admin']);
        User::factory()->create(['name' => 'Regular User 1', 'role' => 'user']);
        User::factory()->create(['name' => 'Regular User 2', 'role' => 'user']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?role=user');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('users.total'));
        foreach ($response->json('users.data') as $u) {
            $this->assertEquals('user', $u['role']);
        }
    }

    /**
     * Test 11: Filter by status active returns only active users.
     */
    public function test_filter_by_status_active(): void
    {
        $admin = $this->createAdmin(['is_active' => true]);
        User::factory()->create(['name' => 'User Aktif', 'is_active' => true]);
        User::factory()->create(['name' => 'User Nonaktif', 'is_active' => false]);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?status=active');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('users.total'));
        foreach ($response->json('users.data') as $u) {
            $this->assertTrue($u['is_active']);
        }
    }

    /**
     * Test 12: Filter by status inactive returns only inactive users.
     */
    public function test_filter_by_status_inactive(): void
    {
        $admin = $this->createAdmin(['is_active' => true]);
        User::factory()->create(['name' => 'User Nonaktif 1', 'is_active' => false]);
        User::factory()->create(['name' => 'User Nonaktif 2', 'is_active' => false]);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?status=inactive');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('users.total'));
        foreach ($response->json('users.data') as $u) {
            $this->assertFalse($u['is_active']);
        }
    }

    /**
     * Test 13: Combination of search and multiple filters work simultaneously.
     */
    public function test_combined_search_and_filter(): void
    {
        $admin = $this->createAdmin();

        // Target match: name contains "Purwokerto", role is "user", status is "active"
        User::factory()->create([
            'name' => 'Puskesmas Purwokerto Barat',
            'role' => 'user',
            'is_active' => true,
        ]);

        // Non match 1: matches name, but is inactive
        User::factory()->create([
            'name' => 'Puskesmas Purwokerto Selatan',
            'role' => 'user',
            'is_active' => false,
        ]);

        // Non match 2: matches name and active, but is admin
        User::factory()->create([
            'name' => 'Admin Purwokerto Utara',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=Purwokerto&role=user&status=active');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('users.total'));
        $this->assertEquals('Puskesmas Purwokerto Barat', $response->json('users.data.0.name'));
    }

    /**
     * Test 14: Search with non-existent keyword returns empty list gracefully.
     */
    public function test_search_not_found_returns_empty_state_gracefully(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=KeywordPalingAcakYangTidakMungkinAda12345');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('users.total'));
        $this->assertEmpty($response->json('users.data'));
    }

    /**
     * Test 15: Pagination works correctly.
     */
    public function test_pagination_returns_expected_pages(): void
    {
        $admin = $this->createAdmin();
        User::factory()->count(14)->create(); // total 15 users with admin

        $page1 = $this->actingAs($admin)->getJson('/api/admin/users?per_page=10&page=1');
        $page1->assertStatus(200);
        $this->assertEquals(15, $page1->json('users.total'));
        $this->assertEquals(10, count($page1->json('users.data')));
        $this->assertEquals(2, $page1->json('users.last_page'));

        $page2 = $this->actingAs($admin)->getJson('/api/admin/users?per_page=10&page=2');
        $page2->assertStatus(200);
        $this->assertEquals(5, count($page2->json('users.data')));
    }

    /**
     * Test 16 (Feature 13): Unauthenticated guest cannot create a new user.
     */
    public function test_unauthenticated_guest_cannot_create_user(): void
    {
        $response = $this->postJson('/api/admin/users', [
            'name' => 'Dr. Budi',
            'username' => 'budi_baru',
            'email' => 'budi.baru@dinkes.go.id',
            'password' => 'Password123!',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test 17 (Feature 13): Non-admin user cannot create a new user.
     */
    public function test_non_admin_user_cannot_create_user(): void
    {
        $regularUser = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $response = $this->actingAs($regularUser)->postJson('/api/admin/users', [
            'name' => 'Dr. Budi',
            'username' => 'budi_baru',
            'email' => 'budi.baru@dinkes.go.id',
            'password' => 'Password123!',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 18 (Feature 13): Inactive admin cannot create a new user.
     */
    public function test_inactive_admin_cannot_create_user(): void
    {
        $inactiveAdmin = $this->createAdmin(['is_active' => false]);

        $response = $this->actingAs($inactiveAdmin)->postJson('/api/admin/users', [
            'name' => 'Dr. Budi',
            'username' => 'budi_baru',
            'email' => 'budi.baru@dinkes.go.id',
            'password' => 'Password123!',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 19 (Feature 13): Admin can create a new user successfully with all fields.
     */
    public function test_authenticated_admin_can_create_user_successfully(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'name' => 'Siti Nurhaliza, S.KM',
            'username' => 'siti_nurhaliza',
            'email' => 'siti.nurhaliza@dinkes.banyumas.go.id',
            'agency' => 'Puskesmas Banyumas I',
            'phone' => '+62 812-3456-7890',
            'role' => 'user',
            'is_active' => true,
            'password' => 'SitiRahasia2026!',
            'password_confirmation' => 'SitiRahasia2026!',
            'bio' => 'Petugas surveilans epidemiologi wilayah Banyumas.',
        ];

        $response = $this->actingAs($admin)->postJson('/api/admin/users', $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Akun pengguna baru berhasil dibuat.',
            'user' => [
                'name' => 'Siti Nurhaliza, S.KM',
                'username' => 'siti_nurhaliza',
                'email' => 'siti.nurhaliza@dinkes.banyumas.go.id',
                'agency' => 'Puskesmas Banyumas I',
                'phone' => '+62 812-3456-7890',
                'role' => 'user',
                'is_active' => true,
                'status_label' => 'Aktif',
            ],
        ]);

        // Verifikasi di basis data MySQL
        $this->assertDatabaseHas('users', [
            'username' => 'siti_nurhaliza',
            'email' => 'siti.nurhaliza@dinkes.banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        // Verifikasi password ter-hash dengan Bcrypt dan tidak pernah disimpan plaintext
        $createdUser = User::where('username', 'siti_nurhaliza')->first();
        $this->assertNotNull($createdUser);
        $this->assertTrue(Hash::check('SitiRahasia2026!', $createdUser->password));
        $this->assertNotEquals('SitiRahasia2026!', $createdUser->password);

        // Verifikasi password tidak pernah bocor pada respons API
        $responseUser = $response->json('user');
        $this->assertArrayNotHasKey('password', $responseUser);
        $this->assertStringNotContainsString('SitiRahasia2026!', $response->getContent());
    }

    /**
     * Test 20 (Feature 13): Admin can create a new administrator account.
     */
    public function test_authenticated_admin_can_create_admin_account(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'name' => 'Dr. Bambang Hermanto',
            'username' => 'bambang_hermanto',
            'email' => 'bambang.hermanto@dinkes.banyumas.go.id',
            'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            'phone' => '081399887766',
            'role' => 'admin',
            'is_active' => true,
            'password' => 'AdminKuat2026!',
            'password_confirmation' => 'AdminKuat2026!',
            'bio' => 'Koordinator IT & WebGIS DBD.',
        ];

        $response = $this->actingAs($admin)->postJson('/api/admin/users', $payload);

        $response->assertStatus(201);
        $this->assertEquals('admin', $response->json('user.role'));
        $this->assertEquals('Administrator', $response->json('user.role_label'));

        $this->assertDatabaseHas('users', [
            'username' => 'bambang_hermanto',
            'role' => 'admin',
        ]);
    }

    /**
     * Test 21 (Feature 13): Create user fails when required fields are missing.
     */
    public function test_create_user_fails_when_required_fields_empty(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'username', 'email', 'role', 'is_active', 'password']);
    }

    /**
     * Test 22 (Feature 13): Create user fails when username is already taken.
     */
    public function test_create_user_fails_when_username_duplicate(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create(['username' => 'user_kembar']);

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Akun Duplikat',
            'username' => 'user_kembar',
            'email' => 'berbeda@dinkes.go.id',
            'role' => 'user',
            'is_active' => true,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['username']);
        $this->assertStringContainsString(
            'Username sudah digunakan. Silakan gunakan username lain.',
            $response->json('errors.username.0')
        );
    }

    /**
     * Test 23 (Feature 13): Create user fails when email is already taken.
     */
    public function test_create_user_fails_when_email_duplicate(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create(['email' => 'email_kembar@banyumas.go.id']);

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Akun Duplikat Email',
            'username' => 'username_beda',
            'email' => 'email_kembar@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
        $this->assertStringContainsString(
            'Email sudah terdaftar. Silakan gunakan alamat email lain.',
            $response->json('errors.email.0')
        );
    }

    /**
     * Test 24 (Feature 13): Create user fails with invalid email format.
     */
    public function test_create_user_fails_with_invalid_email_format(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Nama Benar',
            'username' => 'username_benar',
            'email' => 'bukan-format-email',
            'role' => 'user',
            'is_active' => true,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    /**
     * Test 25 (Feature 13): Create user fails when password is less than 8 characters.
     */
    public function test_create_user_fails_when_password_too_short(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Nama Benar',
            'username' => 'username_benar',
            'email' => 'email.benar@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
            'password' => 'short',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
        $this->assertStringContainsString(
            'Kata sandi minimal 8 karakter.',
            $response->json('errors.password.0')
        );
    }

    /**
     * Test 26 (Feature 13): Create user fails when password confirmation does not match.
     */
    public function test_create_user_fails_when_password_confirmation_mismatch(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Nama Benar',
            'username' => 'username_benar',
            'email' => 'email.benar@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
            'password' => 'SandiKuat123!',
            'password_confirmation' => 'SandiBerbeda456!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password_confirmation']);
    }

    /**
     * Test 27 (Feature 13): Newly created account is immediately searchable and visible in System Feature 12.
     */
    public function test_newly_created_user_is_findable_via_feature_12_search_and_filter(): void
    {
        $admin = $this->createAdmin();

        // Buat akun baru via endpoint POST
        $createResponse = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Dr. Surya Adiputra, Sp.PD',
            'username' => 'surya_adiputra',
            'email' => 'surya.adiputra@rsud.banyumas.go.id',
            'agency' => 'RSUD Margono Banyumas',
            'role' => 'user',
            'is_active' => true,
            'password' => 'SuryaRahasia2026!',
            'password_confirmation' => 'SuryaRahasia2026!',
        ]);
        $createResponse->assertStatus(201);

        // Cari via System Feature 12 (search by name)
        $searchResponse = $this->actingAs($admin)->getJson('/api/admin/users?search=Surya');
        $searchResponse->assertStatus(200);
        $this->assertEquals(1, $searchResponse->json('users.total'));
        $this->assertEquals('Dr. Surya Adiputra, Sp.PD', $searchResponse->json('users.data.0.name'));
        $this->assertEquals('surya_adiputra', $searchResponse->json('users.data.0.username'));

        // Filter via System Feature 12 (role user & status active)
        $filterResponse = $this->actingAs($admin)->getJson('/api/admin/users?role=user&status=active');
        $filterResponse->assertStatus(200);
        $usernames = array_column($filterResponse->json('users.data'), 'username');
        $this->assertContains('surya_adiputra', $usernames);
    }

    /**
     * Test 28 (Feature 13): Newly created user can authenticate and login.
     */
    public function test_newly_created_admin_can_authenticate_via_auth_login(): void
    {
        $superAdmin = $this->createAdmin();

        // Buat admin baru
        $this->actingAs($superAdmin)->postJson('/api/admin/users', [
            'name' => 'Administrator Baru Dinkes',
            'username' => 'admin_baru_dinkes',
            'email' => 'admin.baru@dinkes.banyumas.go.id',
            'role' => 'admin',
            'is_active' => true,
            'password' => 'AdminLogin123!',
            'password_confirmation' => 'AdminLogin123!',
        ])->assertStatus(201);

        // Login dengan kredensial akun baru tersebut
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'admin.baru@dinkes.banyumas.go.id',
            'password' => 'AdminLogin123!',
        ]);

        $loginResponse->assertStatus(200);
        $loginResponse->assertJson([
            'success' => true,
            'user' => [
                'email' => 'admin.baru@dinkes.banyumas.go.id',
                'role' => 'admin',
            ],
        ]);
    }

    /**
     * Test 29 (Feature 14): Unauthenticated guest cannot update a user.
     */
    public function test_unauthenticated_guest_cannot_update_user(): void
    {
        $targetUser = User::factory()->create(['name' => 'Target Pengguna']);

        $response = $this->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'Nama Baru',
            'username' => 'username_baru',
            'email' => 'baru@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test 30 (Feature 14): Non-admin user cannot update a user.
     */
    public function test_non_admin_user_cannot_update_user(): void
    {
        $regularUser = User::factory()->create(['role' => 'user', 'is_active' => true]);
        $targetUser = User::factory()->create(['name' => 'Target Pengguna']);

        $response = $this->actingAs($regularUser)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'Nama Baru',
            'username' => 'username_baru',
            'email' => 'baru@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 31 (Feature 14): Admin can update an existing user successfully.
     */
    public function test_authenticated_admin_can_update_user_successfully(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'name' => 'Nama Lama',
            'username' => 'username_lama',
            'email' => 'lama@dinkes.banyumas.go.id',
            'agency' => 'Puskesmas Lama',
            'role' => 'user',
            'is_active' => true,
        ]);

        $payload = [
            'name' => 'Nama Diperbarui, S.Kep',
            'username' => 'username_baru',
            'email' => 'baru@dinkes.banyumas.go.id',
            'agency' => 'Puskesmas Purwokerto Utara I',
            'phone' => '+62 856-7890-1234',
            'role' => 'admin',
            'is_active' => false,
            'bio' => 'Catatan tugas yang diperbarui.',
        ];

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Data pengguna berhasil diperbarui.',
            'user' => [
                'id' => $targetUser->id,
                'name' => 'Nama Diperbarui, S.Kep',
                'username' => 'username_baru',
                'email' => 'baru@dinkes.banyumas.go.id',
                'agency' => 'Puskesmas Purwokerto Utara I',
                'phone' => '+62 856-7890-1234',
                'role' => 'admin',
                'role_label' => 'Administrator',
                'is_active' => false,
                'status_label' => 'Nonaktif',
            ],
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'name' => 'Nama Diperbarui, S.Kep',
            'username' => 'username_baru',
            'email' => 'baru@dinkes.banyumas.go.id',
            'agency' => 'Puskesmas Purwokerto Utara I',
            'role' => 'admin',
            'is_active' => false,
        ]);
    }

    /**
     * Test 32 (Feature 14): Admin can update user keeping the same username and email (unique ignore self).
     */
    public function test_admin_can_update_user_keeping_own_username_and_email(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'name' => 'User Tetap',
            'username' => 'user_tetap',
            'email' => 'tetap@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'User Tetap Berubah Nama',
            'username' => 'user_tetap',
            'email' => 'tetap@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(200);
        $this->assertEquals('User Tetap Berubah Nama', $response->json('user.name'));
    }

    /**
     * Test 33 (Feature 14): Update user fails when username is already taken by another account.
     */
    public function test_update_user_fails_when_username_taken_by_another(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create(['username' => 'akun_lain']);
        $targetUser = User::factory()->create(['username' => 'akun_target']);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'Nama Target',
            'username' => 'akun_lain',
            'email' => 'target@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['username']);
        $this->assertStringContainsString(
            'Username sudah digunakan oleh akun lain.',
            $response->json('errors.username.0')
        );
    }

    /**
     * Test 34 (Feature 14): Update user fails when email is already taken by another account.
     */
    public function test_update_user_fails_when_email_taken_by_another(): void
    {
        $admin = $this->createAdmin();
        User::factory()->create(['email' => 'email_lain@banyumas.go.id']);
        $targetUser = User::factory()->create(['email' => 'email_target@banyumas.go.id']);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'Nama Target',
            'username' => 'target_unik',
            'email' => 'email_lain@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
        $this->assertStringContainsString(
            'Email sudah digunakan oleh akun lain.',
            $response->json('errors.email.0')
        );
    }

    /**
     * Test 35 (Feature 14): Admin cannot deactivate own administrator account.
     */
    public function test_admin_cannot_deactivate_own_account(): void
    {
        $admin = $this->createAdmin(['is_active' => true]);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$admin->id}", [
            'name' => $admin->name,
            'username' => $admin->username,
            'email' => $admin->email,
            'role' => 'admin',
            'is_active' => false,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString(
            'Anda tidak dapat menonaktifkan akun administrator Anda sendiri',
            $response->json('message')
        );
    }

    /**
     * Test 36 (Feature 14): Admin cannot demote own role to regular user.
     */
    public function test_admin_cannot_demote_own_role(): void
    {
        $admin = $this->createAdmin(['role' => 'admin', 'is_active' => true]);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$admin->id}", [
            'name' => $admin->name,
            'username' => $admin->username,
            'email' => $admin->email,
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString(
            'Anda tidak dapat menurunkan role akun administrator Anda sendiri',
            $response->json('message')
        );
    }

    /**
     * Test 37 (Feature 14): Admin can optionally update user password.
     */
    public function test_admin_can_optionally_update_user_password(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'username' => 'user_ganti_sandi',
            'email' => 'ganti.sandi@banyumas.go.id',
            'password' => Hash::make('SandiLama123!'),
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'email' => $targetUser->email,
            'role' => 'user',
            'is_active' => true,
            'password' => 'SandiBaruKuat123!',
            'password_confirmation' => 'SandiBaruKuat123!',
        ]);

        $response->assertStatus(200);

        $targetUser->refresh();
        $this->assertTrue(Hash::check('SandiBaruKuat123!', $targetUser->password));
        $this->assertFalse(Hash::check('SandiLama123!', $targetUser->password));
    }

    /**
     * Test 38 (Feature 14): Update user returns 404 when user id not found.
     */
    public function test_update_user_returns_404_when_user_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/users/999999', [
            'name' => 'Tidak Ada',
            'username' => 'tidak_ada',
            'email' => 'tidakada@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response->assertStatus(404);
    }

    /**
     * Test 39 (Feature 15): Unauthenticated guest cannot delete user.
     */
    public function test_unauthenticated_guest_cannot_delete_user(): void
    {
        $targetUser = User::factory()->create();

        $response = $this->deleteJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(401);
    }

    /**
     * Test 40 (Feature 15): Non-admin user cannot delete user.
     */
    public function test_non_admin_user_cannot_delete_user(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);
        $targetUser = User::factory()->create();

        $response = $this->actingAs($regularUser)->deleteJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(403);
    }

    /**
     * Test 41 (Feature 15): Inactive admin cannot delete user.
     */
    public function test_inactive_admin_cannot_delete_user(): void
    {
        $inactiveAdmin = $this->createAdmin([
            'is_active' => false,
        ]);
        $targetUser = User::factory()->create();

        $response = $this->actingAs($inactiveAdmin)->deleteJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(403);
    }

    /**
     * Test 42 (Feature 15): Admin cannot delete own account.
     */
    public function test_admin_cannot_delete_own_account(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$admin->id}");

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'Anda tidak dapat menghapus akun administrator yang sedang digunakan.',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    }

    /**
     * Test 43 (Feature 15): Admin cannot delete the last active administrator.
     */
    public function test_admin_cannot_delete_the_last_active_administrator(): void
    {
        $onlyActiveAdmin = $this->createAdmin([
            'email' => 'only.admin@banyumas.go.id',
            'username' => 'only_admin',
            'is_active' => true,
        ]);

        $callerUser = User::factory()->create([
            'email' => 'operator@banyumas.go.id',
            'username' => 'operator_banyumas',
            'role' => 'user',
            'is_active' => true,
        ]);

        // Using withoutMiddleware for EnsureUserIsAdmin to test controller business rule directly
        $response = $this->withoutMiddleware(\App\Http\Middleware\EnsureUserIsAdmin::class)
            ->actingAs($callerUser)
            ->deleteJson("/api/admin/users/{$onlyActiveAdmin->id}");

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'Akun administrator terakhir tidak dapat dihapus. Sistem harus memiliki minimal satu administrator aktif.',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $onlyActiveAdmin->id,
        ]);
    }

    /**
     * Test 44 (Feature 15): Admin can delete regular user successfully.
     */
    public function test_admin_can_delete_regular_user_successfully(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'name' => 'Target User',
            'username' => 'target_user',
            'email' => 'target@banyumas.go.id',
            'role' => 'user',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$targetUser->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Akun pengguna berhasil dihapus.',
        ]);

        $this->assertDatabaseMissing('users', [
            'id' => $targetUser->id,
        ]);
    }

    /**
     * Test 45 (Feature 15): Admin can delete another admin when other active admins exist.
     */
    public function test_admin_can_delete_another_admin_when_multiple_active_admins_exist(): void
    {
        $currentAdmin = $this->createAdmin([
            'email' => 'current.admin@banyumas.go.id',
            'username' => 'current_admin',
            'is_active' => true,
        ]);

        $otherAdmin = $this->createAdmin([
            'email' => 'other.admin@banyumas.go.id',
            'username' => 'other_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($currentAdmin)->deleteJson("/api/admin/users/{$otherAdmin->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Akun pengguna berhasil dihapus.',
        ]);

        $this->assertDatabaseMissing('users', [
            'id' => $otherAdmin->id,
        ]);
    }

    /**
     * Test 46 (Feature 15): Delete user cleans up user sessions if table exists.
     */
    public function test_delete_user_cleans_up_sessions(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        \Illuminate\Support\Facades\DB::table('sessions')->insert([
            'id' => 'test_session_id_123',
            'user_id' => $targetUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'dummy_payload',
            'last_activity' => time(),
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$targetUser->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('sessions', [
            'id' => 'test_session_id_123',
        ]);
    }

    /**
     * Test 47 (Feature 15): Delete user returns 404 when user id not found.
     */
    public function test_delete_user_returns_404_when_user_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->deleteJson('/api/admin/users/999999');

        $response->assertStatus(404);
    }

    /**
     * Test 48 (Feature 16): Unauthenticated guest cannot view user detail.
     */
    public function test_unauthenticated_guest_cannot_view_user_detail(): void
    {
        $targetUser = User::factory()->create();

        $response = $this->getJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(401);
    }

    /**
     * Test 49 (Feature 16): Non-admin user cannot view user detail.
     */
    public function test_non_admin_user_cannot_view_user_detail(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);
        $targetUser = User::factory()->create();

        $response = $this->actingAs($regularUser)->getJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(403);
    }

    /**
     * Test 50 (Feature 16): Inactive admin cannot view user detail.
     */
    public function test_inactive_admin_cannot_view_user_detail(): void
    {
        $inactiveAdmin = $this->createAdmin([
            'is_active' => false,
        ]);
        $targetUser = User::factory()->create();

        $response = $this->actingAs($inactiveAdmin)->getJson("/api/admin/users/{$targetUser->id}");
        $response->assertStatus(403);
    }

    /**
     * Test 51 (Feature 16): Admin can view complete user detail with accurate fields.
     */
    public function test_admin_can_view_complete_user_detail_with_accurate_fields(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'name' => 'Budi Santoso',
            'username' => 'budi_santoso',
            'email' => 'budi.santoso@banyumas.go.id',
            'role' => 'admin',
            'is_active' => true,
            'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            'phone' => '081234567890',
            'bio' => 'Koordinator surveilans epidemiologi DBD.',
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/users/{$targetUser->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Detail akun berhasil diambil.',
            'user' => [
                'id' => $targetUser->id,
                'name' => 'Budi Santoso',
                'username' => 'budi_santoso',
                'email' => 'budi.santoso@banyumas.go.id',
                'role' => 'admin',
                'role_label' => 'Administrator',
                'is_active' => true,
                'status_label' => 'Aktif',
                'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
                'phone' => '081234567890',
                'bio' => 'Koordinator surveilans epidemiologi DBD.',
            ],
        ]);

        $userData = $response->json('user');
        $this->assertNotEmpty($userData['created_at']);
        $this->assertNotEmpty($userData['created_at_formatted']);
        $this->assertNotEmpty($userData['updated_at']);
        $this->assertNotEmpty($userData['updated_at_formatted']);
        $this->assertStringContainsString('WIB', $userData['created_at_formatted']);
    }

    /**
     * Test 52 (Feature 16): User detail endpoint never exposes password or hash.
     */
    public function test_user_detail_never_exposes_password_or_hash(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'password' => Hash::make('SuperSecretPassword123!'),
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/users/{$targetUser->id}");

        $response->assertStatus(200);
        $userData = $response->json('user');

        $this->assertArrayNotHasKey('password', $userData);
        $this->assertArrayNotHasKey('remember_token', $userData);

        $responseContent = $response->getContent();
        $this->assertStringNotContainsString('SuperSecretPassword123!', $responseContent);
        $this->assertStringNotContainsString('$2y$', $responseContent);
    }

    /**
     * Test 53 (Feature 16): User detail handles nullable fields gracefully.
     */
    public function test_user_detail_handles_nullable_fields_gracefully(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'agency' => null,
            'phone' => null,
            'bio' => null,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/users/{$targetUser->id}");

        $response->assertStatus(200);
        $userData = $response->json('user');

        $this->assertNull($userData['agency']);
        $this->assertNull($userData['phone']);
        $this->assertNull($userData['bio']);
    }

    /**
     * Test 54 (Feature 16): User detail returns 404 when user id not found.
     */
    public function test_user_detail_returns_404_when_user_not_found(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->getJson('/api/admin/users/999999');

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Data akun pengguna tidak ditemukan.',
        ]);
    }

    /**
     * Test 55 (Feature 16): User detail returns 404 for deleted user.
     */
    public function test_user_detail_returns_404_for_deleted_user(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'role' => 'user',
        ]);

        // Delete the user first (Feature 15)
        $deleteResponse = $this->actingAs($admin)->deleteJson("/api/admin/users/{$targetUser->id}");
        $deleteResponse->assertStatus(200);

        // Accessing detail of deleted user must return 404 (Feature 16)
        $detailResponse = $this->actingAs($admin)->getJson("/api/admin/users/{$targetUser->id}");
        $detailResponse->assertStatus(404);
    }

    /**
     * Test 56 (Feature 16): User detail reflects latest data after account is edited.
     */
    public function test_user_detail_reflects_latest_data_after_edit(): void
    {
        $admin = $this->createAdmin();
        $targetUser = User::factory()->create([
            'name' => 'Nama Awal',
            'username' => 'user_awal_test',
            'agency' => 'Puskesmas Lama',
            'role' => 'user',
        ]);

        // Update user via Feature 14
        $updateResponse = $this->actingAs($admin)->putJson("/api/admin/users/{$targetUser->id}", [
            'name' => 'Nama Baru Diedit',
            'username' => 'user_awal_test',
            'email' => $targetUser->email,
            'agency' => 'Puskesmas Baru Purwokerto',
            'role' => 'admin',
            'is_active' => true,
            'bio' => 'Catatan baru setelah pembaruan.',
        ]);
        $updateResponse->assertStatus(200);

        // Fetch user detail via Feature 16
        $detailResponse = $this->actingAs($admin)->getJson("/api/admin/users/{$targetUser->id}");
        $detailResponse->assertStatus(200);

        $userData = $detailResponse->json('user');
        $this->assertEquals('Nama Baru Diedit', $userData['name']);
        $this->assertEquals('Puskesmas Baru Purwokerto', $userData['agency']);
        $this->assertEquals('admin', $userData['role']);
        $this->assertEquals('Catatan baru setelah pembaruan.', $userData['bio']);
    }

    /**
     * Test 57 (Feature 16): User detail shows correct information for newly created user.
     */
    public function test_user_detail_shows_correct_info_for_newly_created_user(): void
    {
        $admin = $this->createAdmin();

        // Create new user via Feature 13
        $createResponse = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Petugas Baru',
            'username' => 'petugas_baru',
            'email' => 'petugas.baru@banyumas.go.id',
            'agency' => 'Puskesmas Wangon',
            'phone' => '081399887766',
            'role' => 'user',
            'is_active' => true,
            'password' => 'SandiKuatBaru123!',
            'password_confirmation' => 'SandiKuatBaru123!',
            'bio' => 'Petugas input data DBD kecamatan Wangon.',
        ]);
        $createResponse->assertStatus(201);
        $newUserId = $createResponse->json('user.id');

        // Fetch detail via Feature 16
        $detailResponse = $this->actingAs($admin)->getJson("/api/admin/users/{$newUserId}");
        $detailResponse->assertStatus(200);

        $userData = $detailResponse->json('user');
        $this->assertEquals('Petugas Baru', $userData['name']);
        $this->assertEquals('petugas_baru', $userData['username']);
        $this->assertEquals('petugas.baru@banyumas.go.id', $userData['email']);
        $this->assertEquals('Puskesmas Wangon', $userData['agency']);
        $this->assertEquals('081399887766', $userData['phone']);
        $this->assertEquals('user', $userData['role']);
        $this->assertEquals('Petugas input data DBD kecamatan Wangon.', $userData['bio']);
    }
}

