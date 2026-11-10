<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use App\Models\Periode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class CaseManagementController extends Controller
{
    /**
     * Display a paginated listing of aggregate DBD cases with search and filtering (System Feature 17).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = KasusAgregat::query()->with([
                'kecamatan:id,kode,nama,luas_wilayah,jumlah_penduduk',
                'periode:id,nama,tahun,bulan,tipe_periode,status_publikasi',
            ]);

            // 1. Pencarian kata kunci (nama/kode kecamatan atau catatan kasus)
            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                $query->where(function ($q) use ($search) {
                    $q->whereHas('kecamatan', function ($sub) use ($search) {
                        $sub->where('nama', 'like', "%{$search}%")
                            ->orWhere('kode', 'like', "%{$search}%");
                    })
                    ->orWhere('keterangan', 'like', "%{$search}%");
                });
            }

            // 2. Filter berdasarkan Wilayah Kecamatan
            $districtId = $request->input('district_id') ?? $request->input('kecamatan_id');
            if (!empty($districtId) && $districtId !== 'all') {
                $query->where('kecamatan_id', (int) $districtId);
            }

            // 3. Filter berdasarkan Periode Waktu
            $periodId = $request->input('period_id') ?? $request->input('periode_id');
            if (!empty($periodId) && $periodId !== 'all') {
                $query->where('periode_id', (int) $periodId);
            }

            // 4. Pengurutan data (terbaru di awal secara default)
            $sortBy = $request->input('sort_by', 'updated_at');
            $sortDirection = strtolower((string) $request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

            if (in_array($sortBy, ['jumlah_kasus', 'incidence_rate', 'created_at', 'updated_at'], true)) {
                $query->orderBy($sortBy, $sortDirection);
            } else {
                $query->orderBy('updated_at', 'desc')->orderBy('id', 'desc');
            }

            // 5. Parameter Pagination
            $perPage = max(1, min((int) $request->input('per_page', 10), 50));
            $page = max(1, (int) $request->input('page', 1));

            // Summary metrics calculation based on active filters
            $summaryQuery = clone $query;
            $totalRecords = $summaryQuery->count();
            $totalCases = (int) $summaryQuery->sum('jumlah_kasus');
            $totalDeaths = (int) $summaryQuery->sum('jumlah_meninggal');
            $averageIr = $totalRecords > 0 ? round((float) $summaryQuery->avg('incidence_rate'), 2) : 0.0;

            $paginator = $query->paginate($perPage, ['*'], 'page', $page);

            $transformedCases = collect($paginator->items())->map(function (KasusAgregat $item) {
                return $this->formatCaseData($item);
            });

            return response()->json([
                'success' => true,
                'message' => 'Data kasus DBD berhasil dimuat.',
                'cases' => [
                    'data' => $transformedCases,
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem() ?? 0,
                    'to' => $paginator->lastItem() ?? 0,
                ],
                'summary' => [
                    'total_records' => $totalRecords,
                    'total_cases' => $totalCases,
                    'total_deaths' => $totalDeaths,
                    'average_ir' => $averageIr,
                ],
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memuat data kasus DBD.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a newly created DBD case aggregate record in storage (System Feature 18).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kecamatan_id' => ['required', 'integer', 'exists:kecamatans,id'],
            'periode_id' => ['required', 'integer', 'exists:periodes,id'],
            'jumlah_kasus' => ['required', 'integer', 'min:0'],
            'jumlah_meninggal' => ['required', 'integer', 'min:0'],
            'jumlah_penduduk' => ['required', 'integer', 'min:1'],
            'status_publikasi' => ['required', 'string', Rule::in(['DAPAT_DIPUBLIKASIKAN', 'INTERNAL_BELUM_DIIZINKAN'])],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'kasus_laki_laki' => ['nullable', 'integer', 'min:0'],
            'kasus_perempuan' => ['nullable', 'integer', 'min:0'],
        ], [
            'kecamatan_id.required' => 'Wilayah kecamatan wajib dipilih.',
            'kecamatan_id.integer' => 'Format wilayah kecamatan tidak valid.',
            'kecamatan_id.exists' => 'Wilayah kecamatan yang dipilih tidak valid atau tidak terdaftar.',
            'periode_id.required' => 'Periode waktu pemantauan wajib dipilih.',
            'periode_id.integer' => 'Format periode waktu tidak valid.',
            'periode_id.exists' => 'Periode waktu yang dipilih tidak valid atau tidak terdaftar.',
            'jumlah_kasus.required' => 'Jumlah kasus DBD wajib diisi.',
            'jumlah_kasus.integer' => 'Jumlah kasus DBD harus berupa bilangan bulat.',
            'jumlah_kasus.min' => 'Jumlah kasus DBD tidak boleh bernilai negatif.',
            'jumlah_meninggal.required' => 'Jumlah kasus meninggal (DSS) wajib diisi.',
            'jumlah_meninggal.integer' => 'Jumlah kasus meninggal harus berupa bilangan bulat.',
            'jumlah_meninggal.min' => 'Jumlah kasus meninggal tidak boleh bernilai negatif.',
            'jumlah_penduduk.required' => 'Populasi wilayah wajib diisi.',
            'jumlah_penduduk.integer' => 'Populasi wilayah harus berupa bilangan bulat.',
            'jumlah_penduduk.min' => 'Populasi wilayah harus berupa bilangan bulat positif (minimal 1 jiwa).',
            'status_publikasi.required' => 'Status laporan kasus wajib dipilih.',
            'status_publikasi.in' => 'Pilihan status laporan kasus tidak valid.',
            'keterangan.max' => 'Catatan surveilans maksimal 255 karakter.',
            'kasus_laki_laki.integer' => 'Kasus laki-laki harus berupa bilangan bulat.',
            'kasus_laki_laki.min' => 'Kasus laki-laki tidak boleh bernilai negatif.',
            'kasus_perempuan.integer' => 'Kasus perempuan harus berupa bilangan bulat.',
            'kasus_perempuan.min' => 'Kasus perempuan tidak boleh bernilai negatif.',
        ]);

        // Cek batasan keunikan: satu rekaman per kecamatan per periode
        $existing = KasusAgregat::where('kecamatan_id', $validated['kecamatan_id'])
            ->where('periode_id', $validated['periode_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Data kasus DBD untuk wilayah kecamatan dan periode waktu yang dipilih sudah tercatat dalam sistem.',
                'errors' => [
                    'kecamatan_id' => ['Data kasus untuk wilayah kecamatan dan periode ini sudah ada dalam sistem.'],
                ],
            ], 422);
        }

        try {
            // Kalkulasi Incidence Rate (IR) = (jumlah_kasus / jumlah_penduduk) * 100.000
            $jumlahKasus = (int) $validated['jumlah_kasus'];
            $populasi = (int) $validated['jumlah_penduduk'];
            $ir = round(($jumlahKasus / $populasi) * 100000, 2);

            $statusPublikasi = $validated['status_publikasi'];
            $isPublished = $statusPublikasi === 'DAPAT_DIPUBLIKASIKAN';

            $case = KasusAgregat::create([
                'kecamatan_id' => $validated['kecamatan_id'],
                'periode_id' => $validated['periode_id'],
                'jumlah_kasus' => $jumlahKasus,
                'jumlah_meninggal' => (int) $validated['jumlah_meninggal'],
                'jumlah_penduduk' => $populasi,
                'incidence_rate' => $ir,
                'is_published' => $isPublished,
                'status_publikasi' => $statusPublikasi,
                'keterangan' => !empty($validated['keterangan']) ? trim($validated['keterangan']) : null,
                'kasus_laki_laki' => isset($validated['kasus_laki_laki']) ? (int) $validated['kasus_laki_laki'] : null,
                'kasus_perempuan' => isset($validated['kasus_perempuan']) ? (int) $validated['kasus_perempuan'] : null,
            ]);

            // Load relasi agar data response lengkap
            $case->load([
                'kecamatan:id,kode,nama,luas_wilayah,jumlah_penduduk',
                'periode:id,nama,tahun,bulan,tipe_periode,status_publikasi',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Data kasus DBD berhasil ditambahkan ke dalam sistem.',
                'case' => $this->formatCaseData($case),
            ], 201);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menyimpan data kasus DBD ke basis data.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Display the specified aggregate case record in full detail (System Feature 17).
     */
    public function show(int|string $id): JsonResponse
    {
        try {
            $case = KasusAgregat::with([
                'kecamatan:id,kode,nama,luas_wilayah,jumlah_penduduk',
                'periode:id,nama,tahun,bulan,tipe_periode,status_publikasi,sumber_data,status_kelengkapan,keterangan',
            ])->find($id);

            if (! $case) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kasus DBD tidak ditemukan.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Detail data kasus DBD berhasil diambil.',
                'case' => $this->formatCaseData($case, true),
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail data kasus DBD.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update the specified aggregate case record in storage (System Feature 19).
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        $case = KasusAgregat::with(['kecamatan', 'periode'])->find($id);

        if (! $case) {
            return response()->json([
                'success' => false,
                'message' => 'Data kasus DBD tidak ditemukan atau sudah dihapus.',
            ], 404);
        }

        $validated = $request->validate([
            'jumlah_kasus' => ['required', 'integer', 'min:0'],
            'jumlah_meninggal' => ['required', 'integer', 'min:0'],
            'jumlah_penduduk' => ['required', 'integer', 'min:1'],
            'status_publikasi' => ['required', 'string', Rule::in(['DAPAT_DIPUBLIKASIKAN', 'INTERNAL_BELUM_DIIZINKAN'])],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'kasus_laki_laki' => ['nullable', 'integer', 'min:0'],
            'kasus_perempuan' => ['nullable', 'integer', 'min:0'],
        ], [
            'jumlah_kasus.required' => 'Jumlah kasus DBD wajib diisi.',
            'jumlah_kasus.integer' => 'Jumlah kasus DBD harus berupa bilangan bulat.',
            'jumlah_kasus.min' => 'Jumlah kasus DBD tidak boleh bernilai negatif.',
            'jumlah_meninggal.required' => 'Jumlah kasus meninggal (DSS) wajib diisi.',
            'jumlah_meninggal.integer' => 'Jumlah kasus meninggal harus berupa bilangan bulat.',
            'jumlah_meninggal.min' => 'Jumlah kasus meninggal tidak boleh bernilai negatif.',
            'jumlah_penduduk.required' => 'Populasi wilayah wajib diisi.',
            'jumlah_penduduk.integer' => 'Populasi wilayah harus berupa bilangan bulat.',
            'jumlah_penduduk.min' => 'Populasi wilayah harus berupa bilangan bulat positif (minimal 1 jiwa).',
            'status_publikasi.required' => 'Status laporan kasus wajib dipilih.',
            'status_publikasi.in' => 'Pilihan status laporan kasus tidak valid.',
            'keterangan.max' => 'Catatan surveilans maksimal 255 karakter.',
            'kasus_laki_laki.integer' => 'Kasus laki-laki harus berupa bilangan bulat.',
            'kasus_laki_laki.min' => 'Kasus laki-laki tidak boleh bernilai negatif.',
            'kasus_perempuan.integer' => 'Kasus perempuan harus berupa bilangan bulat.',
            'kasus_perempuan.min' => 'Kasus perempuan tidak boleh bernilai negatif.',
        ]);

        try {
            // Kalkulasi ulang Incidence Rate (IR) = (jumlah_kasus / jumlah_penduduk) * 100.000
            $jumlahKasus = (int) $validated['jumlah_kasus'];
            $populasi = (int) $validated['jumlah_penduduk'];
            $ir = round(($jumlahKasus / $populasi) * 100000, 2);

            $statusPublikasi = $validated['status_publikasi'];
            $isPublished = $statusPublikasi === 'DAPAT_DIPUBLIKASIKAN';

            // Identitas kecamatan_id dan periode_id sengaja tidak diubah (identitas rekaman)
            $case->jumlah_kasus = $jumlahKasus;
            $case->jumlah_meninggal = (int) $validated['jumlah_meninggal'];
            $case->jumlah_penduduk = $populasi;
            $case->incidence_rate = $ir;
            $case->status_publikasi = $statusPublikasi;
            $case->is_published = $isPublished;
            $case->keterangan = !empty($validated['keterangan']) ? trim($validated['keterangan']) : null;

            if (array_key_exists('kasus_laki_laki', $validated)) {
                $case->kasus_laki_laki = isset($validated['kasus_laki_laki']) ? (int) $validated['kasus_laki_laki'] : null;
            }
            if (array_key_exists('kasus_perempuan', $validated)) {
                $case->kasus_perempuan = isset($validated['kasus_perempuan']) ? (int) $validated['kasus_perempuan'] : null;
            }

            $case->save();

            $case->load([
                'kecamatan:id,kode,nama,luas_wilayah,jumlah_penduduk',
                'periode:id,nama,tahun,bulan,tipe_periode,status_publikasi',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Data kasus DBD berhasil diperbarui.',
                'case' => $this->formatCaseData($case),
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memperbarui data kasus DBD ke basis data.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Remove the specified aggregate case record from storage (System Feature 20).
     */
    public function destroy(int|string $id): JsonResponse
    {
        try {
            $case = KasusAgregat::find($id);

            if (! $case) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kasus DBD tidak ditemukan atau sudah dihapus.',
                ], 404);
            }

            $case->delete();

            return response()->json([
                'success' => true,
                'message' => 'Data kasus DBD berhasil dihapus dari sistem.',
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menghapus data kasus DBD.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Provide list of districts (kecamatan) for filter dropdown.
     */
    public function districts(): JsonResponse
    {
        try {
            $districts = Kecamatan::orderBy('nama', 'asc')
                ->select(['id', 'kode', 'nama', 'luas_wilayah', 'jumlah_penduduk'])
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Daftar wilayah kecamatan berhasil dimuat.',
                'districts' => $districts,
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat daftar wilayah kecamatan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Provide list of monitoring periods for filter dropdown.
     */
    public function periods(): JsonResponse
    {
        try {
            $periods = Periode::orderBy('tahun', 'desc')
                ->orderBy('bulan', 'desc')
                ->select(['id', 'nama', 'tahun', 'bulan', 'tipe_periode', 'status_publikasi'])
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Daftar periode waktu pemantauan berhasil dimuat.',
                'periods' => $periods,
            ], 200);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat daftar periode waktu pemantauan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Standardized helper to format case aggregate record.
     */
    private function formatCaseData(KasusAgregat $item, bool $detailed = false): array
    {
        // 1. Populasi Wilayah (ambil dari kolom jumlah_penduduk atau relasi kecamatan)
        $populasi = (int) ($item->jumlah_penduduk ?: ($item->kecamatan?->jumlah_penduduk ?? 0));

        // 2. Incidence Rate (IR) calculation: (kasus / populasi) * 100.000
        $irValue = null;
        $irFormatted = 'Belum tersedia';

        if ($item->incidence_rate !== null) {
            $irValue = (float) $item->incidence_rate;
            $irFormatted = number_format($irValue, 2, ',', '.') . ' / 100k';
        } elseif ($populasi > 0 && $item->jumlah_kasus !== null) {
            $calculated = round(($item->jumlah_kasus / $populasi) * 100000, 2);
            $irValue = $calculated;
            $irFormatted = number_format($calculated, 2, ',', '.') . ' / 100k';
        }

        // 3. Tanggal format Bahasa Indonesia
        $updatedAtFormatted = $item->updated_at
            ? $item->updated_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
            : '-';

        $createdAtFormatted = $item->created_at
            ? $item->created_at->locale('id')->isoFormat('D MMMM Y, HH:mm') . ' WIB'
            : '-';

        $periodeNama = $item->periode?->nama ?? ($item->periode ? 'Tahun ' . $item->periode->tahun : '-');

        $data = [
            'id' => (int) $item->id,
            'kecamatan_id' => (int) $item->kecamatan_id,
            'kecamatan_nama' => $item->kecamatan?->nama ?? 'Tidak Diketahui',
            'kecamatan_kode' => $item->kecamatan?->kode ?? '-',
            'periode_id' => (int) $item->periode_id,
            'periode_nama' => $periodeNama,
            'periode_tahun' => $item->periode?->tahun,
            'periode_bulan' => $item->periode?->bulan,
            'jumlah_kasus' => (int) $item->jumlah_kasus,
            'kasus_laki_laki' => (int) ($item->kasus_laki_laki ?? 0),
            'kasus_perempuan' => (int) ($item->kasus_perempuan ?? 0),
            'jumlah_meninggal' => (int) ($item->jumlah_meninggal ?? 0),
            'populasi' => $populasi,
            'populasi_formatted' => number_format($populasi, 0, ',', '.') . ' jiwa',
            'incidence_rate' => $irValue,
            'incidence_rate_formatted' => $irFormatted,
            'is_published' => (bool) $item->is_published,
            'status_publikasi' => $item->status_publikasi ?? 'DAPAT_DIPUBLIKASIKAN',
            'keterangan' => $item->keterangan ?? null,
            'created_at' => $item->created_at?->toISOString(),
            'created_at_formatted' => $createdAtFormatted,
            'updated_at' => $item->updated_at?->toISOString(),
            'updated_at_formatted' => $updatedAtFormatted,
        ];

        if ($detailed) {
            $data['kecamatan_luas'] = $item->kecamatan?->luas_wilayah ? (float) $item->kecamatan->luas_wilayah : null;
            $data['periode_tipe'] = $item->periode?->tipe_periode ?? 'monthly';
            $data['periode_sumber'] = $item->periode?->sumber_data ?? '-';
            $data['periode_kelengkapan'] = $item->periode?->status_kelengkapan ?? '-';
        }

        return $data;
    }
}

