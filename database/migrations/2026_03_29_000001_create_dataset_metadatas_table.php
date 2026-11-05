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
        Schema::create('dataset_metadatas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')->nullable()->constrained('periodes')->nullOnDelete();
            $table->string('dataset_code')->unique();
            $table->string('dataset_name');
            $table->string('source_name');
            $table->string('reference_source')->nullable();
            $table->string('source_type');
            $table->string('source_category')->default('published'); // published, published_simulation, reference, internal_restricted
            $table->unsignedSmallInteger('observation_year')->nullable()->index();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('spatial_unit')->nullable();
            $table->string('indicator')->nullable();
            $table->string('granularity')->nullable();
            $table->string('publication_status');
            $table->string('validation_status')->nullable();
            $table->date('update_date')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_public_visible')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dataset_metadatas');
    }
};

