<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminPasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'name' => 'Administrator Dinkes',
            'username' => 'admin_dinkes',
            'email' => 'admin@banyumas.go.id',
            'password' => Hash::make('SecretPassword123!'),
            'role' => 'admin',
            'is_active' => true,
            'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            'phone' => '081234567890',
            'bio' => 'Pengelola sistem kewaspadaan dini DBD Banyumas.',
        ], $overrides));
    }

    /**
     * Test 1: Unauthenticated guest cannot access password change endpoint.
     */
    public function test_unauthenticated_guest_cannot_update_admin_password(): void
    {
        $response = $this->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test 2: Non-admin user cannot access password change endpoint.
     */
    public function test_non_admin_user_cannot_update_admin_password(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
            'password' => Hash::make('RegularPassword123!'),
        ]);

        $response = $this->actingAs($regularUser)->putJson('/api/admin/profile/password', [
            'current_password' => 'RegularPassword123!',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 3: Inactive admin cannot access password change endpoint.
     */
    public function test_inactive_admin_cannot_update_password(): void
    {
        $inactiveAdmin = $this->createAdmin([
            'is_active' => false,
        ]);

        $response = $this->actingAs($inactiveAdmin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 4: Validation fails when required fields are empty.
     */
    public function test_update_password_fails_when_fields_are_empty(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password', 'password', 'password_confirmation']);
    }

    /**
     * Test 5: Update password fails when current password is wrong.
     */
    public function test_update_password_fails_when_current_password_is_incorrect(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SalahPassword123!',
            'password' => 'NewSecretPassword789!',
            'password_confirmation' => 'NewSecretPassword789!',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Kata sandi saat ini tidak sesuai.',
        ]);
        $response->assertJsonValidationErrors(['current_password']);

        // Pastikan password di database tidak berubah
        $this->assertTrue(Hash::check('SecretPassword123!', $admin->fresh()->password));
    }

    /**
     * Test 6: Update password fails when new password is too short (< 8 chars).
     */
    public function test_update_password_fails_when_new_password_is_less_than_8_chars(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'Short1!',
            'password_confirmation' => 'Short1!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    /**
     * Test 7: Update password fails when confirmation does not match.
     */
    public function test_update_password_fails_when_confirmation_does_not_match(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'NewSecretPassword789!',
            'password_confirmation' => 'DifferentPassword123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    /**
     * Test 8: Update password fails when new password is identical to current password.
     */
    public function test_update_password_fails_when_new_password_is_same_as_current(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'SecretPassword123!',
            'password_confirmation' => 'SecretPassword123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    /**
     * Test 9: Authenticated admin can update password successfully and verify safe hashing.
     */
    public function test_authenticated_admin_can_update_password_successfully(): void
    {
        $admin = $this->createAdmin();
        $oldHash = $admin->password;

        $response = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'SecretPassword123!',
            'password' => 'NewValidatedPassword2026!',
            'password_confirmation' => 'NewValidatedPassword2026!',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Kata sandi administrator berhasil diperbarui.',
        ]);

        // Verifikasi database: password baru tersimpan dalam bentuk hash
        $freshAdmin = $admin->fresh();
        $this->assertNotEquals('NewValidatedPassword2026!', $freshAdmin->password);
        $this->assertNotEquals($oldHash, $freshAdmin->password);
        $this->assertTrue(Hash::check('NewValidatedPassword2026!', $freshAdmin->password));
        $this->assertFalse(Hash::check('SecretPassword123!', $freshAdmin->password));
    }

    /**
     * Test 10: Admin can authenticate with the newly updated password and cannot authenticate with the old password.
     */
    public function test_admin_can_login_with_new_password_and_old_password_is_rejected(): void
    {
        $admin = $this->createAdmin([
            'email' => 'admin_auth_test@banyumas.go.id',
            'password' => Hash::make('OldInitialPassword123!'),
        ]);

        // Update password melalui endpoint
        $updateResponse = $this->actingAs($admin)->putJson('/api/admin/profile/password', [
            'current_password' => 'OldInitialPassword123!',
            'password' => 'BrandNewPassword2026!',
            'password_confirmation' => 'BrandNewPassword2026!',
        ]);
        $updateResponse->assertStatus(200);

        // Logout untuk menguji login fresh
        $this->postJson('/api/auth/logout');

        // Coba login dengan password LAMA -> harus GAGAL
        $failLogin = $this->postJson('/api/auth/login', [
            'email' => 'admin_auth_test@banyumas.go.id',
            'password' => 'OldInitialPassword123!',
        ]);
        $failLogin->assertStatus(422);

        // Coba login dengan password BARU -> harus BERHASIL
        $successLogin = $this->postJson('/api/auth/login', [
            'email' => 'admin_auth_test@banyumas.go.id',
            'password' => 'BrandNewPassword2026!',
        ]);
        $successLogin->assertStatus(200);
        $successLogin->assertJson([
            'success' => true,
        ]);
    }
}

