<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Clear rate limiter before tests
        RateLimiter::clear('admin@banyumas.go.id|127.0.0.1');
    }

    /**
     * Test successful login for active administrator.
     */
    public function test_login_successful_with_valid_credentials(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin-test@banyumas.go.id'],
            [
                'name' => 'Admin Pengujian',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin-test@banyumas.go.id',
            'password' => 'PasswordAman123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user' => [
                    'email' => 'admin-test@banyumas.go.id',
                    'is_admin' => true,
                ],
            ]);

        $this->assertAuthenticatedAs($user);
    }

    /**
     * Test login failure when entering incorrect password.
     */
    public function test_login_fails_with_invalid_password(): void
    {
        User::updateOrCreate(
            ['email' => 'admin-test@banyumas.go.id'],
            [
                'name' => 'Admin Pengujian',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin-test@banyumas.go.id',
            'password' => 'PasswordSalahTotal',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertGuest();
    }

    /**
     * Test login failure for unregistered email address.
     */
    public function test_login_fails_for_unregistered_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'tidakada@banyumas.go.id',
            'password' => 'PasswordSembarang123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertGuest();
    }

    /**
     * Test validation errors for empty fields.
     */
    public function test_login_validation_errors_for_empty_fields(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => '',
            'password' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    /**
     * Test inactive administrator account is rejected.
     */
    public function test_inactive_admin_cannot_login(): void
    {
        User::updateOrCreate(
            ['email' => 'nonaktif@banyumas.go.id'],
            [
                'name' => 'Admin Nonaktif',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => false,
            ]
        );

        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonaktif@banyumas.go.id',
            'password' => 'PasswordAman123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertGuest();
    }

    /**
     * Test non-admin user role is rejected from admin login.
     */
    public function test_non_admin_user_cannot_login(): void
    {
        User::updateOrCreate(
            ['email' => 'userbiasa@banyumas.go.id'],
            [
                'name' => 'User Biasa',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'public_user',
                'is_active' => true,
            ]
        );

        $response = $this->postJson('/api/auth/login', [
            'email' => 'userbiasa@banyumas.go.id',
            'password' => 'PasswordAman123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertGuest();
    }

    /**
     * Test /api/auth/me returns guest status when unauthenticated.
     */
    public function test_me_endpoint_returns_guest_when_not_logged_in(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'authenticated' => false,
                'user' => null,
            ]);
    }

    /**
     * Test /api/auth/me returns user data when authenticated as admin.
     */
    public function test_me_endpoint_returns_user_when_authenticated(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin-me@banyumas.go.id'],
            [
                'name' => 'Admin Me Test',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $response = $this->actingAs($user)->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'authenticated' => true,
                'user' => [
                    'email' => 'admin-me@banyumas.go.id',
                    'is_admin' => true,
                ],
            ]);
    }

    /**
     * Test logout ends session and unauthenticates user.
     */
    public function test_logout_successfully_terminates_session(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin-logout@banyumas.go.id'],
            [
                'name' => 'Admin Logout Test',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $response = $this->actingAs($user)->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertGuest();
    }

    /**
     * Test protected admin endpoint requires authentication and admin authorization.
     */
    public function test_protected_admin_endpoint_authorization(): void
    {
        // Guest request should be unauthenticated
        $guestResponse = $this->getJson('/api/admin/ping');
        $guestResponse->assertStatus(401);

        // Authenticated admin should be allowed
        $admin = User::updateOrCreate(
            ['email' => 'admin-auth@banyumas.go.id'],
            [
                'name' => 'Admin Auth',
                'password' => Hash::make('PasswordAman123!'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $authResponse = $this->actingAs($admin)->getJson('/api/admin/ping');
        $authResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    /**
     * Test rate limiting on consecutive failed login attempts.
     */
    public function test_login_rate_limiting_after_excessive_attempts(): void
    {
        $testEmail = 'throttle-test@banyumas.go.id';
        RateLimiter::clear($testEmail.'|127.0.0.1');

        // Make 5 failed attempts
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => $testEmail,
                'password' => 'WrongPassword',
            ]);
        }

        // 6th attempt should be blocked with 429
        $throttledResponse = $this->postJson('/api/auth/login', [
            'email' => $testEmail,
            'password' => 'WrongPassword',
        ]);

        $throttledResponse->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);
    }
}
