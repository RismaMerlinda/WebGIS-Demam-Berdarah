<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Periode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class PeriodManagementController extends Controller
{
    /**
     * Nama-nama bulan standar dalam Bahasa Indonesia.
     */
    private const INDONESIAN_MONTHS = [
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
     * Singkatan nama bulan.
     */
    private const INDONESIAN_MONTHS_SHORT = [
        1 => 'Jan',
        2 => 'Feb',
        3 => 'Mar',
        4 => 'Apr',
        5 => 'Mei',
        6 => 'Jun',
        7 => 'Jul',
        8 => 'Agu',
        9 => 'Sep',
        10 => 'Okt',
        11 => 'Nov',
        12 => 'Des',
    ];

    /**
     * Mengambil daftar data periode waktu observasi kasus DBD dengan
     * dukungan pencarian, penyaringan tahun, ringkasan metrik, dan pagination (System Feature 25).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $search = trim((string) $request->input('search', ''));
            $yearFilter = $request->input('year', 'all');
            $statusFilter = $request->input('status', 'all');
            $perPage = $request->input('per_page', 10);

            // 1. Hitung Ringkasan Metrik (Berdasarkan basis data aktual MySQL)
            $summaryStats = [
                'total_periods' => (int) Periode::count(),
                'total_years' => (int) Periode::distinct('tahun')->count('tahun'),
                'published_count' => (int) Periode::where('is_published', true)->count(),
                'unpublished_count' => (int) Periode::where('is_published', false)->count(),
            ];

            // 2. Ambil daftar tahun observasi unik yang tersedia
            $availableYears = Periode::select('tahun')
                ->distinct()
                ->orderBy('tahun', 'desc')
                ->pluck('tahun')
                ->map(fn ($y) => (int) $y)
                ->values()
                ->all();

            // 3. Query Dasar dengan eager loading agregat kasus
            $query = Periode::query()
                ->withCount('kasusAgregat')
                ->withSum('kasusAgregat', 'jumlah_kasus')
                ->withSum('kasusAgregat', 'jumlah_meninggal');

            // 4. Terapkan Filter Tahun
            if ($yearFilter !== 'all' && $yearFilter !== null && $yearFilter !== '') {
                $query->where('tahun', (int) $yearFilter);
            }

            // 5. Terapkan Filter Status Publikasi jika ada
            if ($statusFilter === 'published') {
                $query->where('is_published', true);
            } elseif ($statusFilter === 'unpublished') {
                $query->where('is_published', false);
            }

            // 6. Terapkan Pencarian Berdasarkan Kata Kunci (Label, Kode Periode, Bulan, dll)
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $lowerSearch = strtolower($search);

                    // A. Pencarian teks pada kolom nama, keterangan, sumber_data
                    $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhere('sumber_data', 'like', "%{$search}%");

                    // B. Pencarian berdasarkan angka tahun eksak
                    if (is_numeric($search) && strlen($search) === 4) {
                        $q->orWhere('tahun', (int) $search);
                    }

                    // C. Pencarian format kode "YYYY-MM" (misal: "2026-01")
                    if (preg_match('/^(\d{4})-(\d{1,2})$/', $search, $matches)) {
                        $parsedYear = (int) $matches[1];
                        $parsedMonth = (int) $matches[2];
                        $q->orWhere(function ($sub) use ($parsedYear, $parsedMonth) {
                            $sub->where('tahun', $parsedYear)->where('bulan', $parsedMonth);
                        });
                    }

                    // D. Pencarian nama bulan dalam Bahasa Indonesia
                    foreach (self::INDONESIAN_MONTHS as $monthNum => $monthName) {
                        if (str_contains(strtolower($monthName), $lowerSearch)) {
                            $q->orWhere('bulan', $monthNum);
                        }
                    }
                });
            }

            // 7. Pengurutan Kronologis: Tahun terbaru ke terlama, Bulan terbaru ke terlama
            $query->orderBy('tahun', 'desc')
                ->orderByRaw('CASE WHEN bulan IS NULL THEN 0 ELSE bulan END DESC')
                ->orderBy('id', 'desc');

            // 8. Eksekusi Pagination
            if ($perPage === 'all' || $request->boolean('all')) {
                $rawRecords = $query->get();
                $formattedPeriods = $rawRecords->map(fn ($p) => $this->formatPeriodData($p))->all();

                return response()->json([
                    'success' => true,
                    'message' => 'Daftar periode waktu pemantauan berhasil dimuat.',
                    'periods' => $formattedPeriods,
                    'summary' => $summaryStats,
                    'years' => $availableYears,
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => count($formattedPeriods),
                        'total' => count($formattedPeriods),
                    ],
                ], 200);
            }

            $perPageInt = max(1, min(100, (int) $perPage));
            $paginated = $query->paginate($perPageInt);

            $formattedPeriods = collect($paginated->items())
                ->map(fn ($p) => $this->formatPeriodData($p))
                ->all();

            return response()->json([
                'success' => true,
                'message' => 'Daftar periode waktu pemantauan berhasil dimuat.',
                'periods' => $formattedPeriods,
                'summary' => $summaryStats,
                'years' => $availableYears,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem(),
                    'to' => $paginated->lastItem(),
                ],
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kendala sistem saat memuat data kalender periode waktu.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Menambahkan periode pemantauan baru untuk kalender observasi kasus DBD (System Feature 26).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tahun' => ['required', 'integer', 'min:2000', 'max:2099'],
            'bulan' => ['required', 'integer', 'min:1', 'max:12'],
            'nama' => ['required', 'string', 'max:50', 'unique:periodes,nama'],
            'label_singkat' => ['nullable', 'string', 'max:30'],
            'status_publikasi' => [
                'required',
                'string',
                Rule::in(['DAPAT_DIPUBLIKASIKAN', 'INTERNAL_BELUM_DIIZINKAN', 'published', 'draft']),
            ],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ], [
            'tahun.required' => 'Tahun observasi wajib diisi.',
            'tahun.integer' => 'Tahun observasi harus berupa angka tahun yang valid.',
            'tahun.min' => 'Tahun observasi minimal bernilai 2000.',
            'tahun.max' => 'Tahun observasi maksimal bernilai 2099.',
            'bulan.required' => 'Bulan observasi wajib dipilih.',
            'bulan.integer' => 'Bulan observasi harus berupa angka bulan 1 sampai 12.',
            'bulan.min' => 'Bulan observasi harus berada pada rentang Januari sampai Desember.',
            'bulan.max' => 'Bulan observasi harus berada pada rentang Januari sampai Desember.',
            'nama.required' => 'Label periode lengkap wajib diisi.',
            'nama.string' => 'Label periode harus berupa teks yang valid.',
            'nama.max' => 'Label periode maksimal 50 karakter.',
            'nama.unique' => 'Label periode lengkap sudah terdaftar dalam sistem.',
            'label_singkat.max' => 'Label singkat maksimal 30 karakter.',
            'status_publikasi.required' => 'Status publikasi wajib dipilih.',
            'status_publikasi.in' => 'Pilihan status publikasi tidak valid.',
            'keterangan.max' => 'Catatan musim atau keterangan maksimal 255 karakter.',
        ]);

        $tahun = (int) $validated['tahun'];
        $bulan = (int) $validated['bulan'];

        // Validasi Duplikasi: Kombinasi Tahun dan Bulan harus unik dalam sistem
        $duplicatePeriod = Periode::where('tahun', $tahun)
            ->where('bulan', $bulan)
            ->first();

        if ($duplicatePeriod) {
            $monthName = self::INDONESIAN_MONTHS[$bulan] ?? "Bulan {$bulan}";
            throw ValidationException::withMessages([
                'bulan' => ["Periode observasi untuk {$monthName} {$tahun} sudah terdaftar dalam sistem (Kode: {$duplicatePeriod->nama})."],
            ]);
        }

        // Penanganan Status Publikasi
        $rawStatus = $validated['status_publikasi'];
        $isPublished = in_array($rawStatus, ['DAPAT_DIPUBLIKASIKAN', 'published'], true);
        $statusPublikasi = $isPublished ? 'DAPAT_DIPUBLIKASIKAN' : 'INTERNAL_BELUM_DIIZINKAN';

        // Penanganan Catatan / Deskripsi Musim
        $keterangan = !empty($validated['keterangan']) ? trim($validated['keterangan']) : null;

        DB::beginTransaction();
        try {
            $periode = Periode::create([
                'nama' => trim($validated['nama']),
                'tahun' => $tahun,
                'bulan' => $bulan,
                'tipe_periode' => 'monthly',
                'is_published' => $isPublished,
                'status_publikasi' => $statusPublikasi,
                'sumber_data' => 'Dataset Agregat Dinkes Kabupaten Banyumas',
                'status_kelengkapan' => 'Lengkap (27 Kecamatan)',
                'keterangan' => $keterangan,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Periode pemantauan berhasil ditambahkan.',
                'period' => $this->formatPeriodData($periode),
            ], 201);
        } catch (Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menyimpan periode pemantauan baru.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Mengambil rincian detail data periode waktu observasi kasus DBD.
     */
    public function show(int|string $id): JsonResponse
    {
        try {
            $period = Periode::withCount('kasusAgregat')
                ->withSum('kasusAgregat', 'jumlah_kasus')
                ->withSum('kasusAgregat', 'jumlah_meninggal')
                ->find($id);

            if (!$period) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data periode waktu tidak ditemukan dalam sistem.',
                ], 404);
            }

            // Ambil rangkuman per kecamatan teratas untuk periode ini jika ada kasus
            $topDistricts = $period->kasusAgregat()
                ->with('kecamatan:id,nama,kode')
                ->orderBy('jumlah_kasus', 'desc')
                ->limit(5)
                ->get()
                ->map(fn ($case) => [
                    'kecamatan_id' => $case->kecamatan_id,
                    'kecamatan_nama' => $case->kecamatan?->nama ?? '-',
                    'kecamatan_kode' => $case->kecamatan?->kode ?? '-',
                    'jumlah_kasus' => (int) $case->jumlah_kasus,
                    'jumlah_meninggal' => (int) $case->jumlah_meninggal,
                    'incidence_rate' => $case->incidence_rate ? (float) $case->incidence_rate : null,
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Detail data periode waktu berhasil dimuat.',
                'period' => array_merge(
                    $this->formatPeriodData($period, true),
                    ['top_districts' => $topDistricts]
                ),
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat mengambil detail periode waktu.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Memperbarui informasi periode pemantauan observasi kasus DBD (System Feature 27).
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        $period = Periode::find($id);

        if (! $period) {
            return response()->json([
                'success' => false,
                'message' => 'Data periode waktu tidak ditemukan dalam sistem atau sudah dihapus.',
            ], 404);
        }

        $validated = $request->validate([
            'tahun' => ['required', 'integer', 'min:2000', 'max:2099'],
            'bulan' => ['required', 'integer', 'min:1', 'max:12'],
            'nama' => [
                'required',
                'string',
                'max:50',
                Rule::unique('periodes', 'nama')->ignore($period->id),
            ],
            'label_singkat' => ['nullable', 'string', 'max:30'],
            'status_publikasi' => [
                'required',
                'string',
                Rule::in(['DAPAT_DIPUBLIKASIKAN', 'INTERNAL_BELUM_DIIZINKAN', 'published', 'draft']),
            ],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ], [
            'tahun.required' => 'Tahun observasi wajib diisi.',
            'tahun.integer' => 'Tahun observasi harus berupa angka tahun yang valid.',
            'tahun.min' => 'Tahun observasi minimal bernilai 2000.',
            'tahun.max' => 'Tahun observasi maksimal bernilai 2099.',
            'bulan.required' => 'Bulan observasi wajib dipilih.',
            'bulan.integer' => 'Bulan observasi harus berupa angka bulan 1 sampai 12.',
            'bulan.min' => 'Bulan observasi harus berada pada rentang Januari sampai Desember.',
            'bulan.max' => 'Bulan observasi harus berada pada rentang Januari sampai Desember.',
            'nama.required' => 'Label periode lengkap wajib diisi.',
            'nama.string' => 'Label periode harus berupa teks yang valid.',
            'nama.max' => 'Label periode maksimal 50 karakter.',
            'nama.unique' => 'Label periode lengkap sudah digunakan oleh periode lain.',
            'label_singkat.max' => 'Label singkat maksimal 30 karakter.',
            'status_publikasi.required' => 'Status publikasi wajib dipilih.',
            'status_publikasi.in' => 'Pilihan status publikasi tidak valid.',
            'keterangan.max' => 'Catatan musim atau keterangan maksimal 255 karakter.',
        ]);

        $tahun = (int) $validated['tahun'];
        $bulan = (int) $validated['bulan'];

        // Validasi Duplikasi: Kombinasi Tahun dan Bulan harus unik di antara rekaman periode lain
        $duplicatePeriod = Periode::where('tahun', $tahun)
            ->where('bulan', $bulan)
            ->where('id', '!=', $period->id)
            ->first();

        if ($duplicatePeriod) {
            $monthName = self::INDONESIAN_MONTHS[$bulan] ?? "Bulan {$bulan}";
            throw ValidationException::withMessages([
                'bulan' => ["Periode observasi untuk {$monthName} {$tahun} sudah terdaftar pada periode lain (Kode: {$duplicatePeriod->nama})."],
            ]);
        }

        // Penanganan Status Publikasi
        $rawStatus = $validated['status_publikasi'];
        $isPublished = in_array($rawStatus, ['DAPAT_DIPUBLIKASIKAN', 'published'], true);
        $statusPublikasi = $isPublished ? 'DAPAT_DIPUBLIKASIKAN' : 'INTERNAL_BELUM_DIIZINKAN';

        // Penanganan Catatan / Deskripsi Musim
        $keterangan = !empty($validated['keterangan']) ? trim($validated['keterangan']) : null;

        DB::beginTransaction();
        try {
            $period->update([
                'nama' => trim($validated['nama']),
                'tahun' => $tahun,
                'bulan' => $bulan,
                'is_published' => $isPublished,
                'status_publikasi' => $statusPublikasi,
                'keterangan' => $keterangan,
            ]);

            DB::commit();

            // Muat ulang agregat kasus untuk format respons lengkap
            $period->loadCount('kasusAgregat')
                ->loadSum('kasusAgregat', 'jumlah_kasus')
                ->loadSum('kasusAgregat', 'jumlah_meninggal');

            return response()->json([
                'success' => true,
                'message' => 'Informasi periode berhasil diperbarui.',
                'period' => $this->formatPeriodData($period),
            ], 200);
        } catch (Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memperbarui informasi periode.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Menghapus data periode pemantauan observasi kasus DBD jika tidak memiliki ketergantungan data kasus (System Feature 28).
     */
    public function destroy(int|string $id): JsonResponse
    {
        $period = Periode::find($id);

        if (! $period) {
            return response()->json([
                'success' => false,
                'message' => 'Data periode waktu tidak ditemukan dalam sistem atau sudah dihapus.',
            ], 404);
        }

        // PENTING: Periksa keterkaitan data kasus DBD. Tolak penghapusan jika masih ada data kasus terkait!
        $linkedCasesCount = $period->kasusAgregat()->count();
        if ($linkedCasesCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Periode {$period->nama} tidak dapat dihapus karena masih digunakan oleh {$linkedCasesCount} data rekaman kasus DBD. Hapus atau pindahkan data kasus terkait terlebih dahulu.",
                'linked_cases_count' => $linkedCasesCount,
                'errors' => [
                    'dependency' => [
                        "Periode {$period->nama} masih memiliki {$linkedCasesCount} rekaman data kasus DBD terkait.",
                    ],
                ],
            ], 422);
        }

        $nama = (string) $period->nama;
        $deletedId = (int) $period->id;

        DB::beginTransaction();
        try {
            $period->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data periode pemantauan berhasil dihapus.',
                'deleted_id' => $deletedId,
                'deleted_nama' => $nama,
            ], 200);
        } catch (Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menghapus data periode pemantauan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Memformat objek Periode menjadi struktur data yang konsisten dan informatif.
     */
    private function formatPeriodData(Periode $item, bool $detailed = false): array
    {
        $bulanNum = $item->bulan ? (int) $item->bulan : null;
        $tahunNum = (int) $item->tahun;

        // 1. Kode Periode Terstandarisasi (Format YYYY-MM untuk bulanan, YYYY untuk tahunan)
        if ($bulanNum !== null) {
            $kodePeriode = sprintf('%04d-%02d', $tahunNum, $bulanNum);
            $namaBulan = self::INDONESIAN_MONTHS[$bulanNum] ?? "Bulan {$bulanNum}";
            $labelSingkat = (self::INDONESIAN_MONTHS_SHORT[$bulanNum] ?? "Bln {$bulanNum}") . ' ' . $tahunNum;
        } else {
            $kodePeriode = sprintf('%04d', $tahunNum);
            $namaBulan = $item->tipe_periode === 'partial_year' ? 'Sebagian Bulan (Parsial)' : 'Tahunan (12 Bulan)';
            $labelSingkat = 'Thn ' . $tahunNum;
        }

        // 2. Keterangan Musim Epidemiologis Tropis Banyumas
        $keteranganMusim = $this->determineSeasonDescription($bulanNum, $item->tipe_periode);

        // 3. Status Publikasi
        $isPublished = (bool) $item->is_published;
        $statusLabel = $isPublished ? 'Dipublikasikan' : 'Draft / Internal';
        $statusKey = $item->status_publikasi ?: ($isPublished ? 'DAPAT_DIPUBLIKASIKAN' : 'INTERNAL_BELUM_DIIZINKAN');

        $totalCases = (int) ($item->kasus_agregat_sum_jumlah_kasus ?? 0);
        $totalDeaths = (int) ($item->kasus_agregat_sum_jumlah_meninggal ?? 0);
        $totalCaseRecords = (int) ($item->kasus_agregat_count ?? 0);

        $data = [
            'id' => (int) $item->id,
            'kode_periode' => $kodePeriode,
            'tahun' => $tahunNum,
            'bulan' => $bulanNum,
            'bulan_nama' => $namaBulan,
            'nama' => $item->nama,
            'label_singkat' => $labelSingkat,
            'keterangan_musim' => $keteranganMusim,
            'tipe_periode' => $item->tipe_periode ?: ($bulanNum ? 'monthly' : 'annual'),
            'tipe_periode_label' => $this->getPeriodTypeLabel($item->tipe_periode, $bulanNum),
            'rentang_waktu' => $item->rentang_waktu,
            'is_published' => $isPublished,
            'status_publikasi' => $statusKey,
            'status_publikasi_label' => $statusLabel,
            'sumber_data' => $item->sumber_data ?: 'Dataset Dinkes Kabupaten Banyumas',
            'status_kelengkapan' => $item->status_kelengkapan ?: 'Lengkap (27 Kecamatan)',
            'keterangan' => $item->keterangan,
            'total_case_records' => $totalCaseRecords,
            'total_cases' => $totalCases,
            'total_deaths' => $totalDeaths,
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
            'updated_at_formatted' => $item->updated_at
                ? $item->updated_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
                : '-',
        ];

        return $data;
    }

    /**
     * Menentukan deskripsi iklim / musim epidemiologis berdasarkan bulan.
     */
    private function determineSeasonDescription(?int $bulan, ?string $tipe): string
    {
        if ($bulan === null) {
            return $tipe === 'partial_year' ? 'Observasi Parsial Musim' : 'Akumulasi Siklus Tahunan';
        }

        // Kabupaten Banyumas (Jawa Tengah):
        // Oktober - Maret: Musim Penghujan (Fase peningkatan & puncak DBD)
        // April - Mei: Masa Pancaroba (Peralihan Hujan ke Kemarau)
        // Juni - Agustus: Musim Kemarau (Penurunan kasus DBD)
        // September: Masa Pancaroba (Peralihan Kemarau ke Hujan)
        return match ($bulan) {
            10, 11, 12, 1, 2, 3 => 'Musim Hujan (Puncak Penularan DBD)',
            4, 5 => 'Pancaroba (Peralihan Hujan - Kemarau)',
            6, 7, 8 => 'Musim Kemarau (Waspada DBD)',
            9 => 'Pancaroba (Peralihan Kemarau - Hujan)',
            default => 'Periode Pengamatan Iklim',
        };
    }

    /**
     * Label tipe periode yang informatif.
     */
    private function getPeriodTypeLabel(?string $tipe, ?int $bulan): string
    {
        return match ($tipe) {
            'annual' => 'Agregat Tahunan',
            'partial_year' => 'Parsial Tahunan',
            'monthly' => 'Bulanan',
            default => $bulan ? 'Bulanan' : 'Tahunan',
        };
    }
}
