<?php

namespace App\Services\Chatbot;

use App\Models\DatasetMetadata;
use App\Models\EducationContent;
use App\Models\EducationFaq;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Support\Str;

class WebgisContextRetriever
{
    private const MONTH_NAMES = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    /**
     * Retrieve relevant factual context from MySQL based on user query and recent history.
     */
    public function retrieveContext(string $query, array $history = []): array
    {
        $normalizedQuery = strtolower($query);

        // Include recent user & assistant messages for follow-up resolution (contextual conversation)
        $historyText = '';
        foreach (array_slice($history, -4) as $turn) {
            if (! empty($turn['content']) && is_string($turn['content'])) {
                $historyText .= ' ' . strtolower($turn['content']);
            }
        }

        $matchedKecamatan = $this->detectKecamatan($normalizedQuery, $historyText);
        $matchedYears = $this->detectYears($normalizedQuery, $historyText);
        $matchedMonth = $this->detectMonth($normalizedQuery, $historyText);

        $isAskingComparison = (bool) preg_match('/(bandingkan|perbandingan|dibandingkan|dibanding|versus|vs|tinggian mana|perubahan|selisih|tren naik|tren turun)/i', $normalizedQuery) || count($matchedYears) >= 2;
        $isAskingRanking = (bool) preg_match('/(tertinggi|terbanyak|terparah|paling tinggi|paling banyak|terendah|paling sedikit|ranking|urutan|prioritas|paling rawan|hotspot|zona merah|daerah mana yang paling)/i', $normalizedQuery);
        $isAskingZero = (bool) preg_match('/(nol kasus|0 kasus|bebas kasus|bebas dbd|nihil|tidak ada kasus|apakah ada.*nol)/i', $normalizedQuery);
        $isAskingTotal = (bool) preg_match('/(total|seluruh|semua|kabupaten|keseluruhan|se-banyumas)/i', $normalizedQuery);
        $isAskingChoropleth = (bool) preg_match('/(choropleth|baca peta|cara membaca peta|arti warna|warna peta|legenda|prioritas pemantauan)/i', $normalizedQuery);
        $isAskingHealth = (bool) preg_match('/(gejala|bahaya|tanda|fase|nyamuk|aedes|3m|kuras|tutup|daur|cegah|mencegah|pencegahan|fogging|abate|jentik|jumantik|trombosit|demam|penularan|siklus)/i', $normalizedQuery);
        $isAskingWebgis = (bool) preg_match('/(fitur|halaman|cara baca|cara pakai|apa itu webgis|tentang webgis|webgis dbd|peta|filter|perbandingan|grafik|tren|metadata|sumber|login|dashboard)/i', $normalizedQuery);

        $contextBlocks = [];
        $matchedEntities = [
            'kecamatan' => $matchedKecamatan?->nama,
            'years' => $matchedYears,
            'year' => ! empty($matchedYears) ? $matchedYears[0] : null,
            'month' => $matchedMonth ? (self::MONTH_NAMES[$matchedMonth] ?? $matchedMonth) : null,
            'topic' => null,
        ];

        // 1. COMPARISON RETRIEVAL: 2 Periods compared
        if ($isAskingComparison && count($matchedYears) >= 2) {
            $compBlock = $this->retrieveComparisonData($matchedYears[0], $matchedYears[1], $matchedKecamatan);
            if (! empty($compBlock)) {
                $contextBlocks[] = $compBlock;
                $matchedEntities['topic'] = 'perbandingan_kasus_dbd';
            }
        }
        // 2. DATA RETRIEVAL: Specific District, Year, Ranking, Zero Cases, or Total
        elseif (! empty($matchedYears) || $matchedKecamatan || $isAskingRanking || $isAskingTotal || $isAskingZero) {
            $targetYear = ! empty($matchedYears) ? $matchedYears[0] : null;
            $dataBlock = $this->retrieveCaseData($matchedKecamatan, $targetYear, $matchedMonth, $isAskingRanking, $isAskingTotal, $isAskingZero);
            if (! empty($dataBlock)) {
                $contextBlocks[] = $dataBlock;
                $matchedEntities['topic'] = 'data_kasus_dbd';
            }
        }

        // 3. CHOROPLETH & MAP METHODOLOGY RETRIEVAL
        if ($isAskingChoropleth) {
            $contextBlocks[] = $this->getChoroplethExplanationBlock();
            $matchedEntities['topic'] = 'peta_choropleth';
        }

        // 4. HEALTH EDUCATION RETRIEVAL
        if ($isAskingHealth) {
            $eduBlock = $this->retrieveEducationData($normalizedQuery);
            if (! empty($eduBlock)) {
                $contextBlocks[] = $eduBlock;
                $matchedEntities['topic'] = $matchedEntities['topic'] ?? 'edukasi_kesehatan';
            }
        }

        // 5. WEBGIS OVERVIEW (FALLBACK OR GENERAL SYSTEM QUESTIONS)
        if ($isAskingWebgis || empty($contextBlocks)) {
            $contextBlocks[] = $this->getWebgisOverviewBlock();
            $matchedEntities['topic'] = $matchedEntities['topic'] ?? 'fitur_webgis';
        }

        return [
            'context_text' => implode("\n\n---\n\n", array_unique($contextBlocks)),
            'matched_entities' => $matchedEntities,
        ];
    }

