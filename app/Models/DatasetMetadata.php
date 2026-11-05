<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DatasetMetadata extends Model
{
    use HasFactory;

    protected $table = 'dataset_metadatas';

    protected $fillable = [
        'periode_id',
        'dataset_code',
        'dataset_name',
        'source_name',
        'reference_source',
        'source_type',
        'source_category',
        'observation_year',
        'period_start',
        'period_end',
        'spatial_unit',
        'indicator',
        'granularity',
        'publication_status',
        'validation_status',
        'update_date',
        'description',
        'is_public_visible',
    ];

    protected function casts(): array
    {
        return [
            'periode_id' => 'integer',
            'observation_year' => 'integer',
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'update_date' => 'date:Y-m-d',
            'is_public_visible' => 'boolean',
        ];
    }

    /**
     * Scope only metadata entries safe for public display.
     */
    public function scopePublicVisible(Builder $query): Builder
    {
        return $query->where('is_public_visible', true);
    }

    /**
     * Optional relationship to Periode.
     */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class, 'periode_id');
    }
}

