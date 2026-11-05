<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationCategory extends Model
{
    protected $table = 'education_categories';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function contents(): HasMany
    {
        return $this->hasMany(EducationContent::class, 'category_id');
    }

    public function publishedContents(): HasMany
    {
        return $this->hasMany(EducationContent::class, 'category_id')
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}