    /**
     * Retrieve comparative data between two published periods.
     */
    private function retrieveComparisonData(int $yearA, int $yearB, ?Kecamatan $kecamatan): string
    {
        // Order years chronologically
        if ($yearA > $yearB) {
            $tmp = $yearA;
            $yearA = $yearB;
            $yearB = $tmp;
        }

        $periodA = Periode::published()->where('tahun', $yearA)->where('tipe_periode', 'annual')->first()
            ?? Periode::published()->where('tahun', $yearA)->first();
        $periodB = Periode::published()->where('tahun', $yearB)->where('tipe_periode', 'annual')->first()
            ?? Periode::published()->where('tahun', $yearB)->first();

        if (! $periodA || ! $periodB) {
            return "[DATA PERBANDINGAN WEBGIS DBD BANYUMAS]\n" .
                "- Periode dibandingkan: Tahun {$yearA} vs Tahun {$yearB}\n" .
                "- Keterangan: Salah satu atau kedua periode belum dipublikasikan secara resmi di sistem WebGIS.";
        }

        $out = "[DATA PERBANDINGAN RESMI KASUS DBD BANYUMAS (MYSQL)]\n";
        $out .= "- Periode A: {$periodA->nama} (" . strtoupper($periodA->tipe_periode) . ")\n";
        $out .= "- Periode B: {$periodB->nama} (" . strtoupper($periodB->tipe_periode) . ")\n";
        $out .= "- Sumber Data: " . ($periodA->sumber_data ?: 'Dinas Kesehatan Kabupaten Banyumas') . "\n";

        if ($kecamatan) {
            $caseA = KasusAgregat::published()->where('periode_id', $periodA->id)->where('kecamatan_id', $kecamatan->id)->first();
            $caseB = KasusAgregat::published()->where('periode_id', $periodB->id)->where('kecamatan_id', $kecamatan->id)->first();

            $valA = $caseA?->jumlah_kasus ?? 0;
            $valB = $caseB?->jumlah_kasus ?? 0;
            $diff = $valB - $valA;
            $pct = $valA > 0 ? round(($diff / $valA) * 100, 2) : 0;
            $pctStr = ($diff > 0 ? '+' : '') . $pct . '%';

            $out .= "- Kecamatan: {$kecamatan->nama}\n";
            $out .= "  * Kasus Tahun {$yearA}: {$valA} kasus\n";
            $out .= "  * Kasus Tahun {$yearB}: {$valB} kasus\n";
            $out .= "  * Selisih Perubahan: " . ($diff > 0 ? "+{$diff}" : "{$diff}") . " kasus ({$pctStr})\n";
            $out .= "  * Tren: " . ($diff > 0 ? "Terjadi kenaikan kasus sebesar {$diff} kasus." : ($diff < 0 ? "Terjadi penurunan kasus sebesar " . abs($diff) . " kasus." : "Jumlah kasus stabil/sama."));

            return $out;
        }

        $allA = KasusAgregat::published()->where('periode_id', $periodA->id)->get();
        $allB = KasusAgregat::published()->where('periode_id', $periodB->id)->get();

        $totA = $allA->sum('jumlah_kasus');
        $totB = $allB->sum('jumlah_kasus');
        $diff = $totB - $totA;
        $pct = $totA > 0 ? round(($diff / $totA) * 100, 2) : 0;
        $pctStr = ($diff > 0 ? '+' : '') . $pct . '%';

        $out .= "- Total Kasus Kabupaten Banyumas Tahun {$yearA}: " . number_format($totA, 0, ',', '.') . " kasus\n";
        $out .= "- Total Kasus Kabupaten Banyumas Tahun {$yearB}: " . number_format($totB, 0, ',', '.') . " kasus\n";
        $out .= "- Selisih Perubahan Antartahun: " . ($diff > 0 ? "+{$diff}" : "{$diff}") . " kasus ({$pctStr})\n";
        $out .= "- Kesimpulan Tren: " . ($diff > 0 ? "Terjadi peningkatan kasus secara keseluruhan di Kabupaten Banyumas dari tahun {$yearA} ke {$yearB}." : ($diff < 0 ? "Terjadi penurunan kasus secara keseluruhan di Kabupaten Banyumas dari tahun {$yearA} ke {$yearB}." : "Kasus agregat stabil/sama.")) . "\n";
        $out .= "- Keterangan Metodologi: Keduanya bersumber dari Data Agregat Tahunan Terverifikasi Dinas Kesehatan Kabupaten Banyumas yang mencakup 27 kecamatan.";

        return $out;
    }

