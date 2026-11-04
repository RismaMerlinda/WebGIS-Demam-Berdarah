<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KasusAgregat extends Model
{
    use HasFactory;

    protected $table = 'kasus_agregats';

    protected $fillable = [
        'kecamatan_id',
        'periode_id',
        'jumlah_kasus',
        'kasus_laki_laki',
        'kasus_perempuan',
        'jumlah_meninggal',
        'jumlah_penduduk',
        'incidence_rate',
        'is_published',
        'status_publikasi',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'kecamatan_id' => 'integer',
            'periode_id' => 'integer',
            'jumlah_kasus' => 'integer',
            'kasus_laki_laki' => 'integer',
            'kasus_perempuan' => 'integer',
            'jumlah_meninggal' => 'integer',
            'jumlah_penduduk' => 'integer',
            'incidence_rate' => 'decimal:2',
            'is_published' => 'boolean',
        ];
    }

    /**
     * Scope only authorized published records for public consumption.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)
            ->where('status_publikasi', 'DAPAT_DIPUBLIKASIKAN');
    }

    /**
     * Scope only internal / unauthorized records.
     */
    public function scopeInternal(Builder $query): Builder
    {
        return $query->where('status_publikasi', 'INTERNAL_BELUM_DIIZINKAN');
    }

    /**
     * Relationship to Kecamatan.
     */
    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'kecamatan_id');
    }

    /**
     * Relationship to Periode.
     */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class, 'periode_id');
    }
}
