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
        Schema::create('kasus_agregats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kecamatan_id')->constrained('kecamatans')->cascadeOnDelete();
            $table->foreignId('periode_id')->constrained('periodes')->cascadeOnDelete();
            $table->unsignedInteger('jumlah_kasus')->default(0);
            $table->unsignedInteger('jumlah_meninggal')->default(0);
            $table->decimal('incidence_rate', 8, 2)->nullable()->comment('IR per 100.000 penduduk jika data tersedia');
            $table->boolean('is_published')->default(true)->index();
            $table->string('keterangan', 255)->nullable();
            $table->timestamps();

            // Prevent duplicate entries for the same subdistrict and period
            $table->unique(['kecamatan_id', 'periode_id'], 'uniq_kecamatan_periode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kasus_agregats');
    }
};