    /**
     * Retrieve case figures strictly from published MySQL tables.
     */
    private function retrieveCaseData(?Kecamatan $kecamatan, ?int $year, ?int $month, bool $isRanking, bool $isTotal, bool $isZeroCases = false): string
    {
        $publishedPeriods = Periode::published()
            ->when($year, fn ($q) => $q->where('tahun', $year))
            ->orderBy('tahun')
            ->orderBy('bulan')
            ->get();

        if ($publishedPeriods->isEmpty()) {
            if ($year) {
                return "[DATA DATABASE WEBGIS DBD BANYUMAS]\n" .
                    "- Tahun dicari: {$year}\n" .
                    "- Keterangan Ketersediaan: Data resmi untuk tahun {$year} BELUM TERSEDIA dalam publikasi WebGIS. Periode yang tersedia di sistem adalah 2022, 2023, 2024, 2025 (Data Agregat Tahunan Terverifikasi Dinkes Banyumas) dan 2026 (Data Dinamika Bulanan Berjalan: Januari, Februari, Maret). Sampaikan apa adanya bahwa data tahun {$year} belum tersedia.";
            }

            return '';
        }

        // Target latest verified year (2025) or specified year
        $targetYear = $year ?? ($publishedPeriods->where('tipe_periode', 'annual')->max('tahun') ?? $publishedPeriods->max('tahun'));
        $yearPeriods = $publishedPeriods->where('tahun', $targetYear);

        $out = "[DATA DATABASE WEBGIS DBD BANYUMAS (TERVERIFIKASI & DIPUBLIKASIKAN)]\n";
        $out .= "- Wilayah Cakupan: Kabupaten Banyumas, Jawa Tengah (27 Kecamatan)\n";
        $out .= "- Tahun Data: {$targetYear}\n";

        // Status data explanation
        if ($targetYear >= 2022 && $targetYear <= 2025) {
            $out .= "- Kategori Dataset: Data Agregat Tahunan Terverifikasi resmi bersumber dari Dinas Kesehatan Kabupaten Banyumas.\n";
        } elseif ($targetYear === 2026) {
            $out .= "- Kategori Dataset: Data Dinamika Bulanan Berjalan (Januari–Maret 2026) digunakan untuk peragaan pemantauan spasial-temporal bulanan.\n";
        }

        $isYearMonthly = $yearPeriods->whereNotNull('bulan')->isNotEmpty();
        $targetPeriod = null;

        if ($isYearMonthly) {
            if ($month) {
                $targetPeriod = $yearPeriods->firstWhere('bulan', $month);
                if (! $targetPeriod) {
                    $monthName = self::MONTH_NAMES[$month] ?? "Bulan {$month}";
                    $out .= "- Periode: {$monthName} {$targetYear}\n";
                    $out .= "- Status Ketersediaan: Rincian bulanan untuk {$monthName} {$targetYear} BELUM TERSEDIA / belum dipublikasikan oleh Dinas Kesehatan (Bulan yang tersedia pada 2026: Januari, Februari, Maret).\n";
                    return $out;
                }
            } else {
                $targetPeriod = $yearPeriods->whereNotNull('bulan')->sortByDesc('bulan')->first();
            }
        } else {
            $targetPeriod = $yearPeriods->firstWhere('tipe_periode', 'annual') ?? $yearPeriods->first();
            if ($month) {
                $monthName = self::MONTH_NAMES[$month] ?? "Bulan {$month}";
                $out .= "- Catatan Granularitas: Untuk tahun {$targetYear}, data bersumber dari Data Agregat Tahunan Terverifikasi. Rincian per-bulan ({$monthName}) TIDAK TERSEDIA dalam dataset tahunan ini. Sistem memiliki angka akumulasi penuh tahun {$targetYear}.\n";
            }
        }

        if (! $targetPeriod) {
            return $out . "- Keterangan: Periode data yang diminta belum tersedia.";
        }

        $out .= "- Nama Periode: {$targetPeriod->nama} (Tipe: " . strtoupper($targetPeriod->tipe_periode) . ")\n";

        // Case A: Specific District Requested
        if ($kecamatan) {
            $caseRecord = KasusAgregat::published()
                ->where('periode_id', $targetPeriod->id)
                ->where('kecamatan_id', $kecamatan->id)
                ->first();

            $out .= "- Kecamatan: {$kecamatan->nama} (Kode: {$kecamatan->kode})\n";
            $out .= "- Jumlah Penduduk: " . number_format($kecamatan->jumlah_penduduk, 0, ',', '.') . " jiwa\n";
            if ($caseRecord) {
                $out .= "- Jumlah Kasus DBD: {$caseRecord->jumlah_kasus} kasus\n";
                $out .= "- Kematian DBD: {$caseRecord->jumlah_meninggal} orang\n";
                $out .= "- Kasus Laki-laki: {$caseRecord->kasus_laki_laki} | Kasus Perempuan: {$caseRecord->kasus_perempuan}\n";
                $out .= "- Incidence Rate (IR): " . ($caseRecord->incidence_rate ?? '0') . " per 100.000 penduduk\n";
                $priority = $caseRecord->jumlah_kasus >= 10
                    ? 'Wilayah Prioritas Pemantauan (Tinggi / Merah Tua)'
                    : ($caseRecord->jumlah_kasus >= 5
                        ? 'Peningkatan Kewaspadaan (Sedang / Oranye)'
                        : ($caseRecord->jumlah_kasus >= 1 ? 'Pemantauan Rutin (Rendah / Kuning Muda)' : 'Nol Kasus (Putih)'));
                $out .= "- Klasifikasi Warna Peta: {$priority}\n";
            } else {
                $out .= "- Jumlah Kasus DBD: Data tidak tercatat atau belum tersedia untuk kecamatan ini pada periode tersebut.\n";
            }

            return $out;
        }

        // Case B: Total Kabupaten or Ranking
        $allCases = KasusAgregat::published()
            ->where('periode_id', $targetPeriod->id)
            ->with('kecamatan:id,nama,kode')
            ->get();

        $totalKasus = $allCases->sum('jumlah_kasus');
        $totalMeninggal = $allCases->sum('jumlah_meninggal');
        $out .= "- Total Kasus Seluruh Kabupaten Banyumas (27 Kecamatan): " . number_format($totalKasus, 0, ',', '.') . " kasus\n";
        $out .= "- Total Kematian: {$totalMeninggal} orang\n";

        $sortedCases = $allCases->sortByDesc('jumlah_kasus')->values();
        if ($sortedCases->isNotEmpty()) {
            $out .= "- Kecamatan Kasus Tertinggi (Wilayah Prioritas Pemantauan):\n";
            foreach ($sortedCases->take(5) as $idx => $c) {
                $num = $idx + 1;
                $out .= "  {$num}. {$c->kecamatan?->nama}: {$c->jumlah_kasus} kasus (IR: {$c->incidence_rate})\n";
            }
            $lowest = $sortedCases->last();
            if ($lowest) {
                $out .= "- Kecamatan dengan Kasus Terendah: {$lowest->kecamatan?->nama} ({$lowest->jumlah_kasus} kasus)\n";
            }
        }

        $zeroCases = $allCases->filter(fn ($c) => (int) $c->jumlah_kasus === 0);
        if ($zeroCases->isNotEmpty()) {
            $out .= "- Kecamatan dengan 0 Kasus (Bebas Laporan Kasus Pada Periode Ini):\n";
            foreach ($zeroCases->take(10) as $zc) {
                $out .= "  * {$zc->kecamatan?->nama}: 0 kasus\n";
            }
        } else {
            $out .= "- Laporan Kasus Nol: Pada periode ini tidak ada kecamatan yang mencatatkan 0 kasus (seluruh 27 kecamatan melaporkan kasus DBD minimal 1 kasus).\n";
        }

        $out .= "- Perbedaan Nol Kasus vs Data Belum Tersedia:\n";
        $out .= "  * 'Nol Kasus' (0 Kasus): Berarti wilayah tersebut telah terpantau dalam sistem surveilans dan terkonfirmasi tidak ditemukan laporan kasus DBD pada periode tersebut (warna poligon putih pada peta choropleth).\n";
        $out .= "  * 'Data Belum Tersedia': Berarti Dinas Kesehatan belum mempublikasikan laporan resmi untuk periode tersebut (misalnya bulan-bulan di masa mendatang atau rincian bulanan pada data tahunan). Sistem WebGIS tidak boleh mengasumsikan data belum tersedia sebagai nol kasus.\n";
        $out .= "- Catatan Metodologi Spasial: Istilah 'Wilayah Prioritas Pemantauan' merujuk pada klasifikasi pemetaan choropleth dengan jumlah kasus ≥10 (merah tua). Jangan menggunakan istilah 'hotspot klaster signifikan secara statistik' karena sistem ini tidak menjalankan uji statistik inferensial spasial (seperti Getis-Ord Gi* atau Moran's I).\n";

        return $out;
    }

