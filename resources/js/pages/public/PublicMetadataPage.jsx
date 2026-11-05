import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Database,
  FileText,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Info,
  Layers,
  Calendar,
  MapPin,
  Activity,
  Lock,
  BookOpen,
  Clock,
  ArrowRight,
  GitMerge,
} from 'lucide-react';

export default function PublicMetadataPage() {
  const [metaData, setMetaData] = useState(null);
  const [periodsData, setPeriodsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetadata = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, periodsRes] = await Promise.all([
        axios.get('/api/public/metadata'),
        axios.get('/api/public/metadata/periods'),
      ]);

      if (metaRes.data?.success) {
        setMetaData(metaRes.data);
      } else {
        setError(metaRes.data?.message || 'Gagal memuat informasi metadata dataset.');
      }

      if (periodsRes.data?.success) {
        setPeriodsData(periodsRes.data);
      }
    } catch (err) {
      setError('Gagal menghubungi server metadata. Periksa koneksi jaringan Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const generalInfo = metaData?.general_info;
  const sources = metaData?.sources;
  const coverage = metaData?.coverage;
  const indicators = metaData?.indicators || [];
  const methodology = metaData?.methodology;
  const mappingMethod = metaData?.mapping_method;
  const statusAndLimitations = metaData?.status_and_limitations;
  const ethicsAndPrivacy = metaData?.ethics_and_privacy;
  const updateInfo = metaData?.update_info;
  const yearlyTable = coverage?.yearly_table || periodsData?.years_summary || [];

  const getBadgeStyle = (tone) => {
    switch (tone) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'blue':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-dvh bg-[#fbfbfa] text-[#17221e] flex flex-col pb-14">
      {/* 1. HEADER SECTION */}
      <div className="bg-white border-b border-[#e2e8e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4e6057]">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 hover:text-[#17221e] transition-colors text-[#4e6057] font-medium"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Publik</span>
              </Link>
              <span className="text-[#c5d1cb]">/</span>
              <Link
                to="/peta"
                className="hover:text-[#17221e] transition-colors text-[#4e6057] font-medium"
              >
                Peta WebGIS
              </Link>
              <span className="text-[#c5d1cb]">/</span>
              <span className="text-[#17221e] font-semibold">Metadata & Sumber Data</span>
            </div>
            <h1
              data-testid="metadata-page-title"
              className="text-xl sm:text-2xl font-bold text-[#17221e] tracking-tight"
            >
              Metadata dan Informasi Dataset DBD Banyumas
            </h1>
            <p className="text-xs text-[#4e6057] max-w-3xl">
              Dokumentasi transparan mengenai sumber data, cakupan periode 2022–2026, definisi indikator epidemiologi, metodologi agregasi wilayah 27 kecamatan, serta kebijakan izin publikasi dan perlindungan data.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex flex-wrap items-center bg-[#f0f6f4] p-1 rounded-md border border-[#dbe4df]">
              <Link
                to="/peta"
                data-testid="metadata-nav-map"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Peta Tunggal
              </Link>
              <Link
                to="/perbandingan"
                data-testid="metadata-nav-compare"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Perbandingan
              </Link>
              <Link
                to="/tren"
                data-testid="metadata-nav-trend"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Grafik Tren
              </Link>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#123027] text-white">
                Metadata
              </span>
              <Link
                to="/edukasi"
                data-testid="metadata-nav-education"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Edukasi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* LOADING STATE */}
        {loading && (
          <div data-testid="metadata-loading" className="space-y-4 animate-pulse">
            <div className="h-44 bg-white rounded-xl border border-slate-200 p-5" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="h-56 bg-white rounded-xl border border-slate-200 p-5" />
              <div className="h-56 bg-white rounded-xl border border-slate-200 p-5" />
              <div className="h-56 bg-white rounded-xl border border-slate-200 p-5" />
            </div>
            <div className="h-72 bg-white rounded-xl border border-slate-200 p-5" />
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div
            data-testid="metadata-error"
            className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-4 shadow-2xs"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">Gagal Memuat Metadata</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchMetadata}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Metadata</span>
            </button>
          </div>
        )}

        {!loading && !error && metaData && (
          <>
            {/* 2. INFORMASI UMUM DATASET */}
            <section
              data-testid="section-general-info"
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5"
            >
              <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Informasi Umum Dataset
                  </h2>
                  <p className="text-xs text-slate-500">
                    Spesifikasi pokok dataset epidemiologi yang diintegrasikan pada WebGIS DBD Kabupaten Banyumas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nama Dataset
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.dataset_name}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Topik Data
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.topic}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Wilayah Penelitian
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.research_region}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Unit Analisis Spasial
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.analysis_unit}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tahun Pengamatan
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.observation_years}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Indikator Utama
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.primary_indicator}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Format Data
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.data_format}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-lg border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Metode Visualisasi
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-900 leading-snug">
                    {generalInfo?.visualization_method}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. SUMBER DATA (3 KELOMPOK TATA KELOLA) */}
            <section
              data-testid="section-data-sources"
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-5"
            >
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Katalog Sumber Data dan Status Publikasi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pemisahan tegas antara sumber data yang dipublikasikan, sumber referensi pembanding, dan sumber internal yang belum memiliki izin publikasi.
                  </p>
                </div>
              </div>

              {/* Group 1: Published Sources */}
              <div data-testid="source-group-published" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>{sources?.published_sources?.group_title}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full w-fit">
                    Aktif Ditampilkan pada WebGIS Publik
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {sources?.published_sources?.group_description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(sources?.published_sources?.items || []).map((item) => {
                    const isSim = item.source_category === 'published_simulation';
                    return (
                      <div
                        key={item.dataset_code}
                        className={`rounded-xl border p-4 space-y-2.5 ${isSim
                          ? 'bg-amber-50/40 border-amber-200/90'
                          : 'bg-slate-50/70 border-slate-200/90'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.dataset_code} • Tahun {item.observation_year}
                            </span>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                              {item.dataset_name}
                            </h4>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${isSim
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                          >
                            {item.publication_status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                        <div className="pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-400 block">Dokumen Sumber:</span>
                            <span className="font-bold text-slate-700">{item.source_name}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block">Status Validasi:</span>
                            <span className="font-bold text-slate-700">{item.validation_status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Reference Sources */}
              <div data-testid="source-group-reference" className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>{sources?.reference_sources?.group_title}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full w-fit">
                    Validasi Silang & Batas Wilayah
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {sources?.reference_sources?.group_description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(sources?.reference_sources?.items || []).map((item) => (
                    <div
                      key={item.dataset_code}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.dataset_code}
                          </span>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {item.dataset_name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                          {item.publication_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-slate-700">{item.source_name}</span>
                        <span className="text-slate-500 font-medium">{item.spatial_unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 3: Internal Restricted Sources */}
              <div data-testid="source-group-restricted" className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>{sources?.restricted_internal_sources?.group_title}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full w-fit">
                    Diisolasi dari Halaman Publik
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {sources?.restricted_internal_sources?.group_description}
                </p>

                {(sources?.restricted_internal_sources?.items || []).map((item) => (
                  <div
                    key={item.dataset_code}
                    className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {item.dataset_name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                        {item.publication_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>
                    <div className="text-[11px] text-rose-800 font-medium flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                      <span>Instansi Sumber: Dinas Kesehatan Kabupaten Banyumas</span>
                      <span>•</span>
                      <span>Status: Tidak Ditampilkan & Tidak Disediakan Unduhan Publik</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. CAKUPAN DATA & TABEL RINGKASAN PERIODE 2022–2026 */}
            <section
              data-testid="section-data-coverage"
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Cakupan Wilayah dan Periode Data (2022–2026)
                    </h2>
                    <p className="text-xs text-slate-500">
                      {coverage?.completeness_summary}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg w-fit shrink-0">
                  {coverage?.subdistricts_count || 27} Kecamatan • 5 Tahun Pengamatan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table
                  data-testid="metadata-coverage-table"
                  className="w-full text-left border-collapse"
                >
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80">
                      <th className="py-2.5 px-3">Tahun</th>
                      <th className="py-2.5 px-3">Granularitas</th>
                      <th className="py-2.5 px-3">Cakupan Wilayah</th>
                      <th className="py-2.5 px-3 text-right">Total Kasus</th>
                      <th className="py-2.5 px-3">Status Data</th>
                      <th className="py-2.5 px-3">Keterangan & Sumber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-xs">
                    {yearlyTable.map((row) => (
                      <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                          Tahun {row.year}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          <div>{row.granularity}</div>
                          <div className="text-[11px] font-normal text-slate-500">
                            {row.months_available}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {row.subdistricts_covered}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {row.total_cases !== null && row.total_cases !== undefined
                            ? `${Number(row.total_cases).toLocaleString('id-ID')} Kasus`
                            : 'Belum Tersedia'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${row.is_simulation
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                          >
                            {row.status_label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-md leading-relaxed">
                          <div className="font-medium text-slate-800">{row.notes}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Sumber: {row.source_name}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. DEFINISI INDIKATOR EPIDEMIOLOGI */}
            <section
              data-testid="section-indicators"
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Definisi Indikator Epidemiologi dan Klasifikasi Wilayah
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rumus dan batasan interpretasi indikator yang digunakan pada peta dan grafik.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {indicators.map((ind) => (
                  <div
                    key={ind.code}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          {ind.unit}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">{ind.name}</h3>
                      <div className="bg-white rounded-md border border-[#c5d1cb] px-3 py-2 text-xs font-semibold text-[#17221e] tabular-nums">
                        {ind.formula}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{ind.definition}</p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
                      <span className="font-bold text-slate-700">Catatan Penggunaan: </span>
                      {ind.usage_note}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. METODOLOGI PENGOLAHAN DATA & 7. METODE PEMETAAN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 6. Metodologi Pengolahan Data */}
              <section
                data-testid="section-methodology"
                className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Metodologi Pengolahan & Agregasi Data Wilayah
                    </h2>
                    <p className="text-xs text-slate-500">
                      Alur integrasi dari dokumen sumber 40 Puskesmas hingga visualisasi 27 Kecamatan.
                    </p>
                  </div>
                </div>

                {/* 6-Step Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(methodology?.flow_steps || []).map((step) => (
                    <div
                      key={step.step}
                      className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                          {step.step}
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-900">{step.title}</h3>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700">{step.subtitle}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
                </div>

                {/* Aggregation Notes */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-[#17221e]">
                    Prinsip Agregasi 40 Puskesmas ke 27 Kecamatan
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                    {(methodology?.aggregation_notes || []).map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 7. Metode Pemetaan */}
              <section
                data-testid="section-mapping-method"
                className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Metode Pemetaan Choropleth
                      </h2>
                      <p className="text-xs text-slate-500">
                        Spesifikasi kartografi digital dan klasifikasi warna poligon.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Jenis Peta:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {mappingMethod?.map_type}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Unit Spasial:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {mappingMethod?.spatial_unit}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Pustaka & Basemap:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {mappingMethod?.map_library}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Format Geometri:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {mappingMethod?.geometry_format}
                      </span>
                    </div>
                  </div>

                  {/* Color Intervals Preview */}
                  <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-extrabold text-slate-900">
                      Kelas Gradasi Warna Choropleth
                    </h3>
                    <div className="space-y-1.5">
                      {(mappingMethod?.legend_classes?.tiers || []).map((tier) => (
                        <div
                          key={tier.tier}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-sm border shrink-0"
                              style={{
                                backgroundColor: tier.color,
                                borderColor: tier.border_color,
                              }}
                            />
                            <span className="font-bold text-slate-800">{tier.range_label}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {tier.priority_status}
                          </span>
                        </div>
                      ))}
                      {mappingMethod?.legend_classes?.nodata && (
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-sm border shrink-0"
                              style={{
                                backgroundColor: mappingMethod.legend_classes.nodata.color,
                                borderColor: mappingMethod.legend_classes.nodata.border_color,
                              }}
                            />
                            <span className="font-bold text-slate-700">
                              {mappingMethod.legend_classes.nodata.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Tidak Diubah Menjadi 0
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Catatan Interpretasi Visual: </span>
                  {mappingMethod?.interpretation_disclaimer}
                </div>
              </section>
            </div>

            {/* 8. STATUS DAN KETERBATASAN DATA */}
            <section
              data-testid="section-status-limitations"
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Arti Status Dataset dan Keterbatasan Data
                  </h2>
                  <p className="text-xs text-slate-500">
                    Penjelasan transparan mengenai status validitas periode dan batasan analisis data yang tersedia.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(statusAndLimitations?.statuses || []).map((st) => (
                  <div
                    key={st.code}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2"
                  >
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                        st.badge_tone
                      )}`}
                    >
                      {st.label}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{st.meaning}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <h3 className="text-xs font-bold text-[#17221e]">
                  Keterbatasan Dataset yang Perlu Diperhatikan Pengguna
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                  {(statusAndLimitations?.limitations || []).map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 9. ETIKA DAN PERLINDUNGAN DATA & 10. INFORMASI PEMUTAKHIRAN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 9. Etika dan Perlindungan Data */}
              <section
                data-testid="section-ethics-privacy"
                className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Etika dan Perlindungan Privasi Data Kesehatan
                    </h2>
                    <p className="text-xs text-slate-500">
                      {ethicsAndPrivacy?.principle_summary}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-700">
                  {(ethicsAndPrivacy?.commitments || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                  <h3 className="text-xs font-extrabold text-emerald-950">
                    Data Individu yang Tidak Ditampilkan pada Sistem Publik:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(ethicsAndPrivacy?.excluded_personal_data || []).map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs"
                      >
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* 10. Informasi Pemutakhiran Dataset */}
              <section
                data-testid="section-update-info"
                className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Informasi Pemutakhiran Dataset
                      </h2>
                      <p className="text-xs text-slate-500">
                        Status sinkronisasi basis data MySQL berdasarkan metadata resmi.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pemutakhiran Dataset Resmi (2022–2025)
                      </span>
                      <span
                        data-testid="official-update-date"
                        className="text-xs font-extrabold text-slate-900 block mt-0.5"
                      >
                        {updateInfo?.official_dataset_update_label}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pemutakhiran Dataset Simulasi (2026 Q1)
                      </span>
                      <span
                        data-testid="simulation-update-date"
                        className="text-xs font-extrabold text-slate-900 block mt-0.5"
                      >
                        {updateInfo?.simulation_dataset_update_label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Periode Resmi Terakhir
                        </span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">
                          {updateInfo?.latest_official_period}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Periode Aktif Terakhir
                        </span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">
                          {updateInfo?.latest_available_period_overall}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Status Pemutakhiran
                      </span>
                      <span className="text-xs font-semibold text-slate-700 block mt-0.5 leading-relaxed">
                        {updateInfo?.update_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  {updateInfo?.update_policy_note}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

