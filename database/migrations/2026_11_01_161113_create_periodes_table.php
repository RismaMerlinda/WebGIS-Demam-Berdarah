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
        Schema::create('periodes', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 50)->unique();
            $table->unsignedSmallInteger('tahun')->index();
            $table->unsignedTinyInteger('bulan')->nullable()->index();
            $table->boolean('is_published')->default(true)->index();
            $table->string('sumber_data', 150)->default('Dataset Agregat Simulasi Terstandarisasi');
            $table->string('status_kelengkapan', 50)->default('Lengkap (27 Kecamatan)');
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('periodes');
    }
};