    /**
     * Explanation of Choropleth map, colors, and priority monitoring.
     */
    private function getChoroplethExplanationBlock(): string
    {
        return "[PANDUAN PEMBACAAN PETA CHOROPLETH WEBGIS DBD BANYUMAS]\n" .
            "- Pengertian Peta Choropleth: Visualisasi peta tematik yang menampilkan batas 27 poligon kecamatan Kabupaten Banyumas dengan gradasi warna berdasarkan jumlah kasus DBD pada periode yang dipilih.\n" .
            "- 4 Tingkat Klasifikasi Legenda Warna Peta:\n" .
            "  1. Putih: 0 Kasus (Wilayah tanpa laporan kasus DBD pada periode tersebut).\n" .
            "  2. Kuning Muda (#fed7aa): 1–4 Kasus (Pemantauan Rutin).\n" .
            "  3. Oranye (#fb923c): 5–9 Kasus (Peningkatan Kewaspadaan).\n" .
            "  4. Merah Tua (#dc2626): ≥10 Kasus (Wilayah Prioritas Pemantauan).\n" .
            "- Arti 'Wilayah Prioritas Pemantauan': Kategori wilayah dengan konsentrasi kasus tertinggi (≥10 kasus) yang memerlukan perhatian khusus, penyelidikan epidemiologi, dan kegiatan PSN 3M Plus lebih intensif. Istilah ini merujuk pada batas klasifikasi pemetaan deskriptif, bukan pengujian klaster spasial inferensial statistik.\n" .
            "- Cara Membaca & Interaktivitas:\n" .
            "  * Arahkan kursor atau sentuh poligon kecamatan untuk melihat tooltip ringkas.\n" .
            "  * Klik poligon kecamatan untuk membuka popup rincian lengkap (jumlah kasus, kematian, incidence rate per 100.000 penduduk, kasus laki-laki/perempuan, dan status validitas data).\n" .
            "  * Gunakan menu dropdown Filter Periode di bilah atas untuk beralih antar-tahun (2022–2026) dan antar-bulan.";
    }

