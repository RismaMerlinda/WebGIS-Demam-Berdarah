<?php

namespace Database\Seeders;

use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EducationFaq;
use Illuminate\Database\Seeder;

class EducationSeeder extends Seeder
{
    /**
     * Seed structured DBD & 3M Plus educational categories, articles, and FAQs (Fitur 11).
     */
    public function run(): void
    {
        $categories = [
            [
                'slug' => 'mengenal-dbd',
                'name' => 'Mengenal DBD & Vektor Penular',
                'description' => 'Informasi dasar mengenai pengertian Demam Berdarah Dengue, virus Dengue, serta karakteristik nyamuk Aedes aegypti dan Aedes albopictus.',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'slug' => 'gejala-dan-tanda-bahaya',
                'name' => 'Gejala & Tanda Bahaya DBD',
                'description' => 'Panduan mengenali gejala klinis umum DBD serta tanda bahaya (warning signs) yang memerlukan penanganan medis segera di fasilitas kesehatan.',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'slug' => 'pencegahan-3m-plus',
                'name' => 'Gerakan Pencegahan 3M Plus',
                'description' => 'Langkah nyata memutus rantai perkembangbiakan nyamuk penular DBD melalui 3M (Menguras, Menutup, Mendaur Ulang) beserta tindakan pencegahan Plus.',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'slug' => 'peran-masyarakat-psn',
                'name' => 'Lingkungan & Peran Masyarakat',
                'description' => 'Partisipasi keluarga dan warga dalam Pemberantasan Sarang Nyamuk (PSN), Gerakan 1 Rumah 1 Jumantik, serta pelaporan dini ke Puskesmas.',
                'sort_order' => 4,
                'is_active' => true,
            ],
        ];

        $categoryMap = [];
        foreach ($categories as $catData) {
            $cat = EducationCategory::updateOrCreate(
                ['slug' => $catData['slug']],
                $catData
            );
            $categoryMap[$catData['slug']] = $cat->id;
        }

        $articles = [
            [
                'category_id' => $categoryMap['mengenal-dbd'],
                'slug' => 'pengertian-dbd-dan-cara-penularannya',
                'title' => 'Apa Itu Demam Berdarah Dengue (DBD) dan Bagaimana Penularannya?',
                'summary' => 'Demam Berdarah Dengue (DBD) adalah penyakit infeksi akut akibat virus Dengue yang ditularkan melalui gigitan nyamuk Aedes terinfeksi.',
                'content' => "Demam Berdarah Dengue (DBD) adalah penyakit infeksi yang disebabkan oleh virus Dengue (serotipe DENV-1, DENV-2, DENV-3, dan DENV-4) dari famili Flaviviridae. Penyakit ini ditularkan ke manusia melalui gigitan nyamuk betina yang telah terinfeksi virus Dengue.\n\nPenularan DBD tidak terjadi secara langsung dari orang ke orang melalui kontak fisik, batuk, atau bersin, melainkan memerlukan perantara vektor nyamuk. Saat nyamuk Aedes menggigit penderita DBD yang sedang berada pada fase demam (viremia), virus masuk ke tubuh nyamuk dan berkembang selama sekitar 8–12 hari sebelum dapat ditularkan kepada orang lain yang sehat melalui gigitan berikutnya.\n\nKarena terdapat empat serotipe virus Dengue yang berbeda, seseorang yang pernah sembuh dari infeksi satu serotipe tetap dapat terinfeksi kembali oleh serotipe lainnya. Oleh sebab itu, upaya pencegahan berkelanjutan di tingkat rumah tangga dan lingkungan sangat penting bagi seluruh masyarakat.",
                'image_path' => '/images/education/mengenal-dbd.svg',
                'reference_source' => 'Kementerian Kesehatan Republik Indonesia & World Health Organization (WHO)',
                'sort_order' => 1,
                'is_published' => true,
            ],
            [
                'category_id' => $categoryMap['mengenal-dbd'],
                'slug' => 'karakteristik-nyamuk-aedes-aegypti-dan-albopictus',
                'title' => 'Mengenal Karakteristik Nyamuk Aedes aegypti dan Aedes albopictus',
                'summary' => 'Kenali ciri fisik belang hitam-putih, waktu aktif menggigit pada pagi dan sore hari, serta tempat perindukan nyamuk penular DBD.',
                'content' => "Vektor utama penular penyakit DBD adalah nyamuk Aedes aegypti, sedangkan vektor potensial sekundernya adalah Aedes albopictus. Kedua spesies ini mudah dikenali dari ciri fisik berupa warna dasar hitam dengan bintik atau garis-garis putih keperakan pada bagian tubuh dan kakinya.\n\nKarakteristik penting nyamuk Aedes yang perlu diwaspadai masyarakat meliputi:\n1. Waktu Aktif Menggigit: Aktif mencari makan terutama pada pagi hari (sekitar pukul 08.00–10.00) dan sore hari menjelang petang (sekitar pukul 15.00–17.00).\n2. Tempat Perkembangbiakan: Menyukai genangan air jernih yang tidak berhubungan langsung dengan tanah, seperti bak mandi, tempayan, tandon air, vas bunga, tatakan dispenser, talang air, hingga barang bekas yang menampung air hujan.\n3. Tempat Peristirahatan: Nyamuk dewasa gemar beristirahat di tempat yang agak gelap dan lembap di dalam rumah, seperti di balik pakaian yang tergantung.\n4. Ketahanan Telur: Telur nyamuk Aedes dapat menempel pada dinding wadah dan bertahan dalam kondisi kering selama beberapa bulan hingga wadah kembali terisi air.",
                'image_path' => '/images/education/mengenal-dbd.svg',
                'reference_source' => 'Pedoman Pengendalian DBD Kementerian Kesehatan RI & CDC',
                'sort_order' => 2,
                'is_published' => true,
            ],
            [
                'category_id' => $categoryMap['gejala-dan-tanda-bahaya'],
                'slug' => 'gejala-umum-dan-tanda-bahaya-dbd',
                'title' => 'Gejala Umum DBD dan Tanda Bahaya yang Memerlukan Pertolongan Medis Segera',
                'summary' => 'Pelajari gejala awal demam tinggi mendadak serta tanda bahaya fase kritis DBD yang wajib segera ditangani oleh tenaga kesehatan.',
                'content' => "Gejala Demam Berdarah Dengue umumnya muncul setelah masa inkubasi 4–10 hari sejak gigitan nyamuk terinfeksi. Gejala umum yang sering dialami meliputi:\n• Demam tinggi mendadak (dapat mencapai 39°C–40°C) yang berlangsung selama 2–7 hari.\n• Sakit kepala berat dan nyeri di bagian belakang bola mata.\n• Nyeri otot, tulang, dan persendian.\n• Mual, muntah, dan penurunan nafsu makan.\n• Kemunculan bintik-bintik merah atau ruam pada kulit.\n\nWASPADAI TANDA BAHAYA (WARNING SIGNS):\nSaat demam mulai turun (biasanya hari ke-3 hingga ke-7), penderita justru dapat memasuki fase kritis. Segera bawa ke Puskesmas atau Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat apabila muncul salah satu tanda bahaya berikut:\n• Nyeri perut hebat atau nyeri tekan pada ulu hati.\n• Muntah terus-menerus hingga tidak dapat minum.\n• Perdarahan spontan seperti mimisan, gusi berdarah, muntah darah, atau buang air besar berwarna hitam.\n• Tubuh terasa sangat lemas, gelisah, tangan dan kaki terasa dingin/lembap.\n• Sesak atau sulit bernapas.\n• Penurunan kesadaran.\n\nCatatan Medis Penting: Gejala DBD dapat bervariasi pada setiap individu. Informasi ini bersifat edukatif dan bukan alat diagnosis mandiri. Pemeriksaan fisik dan laboratorium oleh dokter/tenaga kesehatan tetap diperlukan untuk memastikan diagnosis.",
                'image_path' => '/images/education/gejala-waspada.svg',
                'reference_source' => 'WHO Dengue Guidelines for Diagnosis, Treatment, Prevention and Control & Kemenkes RI',
                'sort_order' => 1,
                'is_published' => true,
            ],
            [
                'category_id' => $categoryMap['pencegahan-3m-plus'],
                'slug' => 'panduan-lengkap-gerakan-3m-plus',
                'title' => 'Panduan Lengkap Gerakan 3M Plus untuk Mencegah Perkembangbiakan Nyamuk',
                'summary' => 'Pencegahan paling efektif terhadap DBD adalah memutus siklus hidup nyamuk melalui Menguras, Menutup, Mendaur Ulang, ditambah langkah perlindungan Plus.',
                'content' => "Pemberantasan Sarang Nyamuk (PSN) melalui gerakan 3M Plus merupakan cara utama dan berkelanjutan untuk menekan populasi nyamuk penular DBD. Satu tindakan tunggal saja tidak cukup menjamin seseorang bebas dari DBD, sehingga seluruh langkah perlu diterapkan secara konsisten:\n\n1. MENGURAS:\nMembersihkan dan menguras tempat penampungan air (seperti bak mandi, ember air, penampungan air kulkas/dispenser, dan tempat minum hewan) minimal satu kali seminggu sambil menyikat dinding bagian dalam wadah agar telur nyamuk yang menempel ikut terbuang.\n\n2. MENUTUP:\nMenutup rapat-rapat seluruh tempat penyimpanan air bersih seperti gentong, tempayan, drum, dan tandon air agar nyamuk betina tidak dapat masuk dan bertelur di dalamnya.\n\n3. MENDAUR ULANG:\nMemanfaatkan kembali, mendaur ulang, atau mengelola barang-barang bekas (seperti botol plastik, kaleng, ban bekas, dan pot tidak terpakai) supaya tidak menampung air hujan di sekitar pekarangan rumah.\n\nTINDAKAN PENCEGAHAN PLUS (+):\n• Menggunakan obat antinyamuk (losion penolak nyamuk atau kelambu) sesuai petunjuk penggunaan.\n• Memasang kawat kasa pada ventilasi dan jendela rumah.\n• Memelihara ikan pemakan jentik (seperti ikan cupang, guppy, atau kepala timah) pada kolam yang sulit dikuras.\n• Menaburkan bubuk larvasida (abate) pada penampungan air yang sulit dibersihkan sesuai takaran anjuran petugas kesehatan.\n• Menghindari kebiasaan menggantung pakaian di dalam kamar.\n• Menanam tanaman pengusir nyamuk dan menjaga pencahayaan serta sirkulasi udara rumah.",
                'image_path' => '/images/education/pencegahan-3m-plus.svg',
                'reference_source' => 'Kementerian Kesehatan Republik Indonesia — Gerakan PSN 3M Plus',
                'sort_order' => 1,
                'is_published' => true,
            ],
            [
                'category_id' => $categoryMap['peran-masyarakat-psn'],
                'slug' => 'peran-keluarga-dan-masyarakat-dalam-pemberantasan-sarang-nyamuk',
                'title' => 'Peran Keluarga dan Masyarakat: Gerakan 1 Rumah 1 Jumantik & Kerja Bakti Lingkungan',
                'summary' => 'Nyamuk dapat terbang lintas pekarangan, sehingga kebersihan lingkungan dan pemantauan jentik harus dilakukan serentak oleh warga.',
                'content' => "Pengendalian DBD tidak dapat berhasil jika hanya mengandalkan satu rumah atau pengasapan (fogging) semata, karena fogging hanya membunuh nyamuk dewasa sementara jentik di dalam air tetap akan menetas menjadi nyamuk baru.\n\nPeran aktif yang dapat dijalankan masyarakat Kabupaten Banyumas antara lain:\n1. Pemeriksaan Tempat Penampungan Air Secara Mandiri: Setiap keluarga menunjuk satu anggota keluarga sebagai Juru Pemantau Jentik (Gerakan 1 Rumah 1 Jumantik / G1R1J) untuk memeriksa keberadaan jentik setiap minggu.\n2. Kerja Bakti Lingkungan: Melaksanakan kegiatan bersih lingkungan bersama warga RT/RW untuk membersihkan saluran air yang tergenang, memangkas semak rimbun, dan menertibkan sampah wadah terbuka.\n3. Pemantauan Jentik Berkala: Mendukung kader kesehatan desa/kelurahan dalam pemantauan Angka Bebas Jentik (ABJ).\n4. Pelaporan dan Konsultasi Dini: Segera memeriksakan anggota keluarga yang mengalami demam tinggi ke Puskesmas atau fasilitas kesehatan terdekat serta melaporkannya kepada perangkat lingkungan setempat agar pemantauan wilayah dapat segera ditindaklanjuti.",
                'image_path' => '/images/education/peran-masyarakat.svg',
                'reference_source' => 'Kementerian Kesehatan RI & Dinas Kesehatan Kabupaten Banyumas',
                'sort_order' => 1,
                'is_published' => true,
            ],
        ];

        foreach ($articles as $artData) {
            EducationContent::updateOrCreate(
                ['slug' => $artData['slug']],
                $artData
            );
        }

        $faqs = [
            [
                'question' => 'Apakah pengasapan (fogging) saja sudah cukup untuk memberantas DBD?',
                'answer' => 'Tidak. Fogging hanya membunuh nyamuk dewasa yang terkena paparan insektisida saat pengasapan berlangsung, namun tidak membunuh telur dan jentik nyamuk di dalam penampungan air. Oleh karena itu, Pemberantasan Sarang Nyamuk (PSN) 3M Plus tetap menjadi langkah utama untuk memutus siklus hidup nyamuk.',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'question' => 'Mengapa saat demam mulai turun penderita DBD justru harus lebih diwaspadai?',
                'answer' => 'Dalam perjalanan penyakit DBD, penurunan suhu tubuh pada hari ke-3 sampai ke-7 sering kali menandai masuknya penderita ke fase kritis (kebocoran plasma darah). Jika disertai tanda bahaya seperti nyeri perut hebat, muntah terus-menerus, lemas berat, atau perdarahan, penderita harus segera dibawa ke Puskesmas atau IGD rumah sakit.',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'question' => 'Apakah seseorang yang pernah terkena DBD bisa tertular lagi?',
                'answer' => 'Ya. Virus Dengue memiliki empat serotipe (DENV-1, DENV-2, DENV-3, dan DENV-4). Kekebalan jangka panjang setelah sembuh umumnya hanya spesifik terhadap serotipe yang pernah menginfeksi, sehingga seseorang masih dapat terinfeksi oleh serotipe virus Dengue yang lain.',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'question' => 'Seberapa sering kita harus menguras bak mandi dan memeriksa jentik nyamuk?',
                'answer' => 'Disarankan minimal satu kali setiap minggu. Siklus perkembangan dari telur nyamuk Aedes menjadi jentik, kepompong, hingga nyamuk dewasa memakan waktu sekitar 8–10 hari, sehingga menguras dan menyikat wadah air seminggu sekali efektif memutus siklus tersebut sebelum nyamuk sempat terbang.',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'question' => 'Apa pertolongan pertama di rumah saat anggota keluarga mengalami demam mendadak?',
                'answer' => 'Berikan minum air putih, oralit, atau cairan elektrolit yang cukup untuk mencegah dehidrasi, kompres hangat, dan berikan obat penurun panas berbahan parasetamol sesuai dosis anjuran (hindari pemberian aspirin atau ibuprofen karena dapat meningkatkan risiko perdarahan), lalu segera periksakan ke fasilitas kesehatan.',
                'sort_order' => 5,
                'is_active' => true,
            ],
        ];

        foreach ($faqs as $faqData) {
            EducationFaq::updateOrCreate(
                ['question' => $faqData['question']],
                $faqData
            );
        }
    }
}

