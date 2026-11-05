
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Database,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  LayoutDashboard,
  ShieldAlert,
  Activity,
} from 'lucide-react';

/**
 * Interactive SVG Line Chart for Annual (2022-2026) and Monthly (Jan-Dec) Dengue Trends.
 * - Separates official full-year points (solid line) from partial/simulation points (dashed line).
 * - Preserves gaps for unavailable months (never plots null as 0).
 * - Renders valid 0-case records on the 0 baseline distinct from missing data gaps.
 */
function InteractiveTrendLineChart({
  series = [],
  granularity = 'annual',
  activeIndex,
  onSelectIndex,
  scopeName,
}) {
  const width = 860;
  const height = 340;
  const padLeft = 64;
  const padRight = 34;
  const padTop = 36;
  const padBottom = 54;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const validValues = useMemo(() => {
    return series
      .filter((pt) => pt.has_data && pt.cases !== null && pt.cases !== undefined)
      .map((pt) => Number(pt.cases));
  }, [series]);

  const yMax = useMemo(() => {
    const rawMax = validValues.length > 0 ? Math.max(...validValues) : 10;
    if (rawMax <= 5) return 5;
    if (rawMax <= 10) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const step = magnitude / 2;
    return Math.ceil((rawMax * 1.12) / step) * step;
  }, [validValues]);

  const yTicks = useMemo(() => {
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round((yMax / count) * i));
    }
    return [...new Set(ticks)];
  }, [yMax]);

  const getX = useCallback(
    (idx) => {
      if (series.length <= 1) return padLeft + plotW / 2;
      return padLeft + (idx / (series.length - 1)) * plotW;
    },
    [series.length, plotW]
  );

  const getY = useCallback(
    (cases) => {
      const val = Math.max(0, Number(cases) || 0);
      return padTop + plotH - (val / (yMax || 1)) * plotH;
    },
    [plotH, yMax]
  );

  // Build segments:
  // 1. Official/Standard continuous segments (only connect consecutive points where has_data=true and !is_partial)
  // 2. Partial/Simulation segment in annual view (dashed line from last full year to partial year)
  const { solidSegments, dashedSegments, plottedPoints } = useMemo(() => {
    const solids = [];
    const dashed = [];
    const pts = [];

    let currentSegment = [];

    series.forEach((item, idx) => {
      const x = getX(idx);
      const hasVal = Boolean(item.has_data && item.cases !== null && item.cases !== undefined);
      const y = hasVal ? getY(item.cases) : null;

      pts.push({
        ...item,
        index: idx,
        x,
        y,
        hasVal,
      });

      if (!hasVal) {
        if (currentSegment.length > 1) {
          solids.push(currentSegment);
        }
        currentSegment = [];
        return;
      }

      if (granularity === 'annual' && item.is_partial) {
        if (currentSegment.length > 0) {
          const prevPt = currentSegment[currentSegment.length - 1];
          dashed.push([prevPt, { x, y, item }]);
          if (currentSegment.length > 1) {
            solids.push(currentSegment);
          }
          currentSegment = [];
        }
      } else {
        currentSegment.push({ x, y, item });
      }
    });

    if (currentSegment.length > 1) {
      solids.push(currentSegment);
    }

    return {
      solidSegments: solids,
      dashedSegments: dashed,
      plottedPoints: pts,
    };
  }, [series, granularity, getX, getY]);

  const activePoint =
    activeIndex !== null && plottedPoints[activeIndex]
      ? plottedPoints[activeIndex]
      : plottedPoints.find((p) => p.hasVal) || plottedPoints[0] || null;

  return (
    <div className="space-y-3">
      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          data-testid="trend-line-chart"
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[580px] select-none"
          role="img"
          aria-label={`Grafik garis tren kasus DBD ${scopeName}`}
        >
          {/* Y-Axis Unit Label */}
          <text
            data-testid="trend-y-axis-unit"
            x={padLeft - 10}
            y={18}
            textAnchor="end"
            className="fill-slate-500 text-[11px] font-bold"
          >
            Kasus
          </text>

          {/* Horizontal Gridlines & Y-Axis Ticks */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={tick === 0 ? '#cbd5e1' : '#f1f5f9'}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-semibold"
                >
                  {tick.toLocaleString('id-ID')}
                </text>
              </g>
            );
          })}

          {/* Shaded Gap Columns for Missing Data Points (e.g. Unavailable Months) */}
          {plottedPoints.map((pt) => {
            if (pt.hasVal) return null;
            const colW = Math.min(44, plotW / Math.max(series.length, 1) - 6);
            return (
              <g key={`gap-${pt.key}`}>
                <rect
                  data-testid={`trend-gap-slot-${pt.key}`}
                  x={pt.x - colW / 2}
                  y={padTop}
                  width={colW}
                  height={plotH}
                  rx={6}
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={pt.x}
                  y={padTop + plotH / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 ${pt.x} ${padTop + plotH / 2})`}
                  className="fill-slate-400 text-[9.5px] font-semibold uppercase tracking-wider"
                >
                  Belum Tersedia
                </text>
              </g>
            );
          })}

          {/* Active Point Vertical Guide Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + plotH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* Solid Line Segments (Verified Annual or Continuous Available Months) */}
          {solidSegments.map((seg, sIdx) => {
            const d = seg
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={`solid-seg-${sIdx}`}
                data-testid="trend-solid-path"
                d={d}
                fill="none"
                stroke="#e11d48"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Dashed Line Segments (Partial / Simulation Year 2026) */}
          {dashedSegments.map((seg, dIdx) => {
            const d = seg
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={`dashed-seg-${dIdx}`}
                data-testid="trend-dashed-partial-path"
                d={d}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.75"
                strokeDasharray="6 5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Data Points & X-Axis Labels */}
          {plottedPoints.map((pt) => {
            const isSelected = activePoint && activePoint.index === pt.index;
            const xLabel =
              granularity === 'monthly' ? pt.short_label || pt.label : pt.label;

            return (
              <g
                key={pt.key}
                data-testid={`trend-point-${pt.key}`}
                data-has-data={String(pt.hasVal)}
                data-cases={pt.hasVal ? String(pt.cases) : 'null'}
                data-partial={String(Boolean(pt.is_partial))}
                onClick={() => onSelectIndex(pt.index)}
                onMouseEnter={() => onSelectIndex(pt.index)}
                className="cursor-pointer"
              >
                {/* Invisible wider hit area for comfortable hover/tap */}
                <rect
                  x={pt.x - plotW / Math.max(series.length * 2, 4)}
                  y={padTop}
                  width={plotW / Math.max(series.length, 2)}
                  height={plotH + padBottom}
                  fill="transparent"
                />

                {/* Point Marker when data exists */}
                {pt.hasVal && (
                  <>
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={9}
                        fill={pt.is_partial || pt.is_simulation ? '#fef3c7' : '#ffe4e6'}
                        stroke={pt.is_partial || pt.is_simulation ? '#d97706' : '#e11d48'}
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.5 : 4.5}
                      fill={pt.is_partial ? '#fffbeb' : '#ffffff'}
                      stroke={pt.is_partial ? '#d97706' : '#e11d48'}
                      strokeWidth="2.75"
                    />
                    {/* Value Label directly above point */}
                    <text
                      x={pt.x}
                      y={Math.max(15, pt.y - 12)}
                      textAnchor="middle"
                      className={`text-[11px] font-extrabold ${pt.is_partial ? 'fill-amber-700' : 'fill-slate-800'
                        }`}
                    >
                      {pt.cases}
                    </text>

                    {/* Partial Year Badge Annotation on Chart */}
                    {pt.is_partial && (
                      <text
                        data-testid="trend-partial-annotation"
                        x={pt.x - 6}
                        y={Math.min(padTop + plotH - 8, pt.y + 18)}
                        textAnchor="end"
                        className="fill-amber-700 text-[10px] font-bold"
                      >
                        Parsial (3 Bln)
                      </text>
                    )}
                  </>
                )}

                {/* X-Axis Tick Label */}
                <text
                  x={pt.x}
                  y={padTop + plotH + 22}
                  textAnchor="middle"
                  className={`text-[11px] ${isSelected
                    ? 'fill-slate-950 font-extrabold'
                    : pt.hasVal
                      ? 'fill-slate-700 font-bold'
                      : 'fill-slate-400 font-medium'
                    }`}
                >
                  {xLabel}
                </text>
              </g>
            );
          })}

          {/* X-Axis Title */}
          <text
            data-testid="trend-x-axis-title"
            x={padLeft + plotW / 2}
            y={height - 8}
            textAnchor="middle"
            className="fill-slate-500 text-[11px] font-bold uppercase tracking-wider"
          >
            {granularity === 'annual' ? 'Tahun Pemantauan (2022–2026)' : 'Bulan (Januari–Desember)'}
          </text>
        </svg>
      </div>

      {/* Interactive Selected Point Tooltip / Inspector Bar */}
      {activePoint && (
        <div
          data-testid="trend-chart-tooltip"
          className="bg-slate-50/90 rounded-xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="tooltip-period-label"
                className="text-xs font-extrabold text-slate-900"
              >
                {granularity === 'annual'
                  ? `Tahun ${activePoint.year}`
                  : `Bulan ${activePoint.label} ${activePoint.year}`}
              </span>
              <span
                data-testid="tooltip-status-badge"
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${!activePoint.hasVal
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : activePoint.is_partial || activePoint.is_simulation
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
              >
                {activePoint.status_label}
              </span>
            </div>
            <div
              data-testid="tooltip-coverage-label"
              className="text-[11px] text-slate-600 font-medium"
            >
              Cakupan: {activePoint.coverage_label}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Jumlah Kasus DBD
              </span>
              <span
                data-testid="tooltip-cases-value"
                className={`text-base sm:text-lg font-black ${!activePoint.hasVal
                  ? 'text-slate-400 text-xs font-bold'
                  : activePoint.is_partial
                    ? 'text-amber-700'
                    : 'text-rose-600'
                  }`}
              >
                {activePoint.hasVal ? `${activePoint.cases} Kasus` : 'Data Belum Tersedia'}
              </span>
            </div>

            {(activePoint.yoy_label || activePoint.mom_label) && (
              <div className="text-left sm:text-right border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Perubahan Periode Sebelumnya
                </span>
                <span
                  data-testid="tooltip-change-label"
                  className="text-xs font-bold text-slate-700"
                >
                  {activePoint.yoy_label || activePoint.mom_label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicTrendPage() {
  const [granularity, setGranularity] = useState('annual'); // 'annual' | 'monthly'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');

  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePointIdx, setActivePointIdx] = useState(0);

  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchTrends = useCallback(async (gran, yr, kec) => {
    const currentReqId = ++requestCounterRef.current;
    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await axios.get('/api/public/trends', {
        params: {
          granularity: gran,
          year: yr,
          kecamatan_id: kec,
        },
        signal: abortControllerRef.current.signal,
      });

      if (currentReqId !== requestCounterRef.current) {
        return;
      }

      if (res.data?.success) {
        setTrendData(res.data);
        const firstValidIdx = (res.data.series || []).findIndex((s) => s.has_data);
        setActivePointIdx(firstValidIdx >= 0 ? firstValidIdx : 0);
      } else {
        setError(res.data?.message || 'Gagal memuat data grafik tren.');
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      if (currentReqId === requestCounterRef.current) {
        setError('Gagal memuat data grafik tren. Pastikan server aktif dan coba lagi.');
      }
    } finally {
      if (currentReqId === requestCounterRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTrends('annual', 2026, 'all');
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrends]);

  const handleGranularityChange = (nextGran) => {
    setGranularity(nextGran);
    fetchTrends(nextGran, selectedYear, selectedKecamatan);
  };

  const handleYearChange = (e) => {
    const nextYr = parseInt(e.target.value, 10);
    setSelectedYear(nextYr);
    fetchTrends(granularity, nextYr, selectedKecamatan);
  };

  const handleKecamatanChange = (e) => {
    const nextKec = e.target.value;
    setSelectedKecamatan(nextKec);
    fetchTrends(granularity, selectedYear, nextKec);
  };

  const availableYears = trendData?.available_years || [2022, 2023, 2024, 2025, 2026];
  const subdistricts = trendData?.subdistricts || [];
  const summary = trendData?.summary;
  const series = trendData?.series || [];

  return (
    <div className="min-h-dvh bg-[#fbfbfa] text-[#17221e] flex flex-col pb-12">
      {/* HEADER */}
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
              <span className="text-[#17221e] font-semibold">Grafik Tren</span>
            </div>
            <h1
              data-testid="trend-page-title"
              className="text-xl sm:text-2xl font-bold text-[#17221e] tracking-tight"
            >
              Tren Kasus DBD Kabupaten Banyumas
            </h1>
            <p className="text-xs text-[#4e6057] max-w-2xl">
              Visualisasi interaktif perkembangan jumlah kasus Demam Berdarah Dengue lintas tahun (2022–2026) dan lintas bulan (Januari–Desember).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center bg-[#f0f6f4] p-1 rounded-md border border-[#dbe4df]">
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
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#123027] text-white">
                Grafik Tren
              </span>
              <Link
                to="/metadata"
                data-testid="nav-to-metadata-page"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Metadata
              </Link>
              <Link
                to="/edukasi"
                data-testid="nav-to-education-page"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Edukasi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
        {/* FILTER & CONTROL BAR */}
        <div
          data-testid="trend-filter-bar"
          className="bg-white rounded-lg border border-[#e2e8e5] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          {/* Left: Granularity Toggle & Year Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-[#f0f6f4] p-1 rounded-md border border-[#dbe4df]">
              <button
                type="button"
                data-testid="trend-granularity-annual"
                onClick={() => handleGranularityChange('annual')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${granularity === 'annual'
                  ? 'bg-[#123027] text-white'
                  : 'text-[#4e6057] hover:text-[#17221e]'
                  }`}
              >
                Tren Tahunan (2022–2026)
              </button>
              <button
                type="button"
                data-testid="trend-granularity-monthly"
                onClick={() => handleGranularityChange('monthly')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${granularity === 'monthly'
                  ? 'bg-[#123027] text-white'
                  : 'text-[#4e6057] hover:text-[#17221e]'
                  }`}
              >
                Tren Bulanan (Jan–Des)
              </button>
            </div>

            {granularity === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-[#f0f6f4] rounded-md px-2.5 py-1.5 border border-[#dbe4df]">
                <Calendar className="w-3.5 h-3.5 text-[#123027]" />
                <label
                  htmlFor="trend-filter-year"
                  className="text-xs font-semibold text-[#123027]"
                >
                  Tahun
                </label>
                <select
                  id="trend-filter-year"
                  data-testid="trend-filter-year"
                  aria-label="Pilih Tahun Tren Bulanan"
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-md px-2 py-0.5 text-slate-800 focus:outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: Subdistrict Filter (Kabupaten vs 27 Kecamatan) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label
                htmlFor="trend-filter-kecamatan"
                className="text-[11px] font-bold text-slate-500 uppercase shrink-0"
              >
                Wilayah
              </label>
              <select
                id="trend-filter-kecamatan"
                data-testid="trend-filter-kecamatan"
                aria-label="Pilih Wilayah Kecamatan"
                value={selectedKecamatan}
                onChange={handleKecamatanChange}
                className="text-xs font-bold bg-white border border-slate-300 rounded-md px-2 py-0.5 text-slate-800 focus:outline-none cursor-pointer max-w-[230px]"
              >
                <option value="all">Seluruh Kabupaten Banyumas</option>
                {subdistricts.map((k) => (
                  <option key={k.code} value={k.code}>
                    Kec. {k.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-2">
            <ShieldAlert className="w-6 h-6 text-red-600 mx-auto" />
            <div className="text-sm font-bold text-red-900">{error}</div>
            <button
              type="button"
              onClick={() => fetchTrends(granularity, selectedYear, selectedKecamatan)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* SUMMARY KPI STRIP */}
        {trendData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Active Scope & Period Coverage */}
            <div className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between">
              <span className="text-xs font-semibold text-[#4e6057]">
                Wilayah & Cakupan Tren
              </span>
              <div
                data-testid="trend-scope-name"
                className="text-base sm:text-lg font-bold text-[#17221e] mt-1"
              >
                {trendData.scope?.name}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1">
                {granularity === 'annual'
                  ? `${summary?.verified_years_count ?? 4} Tahun Penuh Terverifikasi + 2026 Parsial`
                  : summary?.coverage_range}
              </div>
            </div>

            {/* Card 2: Peak Period */}
            <div className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between">
              <span className="text-xs font-semibold text-[#4e6057]">
                {granularity === 'annual'
                  ? 'Puncak Kasus Tahunan (Tahun Penuh)'
                  : `Puncak Kasus Bulanan (${selectedYear})`}
              </span>
              <div
                data-testid="trend-peak-cases"
                className="text-xl sm:text-2xl font-bold text-[#b91c1c] mt-1 tabular-nums"
              >
                {trendData.has_data && summary?.peak_cases !== null ? (
                  <>
                    {summary.peak_cases}{' '}
                    <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-[#7d8f87]">Belum tersedia</span>
                )}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1">
                {trendData.has_data
                  ? granularity === 'annual'
                    ? `Tertinggi pada Tahun ${summary?.peak_year || '-'}`
                    : `Tertinggi pada Bulan ${summary?.peak_month || '-'}`
                  : 'Rincian periode belum tersedia'}
              </div>
            </div>

            {/* Card 3: Latest Full Year / Available Months Total */}
            <div className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between">
              <span className="text-xs font-semibold text-[#4e6057]">
                {granularity === 'annual'
                  ? `Tahun Penuh Terakhir (${summary?.latest_full_year || 2025})`
                  : `Total Bulan Tersedia (${selectedYear})`}
              </span>
              <div
                data-testid="trend-latest-total"
                className="text-xl sm:text-2xl font-bold text-[#17221e] mt-1 tabular-nums"
              >
                {granularity === 'annual' ? (
                  summary?.latest_full_year_cases !== null ? (
                    <>
                      {summary.latest_full_year_cases}{' '}
                      <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-[#7d8f87]">Belum tersedia</span>
                  )
                ) : summary?.total_cases_available_months !== null ? (
                  <>
                    {summary.total_cases_available_months}{' '}
                    <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-[#b45309]">
                    Rincian bulanan tidak tersedia
                  </span>
                )}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1">
                {granularity === 'annual'
                  ? summary?.latest_yoy_label
                    ? `Perubahan 2024→2025: ${summary.latest_yoy_label} • 2026* Parsial: ${summary.partial_cases ?? '-'} Kasus`
                    : `2026* Parsial: ${summary?.partial_cases ?? '-'} Kasus`
                  : trendData.has_data
                    ? `Tersedia ${summary?.available_months_count} dari 12 bulan`
                    : 'Hanya tersedia agregat tahunan'}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CHART CARD OR EMPTY STATE */}
        <div className="bg-white rounded-lg border border-[#e2e8e5] p-4 sm:p-5 space-y-4">
          {/* Chart Header & Visual Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e2e8e5] pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#17221e] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#123027]" />
                <span>
                  {granularity === 'annual'
                    ? 'Grafik Garis Tren Tahunan (2022–2026)'
                    : `Grafik Garis Tren Bulanan Tahun ${selectedYear} (Januari–Desember)`}
                </span>
              </h2>
              <p className="text-xs text-[#4e6057] mt-0.5">{trendData?.message}</p>
            </div>

            {/* Line Style Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#4e6057] shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#123027] inline-block rounded-full"></span>
                <span>
                  {granularity === 'annual'
                    ? 'Tahun Penuh Terverifikasi (2022–2025)'
                    : 'Bulan Tersedia'}
                </span>
              </span>
              {granularity === 'annual' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-[#b45309] inline-block"></span>
                  <span>2026* Parsial (Simulasi)</span>
                </span>
              )}
              {granularity === 'monthly' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#f3f6f4] border border-dashed border-[#c5d1cb] inline-block"></span>
                  <span>Gap: Data Belum Tersedia</span>
                </span>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && !trendData && (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-[#7d8f87] animate-spin mx-auto" />
              <div className="text-xs font-medium text-[#4e6057]">
                Memuat deret waktu kasus DBD...
              </div>
            </div>
          )}

          {/* EMPTY STATE when monthly breakdown is unavailable (e.g. 2022-2025 monthly view) */}
          {trendData && !trendData.has_data && (
            <div
              data-testid="trend-empty-state"
              className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-6 text-center space-y-3"
            >
              <AlertTriangle className="w-8 h-8 text-[#b45309] mx-auto" />
              <div className="space-y-1 max-w-lg mx-auto">
                <h3 className="text-sm font-bold text-[#78350f]">
                  {trendData.reason === 'annual_only'
                    ? `Rincian Data Bulanan Tahun ${selectedYear} Belum Tersedia`
                    : 'Data Tren Belum Tersedia'}
                </h3>
                <p className="text-xs text-[#92400e] leading-relaxed">
                  {trendData.message}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="empty-switch-to-annual-btn"
                  onClick={() => handleGranularityChange('annual')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#123027] hover:bg-[#194337] text-white transition-colors cursor-pointer"
                >
                  <span>Lihat Tren Tahunan (2022–2026)</span>
                </button>
                <button
                  type="button"
                  data-testid="empty-switch-to-2026-btn"
                  onClick={() => {
                    setSelectedYear(2026);
                    fetchTrends('monthly', 2026, selectedKecamatan);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-[#c5d1cb] hover:bg-[#f3f6f4] text-[#17221e] transition-colors cursor-pointer"
                >
                  <span>Lihat Tren Bulanan 2026</span>
                </button>
              </div>
            </div>
          )}

          {/* INTERACTIVE SVG LINE CHART */}
          {trendData && trendData.has_data && (
            <InteractiveTrendLineChart
              series={series}
              granularity={granularity}
              activeIndex={activePointIdx}
              onSelectIndex={setActivePointIdx}
              scopeName={trendData.scope?.name}
            />
          )}

          {/* PARTIAL / COVERAGE NOTE & SOURCE METADATA */}
          {trendData && (
            <div
              data-testid="trend-source-status"
              className="pt-3 border-t border-[#e2e8e5] grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-[#4e6057]"
            >
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-[#123027] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#17221e] block">Sumber & Status Dataset:</span>
                  {granularity === 'annual' ? (
                    <span>
                      <strong>2022–2025 (Resmi Terverifikasi):</strong>{' '}
                      {trendData.metadata?.source_official}.{' '}
                      <strong>2026* (Parsial Simulasi):</strong>{' '}
                      {trendData.metadata?.source_partial}.
                    </span>
                  ) : (
                    <span>
                      <strong>{trendData.metadata?.status}:</strong> {trendData.metadata?.source}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#17221e] block">
                    Keterangan Cakupan & Validitas Perbandingan:
                  </span>
                  <span>{trendData.metadata?.completeness_note}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PERIOD SERIES TABLE FOR TRANSPARENCY & EXACT VERIFICATION */}
        {trendData && (
          <div className="bg-white rounded-lg border border-[#e2e8e5] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8e5] flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#17221e]">
                Rincian Angka Deret Waktu ({trendData.scope?.name})
              </h3>
              <span className="text-xs text-[#7d8f87]">
                Satuan: <strong className="text-[#17221e]">Kasus DBD</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table
                data-testid="trend-series-table"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  <tr className="bg-[#f8faf9] border-b border-[#e2e8e5] text-xs font-semibold text-[#4e6057]">
                    <th className="py-2.5 px-4">
                      {granularity === 'annual' ? 'Tahun' : 'Bulan'}
                    </th>
                    <th className="py-2.5 px-4 text-right">Jumlah Kasus</th>
                    <th className="py-2.5 px-4">Cakupan Periode</th>
                    <th className="py-2.5 px-4">Status Data</th>
                    <th className="py-2.5 px-4 text-right">Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {series.map((row, idx) => (
                    <tr
                      key={row.key}
                      data-testid={`trend-table-row-${row.key}`}
                      onClick={() => setActivePointIdx(idx)}
                      className={`cursor-pointer transition-colors ${activePointIdx === idx ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                        }`}
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.label}</td>
                      <td
                        data-testid={`trend-table-cases-${row.key}`}
                        className="py-2.5 px-4 text-right font-extrabold"
                      >
                        {row.has_data && row.cases !== null ? (
                          <span className={row.is_partial ? 'text-amber-700' : 'text-slate-900'}>
                            {row.cases} Kasus
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">
                            Data Belum Tersedia
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{row.coverage_label}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${!row.has_data
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : row.is_partial || row.is_simulation
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                          {row.status_label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-600">
                        {row.yoy_label || row.mom_label || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
