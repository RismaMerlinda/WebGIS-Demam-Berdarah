<?php

namespace Database\Seeders;

use App\Models\Kecamatan;
use Illuminate\Database\Seeder;

class KecamatanSeeder extends Seeder
{
    /**
     * Seed the 27 official subdistricts of Kabupaten Banyumas.
     */
    public function run(): void
    {
        $kecamatans = [
            ['kode' => '330201', 'nama' => 'Lumbir', 'luas_wilayah' => 102.66, 'jumlah_penduduk' => 51200],
            ['kode' => '330202', 'nama' => 'Wangon', 'luas_wilayah' => 60.78, 'jumlah_penduduk' => 84100],
            ['kode' => '330203', 'nama' => 'Jatilawang', 'luas_wilayah' => 48.16, 'jumlah_penduduk' => 67300],
            ['kode' => '330204', 'nama' => 'Rawalo', 'luas_wilayah' => 49.64, 'jumlah_penduduk' => 54200],
            ['kode' => '330205', 'nama' => 'Kebasen', 'luas_wilayah' => 54.00, 'jumlah_penduduk' => 69800],
            ['kode' => '330206', 'nama' => 'Kemranjen', 'luas_wilayah' => 60.72, 'jumlah_penduduk' => 74500],
            ['kode' => '330207', 'nama' => 'Sumpiuh', 'luas_wilayah' => 56.50, 'jumlah_penduduk' => 59600],
            ['kode' => '330208', 'nama' => 'Tambak', 'luas_wilayah' => 52.03, 'jumlah_penduduk' => 51900],
            ['kode' => '330209', 'nama' => 'Somagede', 'luas_wilayah' => 40.11, 'jumlah_penduduk' => 38700],
            ['kode' => '330210', 'nama' => 'Kalibagor', 'luas_wilayah' => 35.73, 'jumlah_penduduk' => 56400],
            ['kode' => '330211', 'nama' => 'Banyumas', 'luas_wilayah' => 38.09, 'jumlah_penduduk' => 53100],
            ['kode' => '330212', 'nama' => 'Patikraja', 'luas_wilayah' => 43.23, 'jumlah_penduduk' => 60200],
            ['kode' => '330213', 'nama' => 'Purwojati', 'luas_wilayah' => 37.86, 'jumlah_penduduk' => 36900],
            ['kode' => '330214', 'nama' => 'Ajibarang', 'luas_wilayah' => 66.50, 'jumlah_penduduk' => 102500],
            ['kode' => '330215', 'nama' => 'Gumelar', 'luas_wilayah' => 93.95, 'jumlah_penduduk' => 55800],
            ['kode' => '330216', 'nama' => 'Pekuncen', 'luas_wilayah' => 92.70, 'jumlah_penduduk' => 76400],
            ['kode' => '330217', 'nama' => 'Cilongok', 'luas_wilayah' => 105.34, 'jumlah_penduduk' => 127900],
            ['kode' => '330218', 'nama' => 'Karanglewas', 'luas_wilayah' => 32.50, 'jumlah_penduduk' => 68400],
            ['kode' => '330219', 'nama' => 'Kedungbanteng', 'luas_wilayah' => 60.22, 'jumlah_penduduk' => 62100],
            ['kode' => '330220', 'nama' => 'Baturraden', 'luas_wilayah' => 45.53, 'jumlah_penduduk' => 54900],
            ['kode' => '330221', 'nama' => 'Sumbang', 'luas_wilayah' => 53.42, 'jumlah_penduduk' => 94200],
            ['kode' => '330222', 'nama' => 'Kembaran', 'luas_wilayah' => 25.92, 'jumlah_penduduk' => 81600],
            ['kode' => '330223', 'nama' => 'Sokaraja', 'luas_wilayah' => 29.92, 'jumlah_penduduk' => 89700],
            ['kode' => '330224', 'nama' => 'Purwokerto Selatan', 'luas_wilayah' => 13.75, 'jumlah_penduduk' => 74800],
            ['kode' => '330225', 'nama' => 'Purwokerto Barat', 'luas_wilayah' => 7.40, 'jumlah_penduduk' => 52300],
            ['kode' => '330226', 'nama' => 'Purwokerto Timur', 'luas_wilayah' => 8.42, 'jumlah_penduduk' => 58900],
            ['kode' => '330227', 'nama' => 'Purwokerto Utara', 'luas_wilayah' => 9.01, 'jumlah_penduduk' => 48600],
        ];

        foreach ($kecamatans as $item) {
            Kecamatan::updateOrCreate(
                ['kode' => $item['kode']],
                [
                    'nama' => $item['nama'],
                    'luas_wilayah' => $item['luas_wilayah'],
                    'jumlah_penduduk' => $item['jumlah_penduduk'],
                ]
            );
        }
    }
}
