<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            if (!Schema::hasColumn('periodes', 'tipe_periode')) {
                $table->enum('tipe_periode', ['annual', 'monthly', 'partial_year'])
                    ->default('monthly')
                    ->after('bulan')
                    ->index();
            }
            if (!Schema::hasColumn('periodes', 'rentang_waktu')) {
                $table->string('rentang_waktu', 100)
                    ->nullable()
                    ->after('tipe_periode');
            }
        });

        Schema::table('kasus_agregats', function (Blueprint $table) {
            if (!Schema::hasColumn('kasus_agregats', 'jumlah_penduduk')) {
                $table->unsignedInteger('jumlah_penduduk')
                    ->nullable()
                    ->after('jumlah_meninggal');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            if (Schema::hasColumn('periodes', 'rentang_waktu')) {
                $table->dropColumn('rentang_waktu');
            }
            if (Schema::hasColumn('periodes', 'tipe_periode')) {
                $table->dropColumn('tipe_periode');
            }
        });

        Schema::table('kasus_agregats', function (Blueprint $table) {
            if (Schema::hasColumn('kasus_agregats', 'jumlah_penduduk')) {
                $table->dropColumn('jumlah_penduduk');
            }
        });
    }
};
