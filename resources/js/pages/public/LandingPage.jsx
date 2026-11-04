import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Shield,
  Layers,
  Calendar,
  BarChart3,
  MapPin,
  CheckCircle2,
  Info,
  Bug,
  ShieldCheck,
  Droplets,
  HeartHandshake,
  ArrowRight,
  Database
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
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200 bg-gradient-to-b from-rose-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs sm:text-sm font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              Sistem Informasi Geografis Kesehatan Masyarakat
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Pemantauan Dinamika Spasial-Temporal Kasus{' '}
              <span className="text-rose-600">Demam Berdarah Dengue</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Platform analitik geospasial berbasis web untuk memetakan distribusi kasus DBD di 27 Kecamatan Kabupaten Banyumas. Menyajikan visualisasi choropleth, analisis tren temporal, dan komparasi wilayah guna mendukung kewaspadaan dini masyarakat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base shadow-md shadow-rose-200 hover:shadow-lg transition-all"
              >
                <Compass className="w-5 h-5" />
                <span>Jelajahi WebGIS Banyumas</span>
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
              >
                <Shield className="w-5 h-5 text-slate-500" />
                <span>Login Administrator</span>
              </Link>
            </div>

            {/* Simulation Indicator Notice */}
            <div className="pt-4 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Status Data:</strong> Mode simulasi pengembangan sistem. Tidak menggunakan atau mengekspos data pribadi pasien.
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">27</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">Kecamatan</div>
              <p className="text-xs text-slate-500 mt-1">Cakupan wilayah administrasi Kabupaten Banyumas</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Choropleth</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">Peta Tematik</div>
              <p className="text-xs text-slate-500 mt-1">Gradasi warna berbasis klasifikasi insidensi kasus</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Multi-Waktu</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">Filter Temporal</div>
              <p className="text-xs text-slate-500 mt-1">Analisis dinamika bulanan dan perbandingan periode</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Agregat</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">Privasi Terjamin</div>
              <p className="text-xs text-slate-500 mt-1">Data tingkat kewilayahan tanpa identitas individu</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="fitur" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">
            Kemampuan Sistem
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            Fitur Utama WebGIS DBD Banyumas
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Arsitektur terpadu berbasis Leaflet dan OpenStreetMap yang memadukan visualisasi spasial dengan analisis epidemiologi temporal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Visualisasi Peta Choropleth</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pemetaan interaktif 27 batas polygon kecamatan dengan gradasi warna berdasarkan jumlah kasus DBD atau indikator epidemiologi yang tersedia.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Dinamika Temporal</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Penyaringan periode waktu bulanan dan tahunan untuk mengamati perubahan jumlah kasus DBD dari waktu ke waktu serta mengidentifikasi pola temporal berdasarkan periode data yang tersedia.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Analisis Grafik & Komparasi</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Grafik tren epidemiologi agregat dan fitur perbandingan langsung antar dua periode waktu secara berdampingan.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Transparansi Metadata</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Penyajian informasi sumber dataset, definisi indikator kesehatan, tanggal pemutakhiran, dan status validitas data.
            </p>
          </div>
        </div>
      </section>

      {/* HEALTH EDUCATION & 3M PLUS */}
      <section id="edukasi" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider border border-rose-500/30">
              <Bug className="w-4 h-4" />
              <span>Edukasi Kesehatan & Pencegahan Vektor</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Kewaspadaan DBD & Gerakan 3M Plus
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Demam Berdarah Dengue (DBD) disebabkan oleh infeksi virus Dengue yang ditularkan melalui gigitan nyamuk <em>Aedes aegypti</em> dan <em>Aedes albopictus</em>. Pencegahan paling efektif dilakukan melalui pengendalian sarang nyamuk secara serentak di lingkungan keluarga dan masyarakat.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">1. Menguras</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bersihkan dan kuras tempat penampungan air seperti bak mandi, drum, dan ember secara berkala minimal 1 minggu sekali.
                </p>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">2. Menutup</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tutup rapat tempat penampungan air agar nyamuk <em>Aedes</em> tidak dapat masuk dan berkembang biak bertelur.
                </p>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-base">3. Mendaur Ulang + Plus</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Manfaatkan/daur ulang barang bekas yang berpotensi menampung air hujan, pelihara ikan pemakan jentik, serta gunakan lotion antinyamuk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 27 KECAMATAN BANYUMAS LIST */}
      <section id="wilayah" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">
                Cakupan Spasial
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                27 Kecamatan Kabupaten Banyumas
              </h2>
              <p className="text-sm text-slate-600">
                Sistem WebGIS ini dirancang khusus untuk memetakan dan menyajikan informasi epidemiologi agregat di seluruh kecamatan Kabupaten Banyumas.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
              Ibukota / Pusat Pemerintahan: <strong>Purwokerto</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {kecamatanList.map((kec, index) => (
              <div
                key={kec}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {kec}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA ETHICS & DISCLAIMER SECTION */}
      <section id="disclaimer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-amber-900 text-base">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
            <span>Pernyataan Etika & Perlindungan Data Kesehatan</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
            Sistem WebGIS ini dibangun dengan memegang teguh prinsip etika penelitian dan perlindungan kerahasiaan data kesehatan. Sistem dirancang untuk menyajikan data kasus DBD dalam bentuk agregat berdasarkan wilayah kecamatan, tanpa menampilkan identitas individu. Informasi publik ini ditujukan semata-mata untuk tujuan edukasi kesehatan, riset akademis, dan visualisasi dinamika kewilayahan.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-rose-600 to-red-700 text-white p-8 sm:p-12 text-center space-y-6 shadow-xl shadow-rose-200">
          <h2 className="text-2xl sm:text-4xl font-extrabold max-w-2xl mx-auto leading-tight">
            Mulai Pantau Sebaran Kasus DBD di Banyumas
          </h2>
          <p className="text-rose-100 max-w-xl mx-auto text-sm sm:text-base">
            Akses peta interaktif, filter periode waktu, dan amati grafik tren kewaspadaan DBD sekarang.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-rose-700 font-bold hover:bg-rose-50 transition-colors shadow-md text-sm sm:text-base"
            >
              <Compass className="w-5 h-5" />
              <span>Buka Peta WebGIS</span>
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-800/80 hover:bg-rose-900 text-white font-semibold transition-colors border border-rose-400/40 text-sm sm:text-base"
            >
              <Shield className="w-5 h-5" />
              <span>Login Administrator</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
