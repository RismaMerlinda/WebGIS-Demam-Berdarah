<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DatasetMetadata;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

class MetadataManagementController extends Controller
{
    /**
     * Nama-nama bulan standar dalam Bahasa Indonesia untuk pemformatan tanggal.
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
     * Pemetaan kategori teknis ke label human-readable Bahasa Indonesia.
     */
    private const CATEGORY_LABELS = [
        'published' => 'Resmi Dipublikasikan',
        'published_simulation' => 'Simulasi Pengembangan',
        'reference' => 'Referensi & Geospasial',
        'internal_restricted' => 'Internal Terbatas',
    ];

    /**
     * Mengambil daftar metadata dataset dengan pencarian (nama dataset & kategori),
     * filter kategori, ringkasan statistik aktual dari basis data MySQL, dan pagination (System Feature 29).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $search = trim((string) $request->input('search', ''));
            $categoryFilter = trim((string) $request->input('category', 'all'));
            $perPage = (int) $request->input('per_page', 10);
            if ($perPage <= 0 || $perPage > 100) {
                $perPage = 10;
            }

            // 1. Ringkasan Statistik Berdasarkan Basis Data Aktual MySQL
            $summaryStats = [
                'total_datasets' => (int) DatasetMetadata::count(),
                'total_categories' => (int) DatasetMetadata::whereNotNull('source_category')
                    ->where('source_category', '!=', '')
                    ->distinct('source_category')
                    ->count('source_category'),
                'with_source_count' => (int) DatasetMetadata::whereNotNull('source_name')
                    ->where('source_name', '!=', '')
                    ->count(),
                'with_update_date_count' => (int) DatasetMetadata::whereNotNull('update_date')->count(),
            ];

            // 2. Opsi Kategori untuk Filter UI
            $categoryCounts = DatasetMetadata::selectRaw('source_category, count(*) as count')
                ->whereNotNull('source_category')
                ->groupBy('source_category')
                ->pluck('count', 'source_category')
                ->all();

            $categoriesList = [
                [
                    'key' => 'all',
                    'label' => 'Semua Kategori',
                    'count' => $summaryStats['total_datasets'],
                ],
            ];

            foreach (self::CATEGORY_LABELS as $catKey => $catLabel) {
                if (isset($categoryCounts[$catKey]) || DatasetMetadata::where('source_category', $catKey)->exists()) {
                    $categoriesList[] = [
                        'key' => $catKey,
                        'label' => $catLabel,
                        'count' => (int) ($categoryCounts[$catKey] ?? 0),
                    ];
                }
            }

            // 3. Query Dasar dengan Eager Loading Relasi Periode
            $query = DatasetMetadata::with('periode');

            // 4. Filter Kategori Spesifik
            if ($categoryFilter !== '' && $categoryFilter !== 'all') {
                $query->where('source_category', $categoryFilter);
            }

            // 5. Pencarian Fleksibel (Nama Dataset & Kategori)
            if ($search !== '') {
                $searchLower = mb_strtolower($search);

                $query->where(function ($q) use ($search, $searchLower) {
                    $q->where('dataset_name', 'like', "%{$search}%")
                        ->orWhere('dataset_code', 'like', "%{$search}%")
                        ->orWhere('source_category', 'like', "%{$search}%")
                        ->orWhere('source_type', 'like', "%{$search}%")
                        ->orWhere('source_name', 'like', "%{$search}%")
                        ->orWhere('reference_source', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('publication_status', 'like', "%{$search}%");

                    // Pemetaan kata kunci Bahasa Indonesia ke kategori teknis
                    if (str_contains($searchLower, 'resmi') || str_contains($searchLower, 'publikasi')) {
                        $q->orWhere('source_category', 'published');
                    }
                    if (str_contains($searchLower, 'simulasi')) {
                        $q->orWhere('source_category', 'published_simulation');
                    }
                    if (str_contains($searchLower, 'referensi') || str_contains($searchLower, 'pembanding') || str_contains($searchLower, 'geospasial')) {
                        $q->orWhere('source_category', 'reference');
                    }
                    if (str_contains($searchLower, 'internal') || str_contains($searchLower, 'terbatas') || str_contains($searchLower, 'restriksi')) {
                        $q->orWhere('source_category', 'internal_restricted');
                    }
                });
            }

            // 6. Pengurutan & Eksekusi Pagination
            $paginated = $query->orderBy('id', 'asc')->paginate($perPage);

            // 7. Format Output Item Sesuai Spesifikasi Sistem WebGIS
            $items = $paginated->getCollection()->map(function (DatasetMetadata $item) {
                return $this->formatMetadataItem($item);
            });

            return response()->json([
                'success' => true,
                'summary' => $summaryStats,
                'categories' => $categoriesList,
                'data' => $items,
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem(),
                    'to' => $paginated->lastItem(),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server saat memuat data metadata dataset.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Menambahkan definisi metadata dataset baru ke dalam basis data MySQL (System Feature 31).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Normalisasi payload dengan alias Bahasa Indonesia
            $input = [
                'dataset_name' => $request->input('dataset_name'),
                'dataset_code' => $request->input('dataset_code'),
                'source_category' => $request->input('source_category', $request->input('kategori')),
                'indicator' => $request->input('indicator', $request->input('satuan_pengukuran')),
                'description' => $request->input('description', $request->input('deskripsi')),
                'source_name' => $request->input('source_name', $request->input('sumber_data')),
                'reference_source' => $request->input('reference_source', $request->input('rujukan')),
                'source_type' => $request->input('source_type'),
                'spatial_unit' => $request->input('spatial_unit', $request->input('cakupan_wilayah')),
                'period_start' => $request->input('period_start'),
                'period_end' => $request->input('period_end'),
                'observation_year' => $request->input('observation_year'),
                'granularity' => $request->input('granularity', $request->input('frekuensi_pembaruan')),
                'validation_status' => $request->input('validation_status', $request->input('catatan_keterbatasan')),
                'publication_status' => $request->input('publication_status'),
                'periode_id' => $request->input('periode_id'),
            ];

            $validator = Validator::make($input, [
                'dataset_name' => ['required', 'string', 'max:255', 'unique:dataset_metadatas,dataset_name'],
                'dataset_code' => ['nullable', 'string', 'max:100', 'unique:dataset_metadatas,dataset_code'],
                'source_category' => ['required', 'string', Rule::in(['published', 'published_simulation', 'reference', 'internal_restricted'])],
                'indicator' => ['nullable', 'string', 'max:255'],
                'description' => ['required', 'string', 'max:5000'],
                'source_name' => ['required', 'string', 'max:255'],
                'reference_source' => ['nullable', 'string', 'max:255'],
                'source_type' => ['nullable', 'string', 'max:255'],
                'spatial_unit' => ['required', 'string', 'max:255'],
                'period_start' => ['nullable', 'date'],
                'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
                'observation_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
                'granularity' => ['required', 'string', 'max:255'],
                'validation_status' => ['nullable', 'string', 'max:2000'],
                'publication_status' => ['nullable', 'string', 'max:255'],
                'periode_id' => ['nullable', 'integer', 'exists:periodes,id'],
            ], [
                'dataset_name.required' => 'Nama dataset wajib diisi.',
                'dataset_name.max' => 'Nama dataset tidak boleh lebih dari 255 karakter.',
                'dataset_name.unique' => 'Nama dataset sudah terdaftar dalam sistem. Gunakan nama yang berbeda.',
                'dataset_code.unique' => 'Kode dataset sudah digunakan. Gunakan kode yang unik.',
                'source_category.required' => 'Kategori data wajib dipilih.',
                'source_category.in' => 'Kategori data yang dipilih tidak valid.',
                'description.required' => 'Deskripsi dataset wajib diisi.',
                'description.max' => 'Deskripsi dataset tidak boleh lebih dari 5000 karakter.',
                'source_name.required' => 'Sumber data wajib diisi.',
                'source_name.max' => 'Sumber data tidak boleh lebih dari 255 karakter.',
                'spatial_unit.required' => 'Cakupan wilayah wajib diisi.',
                'spatial_unit.max' => 'Cakupan wilayah tidak boleh lebih dari 255 karakter.',
                'period_end.after_or_equal' => 'Tanggal akhir rentang periode tidak boleh lebih awal dari tanggal awal periode.',
                'observation_year.integer' => 'Tahun pengamatan harus berupa angka tahun yang valid.',
                'observation_year.min' => 'Tahun pengamatan minimal tahun 2000.',
                'observation_year.max' => 'Tahun pengamatan maksimal tahun 2100.',
                'granularity.required' => 'Frekuensi pembaruan wajib dipilih atau diisi.',
                'granularity.max' => 'Frekuensi pembaruan tidak boleh lebih dari 255 karakter.',
                'validation_status.max' => 'Catatan keterbatasan data tidak boleh lebih dari 2000 karakter.',
                'periode_id.exists' => 'Periode waktu yang dipilih tidak ditemukan dalam sistem.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal. Periksa kembali informasi yang Anda masukkan.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Pengecekan case-insensitive nama dataset untuk perlindungan ekstra
            $normalizedName = mb_strtolower(trim((string) $input['dataset_name']));
            if (DatasetMetadata::whereRaw('LOWER(dataset_name) = ?', [$normalizedName])->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal. Periksa kembali informasi yang Anda masukkan.',
                    'errors' => [
                        'dataset_name' => ['Nama dataset sudah terdaftar dalam sistem. Gunakan nama yang berbeda.'],
                    ],
                ], 422);
            }

            // Generate kode dataset unik jika tidak dimasukkan secara manual
            $datasetCode = $input['dataset_code'];
            if (empty($datasetCode)) {
                $codePrefix = match ($input['source_category']) {
                    'published' => 'DBD-BMS-PUB',
                    'published_simulation' => 'DBD-BMS-SIM',
                    'reference' => 'REF-BMS',
                    'internal_restricted' => 'INT-EDBD',
                    default => 'DBD-BMS-DATA',
                };
                $yearPart = $input['observation_year'] ? "-{$input['observation_year']}" : '';
                $randomSuffix = strtoupper(substr(uniqid(), -4));
                $datasetCode = "{$codePrefix}{$yearPart}-{$randomSuffix}";

                while (DatasetMetadata::where('dataset_code', $datasetCode)->exists()) {
                    $randomSuffix = strtoupper(substr(uniqid(), -4));
                    $datasetCode = "{$codePrefix}{$yearPart}-{$randomSuffix}";
                }
            }

            // Tentukan source_type dan publication_status standar jika kosong
            $sourceType = $input['source_type'] ?: match ($input['source_category']) {
                'published' => 'Workbook Rekapitulasi Resmi Daerah',
                'published_simulation' => 'Dataset Simulasi Pengembangan Terlabel',
                'reference' => 'Dokumen Referensi Pembanding & Geospasial',
                'internal_restricted' => 'Workbook Surveilans Internal Instansi (Akses Dibatasi)',
                default => 'Dataset Eksternal / Terstruktur',
            };

            $publicationStatus = $input['publication_status'] ?: match ($input['source_category']) {
                'published' => 'Resmi Dipublikasikan',
                'published_simulation' => 'Data Simulasi Pengembangan (Parsial)',
                'reference' => 'Sumber Referensi Pembanding',
                'internal_restricted' => 'Data Internal Belum Diizinkan Publikasi',
                default => 'Terdaftar dalam Sistem',
            };

            $metadata = null;
            DB::transaction(function () use (&$metadata, $input, $datasetCode, $sourceType, $publicationStatus) {
                $metadata = DatasetMetadata::create([
                    'dataset_code' => $datasetCode,
                    'dataset_name' => $input['dataset_name'],
                    'source_category' => $input['source_category'],
                    'indicator' => $input['indicator'],
                    'description' => $input['description'],
                    'source_name' => $input['source_name'],
                    'reference_source' => $input['reference_source'],
                    'source_type' => $sourceType,
                    'spatial_unit' => $input['spatial_unit'],
                    'period_start' => $input['period_start'],
                    'period_end' => $input['period_end'],
                    'observation_year' => $input['observation_year'],
                    'granularity' => $input['granularity'],
                    'publication_status' => $publicationStatus,
                    'validation_status' => $input['validation_status'],
                    'update_date' => now()->toDateString(),
                    'is_public_visible' => true,
                    'periode_id' => $input['periode_id'],
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Data metadata berhasil ditambahkan.',
                'data' => $this->formatMetadataItem($metadata->fresh(['periode']), true),
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server saat menambahkan metadata dataset.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Mengambil detail lengkap metadata dataset berdasarkan ID (System Feature 29).
     */
    public function show(int|string $id): JsonResponse
    {
        try {
            $metadata = DatasetMetadata::with('periode')->find($id);

            if (! $metadata) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data metadata dataset tidak ditemukan.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $this->formatMetadataItem($metadata, true),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server saat mengambil detail metadata dataset.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Memperbarui 9 field informasi metadata dataset yang tersimpan pada rekaman yang sama (System Feature 30).
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        try {
            $metadata = DatasetMetadata::find($id);

            if (! $metadata) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data metadata dataset tidak ditemukan.',
                ], 404);
            }

