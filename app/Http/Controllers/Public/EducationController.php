<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EducationFaq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EducationController extends Controller
{
    /**
     * Get published educational categories, articles, structured 3M Plus & symptom guidance,
     * and active FAQs for the public /edukasi page (Fitur 11).
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category' => ['nullable', 'string', 'max:140', 'regex:/^[a-z0-9\-]+$/i'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter permintaan edukasi tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $categorySlug = $request->query('category');
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 12);

        $categories = EducationCategory::active()
            ->withCount(['contents as published_contents_count' => function ($q) {
                $q->where('is_published', true);
            }])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (EducationCategory $cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'slug' => $cat->slug,
                'description' => $cat->description,
                'sort_order' => $cat->sort_order,
                'articles_count' => (int) $cat->published_contents_count,
            ])
            ->values();

        $contentsQuery = EducationContent::published()
            ->with(['category:id,name,slug'])
            ->orderBy('sort_order')
            ->orderBy('id');

        if (! empty($categorySlug) && $categorySlug !== 'all') {
            $contentsQuery->whereHas('category', function ($q) use ($categorySlug) {
                $q->where('slug', $categorySlug)->where('is_active', true);
            });
        }

        if ($search !== '') {
            $contentsQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('summary', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $paginated = $contentsQuery->paginate($perPage);

        $articles = collect($paginated->items())->map(fn (EducationContent $item) => $this->formatPublicArticle($item))->values();

        $faqs = EducationFaq::active()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (EducationFaq $faq) => [
                'id' => $faq->id,
                'question' => $faq->question,
                'answer' => $faq->answer,
                'sort_order' => $faq->sort_order,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'categories' => $categories,
            'articles' => $articles,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'faqs' => $faqs,
            'structured_sections' => $this->getStructuredHealthGuidance(),
            'references' => [
                [
                    'institution' => 'Kementerian Kesehatan Republik Indonesia (Kemenkes RI)',
                    'document' => 'Pedoman Pencegahan dan Pengendalian Demam Berdarah Dengue di Indonesia & Gerakan PSN 3M Plus (G1R1J)',
                ],
                [
                    'institution' => 'World Health Organization (WHO)',
                    'document' => 'Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control & Fact Sheet on Dengue and Severe Dengue',
                ],
                [
                    'institution' => 'Centers for Disease Control and Prevention (CDC)',
                    'document' => 'About Dengue: Transmission, Symptoms, Warning Signs, and Mosquito Control',
                ],
            ],
        ]);
    }

    /**
     * Get detail of a single published educational article by slug (Fitur 11).
     */
    public function show(string $slug): JsonResponse
    {
        if (! preg_match('/^[a-z0-9\-]+$/i', $slug)) {
            return response()->json([
                'success' => false,
                'message' => 'Format tautan artikel edukasi tidak valid.',
            ], 422);
        }

        $article = EducationContent::published()
            ->with(['category:id,name,slug'])
            ->where('slug', $slug)
            ->first();

        if (! $article) {
            return response()->json([
                'success' => false,
                'message' => 'Artikel edukasi tidak ditemukan atau belum diterbitkan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'article' => $this->formatPublicArticle($article),
        ]);
    }

    /**
     * Get active FAQs list for public education page (Fitur 11).
     */
    public function faqs(): JsonResponse
    {
        $faqs = EducationFaq::active()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (EducationFaq $faq) => [
                'id' => $faq->id,
                'question' => $faq->question,
                'answer' => $faq->answer,
                'sort_order' => $faq->sort_order,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'faqs' => $faqs,
        ]);
    }

    /**
     * Format public article payload without exposing internal administrative fields.
     */
    private function formatPublicArticle(EducationContent $item): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'slug' => $item->slug,
            'summary' => $item->summary,
            'content' => $item->content,
            'image_url' => $item->image_url,
            'reference_source' => $item->reference_source ?: 'Kementerian Kesehatan Republik Indonesia & WHO',
            'sort_order' => $item->sort_order,
            'category' => $item->category ? [
                'id' => $item->category->id,
                'name' => $item->category->name,
                'slug' => $item->category->slug,
            ] : null,
            'updated_date' => $item->updated_at?->format('Y-m-d'),
        ];
    }

    /**
     * Provide structured health education highlights aligned with Kemenkes RI, WHO, and CDC.
     */
    private function getStructuredHealthGuidance(): array
    {
        return [
            'mengenal_dbd' => [
                'definition' => 'Demam Berdarah Dengue (DBD) adalah penyakit infeksi akut yang disebabkan oleh virus Dengue dan ditularkan kepada manusia melalui gigitan nyamuk betina yang terinfeksi.',
                'virus' => 'Virus Dengue (famili Flaviviridae) yang memiliki 4 serotipe: DENV-1, DENV-2, DENV-3, dan DENV-4.',
                'vectors' => [
                    [
                        'species' => 'Aedes aegypti (Vektor Utama)',
                        'characteristics' => 'Berwarna hitam dengan belang putih keperakan di tubuh dan kaki, hidup di sekitar permukiman dalam dan luar rumah, serta berkembang biak pada genangan air jernih yang tidak bersentuhan langsung dengan tanah.',
                    ],
                    [
                        'species' => 'Aedes albopictus (Vektor Sekunder)',
                        'characteristics' => 'Memiliki garis putih tunggal di bagian punggung (toraks), lebih sering ditemukan di area kebun, pekarangan berpohon, atau wadah alami yang menampung air hujan.',
                    ],
                ],
                'transmission' => 'Ditular melalui gigitan nyamuk Aedes betina yang sebelumnya menggigit penderita DBD pada fase demam. Nyamuk ini aktif menggigit pada pagi hari (08.00–10.00) dan sore hari sebelum petang (15.00–17.00).',
            ],
            'gejala_dan_bahaya' => [
                'common_symptoms' => [
                    ['title' => 'Demam Tinggi Mendadak', 'desc' => 'Suhu tubuh meningkat tajam hingga 39°C–40°C yang berlangsung selama 2 hingga 7 hari.'],
                    ['title' => 'Sakit Kepala & Nyeri Belakang Mata', 'desc' => 'Rasa nyeri kepala di bagian dahi disertai nyeri saat menggerakkan bola mata.'],
                    ['title' => 'Nyeri Otot dan Sendi', 'desc' => 'Pegal dan nyeri pada otot, tulang, serta persendian seluruh tubuh.'],
                    ['title' => 'Mual dan Muntah', 'desc' => 'Disertai penurunan nafsu makan dan rasa tidak nyaman di ulu hati.'],
                    ['title' => 'Ruam atau Bintik Merah Kulit', 'desc' => 'Kemerahan pada kulit akibat pelebaran pembuluh darah kapiler.'],
                ],
                'warning_signs' => [
                    ['title' => 'Nyeri Perut Hebat', 'desc' => 'Rasa sakit perut yang intens atau nyeri tekan terus-menerus pada bagian perut.'],
                    ['title' => 'Muntah Terus-Menerus', 'desc' => 'Muntah berulang kali sehingga penderita tidak mampu menerima asupan cairan.'],
                    ['title' => 'Perdarahan', 'desc' => 'Mimisan, gusi berdarah, muntah darah, atau buang air besar berwarna hitam.'],
                    ['title' => 'Lemas Berat atau Gelisah', 'desc' => 'Tubuh tampak sangat lesu, mengantuk terus, atau gelisah disertai ujung tangan/kaki dingin.'],
                    ['title' => 'Sulit Bernapas', 'desc' => 'Napas tampak cepat atau terasa sesak akibat penumpukan cairan.'],
                    ['title' => 'Penurunan Kesadaran', 'desc' => 'Tanda kegawatdaruratan syok dengue yang memerlukan pertolongan medis darurat segera.'],
                ],
                'medical_disclaimer' => 'Gejala DBD dapat bervariasi pada setiap orang. Halaman ini bertujuan untuk edukasi masyarakat dan bukan alat diagnosis otomatis. Pemeriksaan dan penegakan diagnosis wajib dilakukan oleh dokter atau tenaga kesehatan di Puskesmas/Rumah Sakit.',
            ],
            'gerakan_3m_plus' => [
                'core_3m' => [
                    [
                        'step' => '1M',
                        'title' => 'Menguras',
                        'description' => 'Membersihkan dan menguras tempat penampungan air (bak mandi, ember, tempayan, tatakan dispenser, tempat minum hewan) secara rutin minimal seminggu sekali sambil menyikat dinding wadah.',
                    ],
                    [
                        'step' => '2M',
                        'title' => 'Menutup',
                        'description' => 'Menutup rapat-rapat seluruh tempat penyimpanan air bersih seperti gentong, drum, dan tandon air agar nyamuk tidak dapat masuk dan meletakkan telurnya.',
                    ],
                    [
                        'step' => '3M',
                        'title' => 'Mendaur Ulang',
                        'description' => 'Memanfaatkan kembali, mendaur ulang, atau membuang barang bekas (ban bekas, kaleng, botol plastik, pot pecah) yang berpotensi menampung genangan air hujan.',
                    ],
                ],
                'plus_actions' => [
                    'Menggunakan obat antinyamuk (losion penolak nyamuk atau kelambu tidur) sesuai petunjuk penggunaan.',
                    'Memasang kawat kasa pada lubang ventilasi dan jendela rumah untuk menahan nyamuk masuk.',
                    'Memelihara ikan pemakan jentik (seperti ikan cupang, guppy, atau kepala timah) pada kolam yang sesuai kondisi lingkungan.',
                    'Membersihkan lingkungan rumah, saluran air, dan talang atap secara rutin agar tidak tergenang.',
                    'Menghindari kebiasaan menggantung pakaian di dalam kamar yang sering menjadi tempat istirahat nyamuk.',
                    'Melakukan kegiatan Pemberantasan Sarang Nyamuk (PSN) secara bersama-sama di lingkungan tempat tinggal.',
                ],
                'prevention_note' => 'Tidak ada satu tindakan tunggal yang dapat menjamin seseorang 100% bebas dari DBD. Kombinasi disiplin 3M Plus di rumah dan kebersihan lingkungan kolektif adalah perlindungan terbaik.',
            ],
            'peran_masyarakat' => [
                [
                    'title' => 'Pemeriksaan Tempat Penampungan Air',
                    'desc' => 'Memeriksa wadah air di dalam dan luar rumah setiap pekan agar tidak ada jentik yang sempat berkembang menjadi nyamuk dewasa.',
                ],
                [
                    'title' => 'Pemberantasan Sarang Nyamuk (PSN)',
                    'desc' => 'Memutus rantai hidup nyamuk langsung pada sumber perindukannya melalui gerakan 1 Rumah 1 Jumantik (G1R1J).',
                ],
                [
                    'title' => 'Kerja Bakti Lingkungan',
                    'desc' => 'Bergotong royong membersihkan selokan, lahan kosong, dan fasilitas umum di tingkat RT/RW secara berkala.',
                ],
                [
                    'title' => 'Pemantauan Jentik Berkala',
                    'desc' => 'Mendukung kader Jumantik desa/kelurahan dalam pemeriksaan Angka Bebas Jentik (ABJ) di wilayah kecamatan.',
                ],
                [
                    'title' => 'Pelaporan & Konsultasi ke Fasilitas Kesehatan',
                    'desc' => 'Segera memeriksakan warga yang mengalami demam tinggi ke Puskesmas terdekat dan menginformasikan kepada pengurus lingkungan.',
                ],
            ],
            'fakta_singkat' => [
                'Siklus perubahan dari telur nyamuk Aedes menjadi jentik hingga nyamuk dewasa hanya membutuhkan waktu sekitar 8–10 hari.',
                'Telur nyamuk Aedes aegypti mampu bertahan di dinding wadah yang kering selama berbulan-bulan dan menetas saat terkena air.',
                'Pengasapan (fogging) hanya mematikan nyamuk dewasa yang sedang terbang, tetapi tidak membunuh jentik di dalam air.',
                'Seseorang dapat terinfeksi DBD lebih dari satu kali karena terdapat empat serotipe virus Dengue yang berbeda.',
            ],
        ];
    }
}

