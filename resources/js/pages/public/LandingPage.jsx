import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Shield,
  Layers,
  Calendar,
  BarChart3,
  MapPin,
  Info,
  Bug,
  ShieldCheck,
  Droplets,
  HeartHandshake,
  ArrowRight,
  Database,
  Activity
} from 'lucide-react';

export default function LandingPage() {
  const kecamatanList = [
    'Ajibarang', 'Banyumas', 'Baturraden', 'Cilongok', 'Gumelar',
    'Jatilawang', 'Kalibagor', 'Karanglewas', 'Kebasen', 'Kedungbanteng',
    'Kembaran', 'Kemranjen', 'Lumbir', 'Patikraja', 'Pekuncen',
    'Purwojati', 'Purwokerto Barat', 'Purwokerto Selatan', 'Purwokerto Timur',
    'Purwokerto Utara', 'Rawalo', 'Sokaraja', 'Somagede', 'Sumbang',
    'Sumpiuh', 'Tambak', 'Wangon'
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* HERO SECTION — Public Health Intelligence Platform */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#e2e8e5] bg-[#ffffff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#f0f6f4] border border-[#dbe4df] text-xs font-semibold text-[#123027]">
              <span className="w-2 h-2 rounded-full bg-[#123027]"></span>
              <span>Sistem Intelijen Spasial & Epidemiologi Banyumas</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#17221e] tracking-tight leading-[1.15] max-w-3xl mx-auto">
              Pemantauan Dinamika Spasial-Temporal{' '}
              <span className="text-[#b91c1c]">DBD Banyumas</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4e6057] leading-relaxed max-w-2xl mx-auto">
              Platform analitik geospasial berbasis web untuk memetakan distribusi kasus DBD di 27 Kecamatan Kabupaten Banyumas. Menyajikan visualisasi choropleth, analisis tren temporal, dan komparasi wilayah guna mendukung kewaspadaan dini masyarakat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                to="/peta"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-md bg-[#123027] hover:bg-[#194337] text-white font-semibold text-sm transition-colors"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Buka Peta Interaktif</span>
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-md border border-[#c5d1cb] hover:border-[#123027] bg-white hover:bg-[#f3f6f4] text-[#17221e] font-semibold text-sm transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-[#4e6057]" />
                <span>Dashboard Ringkasan</span>
              </Link>
            </div>

            {/* Simulation Indicator Notice */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 text-xs text-[#78350f] bg-[#fffbeb] border border-[#fde68a] rounded-md px-3.5 py-2">
                <Info className="w-4 h-4 shrink-0 text-[#b45309]" />
                <span>
                  <strong>Status Data:</strong> Mode surveilans agregat kewilayahan. Tidak mengekspos rekam medis atau privasi individu.
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Metrics Overview */}
          <div className="mt-14 sm:mt-18 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e2e8e5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#4e6057]">Cakupan Spasial</span>
                <MapPin className="w-4 h-4 text-[#123027]" />
              </div>
              <div className="text-3xl font-bold text-[#17221e] tabular-nums">27</div>
              <div className="text-xs font-medium text-[#17221e] mt-0.5">Kecamatan Administratif</div>
              <p className="text-[11px] text-[#4e6057] mt-1">Seluruh wilayah hukum Kabupaten Banyumas</p>
            </div>

            <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e2e8e5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#4e6057]">Visualisasi Tematik</span>
                <Layers className="w-4 h-4 text-[#123027]" />
              </div>
              <div className="text-xl font-bold text-[#17221e]">Choropleth</div>
              <div className="text-xs font-medium text-[#17221e] mt-0.5">Klasifikasi Jenks & Interval</div>
              <p className="text-[11px] text-[#4e6057] mt-1">Gradasi warna berbasis insidensi dan kasus</p>
            </div>

            <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e2e8e5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#4e6057]">Dimensi Waktu</span>
                <Calendar className="w-4 h-4 text-[#123027]" />
              </div>
              <div className="text-xl font-bold text-[#17221e]">Multi-Waktu</div>
              <div className="text-xs font-medium text-[#17221e] mt-0.5">Bulanan & Tahunan</div>
              <p className="text-[11px] text-[#4e6057] mt-1">Analisis fluktuasi temporal & komparasi</p>
            </div>

            <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e2e8e5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#4e6057]">Perlindungan Etika</span>
                <ShieldCheck className="w-4 h-4 text-[#15803d]" />
              </div>
              <div className="text-xl font-bold text-[#17221e]">Agregat</div>
              <div className="text-xs font-medium text-[#17221e] mt-0.5">Tingkat Wilayah</div>
              <p className="text-[11px] text-[#4e6057] mt-1">Standar etika riset kesehatan masyarakat</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="fitur" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-[#123027]">
            Kemampuan Sistem
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#17221e]">
            Fitur Utama WebGIS DBD Banyumas
          </h2>
          <p className="text-sm text-[#4e6057]">
            Arsitektur pemetaan geospasial terpadu berbasis Leaflet yang memadukan kartografi interaktif dengan analisis epidemiologi temporal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#ffffff] p-6 rounded-lg border border-[#e2e8e5] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#f0f6f4] text-[#123027] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#17221e]">Visualisasi Peta Choropleth</h3>
            <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
              Pemetaan interaktif 27 batas polygon kecamatan dengan gradasi warna berdasarkan jumlah kasus DBD, Incidence Rate, dan level kerawanan.
            </p>
          </div>

          <div className="bg-[#ffffff] p-6 rounded-lg border border-[#e2e8e5] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#f0f6f4] text-[#123027] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#17221e]">Dinamika Temporal</h3>
            <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
              Penyaringan periode waktu bulanan dan tahunan untuk mengamati perubahan insidensi dari waktu ke waktu serta mengidentifikasi pola musim hujan.
            </p>
          </div>

          <div className="bg-[#ffffff] p-6 rounded-lg border border-[#e2e8e5] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#f0f6f4] text-[#123027] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#17221e]">Grafik Tren & Komparasi</h3>
            <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
              Grafik kurva epidemiologi agregat dan instrumen komparasi langsung antar dua periode waktu secara berdampingan dengan indikator perubahan delta.
            </p>
          </div>

          <div className="bg-[#ffffff] p-6 rounded-lg border border-[#e2e8e5] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#f0f6f4] text-[#123027] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#17221e]">Transparansi Metadata</h3>
            <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
              Dokumentasi terperinci sumber dataset, formula matematis indikator (IR & CFR), metodologi klasifikasi Jenks, dan validitas surveilans.
            </p>
          </div>
        </div>
      </section>

      {/* HEALTH EDUCATION & 3M PLUS PREVIEW SECTION */}
      <section id="edukasi" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0c201a] text-[#f5f8f6] rounded-xl p-8 sm:p-12 lg:p-14 border border-[#193a30]">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#122e25] text-[#a3d4be] text-xs font-semibold border border-[#1b4337]">
              <Bug className="w-3.5 h-3.5" />
              <span>Edukasi Kesehatan & Pengendalian Vektor</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Kewaspadaan DBD & Gerakan 3M Plus
            </h2>

            <p className="text-xs sm:text-sm text-[#8ea39b] leading-relaxed">
              Demam Berdarah Dengue (DBD) disebabkan oleh infeksi virus Dengue yang ditularkan melalui gigitan nyamuk <em>Aedes aegypti</em> dan <em>Aedes albopictus</em>. Pencegahan paling efektif dilakukan melalui pemutusan rantai perkembangbiakan jentik secara serentak di lingkungan keluarga dan masyarakat.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#122e25] p-5 rounded-lg border border-[#1b4337] space-y-2">
                <div className="w-8 h-8 rounded bg-[#194337] text-emerald-400 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-sm">1. Menguras</h4>
                <p className="text-xs text-[#8ea39b] leading-relaxed">
                  Bersihkan dan kuras tempat penampungan air seperti bak mandi, ember, dan drum secara teratur minimal sekali seminggu untuk membasmi jentik.
                </p>
              </div>

              <div className="bg-[#122e25] p-5 rounded-lg border border-[#1b4337] space-y-2">
                <div className="w-8 h-8 rounded bg-[#194337] text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-sm">2. Menutup</h4>
                <p className="text-xs text-[#8ea39b] leading-relaxed">
                  Tutup rapat tempat penampungan air bersih keluarga agar nyamuk <em>Aedes</em> tidak dapat bertelur dan berkembang biak di dalamnya.
                </p>
              </div>

              <div className="bg-[#122e25] p-5 rounded-lg border border-[#1b4337] space-y-2">
                <div className="w-8 h-8 rounded bg-[#194337] text-emerald-400 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-sm">3. Mendaur Ulang + Plus</h4>
                <p className="text-xs text-[#8ea39b] leading-relaxed">
                  Daur ulang wadah/barang bekas potensial penampung air hujan, gunakan larvasida/abate, pelihara ikan jentik, dan pasang kawat kasa.
                </p>
              </div>
            </div>

            {/* CTA ke Halaman Edukasi Lengkap */}
            <div className="pt-6 border-t border-[#193a30] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-[#8ea39b] leading-relaxed max-w-xl">
                Kenali lebih jauh tentang DBD, gejala, cara penularan, serta langkah pencegahan untuk melindungi keluarga dan lingkungan.
              </p>
              <Link
                to="/edukasi"
                data-testid="landing-to-edukasi-btn"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#194337] hover:bg-[#215647] text-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
              >
                <span>Pelajari Selengkapnya</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 27 KECAMATAN BANYUMAS LIST */}
      <section id="wilayah" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#ffffff] rounded-xl border border-[#e2e8e5] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <span className="text-xs font-bold text-[#123027]">
                Cakupan Spasial
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#17221e]">
                Wilayah 27 Kecamatan Kabupaten Banyumas
              </h2>
              <p className="text-xs sm:text-sm text-[#4e6057]">
                Seluruh batas polygon kecamatan terintegrasi dalam basis data spasial sistem surveilans epidemiologi.
              </p>
            </div>
            <div className="text-xs text-[#4e6057] bg-[#f0f6f4] border border-[#dbe4df] px-3.5 py-1.5 rounded-md">
              Pusat Pemerintahan: <strong>Purwokerto</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {kecamatanList.map((kec) => (
              <div
                key={kec}
                className="flex items-center gap-2 p-2.5 rounded-md bg-[#f8faf9] border border-[#e2e8e5] hover:border-[#123027] hover:bg-white transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#123027] shrink-0"></div>
                <span className="text-xs font-medium text-[#17221e] truncate">
                  {kec}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA ETHICS & DISCLAIMER SECTION */}
      <section id="disclaimer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-5 sm:p-6 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-[#78350f] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#78350f] text-sm">
            <ShieldCheck className="w-4 h-4 text-[#b45309]" />
            <span>Pernyataan Etika & Perlindungan Data Kesehatan</span>
          </div>
          <p className="text-xs text-[#92400e] leading-relaxed">
            Sistem WebGIS ini dibangun dengan memegang teguh prinsip etika penelitian dan perlindungan kerahasiaan data kesehatan. Sistem dirancang untuk menyajikan data kasus DBD dalam bentuk agregat berdasarkan wilayah kecamatan, tanpa menampilkan identitas individu. Informasi publik ini ditujukan semata-mata untuk tujuan edukasi kesehatan, riset akademis, dan visualisasi dinamika kewilayahan.
          </p>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-[#123027] text-white p-8 sm:p-12 text-center space-y-5 border border-[#194337]">
          <h2 className="text-xl sm:text-2xl font-bold max-w-xl mx-auto leading-tight">
            Pantau Sebaran dan Kerawanan DBD
          </h2>
          <p className="text-[#a3d4be] max-w-xl mx-auto text-xs sm:text-sm">
            Akses peta interaktif, filter periode waktu, dan amati grafik tren kewaspadaan DBD di Kabupaten Banyumas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/peta"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-white text-[#123027] font-semibold hover:bg-[#f3f6f4] transition-colors text-sm"
            >
              <Compass className="w-4 h-4 text-emerald-700" />
              <span>Buka Peta WebGIS</span>
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#194337] hover:bg-[#215647] text-white font-medium transition-colors border border-[#2d735f] text-sm"
            >
              <Shield className="w-4 h-4 text-emerald-300" />
              <span>Login Administrator</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