    /**
     * Retrieve health education verified content and FAQs from MySQL.
     */
    private function retrieveEducationData(string $query): string
    {
        $faqs = EducationFaq::where('is_active', true)
            ->orderBy('sort_order')
            ->take(4)
            ->get();

        $out = "[PANDUAN RESMI KESEHATAN DBD & 3M PLUS (KEMENKES RI & WHO)]\n";
        $out .= "- Penyakit: Demam Berdarah Dengue (DBD) disebabkan infeksi virus Dengue melalui gigitan nyamuk Aedes aegypti dan Aedes albopictus.\n";
        $out .= "- Jam Menggigit Nyamuk Aedes: Pagi hari (08.00–10.00) dan sore hari (15.00–17.00).\n";
        $out .= "- 3 Fase Perjalanan DBD:\n";
        $out .= "  1. Fase Demam (Hari 1–3): Demam mendadak tinggi (39–40°C), sakit kepala berat, nyeri belakang bola mata, nyeri otot/sendi, mual.\n";
        $out .= "  2. Fase Kritis (Hari 4–5): Demam justru turun menyerupai sembuh, tetapi ini FASE PALING BERBAHAYA karena risiko kebocoran plasma darah dan syok (Dengue Shock Syndrome).\n";
        $out .= "  3. Fase Pemulihan (Hari 6–7): Cairan tubuh kembali stabil, nafsu makan membaik, trombosit meningkat kembali.\n";
        $out .= "- Tanda Bahaya (Warning Signs) Medis Segera: Nyeri perut hebat, muntah terus-menerus, perdarahan (gusi berdarah, mimisan, muntah darah, tinja hitam), lemas ekstrem/letargi, sesak napas. Pasien HARUS SEGERA DIBAWA KE IGD PUSKESMAS / RUMAH SAKIT!\n";
        $out .= "- Gerakan 3M Plus:\n";
        $out .= "  1. Menguras penampungan air minimal 1x seminggu.\n";
        $out .= "  2. Menutup rapat wadah penampungan air.\n";
        $out .= "  3. Mendaur ulang barang bekas yang berpotensi menampung air hujan.\n";
        $out .= "  + Plus: Memelihara ikan pemakan jentik, larvasida abate (1 gram per 10 liter air), kawat kasa ventilasi, kelambu tidur, lotion antinyamuk, dan gerakan 1 Rumah 1 Jumantik.\n";

        if ($faqs->isNotEmpty()) {
            $out .= "\n[FAQ RESMI TERKAIT]:\n";
            foreach ($faqs->take(3) as $faq) {
                $out .= "Q: {$faq->question}\nA: " . Str::limit($faq->answer, 180) . "\n";
            }
        }

        return $out;
    }

