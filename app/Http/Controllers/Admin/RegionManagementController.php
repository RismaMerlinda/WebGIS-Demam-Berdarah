<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KasusAgregat;
use App\Models\Kecamatan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class RegionManagementController extends Controller
{
    /**
     * Display a paginated listing of sub-districts (wilayah kecamatan) with search,
     * summary statistics, and dengue case aggregates (System Feature 21).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Kecamatan::query()
                ->withCount('kasusAgregat')
                ->withSum('kasusAgregat', 'jumlah_kasus')
                ->withSum('kasusAgregat', 'jumlah_meninggal');

            // 1. Pencarian dinamis berdasarkan nama kecamatan atau kode wilayah
            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('kode', 'like', "%{$search}%");
                });
            }

            // 2. Load GeoJSON untuk verifikasi batas spasial aktual
            $geojson = $this->loadGeoJson();
            $geojsonCodes = $this->getGeoJsonCodes($geojson);

            // 3. Ringkasan Metrik Statistik Aktual
            $totalRegions = Kecamatan::count();
            $allDistricts = Kecamatan::select(['id', 'kode'])->get();
            $regionsWithGeometry = $allDistricts->filter(fn ($d) => in_array((string) $d->kode, $geojsonCodes, true))->count();
            $regionsWithoutGeometry = max(0, $totalRegions - $regionsWithGeometry);
            $totalCasesAllRegions = (int) KasusAgregat::sum('jumlah_kasus');
            $totalDeathsAllRegions = (int) KasusAgregat::sum('jumlah_meninggal');

            // 4. Pagination
            $perPage = (int) $request->input('per_page', 10);
            $perPage = max(1, min($perPage, 50));

            $paginated = $query->orderBy('kode', 'asc')->paginate($perPage);

            // 5. Transformasi data baris tabel
            $regionsData = $paginated->getCollection()->map(function (Kecamatan $district) use ($geojsonCodes) {
                $hasGeometry = in_array((string) $district->kode, $geojsonCodes, true);
                $caseCount = (int) $district->kasus_agregat_count;
                $totalCases = (int) ($district->kasus_agregat_sum_jumlah_kasus ?? 0);
                $totalDeaths = (int) ($district->kasus_agregat_sum_jumlah_meninggal ?? 0);

                return [
                    'id' => $district->id,
                    'kode' => $district->kode,
                    'nama' => $district->nama,
                    'luas_wilayah' => $district->luas_wilayah ? (float) $district->luas_wilayah : null,
                    'luas_wilayah_formatted' => $district->luas_wilayah
                        ? number_format((float) $district->luas_wilayah, 2, ',', '.') . ' km²'
                        : '-',
                    'jumlah_penduduk' => $district->jumlah_penduduk ? (int) $district->jumlah_penduduk : null,
                    'jumlah_penduduk_formatted' => $district->jumlah_penduduk
                        ? number_format((int) $district->jumlah_penduduk, 0, ',', '.') . ' jiwa'
                        : '-',
                    'has_geometry' => $hasGeometry,
                    'geometry_status' => $hasGeometry ? 'Batas Tersedia' : 'Belum Tersedia',
                    'total_case_records' => $caseCount,
                    'total_cases' => $totalCases,
                    'total_deaths' => $totalDeaths,
                    'created_at' => $district->created_at?->toISOString(),
                    'updated_at' => $district->updated_at?->toISOString(),
                    'updated_at_formatted' => $district->updated_at?->format('d M Y, H:i') ?? '-',
                ];
            });

            return response()->json([
                'success' => true,
                'regions' => $regionsData,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem() ?? 0,
                    'to' => $paginated->lastItem() ?? 0,
                ],
                'summary' => [
                    'total_regions' => $totalRegions,
                    'regions_with_geometry' => $regionsWithGeometry,
                    'regions_without_geometry' => $regionsWithoutGeometry,
                    'total_cases_all_regions' => $totalCasesAllRegions,
                    'total_deaths_all_regions' => $totalDeathsAllRegions,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memuat data wilayah kecamatan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Display complete details and geometry of a specific sub-district (System Feature 21).
     */
    public function show(string|int $id): JsonResponse
    {
        try {
            $district = Kecamatan::query()
                ->withCount('kasusAgregat')
                ->withSum('kasusAgregat', 'jumlah_kasus')
                ->withSum('kasusAgregat', 'jumlah_meninggal')
                ->find($id);

            if (!$district) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data wilayah kecamatan tidak ditemukan dalam basis data.',
                ], 404);
            }

            // Ambil batas geometri dari GeoJSON resmi
            $geojson = $this->loadGeoJson();
            $feature = $this->findGeoJsonFeature((string) $district->kode, (string) $district->nama, $geojson);

            $hasGeometry = $feature !== null && !empty($feature['geometry']);
            $caseRecordsCount = (int) $district->kasus_agregat_count;
            $totalCases = (int) ($district->kasus_agregat_sum_jumlah_kasus ?? 0);
            $totalDeaths = (int) ($district->kasus_agregat_sum_jumlah_meninggal ?? 0);

            // Hitung estimasi rata-rata Incidence Rate jika populasi tersedia
            $pop = (int) ($district->jumlah_penduduk ?? 0);
            $averageIR = ($pop > 0 && $totalCases > 0)
                ? round(($totalCases / $pop) * 100000, 2)
                : 0.0;

            // Ambil histori kasus terkini (hingga 5 rekaman terakhir)
            $recentCases = $district->kasusAgregat()
                ->with('periode:id,nama,tahun,bulan')
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get()
                ->map(fn ($case) => [
                    'id' => $case->id,
                    'periode_nama' => $case->periode?->nama ?? '-',
                    'jumlah_kasus' => (int) $case->jumlah_kasus,
                    'jumlah_meninggal' => (int) $case->jumlah_meninggal,
                    'incidence_rate' => $case->incidence_rate ? (float) $case->incidence_rate : null,
                ]);

            return response()->json([
                'success' => true,
                'region' => [
                    'id' => $district->id,
                    'kode' => $district->kode,
                    'nama' => $district->nama,
                    'luas_wilayah' => $district->luas_wilayah ? (float) $district->luas_wilayah : null,
                    'luas_wilayah_formatted' => $district->luas_wilayah
                        ? number_format((float) $district->luas_wilayah, 2, ',', '.') . ' km²'
                        : 'Belum terdata',
                    'jumlah_penduduk' => $pop > 0 ? $pop : null,
                    'jumlah_penduduk_formatted' => $pop > 0
                        ? number_format($pop, 0, ',', '.') . ' jiwa'
                        : 'Belum terdata',
                    'total_case_records' => $caseRecordsCount,
                    'total_cases' => $totalCases,
                    'total_deaths' => $totalDeaths,
                    'average_ir' => $averageIR,
                    'average_ir_formatted' => number_format($averageIR, 2, ',', '.') . ' / 100k',
                    'has_geometry' => $hasGeometry,
                    'geometry' => $hasGeometry ? $feature : null,
                    'geometry_type' => $hasGeometry ? ($feature['geometry']['type'] ?? 'Polygon') : null,
                    'recent_cases' => $recentCases,
                    'created_at' => $district->created_at?->toISOString(),
                    'updated_at' => $district->updated_at?->toISOString(),
                    'updated_at_formatted' => $district->updated_at?->format('d M Y, H:i') ?? '-',
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memuat rincian wilayah kecamatan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a newly created sub-district (wilayah kecamatan) and its administrative
     * boundary geometry (System Feature 22).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:60', Rule::unique('kecamatans', 'nama')],
            'kode' => ['required', 'string', 'max:10', Rule::unique('kecamatans', 'kode')],
            'luas_wilayah' => ['nullable', 'numeric', 'min:0.01', 'max:999999.99'],
            'jumlah_penduduk' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'geojson_file' => ['nullable', 'file', 'max:5120'],
            'geojson_data' => ['nullable'],
        ], [
            'nama.required' => 'Nama kecamatan wajib diisi.',
            'nama.string' => 'Nama kecamatan harus berupa teks yang valid.',
            'nama.max' => 'Nama kecamatan tidak boleh melebihi 60 karakter.',
            'nama.unique' => 'Nama kecamatan sudah terdaftar dalam basis data.',
            'kode.required' => 'Kode wilayah kecamatan wajib diisi.',
            'kode.string' => 'Kode wilayah harus berupa teks yang valid.',
            'kode.max' => 'Kode wilayah tidak boleh melebihi 10 karakter.',
            'kode.unique' => 'Kode wilayah sudah terdaftar dalam basis data.',
            'luas_wilayah.numeric' => 'Luas wilayah harus berupa angka numerik yang valid.',
            'luas_wilayah.min' => 'Luas wilayah minimal bernilai 0.01 km².',
            'luas_wilayah.max' => 'Luas wilayah tidak boleh melebihi 999.999 km².',
            'jumlah_penduduk.integer' => 'Jumlah estimasi penduduk harus berupa bilangan bulat positif.',
            'jumlah_penduduk.min' => 'Jumlah estimasi penduduk tidak boleh bernilai negatif.',
            'jumlah_penduduk.max' => 'Jumlah estimasi penduduk melebihi batas wajar.',
            'geojson_file.file' => 'Berkas batas administrasi harus berupa file yang valid.',
            'geojson_file.max' => 'Ukuran berkas GeoJSON tidak boleh melebihi 5 MB.',
        ]);

        // 1. Ekstraksi dan Validasi Geometri GeoJSON (jika diunggah / dikirimkan)
        $geometry = null;
        $feature = null;

        if ($request->hasFile('geojson_file')) {
            $file = $request->file('geojson_file');
            $extension = strtolower($file->getClientOriginalExtension());
            if (!in_array($extension, ['geojson', 'json'], true)) {
                throw ValidationException::withMessages([
                    'geojson_file' => 'Format berkas batas administrasi tidak didukung. Harap unggah berkas berekstensi .geojson atau .json.',
                ]);
            }

            $rawContent = @file_get_contents($file->getRealPath());
            if ($rawContent === false || trim($rawContent) === '') {
                throw ValidationException::withMessages([
                    'geojson_file' => 'Berkas GeoJSON batas administrasi kosong atau tidak dapat dibaca.',
                ]);
            }

            $geometry = $this->validateAndExtractGeometry($rawContent, 'geojson_file');
        } elseif ($request->filled('geojson_data')) {
            $geometry = $this->validateAndExtractGeometry($request->input('geojson_data'), 'geojson_data');
        }

        if ($geometry !== null) {
            $feature = [
                'type' => 'Feature',
                'properties' => [
                    'kode_kecamatan' => (string) $validated['kode'],
                    'nama_kecamatan' => (string) $validated['nama'],
                    'kabupaten' => 'Banyumas',
                    'provinsi' => 'Jawa Tengah',
                    'source' => 'Input Administrator WebGIS',
                    'license' => 'Creative Commons Attribution (CC BY-IGO)',
                ],
                'geometry' => $geometry,
            ];
        }

        // 2. Simpan dalam Database Transaction
        DB::beginTransaction();
        try {
            $district = Kecamatan::create([
                'kode' => $validated['kode'],
                'nama' => $validated['nama'],
                'luas_wilayah' => isset($validated['luas_wilayah']) && $validated['luas_wilayah'] !== '' ? (float) $validated['luas_wilayah'] : null,
                'jumlah_penduduk' => isset($validated['jumlah_penduduk']) && $validated['jumlah_penduduk'] !== '' ? (int) $validated['jumlah_penduduk'] : null,
            ]);

            // Simpan feature ke penyimpanan GeoJSON terintegrasi jika ada
            if ($feature !== null) {
                $this->saveGeoJsonFeature($feature, (string) $validated['kode']);
            }

            DB::commit();

            $hasGeometry = $feature !== null;

            return response()->json([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil ditambahkan.',
                'region' => [
                    'id' => $district->id,
                    'kode' => $district->kode,
                    'nama' => $district->nama,
                    'luas_wilayah' => $district->luas_wilayah ? (float) $district->luas_wilayah : null,
                    'luas_wilayah_formatted' => $district->luas_wilayah
                        ? number_format((float) $district->luas_wilayah, 2, ',', '.') . ' km²'
                        : '-',
                    'jumlah_penduduk' => $district->jumlah_penduduk ? (int) $district->jumlah_penduduk : null,
                    'jumlah_penduduk_formatted' => $district->jumlah_penduduk
                        ? number_format((int) $district->jumlah_penduduk, 0, ',', '.') . ' jiwa'
                        : '-',
                    'has_geometry' => $hasGeometry,
                    'geometry_status' => $hasGeometry ? 'Batas Tersedia' : 'Belum Tersedia',
                    'total_case_records' => 0,
                    'total_cases' => 0,
                    'total_deaths' => 0,
                    'created_at' => $district->created_at?->toISOString(),
                    'updated_at' => $district->updated_at?->toISOString(),
                    'updated_at_formatted' => $district->updated_at?->format('d M Y, H:i') ?? '-',
                ],
            ], 201);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menyimpan data wilayah kecamatan baru.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update an existing sub-district (wilayah kecamatan) and optionally its
     * administrative boundary geometry (System Feature 23).
     */
    public function update(int|string $id, Request $request): JsonResponse
    {
        $district = Kecamatan::find($id);
        if (!$district) {
            return response()->json([
                'success' => false,
                'message' => 'Data wilayah kecamatan tidak ditemukan dalam sistem.',
            ], 404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:60', Rule::unique('kecamatans', 'nama')->ignore($district->id)],
            'kode' => ['required', 'string', 'max:10', Rule::unique('kecamatans', 'kode')->ignore($district->id)],
            'luas_wilayah' => ['nullable', 'numeric', 'min:0.01', 'max:999999.99'],
            'jumlah_penduduk' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'geojson_file' => ['nullable', 'file', 'max:5120'],
            'geojson_data' => ['nullable'],
        ], [
            'nama.required' => 'Nama kecamatan wajib diisi.',
            'nama.string' => 'Nama kecamatan harus berupa teks yang valid.',
            'nama.max' => 'Nama kecamatan tidak boleh melebihi 60 karakter.',
            'nama.unique' => 'Nama kecamatan sudah terdaftar dalam basis data.',
            'kode.required' => 'Kode wilayah kecamatan wajib diisi.',
            'kode.string' => 'Kode wilayah harus berupa teks yang valid.',
            'kode.max' => 'Kode wilayah tidak boleh melebihi 10 karakter.',
            'kode.unique' => 'Kode wilayah sudah terdaftar dalam basis data.',
            'luas_wilayah.numeric' => 'Luas wilayah harus berupa angka numerik yang valid.',
            'luas_wilayah.min' => 'Luas wilayah minimal bernilai 0.01 km².',
            'luas_wilayah.max' => 'Luas wilayah tidak boleh melebihi 999.999 km².',
            'jumlah_penduduk.integer' => 'Jumlah estimasi penduduk harus berupa bilangan bulat positif.',
            'jumlah_penduduk.min' => 'Jumlah estimasi penduduk tidak boleh bernilai negatif.',
            'jumlah_penduduk.max' => 'Jumlah estimasi penduduk melebihi batas wajar.',
            'geojson_file.file' => 'Berkas batas administrasi harus berupa file yang valid.',
            'geojson_file.max' => 'Ukuran berkas GeoJSON tidak boleh melebihi 5 MB.',
        ]);

        $oldKode = (string) $district->kode;
        $oldNama = (string) $district->nama;
        $newKode = (string) $validated['kode'];
        $newNama = (string) $validated['nama'];

        // Validasi & ekstrak geometri baru jika diunggah
        $newGeometry = null;
        if ($request->hasFile('geojson_file')) {
            $file = $request->file('geojson_file');
            $extension = strtolower($file->getClientOriginalExtension());
            if (!in_array($extension, ['geojson', 'json'], true)) {
                throw ValidationException::withMessages([
                    'geojson_file' => 'Format berkas batas administrasi tidak didukung. Harap unggah berkas berekstensi .geojson atau .json.',
                ]);
            }

            $rawContent = @file_get_contents($file->getRealPath());
            if ($rawContent === false || trim($rawContent) === '') {
                throw ValidationException::withMessages([
                    'geojson_file' => 'Berkas GeoJSON batas administrasi kosong atau tidak dapat dibaca.',
                ]);
            }

            $newGeometry = $this->validateAndExtractGeometry($rawContent, 'geojson_file');
        } elseif ($request->filled('geojson_data')) {
            $newGeometry = $this->validateAndExtractGeometry($request->input('geojson_data'), 'geojson_data');
        }

        DB::beginTransaction();
        try {
            $district->update([
                'kode' => $newKode,
                'nama' => $newNama,
                'luas_wilayah' => isset($validated['luas_wilayah']) && $validated['luas_wilayah'] !== '' ? (float) $validated['luas_wilayah'] : null,
                'jumlah_penduduk' => isset($validated['jumlah_penduduk']) && $validated['jumlah_penduduk'] !== '' ? (int) $validated['jumlah_penduduk'] : null,
            ]);

            $this->updateGeoJsonFeature($oldKode, $oldNama, $newKode, $newNama, $newGeometry);

            DB::commit();

            $geojson = $this->loadGeoJson();
            $feature = $this->findGeoJsonFeature($district->kode, $district->nama, $geojson);
            $hasGeometry = $feature !== null;

            return response()->json([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil diperbarui.',
                'region' => [
                    'id' => $district->id,
                    'kode' => $district->kode,
                    'nama' => $district->nama,
                    'luas_wilayah' => $district->luas_wilayah ? (float) $district->luas_wilayah : null,
                    'luas_wilayah_formatted' => $district->luas_wilayah
                        ? number_format((float) $district->luas_wilayah, 2, ',', '.') . ' km²'
                        : '-',
                    'jumlah_penduduk' => $district->jumlah_penduduk ? (int) $district->jumlah_penduduk : null,
                    'jumlah_penduduk_formatted' => $district->jumlah_penduduk
                        ? number_format((int) $district->jumlah_penduduk, 0, ',', '.') . ' jiwa'
                        : '-',
                    'has_geometry' => $hasGeometry,
                    'geometry_status' => $hasGeometry ? 'Batas Tersedia' : 'Belum Tersedia',
                    'created_at' => $district->created_at?->toISOString(),
                    'updated_at' => $district->updated_at?->toISOString(),
                    'updated_at_formatted' => $district->updated_at?->format('d M Y, H:i') ?? '-',
                ],
            ], 200);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat memperbarui data wilayah kecamatan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete an existing sub-district (wilayah kecamatan) and its administrative
     * boundary geometry if no dependent case data exists (System Feature 24).
     */
    public function destroy(int|string $id): JsonResponse
    {
        $district = Kecamatan::find($id);
        if (!$district) {
            return response()->json([
                'success' => false,
                'message' => 'Data wilayah kecamatan tidak ditemukan dalam sistem.',
            ], 404);
        }

        // PENTING: Periksa keterkaitan data kasus DBD. Tolak penghapusan jika masih ada data kasus terkait!
        $linkedCasesCount = $district->kasusAgregat()->count();
        if ($linkedCasesCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Wilayah tidak dapat dihapus karena masih digunakan oleh data kasus DBD. Periksa dan selesaikan keterkaitan data terlebih dahulu.',
                'linked_cases_count' => $linkedCasesCount,
                'errors' => [
                    'dependency' => [
                        "Wilayah Kecamatan {$district->nama} masih memiliki {$linkedCasesCount} rekaman data kasus DBD terkait.",
                    ],
                ],
            ], 422);
        }

        $kode = (string) $district->kode;
        $nama = (string) $district->nama;
        $deletedId = $district->id;

        DB::beginTransaction();
        try {
            $district->delete();

            // Hapus feature dari berkas master GeoJSON dan direktori districts jika ada
            $this->removeGeoJsonFeature($kode, $nama);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data wilayah kecamatan berhasil dihapus.',
                'deleted_id' => $deletedId,
                'deleted_nama' => $nama,
            ], 200);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menghapus data wilayah kecamatan.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Menghapus feature GeoJSON dari file master banyumas_27_kecamatan.geojson dan direktori districts.
     */
    private function removeGeoJsonFeature(string $kode, string $nama): void
    {
        $masterPath = public_path('geojson/banyumas_27_kecamatan.geojson');
        $districtsDir = public_path('geojson/districts');

        if (File::exists($masterPath)) {
            $masterData = json_decode(File::get($masterPath), true);
            if (is_array($masterData) && isset($masterData['features']) && is_array($masterData['features'])) {
                $masterData['features'] = array_values(array_filter(
                    $masterData['features'],
                    function ($f) use ($kode, $nama) {
                        $props = $f['properties'] ?? [];
                        $fKode = $props['kode_kecamatan'] ?? $props['kode'] ?? null;
                        $fNama = $props['nama_kecamatan'] ?? $props['nama'] ?? null;

                        if ($fKode && strcasecmp(trim((string) $fKode), trim($kode)) === 0) {
                            return false;
                        }
                        if ($fNama && strcasecmp(trim((string) $fNama), trim($nama)) === 0) {
                            return false;
                        }

                        return true;
                    }
                ));

                if (isset($masterData['metadata'])) {
                    $masterData['metadata']['total_kecamatan'] = count($masterData['features']);
                    $masterData['metadata']['updated_at'] = now()->toDateString();
                }

                File::put($masterPath, json_encode($masterData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        }

        if (File::exists("{$districtsDir}/{$kode}.geojson")) {
            File::delete("{$districtsDir}/{$kode}.geojson");
        }
    }

    /**
     * Memperbarui feature GeoJSON pada master banyumas_27_kecamatan.geojson dan direktori districts.
     */
    private function updateGeoJsonFeature(
        string $oldKode,
        string $oldNama,
        string $newKode,
        string $newNama,
        ?array $newGeometry
    ): bool {
        $masterPath = public_path('geojson/banyumas_27_kecamatan.geojson');
        $districtsDir = public_path('geojson/districts');
        $hasGeometry = false;
        $updatedFeature = null;

        if (File::exists($masterPath)) {
            $masterData = json_decode(File::get($masterPath), true);
            if (is_array($masterData) && isset($masterData['features']) && is_array($masterData['features'])) {
                $features = $masterData['features'];
                $matchedIndex = null;

                foreach ($features as $idx => $f) {
                    $props = $f['properties'] ?? [];
                    $fKode = $props['kode_kecamatan'] ?? $props['kode'] ?? null;
                    $fNama = $props['nama_kecamatan'] ?? $props['nama'] ?? null;

                    if (($fKode && strcasecmp(trim((string) $fKode), trim($oldKode)) === 0) ||
                        ($fNama && strcasecmp(trim((string) $fNama), trim($oldNama)) === 0)) {
                        $matchedIndex = $idx;
                        break;
                    }
                }

                if ($newGeometry !== null) {
                    $updatedFeature = [
                        'type' => 'Feature',
                        'properties' => [
                            'kode_kecamatan' => $newKode,
                            'nama_kecamatan' => $newNama,
                            'kabupaten' => 'Banyumas',
                            'provinsi' => 'Jawa Tengah',
                            'source' => 'Update Administrator WebGIS',
                            'license' => 'Creative Commons Attribution (CC BY-IGO)',
                        ],
                        'geometry' => $newGeometry,
                    ];

                    if ($matchedIndex !== null) {
                        $features[$matchedIndex] = $updatedFeature;
                    } else {
                        $features[] = $updatedFeature;
                    }
                    $hasGeometry = true;
                } else {
                    // Jika tidak ada geometri baru yang diunggah, sinkronkan kode dan nama pada feature yang sudah ada
                    if ($matchedIndex !== null) {
                        $features[$matchedIndex]['properties']['kode_kecamatan'] = $newKode;
                        $features[$matchedIndex]['properties']['nama_kecamatan'] = $newNama;
                        $updatedFeature = $features[$matchedIndex];
                        $hasGeometry = true;
                    }
                }

                $masterData['features'] = array_values($features);
                if (isset($masterData['metadata'])) {
                    $masterData['metadata']['total_kecamatan'] = count($masterData['features']);
                    $masterData['metadata']['updated_at'] = now()->toDateString();
                }
                File::put($masterPath, json_encode($masterData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        }

        // Simpan / update ke direktori public/geojson/districts
        if (!File::exists($districtsDir)) {
            File::makeDirectory($districtsDir, 0755, true);
        }

        if ($updatedFeature !== null) {
            if ($oldKode !== $newKode && File::exists("{$districtsDir}/{$oldKode}.geojson")) {
                File::delete("{$districtsDir}/{$oldKode}.geojson");
            }
            File::put("{$districtsDir}/{$newKode}.geojson", json_encode($updatedFeature, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

        return $hasGeometry;
    }

    /**
     * Memvalidasi dan mengekstrak geometri Polygon / MultiPolygon dari payload GeoJSON.
     *
     * @throws ValidationException
     */
    private function validateAndExtractGeometry(mixed $rawContent, string $field): array
    {
        if (is_string($rawContent)) {
            $decoded = json_decode($rawContent, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                throw ValidationException::withMessages([
                    $field => 'Format berkas GeoJSON rusak atau tidak sesuai standar JSON.',
                ]);
            }
        } elseif (is_array($rawContent)) {
            $decoded = $rawContent;
        } else {
            throw ValidationException::withMessages([
                $field => 'Data batas administrasi tidak valid.',
            ]);
        }

        // Tentukan objek geometri dari struktur GeoJSON
        $geometry = null;
        $type = $decoded['type'] ?? null;

        if ($type === 'FeatureCollection') {
            $features = $decoded['features'] ?? [];
            if (!is_array($features) || empty($features)) {
                throw ValidationException::withMessages([
                    $field => 'Struktur GeoJSON FeatureCollection tidak memiliki fitur wilayah (features kosong).',
                ]);
            }
            // Ambil feature pertama
            $firstFeature = $features[0];
            $geometry = $firstFeature['geometry'] ?? null;
        } elseif ($type === 'Feature') {
            $geometry = $decoded['geometry'] ?? null;
        } elseif (in_array($type, ['Polygon', 'MultiPolygon'], true)) {
            $geometry = $decoded;
        } else {
            throw ValidationException::withMessages([
                $field => 'Struktur GeoJSON tidak valid. Tipe harus berupa Feature, FeatureCollection, Polygon, atau MultiPolygon.',
            ]);
        }

        if (!is_array($geometry) || empty($geometry['type']) || empty($geometry['coordinates'])) {
            throw ValidationException::withMessages([
                $field => 'Geometri GeoJSON kosong atau tidak memiliki informasi koordinat spasial.',
            ]);
        }

        $geomType = $geometry['type'];
        if (!in_array($geomType, ['Polygon', 'MultiPolygon'], true)) {
            throw ValidationException::withMessages([
                $field => "Tipe geometri '{$geomType}' tidak didukung. Batas administrasi wilayah harus berupa Polygon atau MultiPolygon.",
            ]);
        }

        $coords = $geometry['coordinates'];
        if (!is_array($coords) || empty($coords)) {
            throw ValidationException::withMessages([
                $field => 'Koordinat batas administrasi tidak boleh kosong.',
            ]);
        }

        // Validasi struktur koordinat dasar
        $isValidCoords = false;
        if ($geomType === 'Polygon') {
            // Polygon: array of rings; ring 0 is outer boundary
            if (isset($coords[0]) && is_array($coords[0]) && count($coords[0]) >= 3) {
                $isValidCoords = true;
                foreach ($coords[0] as $point) {
                    if (!is_array($point) || count($point) < 2 || !is_numeric($point[0]) || !is_numeric($point[1])) {
                        $isValidCoords = false;
                        break;
                    }
                }
            }
        } elseif ($geomType === 'MultiPolygon') {
            // MultiPolygon: array of polygons
            if (isset($coords[0][0]) && is_array($coords[0][0]) && count($coords[0][0]) >= 3) {
                $isValidCoords = true;
                foreach ($coords[0][0] as $point) {
                    if (!is_array($point) || count($point) < 2 || !is_numeric($point[0]) || !is_numeric($point[1])) {
                        $isValidCoords = false;
                        break;
                    }
                }
            }
        }

        if (!$isValidCoords) {
            throw ValidationException::withMessages([
                $field => 'Koordinat batas administrasi tidak valid. Pastikan koordinat merupakan pasangan [longitude, latitude] numerik.',
            ]);
        }

        return $geometry;
    }

    /**
     * Menyimpan feature GeoJSON baru ke file master banyumas_27_kecamatan.geojson dan direktori districts.
     */
    private function saveGeoJsonFeature(array $feature, string $kode): void
    {
        // 1. Simpan salinan individu di public/geojson/districts/{kode}.geojson
        $districtsDir = public_path('geojson/districts');
        if (!File::exists($districtsDir)) {
            File::makeDirectory($districtsDir, 0755, true);
        }
        File::put("{$districtsDir}/{$kode}.geojson", json_encode($feature, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        // 2. Gabungkan ke master banyumas_27_kecamatan.geojson
        $masterPath = public_path('geojson/banyumas_27_kecamatan.geojson');
        if (File::exists($masterPath)) {
            $masterData = json_decode(File::get($masterPath), true);
            if (is_array($masterData) && isset($masterData['features']) && is_array($masterData['features'])) {
                // Hapus jika ada feature dengan kode yang sama
                $masterData['features'] = array_values(array_filter(
                    $masterData['features'],
                    fn ($f) => ($f['properties']['kode_kecamatan'] ?? $f['properties']['kode'] ?? null) !== $kode
                ));
                // Tambahkan feature baru
                $masterData['features'][] = $feature;
                if (isset($masterData['metadata'])) {
                    $masterData['metadata']['total_kecamatan'] = count($masterData['features']);
                    $masterData['metadata']['updated_at'] = now()->toDateString();
                }
                File::put($masterPath, json_encode($masterData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        }
    }

    /**
     * Membaca file GeoJSON batas kecamatan Kabupaten Banyumas.
     */
    private function loadGeoJson(): ?array
    {
        $path = public_path('geojson/banyumas_27_kecamatan.geojson');
        if (!file_exists($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if (!$raw) {
            return null;
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Mengambil daftar kode kecamatan yang memiliki batas geometri GeoJSON.
     */
    private function getGeoJsonCodes(?array $geojson): array
    {
        if (!$geojson || !isset($geojson['features']) || !is_array($geojson['features'])) {
            return [];
        }

        $codes = [];
        foreach ($geojson['features'] as $feature) {
            $props = $feature['properties'] ?? [];
            if (!empty($props['kode_kecamatan'])) {
                $codes[] = (string) $props['kode_kecamatan'];
            } elseif (!empty($props['kode'])) {
                $codes[] = (string) $props['kode'];
            }
        }

        return array_unique($codes);
    }

    /**
     * Menemukan feature GeoJSON yang cocok berdasarkan kode atau nama kecamatan.
     */
    private function findGeoJsonFeature(string $kode, string $nama, ?array $geojson): ?array
    {
        if (!$geojson || !isset($geojson['features']) || !is_array($geojson['features'])) {
            return null;
        }

        foreach ($geojson['features'] as $feature) {
            $props = $feature['properties'] ?? [];
            $featureKode = $props['kode_kecamatan'] ?? $props['kode'] ?? null;
            $featureNama = $props['nama_kecamatan'] ?? $props['nama'] ?? null;

            if ($featureKode && strcasecmp(trim((string) $featureKode), trim($kode)) === 0) {
                return $feature;
            }

            if ($featureNama && strcasecmp(trim((string) $featureNama), trim($nama)) === 0) {
                return $feature;
            }
        }

        return null;
    }
}

