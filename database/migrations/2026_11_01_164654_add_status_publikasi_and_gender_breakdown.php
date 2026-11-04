<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            $table->string('status_publikasi', 50)->default('INTERNAL_BELUM_DIIZINKAN')->after('is_published');
        });

        Schema::table('kasus_agregats', function (Blueprint $table) {
            $table->unsignedInteger('kasus_laki_laki')->nullable()->after('jumlah_kasus');
            $table->unsignedInteger('kasus_perempuan')->nullable()->after('kasus_laki_laki');
            $table->string('status_publikasi', 50)->default('INTERNAL_BELUM_DIIZINKAN')->after('is_published');
        });

        // Set existing published period status to 'DAPAT_DIPUBLIKASIKAN'
        DB::table('periodes')->where('is_published', true)->update(['status_publikasi' => 'DAPAT_DIPUBLIKASIKAN']);
        DB::table('kasus_agregats')->where('is_published', true)->update(['status_publikasi' => 'DAPAT_DIPUBLIKASIKAN']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            $table->dropColumn('status_publikasi');
        });

        Schema::table('kasus_agregats', function (Blueprint $table) {
            $table->dropColumn(['kasus_laki_laki', 'kasus_perempuan', 'status_publikasi']);
        });
    }
};
