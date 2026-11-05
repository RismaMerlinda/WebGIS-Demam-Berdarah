<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class EducationContent extends Model
{
    protected $table = 'education_contents';

    protected $fillable = [
        'category_id',
        'title',
        'slug',
        'summary',
        'content',
        'image_path',
        'reference_source',
        'sort_order',
        'is_published',
    ];

    protected $appends = [
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'sort_order' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EducationCategory::class, 'category_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)
            ->whereHas('category', function (Builder $q) {
                $q->where('is_active', true);
            });
    }

    /**
     * Resolve safe public image URL from image_path.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->image_path)) {
            return null;
        }

        if (str_starts_with($this->image_path, '/images/')) {
            return $this->image_path;
        }

        return Storage::disk('public')->url($this->image_path);
    }
}