    /**
     * Provide overview of WebGIS features and routes.
     */
    private function getWebgisOverviewBlock(): string
    {
        return "[INFORMASI SISTEM & FITUR WEBGIS DBD KABUPATEN BANYUMAS]\n" .
            "- Pengertian Sistem: WebGIS DBD Kabupaten Banyumas adalah platform sistem informasi geospasial resmi untuk pemantauan dinamika spasial-temporal kasus Demam Berdarah Dengue (DBD) di 27 kecamatan Kabupaten Banyumas, Jawa Tengah. Bertujuan mendukung kesiapsiagaan preventif masyarakat, deteksi dini wilayah rawan, dan transparansi data kesehatan masyarakat.\n" .
            "- Beranda (Landing Page - /): Gambaran umum sistem, metrik agregat 27 kecamatan, pratinjau gerakan 3M Plus, dan tombol 'Pelajari Selengkapnya' yang mengarahkan ke halaman edukasi komprehensif (/edukasi).\n" .
            "- Dashboard Publik (/dashboard): Ringkasan metrik epidemiologi kabupaten, kartu indikator total kasus, kematian, Case Fatality Rate (CFR), incidence rate (IR), serta tabel distribusi peringkat kasus.\n" .
            "- Peta WebGIS Choropleth (/peta): Peta interaktif 27 batas poligon kecamatan berbasis Leaflet & OpenStreetMap, gradasi warna choropleth 4 kategori, filter periode tahun (2022-2026) dan bulan, serta interaktivitas hover tooltip dan klik popup detail statistik.\n" .
            "- Perbandingan Periode (/perbandingan): Workbench komparasi dua periode (Periode A vs Periode B) secara berdampingan untuk mengamati selisih absolut angka kasus dan persentase perubahan spasial-temporal.\n" .
            "- Grafik Tren Kasus (/tren): Visualisasi grafik garis interaktif deret waktu kasus tahunan (2022–2026) dan fluktuasi bulanan dengan batas kelengkapan data.\n" .
            "- Metadata Dataset (/metadata): Transparansi tata kelola data, sumber data resmi Dinas Kesehatan Kabupaten Banyumas, metodologi agregasi wilayah, kamus indikator, dan prinsip perlindungan privasi pasien.\n" .
            "- Halaman Edukasi (/edukasi): Materi komprehensif DBD, siklus hidup vektor nyamuk Aedes aegypti dan Aedes albopictus, 3 fase perjalanan penyakit, tanda bahaya medis darurat, panduan 3M Plus, peran Jumantik, dan tanya-jawab resmi (FAQ).\n" .
            "- Login Admin (/login): Gerbang otentikasi petugas/administrator WebGIS untuk manajemen pemutakhiran data kasus dan artikel edukasi kesehatan.";
    }

