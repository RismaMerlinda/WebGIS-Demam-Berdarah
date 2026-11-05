import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  Compass,
  Calendar,
  Database,
  ShieldCheck,
  Search,
  RefreshCw,
  Info,
  CheckCircle2,
  TrendingUp,
  FileText,
} from 'lucide-react';

export default function PublicDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Period filter state synced with /api/public/map/periods
  const [availableYears, setAvailableYears] = useState([2022, 2023, 2024, 2025, 2026]);
  const [yearModes, setYearModes] = useState({});
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState('1');

  const fetchDashboardData = async (yearParam = null, monthParam = null) => {
    setLoading(true);
    setError(null);
    try {
      const config =
        yearParam !== null
          ? { params: { tahun: yearParam, bulan: monthParam ?? 'all' } }
          : undefined;
      const response = await axios.get('/api/public/dashboard/summary', config);
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

    axios
      .get('/api/public/map/periods')
      .then((res) => {
        if (res.data?.success) {
          if (Array.isArray(res.data.years) && res.data.years.length > 0) {
            setAvailableYears(res.data.years);
          }
          if (res.data.year_modes) {
            setYearModes(res.data.year_modes);
          }
          if (res.data.default_selection?.year) {
            setSelectedYear(res.data.default_selection.year);
          }
          if (res.data.default_selection?.month) {
            setSelectedMonth(String(res.data.default_selection.month));
          }
        }
      })
      .catch(() => {
        // Fallback silently if periods metadata is not mocked in isolated unit tests
      });
  }, []);

  const handleDashboardYearChange = (e) => {
    const yr = parseInt(e.target.value, 10);
    setSelectedYear(yr);
    const mode = yearModes[yr];
    const isAnnualOnly = mode ? !mode.has_monthly : yr < 2026;
    const nextMonth = isAnnualOnly ? 'all' : String(mode?.default_month || '1');
    setSelectedMonth(nextMonth);
    fetchDashboardData(yr, nextMonth);
  };

  // Filter rankings by search query
  const filteredRankings =
    data?.rankings?.filter((item) =>
      item.subdistrict_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const maxCases = data?.rankings?.[0]?.cases || 1;
  const isVerifiedAnnualData = data?.metadata?.is_simulation === false;

  return (
    <div className="bg-[#fbfbfa] min-h-dvh pb-16">
      {/* HEADER DASHBOARD */}
      <div className="bg-white border-b border-[#e2e8e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4e6057] hover:text-[#123027] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Beranda</span>
                </Link>
                <span className="text-[#c5d1cb]">•</span>
                <span className="text-xs font-semibold text-[#17221e]">Dashboard Publik</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#17221e] tracking-tight">
                Dashboard Pemantauan Epidemiologi DBD
              </h1>
              <p className="text-xs sm:text-sm text-[#4e6057]">
                Ringkasan data surveilans kasus Demam Berdarah Dengue di 27 Kecamatan Kabupaten Banyumas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-[#f0f6f4] rounded-md px-2.5 py-1.5 border border-[#dbe4df]">
                <label
                  htmlFor="dashboard-filter-tahun"
                  className="text-xs font-semibold text-[#123027] flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#123027]" />
                  <span>Tahun</span>
                </label>
                <select
                  id="dashboard-filter-tahun"
                  aria-label="Pilih Tahun Dashboard"
                  value={selectedYear}
                  onChange={handleDashboardYearChange}
                  className="text-xs font-semibold bg-white border border-[#c5d1cb] rounded px-2 py-0.5 text-[#17221e] focus:outline-none focus:border-[#123027] cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Status Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  isVerifiedAnnualData
                    ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
                    : 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVerifiedAnnualData ? 'bg-[#15803d]' : 'bg-[#d97706]'
                  }`}
                />
                <span>
                  {isVerifiedAnnualData
                    ? data?.metadata?.status || 'Data Agregat Terverifikasi'
                    : 'Data Surveilans Aktif'}
                </span>
              </div>

              {/* Navigation Tools */}
              <Link
                to="/peta"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#123027] hover:bg-[#194337] text-white text-xs font-semibold transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Peta WebGIS</span>
              </Link>
              <Link
                to="/perbandingan"
                data-testid="dashboard-to-compare-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#c5d1cb] bg-white hover:bg-[#f3f6f4] text-[#17221e] text-xs font-medium transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#4e6057]" />
                <span>Perbandingan</span>
              </Link>
              <Link
                to="/tren"
                data-testid="dashboard-to-trend-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#c5d1cb] bg-white hover:bg-[#f3f6f4] text-[#17221e] text-xs font-medium transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-[#4e6057]" />
                <span>Tren Temporal</span>
              </Link>
              <Link
                to="/metadata"
                data-testid="dashboard-to-metadata-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#c5d1cb] bg-white hover:bg-[#f3f6f4] text-[#17221e] text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#4e6057]" />
                <span>Metadata</span>
              </Link>
              <Link
                to="/edukasi"
                data-testid="dashboard-to-education-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#c5d1cb] bg-white hover:bg-[#f3f6f4] text-[#17221e] text-xs font-medium transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#15803d]" />
                <span>Edukasi 3M+</span>
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
                <div key={i} className="h-28 bg-white rounded-lg border border-[#e2e8e5] p-5" />
              ))}
            </div>
            <div className="h-96 bg-white rounded-lg border border-[#e2e8e5] p-6" />
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="bg-white border border-[#fecaca] rounded-lg p-8 text-center space-y-4">
            <div className="w-10 h-10 rounded-md bg-[#fef2f2] text-[#b91c1c] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#17221e]">Gagal Memuat Data</h3>
              <p className="text-xs text-[#4e6057] max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={() => fetchDashboardData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#123027] text-white text-xs font-medium hover:bg-[#194337] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && (!data?.has_data || data?.rankings?.length === 0) && (
          <div className="bg-white border border-[#e2e8e5] rounded-lg p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#f3f6f4] text-[#4e6057] flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#17221e]">
              {data?.reason === 'annual_only'
                ? 'Rincian bulanan tidak tersedia'
                : 'Data Belum Tersedia'}
            </h3>
            <p className="text-xs text-[#4e6057] max-w-md mx-auto">
              {data?.message ||
                'Saat ini belum ada data kasus agregat yang dipublikasikan untuk periode pemantauan aktif.'}
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {!loading && !error && data?.has_data && (
          <>
            {/* KPI METRIC CARDS — Typography first, zero generic icon circles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Kasus */}
              <div className="bg-white p-5 rounded-lg border border-[#e2e8e5] space-y-1.5">
                <div className="text-xs font-semibold text-[#4e6057]">
                  Total Kasus DBD
                </div>
                <div className="text-3xl font-bold text-[#17221e] tracking-tight tabular-nums">
                  {data.summary.total_cases !== null ? (
                    <>
                      {data.summary.total_cases}{' '}
                      <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-[#7d8f87]">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-[#7d8f87]">
                  Periode {data.period?.name || 'Aktif'}
                </p>
              </div>

              {/* Card 2: Jumlah Kecamatan Berdata */}
              <div className="bg-white p-5 rounded-lg border border-[#e2e8e5] space-y-1.5">
                <div className="text-xs font-semibold text-[#4e6057]">
                  Cakupan Wilayah
                </div>
                <div className="text-3xl font-bold text-[#17221e] tracking-tight tabular-nums">
                  {data.summary.subdistricts_with_data !== null ? (
                    <>
                      {data.summary.subdistricts_with_data}{' '}
                      <span className="text-xs font-normal text-[#7d8f87]">Kecamatan</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-[#7d8f87]">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-[#7d8f87]">
                  Seluruh kecamatan terdata
                </p>
              </div>

              {/* Card 3: Kecamatan Kasus Tertinggi */}
              <div className="bg-white p-5 rounded-lg border border-[#e2e8e5] space-y-1.5">
                <div className="text-xs font-semibold text-[#4e6057]">
                  Kasus Tertinggi
                </div>
                <div className="text-xl font-bold text-[#17221e] truncate tracking-tight">
                  {data.summary.highest_case_subdistrict ? (
                    data.summary.highest_case_subdistrict.name
                  ) : (
                    <span className="text-sm font-medium text-[#7d8f87]">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-[#78350f]">
                  {data.summary.highest_case_subdistrict ? (
                    <>
                      <strong className="tabular-nums">{data.summary.highest_case_subdistrict.cases} kasus</strong> (Prioritas Pemantauan)
                    </>
                  ) : (
                    'Tidak ada kasus terlapor'
                  )}
                </p>
              </div>

              {/* Card 4: Kecamatan Melaporkan Kasus */}
              <div className="bg-white p-5 rounded-lg border border-[#e2e8e5] space-y-1.5">
                <div className="text-xs font-semibold text-[#4e6057]">
                  Kecamatan Ada Kasus
                </div>
                <div className="text-3xl font-bold text-[#17221e] tracking-tight tabular-nums">
                  {data.summary.subdistricts_with_cases !== null ? (
                    <>
                      {data.summary.subdistricts_with_cases}{' '}
                      <span className="text-xs font-normal text-[#7d8f87]">/ {data.summary.subdistricts_with_data}</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-[#7d8f87]">Data belum tersedia</span>
                  )}
                </div>
                <p className="text-[11px] text-[#7d8f87]">
                  Melaporkan &gt; 0 kejadian DBD
                </p>
              </div>
            </div>

            {/* RINGKASAN PERINGKAT KECAMATAN */}
            <div className="bg-white rounded-lg border border-[#e2e8e5] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#17221e]">
                    Distribusi Kasus per Kecamatan
                  </h2>
                  <p className="text-xs text-[#4e6057]">
                    Peringkat jumlah kejadian DBD pada periode {data.period?.name}.
                  </p>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7d8f87]">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama kecamatan..."
                    className="block w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[#c5d1cb] bg-white text-[#17221e] placeholder-[#7d8f87] focus:border-[#123027] focus:outline-none"
                  />
                </div>
              </div>

              {/* Horizontal Bar Visualizations */}
              <div className="space-y-2">
                {filteredRankings.length === 0 ? (
                  <p className="text-xs text-[#7d8f87] py-6 text-center">
                    Kecamatan tidak ditemukan untuk pencarian "{searchQuery}".
                  </p>
                ) : (
                  filteredRankings.map((item) => {
                    const percentage = Math.max(3, Math.round((item.cases / maxCases) * 100));
                    const isPriority = item.cases >= 10;
                    const hasCases = item.cases > 0;

                    return (
                      <div
                        key={item.subdistrict_code}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md hover:bg-[#f8faf9] transition-colors border border-transparent hover:border-[#e2e8e5]"
                      >
                        {/* Rank & Subdistrict name */}
                        <div className="flex items-center gap-3 sm:w-56 shrink-0">
                          <span className="w-6 text-center text-xs font-semibold text-[#7d8f87] tabular-nums">
                            #{item.rank}
                          </span>
                          <span className="text-xs font-semibold text-[#17221e]">
                            {item.subdistrict_name}
                          </span>
                        </div>

                        {/* Bar representation */}
                        <div className="flex-1 mx-0 sm:mx-4">
                          <div className="w-full bg-[#eaefec] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-[width] duration-300 ${
                                isPriority
                                  ? 'bg-[#b91c1c]'
                                  : hasCases
                                  ? 'bg-[#123027]'
                                  : 'bg-[#cbd5cf]'
                              }`}
                              style={{ width: `${item.cases > 0 ? percentage : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Numbers & Priority Badge */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-60 shrink-0">
                          <span className="text-xs font-bold text-[#17221e] min-w-16 text-right tabular-nums">
                            {item.cases} <span className="font-normal text-[#7d8f87] text-[11px]">kasus</span>
                          </span>

                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                              isPriority
                                ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                                : hasCases
                                ? 'bg-[#f0f6f4] text-[#123027] border-[#dbe4df]'
                                : 'bg-[#f8faf9] text-[#7d8f87] border-[#e2e8e5]'
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

              <div className="pt-3 border-t border-[#e2e8e5] text-[11px] text-[#4e6057] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#4e6057] shrink-0" />
                <span>
                  <strong>Keterangan Klasifikasi:</strong> Istilah "Wilayah Prioritas Pemantauan" digunakan sebagai penanda kecamatan dengan nilai indikator tertinggi untuk kesiapsiagaan deteksi dini.
                </span>
              </div>
            </div>

            {/* INFORMASI DATA & METADATA */}
            <div className="bg-white rounded-lg border border-[#e2e8e5] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#f0f6f4] flex items-center justify-center text-[#123027]">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-[#17221e]">
                  Informasi & Keterangan Dataset
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-md bg-[#f8faf9] border border-[#e2e8e5]">
                  <span className="text-[#7d8f87] block font-medium">Periode Aktif</span>
                  <span className="font-semibold text-[#17221e]">
                    {data.period?.name || 'Tidak ada'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-md bg-[#f8faf9] border border-[#e2e8e5]">
                  <span className="text-[#7d8f87] block font-medium">Sumber Dataset</span>
                  <span className="font-semibold text-[#17221e] truncate block" title={data.metadata?.source}>
                    {data.metadata?.source || 'Dataset Agregat Terstandarisasi'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-md bg-[#f8faf9] border border-[#e2e8e5]">
                  <span className="text-[#7d8f87] block font-medium">Kelengkapan Wilayah</span>
                  <span className="font-semibold text-[#17221e]">
                    {data.metadata?.completeness || 'Lengkap'}
                  </span>
                </div>

                <div className="space-y-1 p-3 rounded-md bg-[#f8faf9] border border-[#e2e8e5]">
                  <span className="text-[#7d8f87] block font-medium">Waktu Pemutakhiran</span>
                  <span className="font-semibold text-[#17221e]">
                    {data.metadata?.updated_at || 'Terbaru'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[#4e6057] leading-relaxed bg-[#f0f6f4] p-3 rounded-md border border-[#dbe4df] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
                <span>
                  <strong>Etika & Privasi Data Publik:</strong> Seluruh indikator yang disajikan merupakan agregasi kasus pada tingkat administrasi kecamatan. Sistem tidak mempublikasikan identitas individu, nama, maupun alamat pasien.
                </span>
              </div>
            </div>

            {/* NAVIGASI FITUR LANJUTAN: MENUJU PETA WEBGIS */}
            <div className="bg-[#123027] text-white rounded-lg p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-[#194337]">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#194337] text-emerald-300 text-[11px] font-semibold border border-[#235b4c]">
                  <Compass className="w-3 h-3" />
                  <span>Modul Pemetaan Spasial</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  Visualisasikan Sebaran Kasus pada Peta WebGIS
                </h3>
                <p className="text-xs sm:text-sm text-[#a3d4be] leading-relaxed">
                  Peta interaktif berbasis OpenStreetMap dan Leaflet.js dengan batas polygon 27 kecamatan Kabupaten Banyumas.
                </p>
              </div>

              <Link
                to="/peta"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#123027] font-semibold text-xs sm:text-sm hover:bg-[#f3f6f4] transition-colors shrink-0"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>Buka Peta WebGIS Banyumas</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
