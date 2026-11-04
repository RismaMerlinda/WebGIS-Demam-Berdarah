<?php

namespace Database\Seeders;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class KasusAgregatSeeder extends Seeder
{
    /**
     * Seed synthetic aggregate dengue cases for Banyumas public view,
     * and internal Dinkes 2026 aggregate data under strict privacy isolation.
     */
    public function run(): void
    {
        $allKecamatan = Kecamatan::all()->keyBy('nama');

        // Helper to seed a period and its 27 subdistrict distribution
        $seedPeriod = function (string $nama, int $tahun, int $bulan, string $keterangan, array $distribution) use ($allKecamatan) {
            $periode = Periode::updateOrCreate(
                ['nama' => $nama],
                [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'tipe_periode' => 'monthly',
                    'rentang_waktu' => null,
                    'is_published' => true,
                    'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                    'sumber_data' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas',
                    'status_kelengkapan' => 'Lengkap (27 Kecamatan)',
                    'keterangan' => $keterangan,
                ]
            );

            foreach ($distribution as $kecNama => $stat) {
                $kec = $allKecamatan->get($kecNama);
                if ($kec) {
                    $ir = ($kec->jumlah_penduduk && $kec->jumlah_penduduk > 0)
                        ? round(($stat['kasus'] / $kec->jumlah_penduduk) * 100000, 2)
                        : null;

                    KasusAgregat::updateOrCreate(
                        [
                            'kecamatan_id' => $kec->id,
                            'periode_id' => $periode->id,
                        ],
                        [
                            'jumlah_kasus' => $stat['kasus'],
                            'kasus_laki_laki' => $stat['l'],
                            'kasus_perempuan' => $stat['p'],
                            'jumlah_meninggal' => $stat['meninggal'],
                            'jumlah_penduduk' => $kec->jumlah_penduduk,
                            'incidence_rate' => $ir,
                            'is_published' => true,
                            'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                            'keterangan' => 'Data simulasi berlabel pengembangan',
                        ]
                    );
                }
            }

            return $periode;
        };

        // 0. TAHUN 2021–2025 — DATA TAHUNAN RESMI PROFIL KESEHATAN DINKES BANYUMAS
        $annualJsonPath = database_path('seeders/data/agregat_tahunan_dinkes_2021_2025.json');
        if (file_exists($annualJsonPath)) {
            $annualData = json_decode(file_get_contents($annualJsonPath), true);
            foreach ($annualData as $yearStr => $yearInfo) {
                $periode = Periode::updateOrCreate(
                    ['nama' => $yearInfo['name']],
                    [
                        'tahun' => (int) $yearInfo['year'],
                        'bulan' => null,
                        'tipe_periode' => 'annual',
                        'rentang_waktu' => $yearInfo['rentang_waktu'],
                        'is_published' => true,
                        'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                        'sumber_data' => $yearInfo['sumber_data'],
                        'status_kelengkapan' => $yearInfo['status_kelengkapan'],
                        'keterangan' => $yearInfo['keterangan'],
                    ]
                );

                foreach ($yearInfo['districts'] as $dist) {
                    $kec = $allKecamatan->get($dist['nama']);
                    if ($kec) {
                        KasusAgregat::updateOrCreate(
                            [
                                'kecamatan_id' => $kec->id,
                                'periode_id' => $periode->id,
                            ],
                            [
                                'jumlah_kasus' => (int) $dist['kasus'],
                                'kasus_laki_laki' => (int) $dist['kasus_l'],
                                'kasus_perempuan' => (int) $dist['kasus_p'],
                                'jumlah_meninggal' => (int) $dist['meninggal'],
                                'jumlah_penduduk' => (int) $dist['penduduk'],
                                'incidence_rate' => $dist['incidence_rate'],
                                'is_published' => true,
                                'status_publikasi' => 'DAPAT_DIPUBLIKASIKAN',
                                'keterangan' => 'Data resmi Profil Kesehatan Dinkes Banyumas ' . $yearInfo['year'],
                            ]
                        );
                    }
                }
            }
        }

        // 1. TAHUN 2026 — JANUARI (143 Kasus)
        $jan2026 = [
            'Purwokerto Selatan' => ['kasus' => 19, 'l' => 9,  'p' => 10, 'meninggal' => 0],
            'Purwokerto Timur'   => ['kasus' => 16, 'l' => 8,  'p' => 8,  'meninggal' => 0],
            'Sokaraja'           => ['kasus' => 14, 'l' => 7,  'p' => 7,  'meninggal' => 0],
            'Ajibarang'          => ['kasus' => 12, 'l' => 6,  'p' => 6,  'meninggal' => 0],
            'Cilongok'           => ['kasus' => 11, 'l' => 5,  'p' => 6,  'meninggal' => 0],
            'Kembaran'           => ['kasus' => 9,  'l' => 4,  'p' => 5,  'meninggal' => 0],
            'Purwokerto Barat'   => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Purwokerto Utara'   => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Baturraden'         => ['kasus' => 7,  'l' => 3,  'p' => 4,  'meninggal' => 0],
            'Sumbang'            => ['kasus' => 6,  'l' => 3,  'p' => 3,  'meninggal' => 0],
            'Wangon'             => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Karanglewas'        => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Patikraja'          => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Kalibagor'          => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Banyumas'           => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Jatilawang'         => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Kedungbanteng'      => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Rawalo'             => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Kebasen'            => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Kemranjen'          => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Pekuncen'           => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Sumpiuh'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Tambak'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Somagede'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Gumelar'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Purwojati'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Lumbir'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
        ];
        $seedPeriod('Januari 2026', 2026, 1, 'Data sintetis berlabel pengembangan bulan Januari 2026.', $jan2026);

        // 2. TAHUN 2026 — FEBRUARI (88 Kasus)
        $feb2026 = [
            'Purwokerto Timur'   => ['kasus' => 15, 'l' => 8,  'p' => 7,  'meninggal' => 0],
            'Sokaraja'           => ['kasus' => 12, 'l' => 6,  'p' => 6,  'meninggal' => 0],
            'Ajibarang'          => ['kasus' => 10, 'l' => 5,  'p' => 5,  'meninggal' => 0],
            'Cilongok'           => ['kasus' => 9,  'l' => 5,  'p' => 4,  'meninggal' => 0],
            'Purwokerto Selatan' => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Purwokerto Barat'   => ['kasus' => 7,  'l' => 3,  'p' => 4,  'meninggal' => 0],
            'Kembaran'           => ['kasus' => 6,  'l' => 3,  'p' => 3,  'meninggal' => 0],
            'Baturraden'         => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Purwokerto Utara'   => ['kasus' => 5,  'l' => 3,  'p' => 2,  'meninggal' => 0],
            'Sumbang'            => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Karanglewas'        => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Wangon'             => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Kedungbanteng'      => ['kasus' => 3,  'l' => 2,  'p' => 1,  'meninggal' => 0],
            'Banyumas'           => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Patikraja'          => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Kalibagor'          => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Jatilawang'         => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Rawalo'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kebasen'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kemranjen'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Pekuncen'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Sumpiuh'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Tambak'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Somagede'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Gumelar'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Purwojati'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Lumbir'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
        ];
        $seedPeriod('Februari 2026', 2026, 2, 'Data sintetis berlabel pengembangan bulan Februari 2026.', $feb2026);

        // 3. TAHUN 2026 — MARET (64 Kasus)
        $mar2026 = [
            'Cilongok'           => ['kasus' => 11, 'l' => 5,  'p' => 6,  'meninggal' => 0],
            'Ajibarang'          => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Purwokerto Barat'   => ['kasus' => 7,  'l' => 3,  'p' => 4,  'meninggal' => 0],
            'Sokaraja'           => ['kasus' => 6,  'l' => 3,  'p' => 3,  'meninggal' => 0],
            'Purwokerto Selatan' => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Purwokerto Timur'   => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Wangon'             => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Kembaran'           => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Baturraden'         => ['kasus' => 3,  'l' => 2,  'p' => 1,  'meninggal' => 0],
            'Sumbang'            => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Purwokerto Utara'   => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Karanglewas'        => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Kedungbanteng'      => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Patikraja'          => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Banyumas'           => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Jatilawang'         => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Kalibagor'          => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Rawalo'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kebasen'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kemranjen'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Pekuncen'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Sumpiuh'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Tambak'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Somagede'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Gumelar'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Purwojati'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Lumbir'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
        ];
        $seedPeriod('Maret 2026', 2026, 3, 'Data sintetis berlabel pengembangan bulan Maret 2026.', $mar2026);

        // 4. TAHUN 2025 — DESEMBER (82 Kasus)
        $des2025 = [
            'Purwokerto Selatan' => ['kasus' => 12, 'l' => 6,  'p' => 6,  'meninggal' => 0],
            'Purwokerto Timur'   => ['kasus' => 10, 'l' => 5,  'p' => 5,  'meninggal' => 0],
            'Sokaraja'           => ['kasus' => 9,  'l' => 4,  'p' => 5,  'meninggal' => 0],
            'Ajibarang'          => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Cilongok'           => ['kasus' => 7,  'l' => 3,  'p' => 4,  'meninggal' => 0],
            'Kembaran'           => ['kasus' => 6,  'l' => 3,  'p' => 3,  'meninggal' => 0],
            'Purwokerto Barat'   => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Purwokerto Utara'   => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Baturraden'         => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Sumbang'            => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Wangon'             => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Karanglewas'        => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Patikraja'          => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Kalibagor'          => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Banyumas'           => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Jatilawang'         => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Kedungbanteng'      => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Rawalo'             => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Kebasen'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kemranjen'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Pekuncen'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Sumpiuh'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Tambak'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Somagede'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Gumelar'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Purwojati'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Lumbir'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
        ];
        $seedPeriod('Desember 2025', 2025, 12, 'Data sintetis berlabel pengembangan bulan Desember 2025.', $des2025);

        // 5. TAHUN 2025 — NOVEMBER (54 Kasus)
        $nov2025 = [
            'Purwokerto Selatan' => ['kasus' => 8,  'l' => 4,  'p' => 4,  'meninggal' => 0],
            'Purwokerto Timur'   => ['kasus' => 7,  'l' => 3,  'p' => 4,  'meninggal' => 0],
            'Sokaraja'           => ['kasus' => 6,  'l' => 3,  'p' => 3,  'meninggal' => 0],
            'Ajibarang'          => ['kasus' => 5,  'l' => 2,  'p' => 3,  'meninggal' => 0],
            'Cilongok'           => ['kasus' => 5,  'l' => 3,  'p' => 2,  'meninggal' => 0],
            'Kembaran'           => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Purwokerto Barat'   => ['kasus' => 4,  'l' => 2,  'p' => 2,  'meninggal' => 0],
            'Purwokerto Utara'   => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Baturraden'         => ['kasus' => 3,  'l' => 1,  'p' => 2,  'meninggal' => 0],
            'Sumbang'            => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Wangon'             => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Karanglewas'        => ['kasus' => 2,  'l' => 1,  'p' => 1,  'meninggal' => 0],
            'Patikraja'          => ['kasus' => 1,  'l' => 1,  'p' => 0,  'meninggal' => 0],
            'Kalibagor'          => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Banyumas'           => ['kasus' => 1,  'l' => 0,  'p' => 1,  'meninggal' => 0],
            'Jatilawang'         => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kedungbanteng'      => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Rawalo'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kebasen'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Kemranjen'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Pekuncen'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Sumpiuh'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Tambak'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Somagede'           => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Gumelar'            => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Purwojati'          => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
            'Lumbir'             => ['kasus' => 0,  'l' => 0,  'p' => 0,  'meninggal' => 0],
        ];
        $seedPeriod('November 2025', 2025, 11, 'Data sintetis berlabel pengembangan bulan November 2025.', $nov2025);

        // 6. Import verified internal Dinkes 2026 aggregate data (117 cases) marked strictly INTERNAL_BELUM_DIIZINKAN
        Artisan::call('dinkes:import-aggregate');
    }
}