    /**
     * Match a kecamatan name from the query or history.
     */
    private function detectKecamatan(string $query, string $history): ?Kecamatan
    {
        $allKecamatan = Kecamatan::all();

        // Check in current query first
        foreach ($allKecamatan as $kec) {
            $name = strtolower($kec->nama);

            // Avoid false positive on "Banyumas" when referring to the regency or platform name
            if ($name === 'banyumas') {
                if (preg_match('/(webgis\s+(dbd\s+)?banyumas|kabupaten\s+banyumas|se-banyumas|kab\.\s*banyumas)/i', $query) && ! preg_match('/kecamatan\s+banyumas/i', $query)) {
                    continue;
                }
            }

            if (str_contains($query, $name)) {
                return $kec;
            }
        }

        // Secondary check: common aliases
        $aliases = [
            'pwt selatan' => 'Purwokerto Selatan',
            'pwt utara' => 'Purwokerto Utara',
            'pwt barat' => 'Purwokerto Barat',
            'pwt timur' => 'Purwokerto Timur',
            'purwokerto sel' => 'Purwokerto Selatan',
            'purwokerto ut' => 'Purwokerto Utara',
            'purwokerto bar' => 'Purwokerto Barat',
            'purwokerto tim' => 'Purwokerto Timur',
        ];
        foreach ($aliases as $alias => $realName) {
            if (str_contains($query, $alias)) {
                return $allKecamatan->firstWhere('nama', $realName);
            }
        }

        // Check in recent history (user or assistant context) for follow-up questions like "di sana"
        foreach ($allKecamatan as $kec) {
            $name = strtolower($kec->nama);

            if ($name === 'banyumas') {
                if (preg_match('/(webgis\s+(dbd\s+)?banyumas|kabupaten\s+banyumas|se-banyumas|kab\.\s*banyumas)/i', $history) && ! preg_match('/kecamatan\s+banyumas/i', $history)) {
                    continue;
                }
            }

            if (str_contains($history, $name)) {
                return $kec;
            }
        }

        return null;
    }

    /**
     * Match all years (2022 - 2026) from query or history, including relative expressions.
     */
    private function detectYears(string $query, string $history): array
    {
        preg_match_all('/\b(202[2-6])\b/', $query, $matches);
        $years = array_map('intval', array_unique($matches[1] ?? []));

        if (empty($years)) {
            // Check for relative temporal expressions
            $isPrevious = (bool) preg_match('/(tahun sebelumnya|tahun lalu|sebelumnya|kemarin)/i', $query);
            $isNext = (bool) preg_match('/(tahun berikutnya|tahun setelahnya|sesudahnya|berikutnya)/i', $query);

            preg_match_all('/\b(202[2-6])\b/', $history, $histMatches);
            $histYears = array_map('intval', array_unique($histMatches[1] ?? []));

            if (! empty($histYears)) {
                $lastYear = end($histYears);
                if ($isPrevious) {
                    $targetYear = $lastYear - 1;
                    if ($targetYear >= 2022 && $targetYear <= 2026) {
                        return [$targetYear];
                    }
                } elseif ($isNext) {
                    $targetYear = $lastYear + 1;
                    if ($targetYear >= 2022 && $targetYear <= 2026) {
                        return [$targetYear];
                    }
                }
                $years = $histYears;
            }
        }

        return $years;
    }

    /**
     * Match a month name from query or history.
     */
    private function detectMonth(string $query, string $history): ?int
    {
        $months = [
            'januari' => 1, 'jan' => 1,
            'februari' => 2, 'feb' => 2,
            'maret' => 3, 'mar' => 3,
            'april' => 4, 'apr' => 4,
            'mei' => 5,
            'juni' => 6, 'jun' => 6,
            'juli' => 7, 'jul' => 7,
            'agustus' => 8, 'agu' => 8, 'agt' => 8,
            'september' => 9, 'sep' => 9,
            'oktober' => 10, 'okt' => 10,
            'november' => 11, 'nov' => 11,
            'desember' => 12, 'des' => 12,
        ];

        foreach ($months as $name => $num) {
            if (preg_match('/\b' . preg_quote($name, '/') . '\b/i', $query)) {
                return $num;
            }
        }

        foreach ($months as $name => $num) {
            if (preg_match('/\b' . preg_quote($name, '/') . '\b/i', $history)) {
                return $num;
            }
        }

        return null;
    }
}
