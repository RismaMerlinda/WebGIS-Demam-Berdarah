import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  Layers,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  Compass,
  Calendar,
  Database,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  Info,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function PublicDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/public/dashboard/summary');
      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.message || 'Gagal memuat data dashboard.');
      }
    } catch (err) {
      setError('Terjadi kendala saat menghubungi server data. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter rankings by search query
  const filteredRankings = data?.rankings?.filter((item) =>
    item.subdistrict_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const maxCases = data?.rankings?.[0]?.cases || 1;

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* HEADER DASHBOARD */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Beranda</span>
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-700">Dashboard Publik</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Dashboard Pemantauan DBD
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Ringkasan epidemiologi kasus Demam Berdarah Dengue (DBD) di 27 Kecamatan Kabupaten Banyumas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Data Status Indicator */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Data Simulasi Pengembangan</span>
              </div>

              {/* Navigation to WebGIS Map */}
              <Link
                to="/peta"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Peta WebGIS</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6">
        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 p-5" />
              ))}
            </div>
            <div className="h-96 bg-white rounded-2xl border border-slate-200 p-6" />
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Gagal Memuat Data</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && (!data?.has_data || data?.rankings?.length === 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Data Belum Tersedia</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Saat ini belum ada data kasus agregat yang dipublikasikan untuk periode pemantauan aktif.
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {!loading && !error && data?.has_data && (
          <>
            {/* KARTU RINGKASAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Kasus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Total Kasus DBD</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.total_cases !== null ? (
                    <>
                      {data.summary.total_cases}{' '}
                      <span className="text-xs font-normal text-slate-500">Kasus</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Periode {data.period?.name || 'Aktif'}
                </p>
              </div>

              {/* Card 2: Jumlah Kecamatan Berdata */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Cakupan Wilayah</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.subdistricts_with_data !== null ? (
                    <>
                      {data.summary.subdistricts_with_data}{' '}
                      <span className="text-xs font-normal text-slate-500">Kecamatan</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Seluruh kecamatan terdata
                </p>
              </div>

              {/* Card 3: Kecamatan Kasus Tertinggi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Kasus Tertinggi</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 truncate tracking-tight">
                  {data.summary.highest_case_subdistrict ? (
                    data.summary.highest_case_subdistrict.name
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {data.summary.highest_case_subdistrict ? (
                    <>
                      <strong>{data.summary.highest_case_subdistrict.cases} kasus</strong> (Prioritas Pemantauan)
                    </>
                  ) : (
                    'Tidak ada kasus terlapor'
                  )}
                </p>
              </div>

              {/* Card 4: Kecamatan Melaporkan Kasus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Kecamatan Ada Kasus</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.subdistricts_with_cases !== null ? (
                    <>
                      {data.summary.subdistricts_with_cases}{' '}
                      <span className="text-xs font-normal text-slate-500">/ {data.summary.subdistricts_with_data}</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Melaporkan &gt; 0 kejadian DBD
                </p>
              </div>
            </div>

            {/* RINGKASAN KECAMATAN */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Distribusi Kasus per Kecamatan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Peringkat jumlah kejadian DBD pada periode {data.period?.name}.
                  </p>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama kecamatan..."
                    className="block w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>

              {/* Horizontal Bar Visualizations */}
              <div className="space-y-3">
                {filteredRankings.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Kecamatan tidak ditemukan untuk pencarian "{searchQuery}".
                  </p>
                ) : (
                  filteredRankings.map((item) => {
                    const percentage = Math.max(4, Math.round((item.cases / maxCases) * 100));
                    const isPriority = item.cases >= 10;
                    const hasCases = item.cases > 0;

                    return (
                      <div
                        key={item.subdistrict_code}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
                      >
                        {/* Rank & Subdistrict name */}
                        <div className="flex items-center gap-3 sm:w-56 shrink-0">
                          <span className="w-6 text-center text-xs font-bold text-slate-400">
                            #{item.rank}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                            {item.subdistrict_name}
                          </span>
                        </div>

                        {/* Bar representation */}
                        <div className="flex-1 mx-0 sm:mx-4">
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isPriority
                                  ? 'bg-rose-600'
                                  : hasCases
                                  ? 'bg-rose-400'
                                  : 'bg-slate-200'
                              }`}
                              style={{ width: `${item.cases > 0 ? percentage : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Numbers & Priority Badge */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-60 shrink-0">
                          <span className="text-xs font-bold text-slate-900 min-w-16 text-right">
                            {item.cases} <span className="font-normal text-slate-400 text-[11px]">kasus</span>
                          </span>

                          <span
                            className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                              isPriority
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : hasCases
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {item.priority_status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong>Keterangan Klasifikasi:</strong> Istilah "Wilayah Prioritas Pemantauan" digunakan sebagai penanda kecamatan dengan nilai indikator tertinggi untuk kesiapsiagaan deteksi dini, bukan uji signifikansi spasial statistik.
                </span>
              </div>
            </div>

            {/* INFORMASI DATA & METADATA */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Informasi & Keterangan Dataset
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">Periode Aktif</span>
                  <span className="font-semibold text-slate-800">
                    {data.period?.name || 'Tidak ada'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">Sumber Dataset</span>
                  <span className="font-semibold text-slate-800 truncate block" title={data.metadata?.source}>
                    {data.metadata?.source || 'Dataset Agregat Terstandarisasi'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">Kelengkapan Wilayah</span>
                  <span className="font-semibold text-slate-800">
                    {data.metadata?.completeness || 'Lengkap'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">Waktu Pemutakhiran</span>
                  <span className="font-semibold text-slate-800">
                    {data.metadata?.updated_at || 'Terbaru'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Etika & Privasi Data Publik:</strong> Seluruh indikator yang disajikan merupakan agregasi kasus pada tingkat administrasi kecamatan. Sistem tidak mempublikasikan identitas individu, nama, maupun alamat pasien. Data yang ditampilkan saat ini adalah data sintetis berlabel pengembangan.
                </span>
              </div>
            </div>

            {/* NAVIGASI FITUR LANJUTAN: MENUJU PETA WEBGIS */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-semibold border border-rose-500/30">
                  <Compass className="w-3 h-3" />
                  <span>Modul Pemetaan Spasial (Fitur 4)</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  Visualisasikan Distribusi Kasus pada Peta WebGIS
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Peta interaktif berbasis OpenStreetMap dan Leaflet.js dengan batas polygon 27 kecamatan Kabupaten Banyumas.
                </p>
              </div>

              <Link
                to="/peta"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors shrink-0"
              >
                <Compass className="w-4 h-4" />
                <span>Buka Peta WebGIS Banyumas</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
