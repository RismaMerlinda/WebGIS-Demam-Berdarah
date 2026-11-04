<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds for default administrator account.
     */
    public function run(): void
    {
        $adminEmail = env('ADMIN_DEFAULT_EMAIL', 'admin@banyumas.go.id');
        $adminPassword = env('ADMIN_DEFAULT_PASSWORD', 'AdminBanyumas2026!');

        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Administrator WebGIS Banyumas',
                'password' => Hash::make($adminPassword),
                'role' => 'super_admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
