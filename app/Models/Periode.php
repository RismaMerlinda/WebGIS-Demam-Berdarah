<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Periode extends Model
{
    use HasFactory;

    protected $table = 'periodes';

    protected $fillable = [
        'nama',
        'tahun',
        'bulan',
        'tipe_periode',
        'rentang_waktu',
        'is_published',
        'status_publikasi',
        'sumber_data',
        'status_kelengkapan',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'tahun' => 'integer',
            'bulan' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    /**
     * Scope only authorized published periods for public access.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)
            ->where('status_publikasi', 'DAPAT_DIPUBLIKASIKAN');
    }

    /**
     * Scope only internal / unreleased periods.
     */
    public function scopeInternal(Builder $query): Builder
    {
        return $query->where('status_publikasi', 'INTERNAL_BELUM_DIIZINKAN');
    }

    /**
     * Get aggregate cases for this period.
     */
    public function kasusAgregat(): HasMany
    {
        return $this->hasMany(KasusAgregat::class, 'periode_id');
    }
}
