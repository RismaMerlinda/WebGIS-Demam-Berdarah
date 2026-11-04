<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kecamatan extends Model
{
    use HasFactory;

    protected $table = 'kecamatans';

    protected $fillable = [
        'kode',
        'nama',
        'luas_wilayah',
        'jumlah_penduduk',
    ];

    protected function casts(): array
    {
        return [
            'luas_wilayah' => 'decimal:2',
            'jumlah_penduduk' => 'integer',
        ];
    }

    /**
     * Get aggregate cases for this kecamatan.
     */
    public function kasusAgregat(): HasMany
    {
        return $this->hasMany(KasusAgregat::class, 'kecamatan_id');
    }
}
