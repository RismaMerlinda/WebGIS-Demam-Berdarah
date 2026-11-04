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
                            {--file= : Path to CSV aggregate file (default: database/seeders/data/agregat_kecamatan_dinkes_2026_internal.csv)}
                            {--allow-publish : Authorize publication status to DAPAT_DIPUBLIKASIKAN (default: false)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import or update verified Dinkes Banyumas 2026 aggregate data with strict privacy checks';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
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
