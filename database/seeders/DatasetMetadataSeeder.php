<?php

namespace Database\Seeders;

use App\Models\DatasetMetadata;
use App\Models\Periode;
use Illuminate\Database\Seeder;

class DatasetMetadataSeeder extends Seeder
{
    /**
     * Seed structured dataset metadata records linked to published periods and governance categories (Fitur 10).
     */
    public function run(): void
    {
        $periodsByYear = Periode::published()
            ->whereBetween('tahun', [2022, 2025])
            ->whereNull('bulan')
            ->get()
            ->keyBy('tahun');

        $periodJan2026 = Periode::published()
            ->where('tahun', 2026)
            ->where('bulan', 1)
            ->first();

        $annualSpecs = [
            2022 => [
                'cases' => 307,
                'male' => 156,
                'female' => 151,
                'deaths' => 13,
                'ref_page' => 'Tabel 72, Hal. 151–152',
            ],
            2023 => [
                'cases' => 273,
                'male' => 154,
                'female' => 119,
                'deaths' => 4,
                'ref_page' => 'Tabel 72, Hal. 201–202',
            ],
            2024 => [
                'cases' => 2180,
                'male' => 1292,
                'female' => 888,
                'deaths' => 12,
                'ref_page' => 'Tabel 72, Hal. 267–268',
            ],
            2025 => [
                'cases' => 1062,
                'male' => 599,
                'female' => 463,
                'deaths' => 8,
                'ref_page' => 'Tabel 72, Hal. 272',
            ],
        ];

        foreach ($annualSpecs as $yr => $spec) {
            $periode = $periodsByYear->get($yr);
            $casesFmt = number_format($spec['cases'], 0, ',', '.');

            DatasetMetadata::updateOrCreate(
                ['dataset_code' => "DBD-BMS-ANNUAL-{$yr}"],
                [
                    'periode_id' => $periode?->id,
                    'dataset_name' => "Dataset Kasus DBD Agregat Tahunan Kabupaten Banyumas Tahun {$yr}",
                    'source_name' => 'DATA DEMAM BERDARAH KABUPATEN BANYUMAS.xlsx (Rekapitulasi Kasus DBD, IR & Penduduk)',
                    'reference_source' => "Profil Kesehatan Kabupaten Banyumas Tahun {$yr} ({$spec['ref_page']})",
                    'source_type' => 'Workbook Rekapitulasi Resmi & Dokumen Profil Kesehatan Daerah',
                    'source_category' => 'published',
                    'observation_year' => $yr,
                    'period_start' => "{$yr}-01-01",
                    'period_end' => "{$yr}-12-31",
                    'spatial_unit' => '27 Kecamatan (Agregasi Terverifikasi dari 40 Puskesmas)',
                    'indicator' => 'Jumlah Kasus DBD (L/P/Total), Kematian, Jumlah Penduduk, Incidence Rate (IR)',
                    'granularity' => 'Tahunan (1 Tahun Penuh / 12 Bulan)',
                    'publication_status' => 'Resmi Dipublikasikan',
                    'validation_status' => "Terverifikasi Silang Excel & PDF Profil Kesehatan {$yr} ({$casesFmt} Kasus, {$spec['deaths']} Meninggal)",
                    'update_date' => '2025-10-15',
                    'description' => "Data agregat tahunan resmi tahun {$yr} sebanyak {$casesFmt} kasus DBD ({$spec['male']} laki-laki, {$spec['female']} perempuan, {$spec['deaths']} meninggal) pada seluruh 27 kecamatan Kabupaten Banyumas. Sumber resmi tahun {$yr} hanya menyediakan agregat tahunan tanpa rincian bulanan per kecamatan.",
                    'is_public_visible' => true,
                ]
            );
        }

        // 2026 Published Simulation Dataset (Januari - Maret 2026)
        DatasetMetadata::updateOrCreate(
            ['dataset_code' => 'DBD-BMS-SIM-2026-Q1'],
            [
                'periode_id' => $periodJan2026?->id,
                'dataset_name' => 'Dataset Simulasi Pengembangan Bulanan Kasus DBD Tahun 2026 (Januari–Maret)',
                'source_name' => 'Dataset Agregat Sintetis Model Epidemiologi Dinkes Banyumas',
                'reference_source' => 'Skema Pengujian Spasial-Temporal Choropleth 27 Kecamatan',
                'source_type' => 'Dataset Simulasi Pengembangan Terlabel',
                'source_category' => 'published_simulation',
                'observation_year' => 2026,
                'period_start' => '2026-01-01',
                'period_end' => '2026-03-31',
                'spatial_unit' => '27 Kecamatan Kabupaten Banyumas',
                'indicator' => 'Jumlah Kasus DBD Bulanan per Kecamatan',
                'granularity' => 'Bulanan Parsial (Januari, Februari, Maret 2026 • 3 dari 12 Bulan)',
                'publication_status' => 'Data Simulasi Pengembangan (Parsial)',
                'validation_status' => 'Simulasi Terlabel (Digunakan Selama Data Asli 2026 Belum Memperoleh Izin Publikasi)',
                'update_date' => '2026-03-31',
                'description' => 'Dataset simulasi pengembangan yang digunakan pada tampilan publik tahun 2026 untuk bulan Januari (143 kasus), Februari (98 kasus), dan Maret (64 kasus) dengan total akumulasi 305 kasus. Bulan April–Desember 2026 ditandai sebagai Data Belum Tersedia (bukan 0 kasus).',
                'is_public_visible' => true,
            ]
        );

        // Reference / Comparison Source 1: Profil Kesehatan 2021-2025
        DatasetMetadata::updateOrCreate(
            ['dataset_code' => 'REF-PROFKES-BMS-2021-2025'],
            [
                'periode_id' => null,
                'dataset_name' => 'Dokumen Profil Kesehatan Kabupaten Banyumas Tahun 2021–2025',
                'source_name' => 'Profil Kesehatan Kabupaten Banyumas Tahun 2021–2025 (Dinas Kesehatan Kabupaten Banyumas)',
                'reference_source' => 'Tabel Kasus DBD, IR per 100.000 Penduduk, CFR, dan Jumlah Penduduk',
                'source_type' => 'Dokumen Publikasi Resmi Daerah (PDF Referensi Pembanding)',
                'source_category' => 'reference',
                'observation_year' => null,
                'period_start' => '2021-01-01',
                'period_end' => '2025-12-31',
                'spatial_unit' => '40 Puskesmas & 27 Kecamatan Kabupaten Banyumas',
                'indicator' => 'Jumlah Kasus DBD, Incidence Rate (IR), Angka Kematian, dan Populasi',
                'granularity' => 'Tahunan',
                'publication_status' => 'Sumber Referensi Pembanding',
                'validation_status' => 'Digunakan untuk Pemeriksaan Silang Total Kasus dan IR Tahun 2022–2025',
                'update_date' => '2025-10-15',
                'description' => 'Digunakan sebagai dokumen referensi pembanding resmi untuk memvalidasi kesesuaian angka kasus DBD, kematian, dan jumlah penduduk pada workbook rekapitulasi tahunan. Data tahun 2021 digunakan sebagai rujukan historis di luar rentang filter aktif 2022–2026.',
                'is_public_visible' => true,
            ]
        );

        // Reference / Spatial Source 2: GeoJSON 27 Kecamatan
        DatasetMetadata::updateOrCreate(
            ['dataset_code' => 'REF-GEOJSON-BMS-27KEC'],
            [
                'periode_id' => null,
                'dataset_name' => 'Geometri Batas Administrasi 27 Kecamatan Kabupaten Banyumas',
                'source_name' => 'HDX / BPS / Badan Informasi Geospasial (BIG) — GeoJSON 27 Kecamatan Banyumas',
                'reference_source' => 'Kode Wilayah Administrasi Kemendagri / BPS (330201–330227)',
                'source_type' => 'Data Geospasial Vektor Polygon (GeoJSON WGS84 / EPSG:4326)',
                'source_category' => 'reference',
                'observation_year' => null,
                'period_start' => null,
                'period_end' => null,
                'spatial_unit' => '27 Kecamatan Kabupaten Banyumas',
                'indicator' => 'Batas Wilayah Administrasi Kecamatan (Polygon & MultiPolygon)',
                'granularity' => 'Batas Administrasi Kecamatan',
                'publication_status' => 'Resmi Dipublikasikan',
                'validation_status' => 'Terverifikasi 27 Polygon Kecamatan Lengkap',
                'update_date' => '2025-10-01',
                'description' => 'Menyediakan poligon batas wilayah administrasi untuk seluruh 27 kecamatan di Kabupaten Banyumas yang digunakan pada Peta Choropleth, Popup Detail Kecamatan, dan Perbandingan Periode.',
                'is_public_visible' => true,
            ]
        );

        // Restricted Internal Source Notice (2026 E-DBD Workbook)
        DatasetMetadata::updateOrCreate(
            ['dataset_code' => 'INT-EDBD-BMS-2026'],
            [
                'periode_id' => null,
                'dataset_name' => 'Rekapitulasi Surveilans E-DBD Dinas Kesehatan Kabupaten Banyumas Tahun 2026',
                'source_name' => 'Workbook Surveilans Epidemiologi E-DBD Banyumas Tahun Berjalan 2026 (Dinkes Kabupaten Banyumas)',
                'reference_source' => 'Rekapitulasi Internal Surveilans Puskesmas/Kecamatan (Januari–Oktober 2026)',
                'source_type' => 'Workbook Surveilans Internal Instansi (Akses Dibatasi)',
                'source_category' => 'internal_restricted',
                'observation_year' => 2026,
                'period_start' => '2026-01-01',
                'period_end' => '2026-10-31',
                'spatial_unit' => 'Kecamatan / Puskesmas',
                'indicator' => 'Rekapitulasi Kasus Surveilans Berjalan (Diisolasi dari Endpoint Publik)',
                'granularity' => 'Bulanan / Tahun Berjalan Parsial (Januari–Oktober 2026)',
                'publication_status' => 'Data Internal Belum Diizinkan Publikasi',
                'validation_status' => 'Terverifikasi Agregat Internal, Menunggu Izin Publikasi Resmi Dinkes',
                'update_date' => '2026-10-31',
                'description' => 'Sumber data surveilans tahun 2026 dari Dinas Kesehatan Kabupaten Banyumas belum memperoleh izin publikasi terbuka. Sesuai kebijakan keamanan dan etika data, angka dari sumber internal ini tidak ditampilkan ke publik dan tidak disediakan tautan unduhannya.',
                'is_public_visible' => true,
            ]
        );
    }
}

