<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for administrator profile fields (System Feature 10).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 60)->nullable()->unique()->after('name');
            $table->string('agency', 120)->nullable()->after('is_active');
            $table->string('phone', 30)->nullable()->after('agency');
            $table->text('bio')->nullable()->after('phone');
        });

        // Populate default username for existing administrator accounts if empty
        if (Schema::hasColumn('users', 'username')) {
            DB::table('users')->whereNull('username')->update([
                'username' => 'admin',
                'agency' => 'Dinas Kesehatan Kabupaten Banyumas',
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'agency', 'phone', 'bio']);
        });
    }
};

