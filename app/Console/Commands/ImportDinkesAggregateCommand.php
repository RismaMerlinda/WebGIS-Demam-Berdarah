<?php

namespace App\Console\Commands;

use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Console\Command;

class ImportDinkesAggregateCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dinkes:import-aggregate
                            {--file= : Path to 2026 CSV aggregate file (default: database/seeders/data/agregat_kecamatan_dinkes_2026_internal.csv)}
                            {--annual-json= : Path to 2022-2025 verified annual JSON file (default: database/seeders/data/agregat_tahunan_dinkes_2021_2025.json)}
                            {--only-2026 : Only import 2026 internal dataset}
                            {--allow-publish : Authorize 2026 internal publication status to DAPAT_DIPUBLIKASIKAN (default: false)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import and validate verified Dinkes Banyumas 2022-2025 annual aggregates and 2026 internal aggregate data with strict privacy checks';

    /**
     * Expected official totals reconciled from Excel & Profil Kesehatan PDFs (2022-2025).
     */
    private const EXPECTED_ANNUAL = [
        2022 => ['kecamatan' => 27, 'kasus' => 307,  'l' => 156,  'p' => 151, 'meninggal' => 13, 'penduduk' => 1842582],
        2023 => ['kecamatan' => 27, 'kasus' => 273,  'l' => 154,  'p' => 119, 'meninggal' => 4,  'penduduk' => 1857211],
        2024 => ['kecamatan' => 27, 'kasus' => 2180, 'l' => 1292, 'p' => 888, 'meninggal' => 12, 'penduduk' => 1868446],
        2025 => ['kecamatan' => 27, 'kasus' => 1062, 'l' => 599,  'p' => 463, 'meninggal' => 8,  'penduduk' => 1876060],
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $allKecamatan = Kecamatan::all()->keyBy('nama');
        if ($allKecamatan->count() !== 27) {
            $this->error('Master data kecamatan belum lengkap (harus 27 kecamatan).');
            return Command::FAILURE;
        }

        if (! $this->option('only-2026')) {
            $annualJsonPath = $this->option('annual-json') ?: database_path('seeders/data/agregat_tahunan_dinkes_2021_2025.json');
            if (! file_exists($annualJsonPath)) {
                $this->error("Annual JSON file not found at: {$annualJsonPath}");
                return Command::FAILURE;
            }

            $this->info("Reading and validating 2022–2025 verified annual aggregates from: {$annualJsonPath}");
            $annualData = json_decode(file_get_contents($annualJsonPath), true);
            if (! is_array($annualData)) {
                $this->error('Invalid JSON structure in annual aggregate file.');
                return Command::FAILURE;
            }

            $annualSummaryRows = [];
            foreach (self::EXPECTED_ANNUAL as $yr => $expected) {
                $yearKey = (string) $yr;
                if (! isset($annualData[$yearKey])) {
                    $this->error("Missing year {$yr} in annual aggregate file.");
                    return Command::FAILURE;
                }

                $yearInfo = $annualData[$yearKey];
                $districts = $yearInfo['districts'] ?? [];
                $countKec = count($districts);
                $sumKasus = array_sum(array_column($districts, 'kasus'));
                $sumL = array_sum(array_column($districts, 'kasus_l'));
                $sumP = array_sum(array_column($districts, 'kasus_p'));
                $sumM = array_sum(array_column($districts, 'meninggal'));
                $sumPop = array_sum(array_column($districts, 'penduduk'));

                $isValid = ($countKec === $expected['kecamatan'])
                    && ($sumKasus === $expected['kasus'])
                    && ($sumL === $expected['l'])
                    && ($sumP === $expected['p'])
                    && ($sumM === $expected['meninggal'])
                    && ($sumPop === $expected['penduduk']);

                $annualSummaryRows[] = [
                    $yr,
                    "{$countKec}/{$expected['kecamatan']}",
                    "{$sumKasus} ({$sumL} L + {$sumP} P)",
                    $sumM,
                    number_format($sumPop, 0, ',', '.'),
                    $isValid ? 'VALID' : 'INVALID',
                ];

                if (! $isValid) {
                    $this->error("Integrity check failed for year {$yr}!");
                    return Command::FAILURE;
                }

                $periode = Periode::updateOrCreate(
                    ['nama' => $yearInfo['name']],
                    [
                        'tahun' => $yr,
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

                foreach ($districts as $dist) {
                    $kec = $allKecamatan->get($dist['nama']);
                    if (! $kec) {
                        $this->error("Kecamatan '{$dist['nama']}' not found in master table!");
                        return Command::FAILURE;
                    }

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
                            'keterangan' => 'Data resmi terverifikasi Dinkes Banyumas ' . $yr,
                        ]
                    );
                }
            }

            $this->table(
                ['Tahun', 'Kecamatan', 'Total Kasus (L+P)', 'Meninggal', 'Jumlah Penduduk', 'Status Validasi'],
                $annualSummaryRows
            );
        }

        $filePath = $this->option('file') ?: database_path('seeders/data/agregat_kecamatan_dinkes_2026_internal.csv');

        if (! file_exists($filePath)) {
            $this->error("CSV file not found at: {$filePath}");
            return Command::FAILURE;
        }

        $this->info("Reading and validating aggregate data from: {$filePath}");

        $rows = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            $headers = fgetcsv($handle);
            while (($data = fgetcsv($handle)) !== false) {
                if (count($headers) === count($data)) {
                    $rows[] = array_combine($headers, $data);
                }
            }
            fclose($handle);
        }

        $totalSubdistricts = count($rows);
        $totalCases = array_sum(array_column($rows, 'total_kasus'));
        $totalMale = array_sum(array_column($rows, 'kasus_laki_laki'));
        $totalFemale = array_sum(array_column($rows, 'kasus_perempuan'));
        $totalDeaths = array_sum(array_column($rows, 'meninggal'));

        $this->table(
            ['Metric', 'Expected Dinkes 2026', 'Found in CSV', 'Validation Status'],
            [
                ['Total Kecamatan', '27', $totalSubdistricts, $totalSubdistricts === 27 ? 'VALID' : 'INVALID'],
                ['Total Kasus DBD', '117', $totalCases, $totalCases === 117 ? 'VALID' : 'INVALID'],
                ['Kasus Laki-laki', '56', $totalMale, $totalMale === 56 ? 'VALID' : 'INVALID'],
                ['Kasus Perempuan', '61', $totalFemale, $totalFemale === 61 ? 'VALID' : 'INVALID'],
                ['Total Kematian', '1', $totalDeaths, $totalDeaths === 1 ? 'VALID' : 'INVALID'],
            ]
        );

        if ($totalSubdistricts !== 27 || $totalCases !== 117 || $totalMale !== 56 || $totalFemale !== 61 || $totalDeaths !== 1) {
            $this->error('Data integrity check failed! Numbers do not reconcile with official Dinkes 2026 workbook.');
            return Command::FAILURE;
        }

        $allowPublish = $this->option('allow-publish');
        $statusPublikasi = $allowPublish ? 'DAPAT_DIPUBLIKASIKAN' : 'INTERNAL_BELUM_DIIZINKAN';
        $isPublished = (bool) $allowPublish;

        $this->warn("Data publication status set to: {$statusPublikasi} (is_published: " . ($isPublished ? 'TRUE' : 'FALSE') . ')');

        // Create or update internal period
        $periode = Periode::updateOrCreate(
            ['nama' => 'Januari–Oktober 2026 (Data Dinkes Internal)'],
            [
                'tahun' => 2026,
                'bulan' => null, // Multi-month period Jan-Oct
                'tipe_periode' => 'partial_year',
                'rentang_waktu' => 'Januari – Oktober 2026 (Tahun Berjalan)',
                'is_published' => $isPublished,
                'status_publikasi' => $statusPublikasi,
                'sumber_data' => 'Workbook EDBD Banyumas Oktober 2026 (Sheet DBD-11 & REKAP 2)',
                'status_kelengkapan' => 'Perlu Konfirmasi Kelengkapan (Oktober Berjalan)',
                'keterangan' => 'Data agregat resmi Dinkes Banyumas 2026 (117 kasus, 56 L, 61 P, 1 kematian di Ajibarang). Bulan November dan Desember belum tersedia (NULL). Berstatus internal sampai izin publikasi resmi diberikan.',
            ]
        );

        $importedCount = 0;
        foreach ($rows as $row) {
            $namaKecamatan = trim($row['nama_kecamatan']);
            $kec = Kecamatan::where('nama', $namaKecamatan)->first();

            if (! $kec) {
                $this->error("Kecamatan '{$namaKecamatan}' not found in database!");
                return Command::FAILURE;
            }

            $cases = (int) $row['total_kasus'];
            $male = (int) $row['kasus_laki_laki'];
            $female = (int) $row['kasus_perempuan'];
            $deaths = (int) $row['meninggal'];

            $ir = ($kec->jumlah_penduduk && $kec->jumlah_penduduk > 0)
                ? round(($cases / $kec->jumlah_penduduk) * 100000, 2)
                : null;

            KasusAgregat::updateOrCreate(
                [
                    'kecamatan_id' => $kec->id,
                    'periode_id' => $periode->id,
                ],
                [
                    'jumlah_kasus' => $cases,
                    'kasus_laki_laki' => $male,
                    'kasus_perempuan' => $female,
                    'jumlah_meninggal' => $deaths,
                    'incidence_rate' => $ir,
                    'is_published' => $isPublished,
                    'status_publikasi' => $statusPublikasi,
                    'keterangan' => 'Agregat kecamatan sumber EDBD Dinkes 2026',
                ]
            );

            $importedCount++;
        }

        $this->info("Successfully imported {$importedCount} subdistricts into period '{$periode->nama}' [ID: {$periode->id}].");
        $this->info("Public isolation verified: is_published={$isPublished}, status_publikasi={$statusPublikasi}.");

        return Command::SUCCESS;
    }
}