            // Normalisasi payload dengan alias Bahasa Indonesia
            $input = [
                'dataset_name' => $request->input('dataset_name'),
                'source_category' => $request->input('source_category', $request->input('kategori')),
                'indicator' => $request->input('indicator', $request->input('satuan_pengukuran')),
                'description' => $request->input('description', $request->input('deskripsi')),
                'source_name' => $request->input('source_name', $request->input('sumber_data')),
                'reference_source' => $request->input('reference_source', $request->input('rujukan')),
                'spatial_unit' => $request->input('spatial_unit', $request->input('cakupan_wilayah')),
                'period_start' => $request->input('period_start'),
                'period_end' => $request->input('period_end'),
                'observation_year' => $request->input('observation_year'),
                'granularity' => $request->input('granularity', $request->input('frekuensi_pembaruan')),
                'validation_status' => $request->input('validation_status', $request->input('catatan_keterbatasan')),
                'publication_status' => $request->input('publication_status'),
            ];

            $validator = Validator::make($input, [
                'dataset_name' => ['required', 'string', 'max:255'],
                'source_category' => ['required', 'string', Rule::in(['published', 'published_simulation', 'reference', 'internal_restricted'])],
                'indicator' => ['nullable', 'string', 'max:255'],
                'description' => ['required', 'string', 'max:5000'],
                'source_name' => ['required', 'string', 'max:255'],
                'reference_source' => ['nullable', 'string', 'max:255'],
                'spatial_unit' => ['required', 'string', 'max:255'],
                'period_start' => ['nullable', 'date'],
                'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
                'observation_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
                'granularity' => ['required', 'string', 'max:255'],
                'validation_status' => ['nullable', 'string', 'max:2000'],
                'publication_status' => ['nullable', 'string', 'max:255'],
            ], [
                'dataset_name.required' => 'Nama dataset wajib diisi.',
                'dataset_name.max' => 'Nama dataset tidak boleh lebih dari 255 karakter.',
                'source_category.required' => 'Kategori data wajib dipilih.',
                'source_category.in' => 'Kategori data yang dipilih tidak valid.',
                'description.required' => 'Deskripsi dataset wajib diisi.',
                'description.max' => 'Deskripsi dataset tidak boleh lebih dari 5000 karakter.',
                'source_name.required' => 'Sumber data wajib diisi.',
                'source_name.max' => 'Sumber data tidak boleh lebih dari 255 karakter.',
                'spatial_unit.required' => 'Cakupan wilayah wajib diisi.',
                'spatial_unit.max' => 'Cakupan wilayah tidak boleh lebih dari 255 karakter.',
                'period_end.after_or_equal' => 'Tanggal akhir rentang periode tidak boleh lebih awal dari tanggal awal periode.',
                'observation_year.integer' => 'Tahun pengamatan harus berupa angka tahun yang valid.',
                'observation_year.min' => 'Tahun pengamatan minimal tahun 2000.',
                'observation_year.max' => 'Tahun pengamatan maksimal tahun 2100.',
                'granularity.required' => 'Frekuensi pembaruan wajib dipilih atau diisi.',
                'granularity.max' => 'Frekuensi pembaruan tidak boleh lebih dari 255 karakter.',
                'validation_status.max' => 'Catatan keterbatasan data tidak boleh lebih dari 2000 karakter.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal. Periksa kembali informasi yang Anda masukkan.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $updateData = [
                'dataset_name' => $input['dataset_name'],
                'source_category' => $input['source_category'],
                'indicator' => $input['indicator'],
                'description' => $input['description'],
                'source_name' => $input['source_name'],
                'reference_source' => $input['reference_source'],
                'spatial_unit' => $input['spatial_unit'],
                'period_start' => $input['period_start'],
                'period_end' => $input['period_end'],
                'observation_year' => $input['observation_year'],
                'granularity' => $input['granularity'],
                'validation_status' => $input['validation_status'],
            ];

            // Penentuan status publikasi standar jika kategori diubah dan status kosong
            if (! empty($input['publication_status'])) {
                $updateData['publication_status'] = $input['publication_status'];
            } elseif ($input['source_category'] !== $metadata->source_category) {
                $updateData['publication_status'] = match ($input['source_category']) {
                    'published' => 'Resmi Dipublikasikan',
                    'published_simulation' => 'Data Simulasi Pengembangan (Parsial)',
                    'reference' => 'Sumber Referensi Pembanding',
                    'internal_restricted' => 'Data Internal Belum Diizinkan Publikasi',
                    default => $metadata->publication_status,
                };
            }

            // Eksekusi pembaruan pada rekaman yang sama di dalam database transaction
            DB::transaction(function () use ($metadata, $updateData) {
                $metadata->update($updateData);
            });

            return response()->json([
                'success' => true,
                'message' => 'Informasi metadata berhasil diperbarui.',
                'data' => $this->formatMetadataItem($metadata->fresh(['periode']), true),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server saat memperbarui metadata dataset.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Menghapus informasi metadata dataset dari basis data MySQL (System Feature 32).
     */
    public function destroy(int|string $id): JsonResponse
    {
        try {
            $metadata = DatasetMetadata::with('periode')->find($id);

            if (! $metadata) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data metadata dataset tidak ditemukan dalam sistem atau sudah dihapus.',
                ], 404);
            }

            // Periksa dependensi relasi: tolak jika metadata merupakan referensi resmi wajib untuk periode dengan kasus aktif
            if ($metadata->periode_id && $metadata->periode) {
                $linkedCasesCount = $metadata->periode->kasusAgregat()->count();
                if ($linkedCasesCount > 0 && ($metadata->source_category === 'published' || str_starts_with((string) $metadata->dataset_code, 'DBD-BMS-ANNUAL-'))) {
                    return response()->json([
                        'success' => false,
                        'message' => "Metadata dataset \"{$metadata->dataset_name}\" merupakan referensi wajib untuk periode {$metadata->periode->nama} yang memiliki {$linkedCasesCount} rekaman data kasus DBD aktif. Hapus atau lepaskan keterkaitan data kasus terkait terlebih dahulu.",
                        'linked_cases_count' => $linkedCasesCount,
                        'errors' => [
                            'dependency' => [
                                "Metadata dataset masih menjadi referensi wajib bagi {$linkedCasesCount} rekaman data kasus DBD pada periode {$metadata->periode->nama}.",
                            ],
                        ],
                    ], 422);
                }
            }

            $deletedId = (int) $metadata->id;
            $deletedName = (string) $metadata->dataset_name;
            $deletedCode = (string) $metadata->dataset_code;

            DB::beginTransaction();
            try {
                $metadata->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Metadata dataset berhasil dihapus.',
                    'deleted_id' => $deletedId,
                    'deleted_name' => $deletedName,
                    'deleted_code' => $deletedCode,
                ], 200);
            } catch (Throwable $e) {
                DB::rollBack();
                report($e);

                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan sistem saat menghapus metadata dataset dari basis data.',
                    'error' => config('app.debug') ? $e->getMessage() : null,
                ], 500);
            }
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server saat memproses penghapusan metadata dataset.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Memformat record DatasetMetadata menjadi struktur data seragam dan informatif.
     */
    private function formatMetadataItem(DatasetMetadata $item, bool $detailed = false): array
    {
        $updateDateFormatted = '-';
        if ($item->update_date) {
            $day = (int) $item->update_date->format('j');
            $monthNum = (int) $item->update_date->format('n');
            $year = $item->update_date->format('Y');
            $monthName = self::INDONESIAN_MONTHS[$monthNum] ?? $item->update_date->format('F');
            $updateDateFormatted = "{$day} {$monthName} {$year}";
        }

        $periodRange = null;
        if ($item->period_start && $item->period_end) {
            $periodRange = $item->period_start->format('d/m/Y') . ' s.d. ' . $item->period_end->format('d/m/Y');
        } elseif ($item->observation_year) {
            $periodRange = "Tahun {$item->observation_year}";
        } else {
            $periodRange = 'Lintas Periode / Statis';
        }

        $categoryLabel = self::CATEGORY_LABELS[$item->source_category] ?? ucfirst(str_replace('_', ' ', (string) $item->source_category));

        $data = [
            'id' => (int) $item->id,
            'dataset_code' => $item->dataset_code,
            'dataset_name' => $item->dataset_name,
            'kategori' => $item->source_category,
            'kategori_label' => $categoryLabel,
            'source_category' => $item->source_category,
            'source_type' => $item->source_type,
            'description' => $item->description,
            'deskripsi' => $item->description,
            'source_name' => $item->source_name,
            'sumber_data' => $item->source_name,
            'reference_source' => $item->reference_source,
            'spatial_unit' => $item->spatial_unit ?: 'Kabupaten Banyumas',
            'cakupan_wilayah' => $item->spatial_unit ?: 'Kabupaten Banyumas',
            'granularity' => $item->granularity ?: 'Sesuai Ketersediaan',
            'frekuensi_pembaruan' => $item->granularity ?: 'Sesuai Ketersediaan',
            'update_date' => $item->update_date?->format('Y-m-d'),
            'tanggal_pembaruan' => $item->update_date?->format('Y-m-d'),
            'update_date_formatted' => $updateDateFormatted,
            'tanggal_pembaruan_formatted' => $updateDateFormatted,
            'observation_year' => $item->observation_year,
            'period_range' => $periodRange,
            'rentang_periode' => $periodRange,
            'indicator' => $item->indicator,
            'indikator' => $item->indicator,
            'publication_status' => $item->publication_status,
            'status_publikasi' => $item->publication_status,
            'validation_status' => $item->validation_status,
            'status_validasi' => $item->validation_status,
            'is_public_visible' => (bool) $item->is_public_visible,
            'periode_id' => $item->periode_id,
        ];

        if ($detailed) {
            $data['created_at'] = $item->created_at?->toIso8601String();
            $data['updated_at'] = $item->updated_at?->toIso8601String();
            if ($item->relationLoaded('periode') && $item->periode) {
                $data['periode'] = [
                    'id' => $item->periode->id,
                    'tahun' => $item->periode->tahun,
                    'bulan' => $item->periode->bulan,
                    'nama_periode' => $item->periode->nama_periode,
                    'label_singkat' => $item->periode->label_singkat,
                    'is_published' => (bool) $item->periode->is_published,
                ];
            }
        }

        return $data;
    }
}

