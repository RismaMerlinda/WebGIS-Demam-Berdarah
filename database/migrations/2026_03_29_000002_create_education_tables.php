<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Fitur 11 (Edukasi DBD dan Pencegahan 3M Plus).
     */
    public function up(): void
    {
        Schema::create('education_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('education_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')
                ->constrained('education_categories')
                ->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('slug', 220)->unique();
            $table->text('summary')->nullable();
            $table->longText('content');
            $table->string('image_path', 255)->nullable();
            $table->string('reference_source', 255)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
            $table->index(['category_id', 'is_published', 'sort_order']);
        });

        Schema::create('education_faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question', 255);
            $table->text('answer');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('education_faqs');
        Schema::dropIfExists('education_contents');
        Schema::dropIfExists('education_categories');
    }
};

