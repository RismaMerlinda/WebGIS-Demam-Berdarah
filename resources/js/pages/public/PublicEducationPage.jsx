import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Users,
  Stethoscope,
  Droplets,
  Trash2,
  ShieldAlert,
  X,
  Compass,
} from 'lucide-react';

export default function PublicEducationPage() {
  const [eduData, setEduData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openFaqId, setOpenFaqId] = useState(null);

  const fetchEducationData = useCallback(
    async (catSlug = 'all', search = '', page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, per_page: 9 };
        if (catSlug && catSlug !== 'all') {
          params.category = catSlug;
        }
        if (search.trim() !== '') {
          params.search = search.trim();
        }
        const res = await axios.get('/api/public/education', { params });
        if (res.data?.success) {
          setEduData(res.data);
          const firstFaq = res.data.faqs?.[0]?.id;
          if (firstFaq && openFaqId === null) {
            setOpenFaqId(firstFaq);
          }
        } else {
          setError(res.data?.message || 'Gagal memuat materi edukasi kesehatan.');
        }
      } catch (err) {
        setError('Gagal menghubungi server edukasi DBD. Periksa koneksi jaringan Anda.');
      } finally {
        setLoading(false);
      }
    },
    [openFaqId]
  );

  useEffect(() => {
    fetchEducationData('all', '', 1);
  }, []);

  const handleCategorySelect = (slug) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
    fetchEducationData(slug, searchQuery, 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEducationData(selectedCategory, searchQuery, 1);
  };

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    fetchEducationData(selectedCategory, searchQuery, nextPage);
  };

  const handleOpenArticleDetail = async (slug) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/public/education/${slug}`);
      if (res.data?.success && res.data.article) {
        setSelectedArticle(res.data.article);
      }
    } catch (err) {
      const existing = (eduData?.articles || []).find((a) => a.slug === slug);
      if (existing) {
        setSelectedArticle(existing);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const categories = eduData?.categories || [];
  const articles = eduData?.articles || [];
  const pagination = eduData?.pagination;
  const faqs = eduData?.faqs || [];
  const structured = eduData?.structured_sections;
  const references = eduData?.references || [];

  return (
    <div className="min-h-dvh bg-[#fbfbfa] text-[#17221e] flex flex-col pb-16">
      {/* TOP SUBHEADER & NAVIGATION CONSISTENT WITH DASHBOARD, MAP & METADATA */}
      <div className="bg-white border-b border-[#e2e8e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#4e6057]">
            <Link
              to={{ pathname: '/', hash: '' }}
              data-testid="education-back-home-btn"
              onClick={() => {
                if (window.location.hash) {
                  window.history.pushState('', document.title, '/');
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
              }}
              className="inline-flex items-center gap-1.5 hover:text-[#123027] transition-colors text-[#17221e] font-bold"
            >
              <span>← Kembali ke Beranda</span>
            </Link>
            <span className="text-[#c5d1cb]">/</span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 hover:text-[#17221e] transition-colors text-[#4e6057] font-medium"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard Publik</span>
            </Link>
            <span className="text-[#c5d1cb]">/</span>
            <span className="text-[#17221e] font-semibold">Edukasi & 3M Plus (#edukasi)</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex flex-wrap items-center bg-[#f0f6f4] p-1 rounded-md border border-[#dbe4df]">
              <Link
                to="/peta"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Peta Tunggal
              </Link>
              <Link
                to="/perbandingan"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Perbandingan
              </Link>
              <Link
                to="/tren"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Grafik Tren
              </Link>
              <Link
                to="/metadata"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Metadata
              </Link>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#123027] text-white">
                Edukasi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. CLEAN LIGHT HERO SECTION */}
      <section
        data-testid="education-hero-section"
        className="bg-white border-b border-[#e2e8e5]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#f0f6f4] border border-[#dbe4df] text-[#123027] text-xs font-semibold">
              <HeartPulse className="w-3.5 h-3.5 text-[#123027]" />
              <span>Panduan Kesehatan Masyarakat Kabupaten Banyumas</span>
            </div>

            <h1
              data-testid="education-page-title"
              className="text-2xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-[#17221e] leading-[1.12]"
            >
              Edukasi Demam Berdarah Dengue
            </h1>

            <p className="text-sm sm:text-base text-[#4e6057] leading-relaxed max-w-2xl">
              Kenali karakteristik nyamuk penular, gejala awal, tanda bahaya yang membutuhkan pertolongan medis segera, serta langkah nyata memutus rantai penularan DBD dari rumah melalui gerakan Pemberantasan Sarang Nyamuk (PSN) 3M Plus.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  document.getElementById('pencegahan-3m-plus')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#123027] hover:bg-[#194337] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Panduan 3M Plus</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('gejala-tanda-bahaya')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white hover:bg-[#f3f6f4] border border-[#c5d1cb] text-[#17221e] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-[#b45309]" />
                <span>Gejala & Tanda Bahaya</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('artikel-edukasi')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white hover:bg-[#f3f6f4] border border-[#c5d1cb] text-[#17221e] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#0369a1]" />
                <span>Materi & FAQ</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-lg overflow-hidden border border-[#e2e8e5] bg-white p-2">
              <img
                src="/images/education/pencegahan-3m-plus.svg"
                alt="Ilustrasi Edukasi Pencegahan DBD dan Gerakan 3M Plus"
                className="w-full h-auto rounded-md object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* LOADING STATE */}
        {loading && !eduData && (
          <div data-testid="education-loading" className="space-y-6 animate-pulse">
            <div className="h-52 bg-white rounded-2xl border border-slate-200 p-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-60 bg-white rounded-2xl border border-slate-200 p-5" />
              <div className="h-60 bg-white rounded-2xl border border-slate-200 p-5" />
              <div className="h-60 bg-white rounded-2xl border border-slate-200 p-5" />
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && !eduData && (
          <div
            data-testid="education-error"
            className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-2xs"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">Gagal Memuat Materi Edukasi</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchEducationData(selectedCategory, searchQuery, currentPage)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {eduData && (
          <>
            {/* 2. MENGENAL DBD & VEKTOR NYAMUK AEDES */}
            <section
              id="mengenal-dbd"
              data-testid="section-mengenal-dbd"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5">
                  <img
                    src="/images/education/mengenal-dbd.svg"
                    alt="Ilustrasi Mengenal Virus Dengue dan Nyamuk Aedes aegypti"
                    className="w-full h-auto rounded-xl border border-slate-200/80"
                    loading="lazy"
                  />
                </div>

                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-[#123027]">
                      1. Mengenal Penyakit & Vektor
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#17221e]">
                      Apa Itu Demam Berdarah Dengue (DBD)?
                    </h2>
                    <p className="text-sm text-[#4e6057] leading-relaxed">
                      {structured?.mengenal_dbd?.definition}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="border-l-2 border-[#123027] pl-3 py-1 space-y-1">
                      <h3 className="text-xs font-bold text-[#17221e]">
                        Penyebab & Cara Penularan
                      </h3>
                      <p className="text-xs text-[#4e6057] leading-relaxed">
                        {structured?.mengenal_dbd?.virus} {structured?.mengenal_dbd?.transmission}
                      </p>
                    </div>

                    <div className="border-l-2 border-[#0369a1] pl-3 py-1 space-y-2">
                      <h3 className="text-xs font-bold text-[#17221e]">
                        Karakteristik Nyamuk Aedes
                      </h3>
                      {(structured?.mengenal_dbd?.vectors || []).map((vec) => (
                        <div key={vec.species} className="text-xs text-[#4e6057] leading-relaxed">
                          <strong className="text-[#17221e]">{vec.species}:</strong>{' '}
                          {vec.characteristics}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. GEJALA DBD DAN TANDA BAHAYA */}
            <section
              id="gejala-tanda-bahaya"
              data-testid="section-gejala-dbd"
              className="bg-white rounded-lg border border-[#e2e8e5] p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#e2e8e5]">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#b45309]">
                    2. Kewaspadaan Klinis
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Gejala Umum DBD dan Tanda Bahaya
                  </h2>
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Kenali gejala awal demam serta tanda bahaya fase kritis yang membutuhkan pertolongan medis segera di Puskesmas atau Rumah Sakit.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Common Symptoms List */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Gejala Umum DBD</span>
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Fase Awal Demam
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-200/70">
                    {(structured?.gejala_dan_bahaya?.common_symptoms || []).map((sym) => (
                      <li key={sym.title} className="py-2.5 first:pt-0 last:pb-0">
                        <span className="text-xs font-bold text-slate-900 block">
                          {sym.title}
                        </span>
                        <span className="text-xs text-slate-600 leading-relaxed">
                          {sym.desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Warning Signs List */}
                <div
                  data-testid="warning-signs-panel"
                  className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-rose-950 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Tanda Bahaya (Segera ke Fasilitas Kesehatan)</span>
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0">
                      Darurat Medis
                    </span>
                  </div>
                  <ul className="divide-y divide-rose-200/60">
                    {(structured?.gejala_dan_bahaya?.warning_signs || []).map((warn) => (
                      <li key={warn.title} className="py-2.5 first:pt-0 last:pb-0">
                        <span className="text-xs font-bold text-rose-900 block">
                          {warn.title}
                        </span>
                        <span className="text-xs text-slate-700 leading-relaxed">
                          {warn.desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Clean Light Non-Diagnostic Disclaimer */}
              <div
                data-testid="medical-disclaimer-banner"
                className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-950"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Catatan Medis Penting: </strong>
                  {structured?.gejala_dan_bahaya?.medical_disclaimer}
                </p>
              </div>
            </section>

            {/* 4. PENCEGAHAN 3M PLUS */}
            <section
              id="pencegahan-3m-plus"
              data-testid="section-3m-plus"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#15803d]">
                    3. Pengendalian Sarang Nyamuk
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#17221e]">
                    Pencegahan DBD Melalui Gerakan 3M Plus
                  </h2>
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Tiga langkah utama pemberantasan sarang nyamuk beserta tindakan pencegahan tambahan (Plus) di lingkungan rumah.
                </p>
              </div>

              {/* 3M Core Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(structured?.gerakan_3m_plus?.core_3m || []).map((item, idx) => {
                  const icons = [Droplets, ShieldCheck, Trash2];
                  const IconComp = icons[idx] || ShieldCheck;
                  return (
                    <div
                      key={item.step}
                      className="rounded-xl border border-emerald-200/90 bg-emerald-50/30 p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black">
                          {item.step}
                        </span>
                        <IconComp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* PLUS Actions List */}
              <div
                data-testid="section-plus-actions"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Tindakan Pencegahan PLUS (+) di Lingkungan Rumah</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full w-fit">
                    Pelengkap Wajib 3M
                  </span>
                </div>

                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs text-slate-700">
                  {(structured?.gerakan_3m_plus?.plus_actions || []).map((act, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                  <strong>Prinsip Pencegahan:</strong> {structured?.gerakan_3m_plus?.prevention_note}
                </p>
              </div>
            </section>

            {/* 5. LINGKUNGAN DAN PERAN MASYARAKAT */}
            <section
              id="peran-masyarakat"
              data-testid="section-peran-masyarakat"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#0369a1]">
                      4. Partisipasi Komunitas
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#17221e]">
                      Lingkungan dan Peran Aktif Masyarakat
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
                      Nyamuk penular DBD dapat terbang melintasi batas pekarangan rumah, sehingga upaya pemberantasan sarang nyamuk harus dilakukan secara serentak bersama warga lingkungan.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {(structured?.peran_masyarakat || []).map((role, idx) => (
                      <div key={role.title} className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-xs font-black shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                            {role.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{role.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <img
                    src="/images/education/peran-masyarakat.svg"
                    alt="Ilustrasi Peran Masyarakat dan Gerakan 1 Rumah 1 Jumantik"
                    className="w-full h-auto rounded-xl border border-slate-200/80"
                    loading="lazy"
                  />
                </div>
              </div>
            </section>

            {/* KATALOG ARTIKEL EDUKASI DARI DATABASE MYSQL */}
            <section
              id="artikel-edukasi"
              data-testid="section-articles-catalogue"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#123027]">
                    5. Pustaka Edukasi Kesehatan
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#17221e]">
                    Materi & Artikel Edukasi DBD
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pilih kategori topik atau cari kata kunci untuk membaca panduan lengkap yang dikelola melalui basis data WebGIS.
                  </p>
                </div>

                {/* Search Box */}
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari topik edukasi..."
                      aria-label="Cari artikel edukasi"
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Cari
                  </button>
                </form>
              </div>

              {/* Category Filter Pills */}
              <div
                data-testid="education-category-filters"
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => handleCategorySelect('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedCategory === 'all'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  Semua Kategori
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    data-testid={`category-btn-${cat.slug}`}
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedCategory === cat.slug
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    <span>{cat.name}</span>
                    <span className="ml-1.5 opacity-75">({cat.articles_count})</span>
                  </button>
                ))}
              </div>

              {/* Articles Grid or Empty State */}
              {articles.length === 0 ? (
                <div
                  data-testid="education-empty-articles"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2"
                >
                  <p className="text-xs font-bold text-slate-700">
                    Belum ada materi edukasi yang sesuai dengan filter pencarian.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleCategorySelect('all');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Tampilkan Semua Materi
                  </button>
                </div>
              ) : (
                <div
                  data-testid="education-articles-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {articles.map((art) => (
                    <article
                      key={art.id}
                      data-testid={`article-card-${art.slug}`}
                      className="rounded-lg border border-[#e2e8e5] bg-white hover:border-[#123027] transition-colors overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {art.image_url && (
                          <div className="h-40 bg-slate-50 border-b border-slate-100 overflow-hidden">
                            <img
                              src={art.image_url}
                              alt={art.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-4 space-y-2">
                          {art.category && (
                            <span className="inline-block text-[11px] font-semibold text-[#123027] bg-[#f0f6f4] border border-[#dbe4df] px-2 py-0.5 rounded">
                              {art.category.name}
                            </span>
                          )}
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {art.title}
                          </h3>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {art.summary || art.content}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-slate-400 truncate">
                          Ref: {art.reference_source}
                        </span>
                        <button
                          type="button"
                          data-testid={`read-article-${art.slug}`}
                          onClick={() => handleOpenArticleDetail(art.slug)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 shrink-0 cursor-pointer"
                        >
                          Baca Selengkapnya →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {Array.from({ length: pagination.last_page }, (_, idx) => idx + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => handlePageChange(pg)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${pg === currentPage
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 6. INFORMASI TAMBAHAN: FAKTA SINGKAT, FAQ & REFERENSI RESMI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Fakta Singkat & Referensi Kesehatan Resmi */}
              <section
                data-testid="section-facts-references"
                className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Sparkles className="w-5 h-5 text-rose-600 shrink-0" />
                    <h2 className="text-base font-extrabold text-slate-900">
                      Fakta Singkat DBD
                    </h2>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {(structured?.fakta_singkat || []).map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Official Health References */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold text-[#17221e]">
                    Sumber Referensi Kesehatan Resmi
                  </h3>
                  <ul className="space-y-2 text-[11px] text-slate-600">
                    {references.map((ref) => (
                      <li
                        key={ref.institution}
                        className="border-b border-slate-200/60 pb-1.5 last:border-none last:pb-0"
                      >
                        <span className="font-bold text-slate-900 block">{ref.institution}</span>
                        <span>{ref.document}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Pertanyaan yang Sering Diajukan (FAQ) */}
              <section
                data-testid="section-education-faqs"
                className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <HelpCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Pertanyaan yang Sering Diajukan (FAQ)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Jawaban ringkas atas pertanyaan umum seputar penularan, penanganan, dan pencegahan DBD.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {faqs.map((faq) => {
                    const isOpen = openFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        data-testid={`faq-item-${faq.id}`}
                        className="rounded-xl border border-slate-200 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                          className="w-full px-4 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {faq.question}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div
                            data-testid={`faq-answer-${faq.id}`}
                            className="px-4 py-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100"
                          >
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* CLEAN LIGHT CALL-TO-ACTION BANNER */}
            <section
              data-testid="section-call-to-action"
              className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-1.5 max-w-2xl">
                <h2 className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
                  Mulai Pencegahan DBD dari Rumah Kita Hari Ini
                </h2>
                <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">
                  Luangkan waktu 10–15 menit setiap minggu bersama keluarga untuk memeriksa jentik dan melaksanakan 3M Plus. Lingkungan yang bersih dan bebas jentik melindungi keluarga serta tetangga di sekitar kita.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to="/peta"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-extrabold transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Pantau Peta Sebaran</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold transition-colors"
                >
                  <span>Buka Dashboard Publik</span>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      {/* MODAL DETAIL ARTIKEL EDUKASI */}
      {(selectedArticle || detailLoading) && (
        <div
          data-testid="article-detail-modal"
          className="fixed inset-0 z-50 bg-[#0c201a]/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !detailLoading && setSelectedArticle(null)}
        >
          <div
            className="bg-white rounded-lg border border-[#e2e8e5] max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                Memuat isi artikel edukasi...
              </div>
            ) : (
              selectedArticle && (
                <>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      {selectedArticle.category && (
                        <span className="inline-block text-[11px] font-semibold text-[#123027] bg-[#f0f6f4] border border-[#dbe4df] px-2 py-0.5 rounded">
                          {selectedArticle.category.name}
                        </span>
                      )}
                      <h2
                        data-testid="modal-article-title"
                        className="text-base sm:text-lg font-black text-slate-900 leading-snug"
                      >
                        {selectedArticle.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      data-testid="close-article-modal"
                      onClick={() => setSelectedArticle(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Tutup detail artikel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {selectedArticle.image_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img
                        src={selectedArticle.image_url}
                        alt={selectedArticle.title}
                        className="w-full max-h-60 object-cover"
                      />
                    </div>
                  )}

                  {selectedArticle.summary && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 leading-relaxed">
                      {selectedArticle.summary}
                    </div>
                  )}

                  <div
                    data-testid="modal-article-content"
                    className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                  >
                    {selectedArticle.content}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>
                      <strong>Sumber Referensi:</strong> {selectedArticle.reference_source}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(null)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
