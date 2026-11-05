import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  RotateCcw,
  LayoutDashboard,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Database,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from 'lucide-react';
import {
  MONTH_OPTIONS,
  BANYUMAS_CENTER,
  DEFAULT_ZOOM,
  CHOROPLETH_CLASSIFICATION,
  getColor,
  escapeHtml,
  buildDistrictPopupHtml,
  MapController,
} from './PublicMapPage';

/**
 * Reusable Choropleth Map Panel for Period A and Period B.
 * Uses the exact same GeoJSON, classification thresholds, tooltip, and popup builder as PublicMapPage.
 */
function ComparisonMapPanel({
  panelKey,
  badgeLabel,
  periodData,
  selectedYear,
  selectedMonth,
  selectedMonthLabel,
  geojsonData,
  resetTrigger,
  loading,
}) {
  const geojsonLayerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const districtMap = useMemo(() => {
    const map = new Map();
    if (periodData && Array.isArray(periodData.districts)) {
      periodData.districts.forEach((d) => {
        if (d.code) map.set(d.code, d);
        if (d.name) map.set(d.name.toLowerCase().replace(/\s+/g, ''), d);
      });
    }
    return map;
  }, [periodData]);

  useEffect(() => {
    if (mapInstance) {
      mapInstance.closePopup();
    }
    setSelectedDistrict(null);
  }, [selectedYear, selectedMonth, resetTrigger, mapInstance]);

  const styleFeature = useCallback(
    (feature) => {
      const code = feature.properties?.kode_kecamatan;
      const name = feature.properties?.nama_kecamatan;
      const nameKey = name ? name.toLowerCase().replace(/\s+/g, '') : '';

      const stats = districtMap.get(code) || districtMap.get(nameKey);
      const hasData = Boolean(periodData?.has_data && stats && stats.has_data);
      const cases = hasData ? stats.cases : null;
      const isSelected = selectedDistrict && selectedDistrict.code === code;

      return {
        fillColor: getColor(cases, hasData),
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        color: isSelected ? '#0f172a' : '#475569',
        dashArray: '',
        fillOpacity: isSelected ? 0.9 : 0.78,
      };
    },
    [districtMap, periodData, selectedDistrict]
  );

  useEffect(() => {
    if (geojsonLayerRef.current && geojsonLayerRef.current.setStyle) {
      geojsonLayerRef.current.setStyle(styleFeature);
    }
  }, [styleFeature]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const code = feature.properties?.kode_kecamatan;
      const name = feature.properties?.nama_kecamatan || 'Kecamatan';
      const nameKey = name.toLowerCase().replace(/\s+/g, '');
      const stats = districtMap.get(code) || districtMap.get(nameKey);

      const isAnnualOnlyEmpty = periodData?.reason === 'annual_only';
      const hasData = Boolean(
        periodData?.has_data &&
        stats &&
        stats.has_data &&
        stats.cases !== null &&
        stats.cases !== undefined
      );
      const cases = hasData
        ? stats.cases
        : isAnnualOnlyEmpty
          ? 'Rincian bulanan tidak tersedia'
          : 'Belum tersedia';
      const priorityLabel = hasData
        ? stats.priority_status
        : isAnnualOnlyEmpty
          ? 'Rincian bulanan tidak tersedia'
          : 'Data Belum Tersedia';
      const isPriority = Boolean(hasData && stats?.is_priority);

      const tooltipContent = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px; font-size: 13px;">
            Kecamatan ${escapeHtml(name)}
          </div>
          <div style="color: #475569; display: flex; justify-content: space-between; gap: 8px;">
            <span>Jumlah Kasus:</span>
            <strong style="color: ${typeof cases === 'number' && cases >= 10 ? '#dc2626' : '#0f172a'};">${escapeHtml(cases)} ${typeof cases === 'number' ? 'Kasus' : ''}</strong>
          </div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: ${isPriority
          ? '#dc2626'
          : typeof cases === 'number' && cases > 0
            ? '#ea580c'
            : '#64748b'
        };">
            ${escapeHtml(priorityLabel)}
          </div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'auto',
        opacity: 0.97,
        className: 'custom-leaflet-tooltip rounded border border-[#c5d1cb]',
      });

      const popupContent = buildDistrictPopupHtml({
        name,
        code,
        stats,
        mapData: periodData,
        selectedYear,
        selectedMonthLabel,
      });

      layer.bindPopup(popupContent, {
        className: 'dbd-district-popup',
        maxWidth: 280,
        minWidth: 235,
        closeButton: true,
        autoPan: true,
        autoPanPaddingTopLeft: L.point(48, 16),
        autoPanPaddingBottomRight: L.point(16, 16),
      });

      layer.on({
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({
            weight: 3,
            color: '#0f172a',
            fillOpacity: 0.9,
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            l.bringToFront();
          }
        },
        mouseout: (e) => {
          if (geojsonLayerRef.current) {
            geojsonLayerRef.current.resetStyle(e.target);
          }
        },
        click: () => {
          if (layer.closeTooltip) {
            layer.closeTooltip();
          }
          setSelectedDistrict(stats || { name, code, has_data: false });
        },
      });
    },
    [districtMap, periodData, selectedYear, selectedMonthLabel]
  );

  const isVerifiedAnnual = periodData?.metadata?.is_simulation === false && periodData?.has_data;
  const periodTitle = useMemo(() => {
    if (periodData?.period?.is_annual) {
      return `${periodData.period.name} (${periodData.period.range})`;
    }
    if (periodData?.period?.is_accumulation) {
      return `Semua Bulan Tersedia ${periodData.period.year} (${periodData.period.range})`;
    }
    if (periodData?.has_data && periodData?.period?.name) {
      return periodData.period.name;
    }
    if (periodData?.reason === 'annual_only') {
      return `${selectedMonthLabel} ${selectedYear} (Rincian bulanan tidak tersedia)`;
    }
    return `${selectedMonthLabel} ${selectedYear} (Data belum tersedia)`;
  }, [periodData, selectedMonthLabel, selectedYear]);

  return (
    <div
      data-testid={`compare-map-card-${panelKey}`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col"
    >
      {/* Map Panel Header */}
      <div className="px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider shrink-0 ${panelKey === 'a'
              ? 'bg-slate-800 text-white'
              : 'bg-rose-600 text-white'
              }`}
          >
            {badgeLabel}
          </span>
          <span
            data-testid={`compare-map-title-${panelKey}`}
            className="text-xs font-bold text-slate-900 truncate"
          >
            {periodTitle}
          </span>
        </div>

        <span
          data-testid={`compare-map-status-${panelKey}`}
          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${!periodData?.has_data
            ? 'bg-slate-100 text-slate-600 border-slate-300'
            : isVerifiedAnnual
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
        >
          {!periodData?.has_data
            ? 'Data Belum Tersedia'
            : isVerifiedAnnual
              ? 'Resmi Terverifikasi'
              : 'Data Simulasi'}
        </span>
      </div>

      {/* Leaflet Map Viewport */}
      <div
        data-testid={`compare-map-viewport-${panelKey}`}
        className="relative w-full h-[380px] sm:h-[430px] lg:h-[460px] bg-slate-100"
      >
        {loading && (
          <div className="absolute top-3 right-3 z-1000 bg-white/95 px-2.5 py-1 rounded-full border border-slate-200 shadow-xs flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <RefreshCw className="w-3 h-3 text-rose-600 animate-spin" />
            <span>Memuat...</span>
          </div>
        )}

        <MapContainer
          center={BANYUMAS_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            maxZoom={18}
          />

          {geojsonData && (
            <GeoJSON
              key={`compare-geojson-${panelKey}-${selectedYear}-${selectedMonth}-${periodData?.has_data ? 'data' : 'nodata'}-${periodData?.summary?.total_cases ?? 'none'}-${resetTrigger}`}
              ref={geojsonLayerRef}
              data={geojsonData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          <MapController
            geojsonData={geojsonData}
            resetTrigger={resetTrigger}
            onMapReady={setMapInstance}
          />
        </MapContainer>
      </div>

      {/* Map Panel Footer Metadata */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div>
          Total:{' '}
          <strong className="text-slate-900">
            {periodData?.has_data && periodData?.summary?.total_cases !== null
              ? `${periodData.summary.total_cases} Kasus`
              : 'Belum Tersedia'}
          </strong>
          {' • '}
          Prioritas (≥10):{' '}
          <strong className="text-red-600">
            {periodData?.has_data ? `${periodData.summary?.priority_count ?? 0} Kec` : '-'}
          </strong>
        </div>
        <div
          data-testid={`compare-map-source-${panelKey}`}
          className="text-[10.5px] text-slate-500 truncate max-w-full sm:max-w-[60%]"
          title={periodData?.metadata?.source || 'Data Belum Tersedia'}
        >
          Sumber: {periodData?.metadata?.source || 'Belum tersedia pada periode ini'}
        </div>
      </div>
    </div>
  );
}

export default function PublicComparePage() {
  // Available periods metadata from /api/public/map/periods
  const [availableYears, setAvailableYears] = useState([2022, 2023, 2024, 2025, 2026]);
  const [yearModes, setYearModes] = useState({});

  // Period A & Period B filter states (Default: Full Year 2024 vs Full Year 2025)
  const [yearA, setYearA] = useState(2024);
  const [monthA, setMonthA] = useState('all');
  const [yearB, setYearB] = useState(2025);
  const [monthB, setMonthB] = useState('all');

  // Comparison API response & GeoJSON state
  const [compareData, setCompareData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Table search & status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef(null);

  const monthALabel = useMemo(() => {
    return (
      MONTH_OPTIONS.find((opt) => String(opt.value) === String(monthA))?.label ||
      'Semua Bulan Tersedia'
    );
  }, [monthA]);

  const monthBLabel = useMemo(() => {
    return (
      MONTH_OPTIONS.find((opt) => String(opt.value) === String(monthB))?.label ||
      'Semua Bulan Tersedia'
    );
  }, [monthB]);

  const fetchComparisonData = useCallback(async (yrA, mnA, yrB, mnB) => {
    const currentReqId = ++requestCounterRef.current;
    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await axios.get('/api/public/compare', {
        params: {
          year_a: yrA,
          month_a: mnA,
          year_b: yrB,
          month_b: mnB,
        },
        signal: abortControllerRef.current.signal,
      });

      if (currentReqId !== requestCounterRef.current) {
        return;
      }

      if (res.data?.success) {
        setCompareData(res.data);
      } else {
        setError(res.data?.message || 'Gagal memuat data perbandingan periode.');
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      if (currentReqId === requestCounterRef.current) {
        setError('Gagal memuat data perbandingan periode. Pastikan server aktif dan coba lagi.');
      }
    } finally {
      if (currentReqId === requestCounterRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load: fetch periods metadata, GeoJSON, and default comparison (2024 vs 2025)
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [periodsRes, geoRes] = await Promise.all([
          axios.get('/api/public/map/periods'),
          axios.get('/geojson/banyumas_27_kecamatan.geojson'),
        ]);

        if (isMounted && periodsRes.data?.success) {
          if (Array.isArray(periodsRes.data.years) && periodsRes.data.years.length > 0) {
            setAvailableYears(periodsRes.data.years);
          }
          if (periodsRes.data.year_modes) {
            setYearModes(periodsRes.data.year_modes);
          }
        }

        if (isMounted && geoRes.data) {
          setGeojsonData(geoRes.data);
        }
      } catch (err) {
        console.error('Compare page initialization error:', err);
      }
    }

    init();
    fetchComparisonData(2024, 'all', 2025, 'all');

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchComparisonData]);

  // Handlers for Period A & Period B changes
  const handleYearAChange = (e) => {
    const nextYear = parseInt(e.target.value, 10);
    setYearA(nextYear);
    const mode = yearModes[nextYear];
    const isAnnualOnly = mode ? !mode.has_monthly : nextYear < 2026;
    const nextMonth = isAnnualOnly ? 'all' : monthA;
    if (isAnnualOnly && monthA !== 'all') {
      setMonthA('all');
    }
    fetchComparisonData(nextYear, nextMonth, yearB, monthB);
  };

  const handleMonthAChange = (e) => {
    const nextMonth = String(e.target.value);
    setMonthA(nextMonth);
    fetchComparisonData(yearA, nextMonth, yearB, monthB);
  };

  const handleYearBChange = (e) => {
    const nextYear = parseInt(e.target.value, 10);
    setYearB(nextYear);
    const mode = yearModes[nextYear];
    const isAnnualOnly = mode ? !mode.has_monthly : nextYear < 2026;
    const nextMonth = isAnnualOnly ? 'all' : monthB;
    if (isAnnualOnly && monthB !== 'all') {
      setMonthB('all');
    }
    fetchComparisonData(yearA, monthA, nextYear, nextMonth);
  };

  const handleMonthBChange = (e) => {
    const nextMonth = String(e.target.value);
    setMonthB(nextMonth);
    fetchComparisonData(yearA, monthA, yearB, nextMonth);
  };

  const handleSwapPeriods = () => {
    const nextYrA = yearB;
    const nextMnA = monthB;
    const nextYrB = yearA;
    const nextMnB = monthA;
    setYearA(nextYrA);
    setMonthA(nextMnA);
    setYearB(nextYrB);
    setMonthB(nextMnB);
    fetchComparisonData(nextYrA, nextMnA, nextYrB, nextMnB);
  };

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  const periodA = compareData?.period_a;
  const periodB = compareData?.period_b;
  const comparability = compareData?.comparability;
  const summary = compareData?.comparison?.summary;
  const isComparable = Boolean(compareData?.comparison?.is_comparable);

  // Filtered 27 subdistrict comparison rows
  const filteredDistricts = useMemo(() => {
    const list = compareData?.comparison?.districts || [];
    return list.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'incomparable'
            ? !item.comparable
            : item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [compareData, searchQuery, statusFilter]);

  return (
    <div className="min-h-dvh bg-[#fbfbfa] text-[#17221e] flex flex-col pb-12">
      {/* HEADER SECTION */}
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
              <span className="text-[#17221e] font-semibold">Perbandingan Periode</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17221e] tracking-tight">
              Perbandingan Spasial-Temporal Kasus DBD Banyumas
            </h1>
            <p className="text-xs text-[#4e6057] max-w-2xl">
              Bandingkan persebaran choropleth dan perubahan jumlah kasus DBD antar dua periode di 27 kecamatan Kabupaten Banyumas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center bg-[#f0f6f4] p-1 rounded-md border border-[#dbe4df]">
              <Link
                to="/peta"
                data-testid="nav-to-single-map"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Peta Tunggal
              </Link>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#123027] text-white">
                Perbandingan
              </span>
              <Link
                to="/tren"
                data-testid="nav-to-trend-page"
                className="px-2.5 py-1 rounded text-xs font-medium text-[#4e6057] hover:text-[#17221e] transition-colors"
              >
                Grafik Tren
              </Link>
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
        {/* PERIOD A & PERIOD B FILTER BAR */}
        <div
          data-testid="compare-filter-bar"
          className="bg-white rounded-lg border border-[#e2e8e5] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
            {/* PERIODE A SELECTOR */}
            <div className="bg-[#f8faf9] rounded-md border border-[#e2e8e5] p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#123027] text-white">
                  Periode A
                </span>
                <span className="text-xs font-semibold text-[#4e6057]">Periode Dasar (Awal)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-[#c5d1cb]">
                  <Calendar className="w-3 h-3 text-[#4e6057]" />
                  <label htmlFor="compare-year-a" className="sr-only">
                    Tahun Periode A
                  </label>
                  <select
                    id="compare-year-a"
                    data-testid="compare-year-a"
                    aria-label="Tahun Periode A"
                    value={yearA}
                    onChange={handleYearAChange}
                    className="text-xs font-bold text-[#17221e] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-[#c5d1cb]">
                  <label htmlFor="compare-month-a" className="sr-only">
                    Bulan Periode A
                  </label>
                  <select
                    id="compare-month-a"
                    data-testid="compare-month-a"
                    aria-label="Bulan Periode A"
                    value={monthA}
                    onChange={handleMonthAChange}
                    className="text-xs font-semibold text-[#17221e] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {MONTH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* PERIODE B SELECTOR */}
            <div className="bg-[#f8faf9] rounded-md border border-[#e2e8e5] p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#b91c1c] text-white">
                  Periode B
                </span>
                <span className="text-xs font-semibold text-[#4e6057]">Periode Pembanding</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-[#c5d1cb]">
                  <Calendar className="w-3 h-3 text-[#4e6057]" />
                  <label htmlFor="compare-year-b" className="sr-only">
                    Tahun Periode B
                  </label>
                  <select
                    id="compare-year-b"
                    data-testid="compare-year-b"
                    aria-label="Tahun Periode B"
                    value={yearB}
                    onChange={handleYearBChange}
                    className="text-xs font-bold text-[#17221e] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-[#c5d1cb]">
                  <label htmlFor="compare-month-b" className="sr-only">
                    Bulan Periode B
                  </label>
                  <select
                    id="compare-month-b"
                    data-testid="compare-month-b"
                    aria-label="Bulan Periode B"
                    value={monthB}
                    onChange={handleMonthBChange}
                    className="text-xs font-semibold text-[#17221e] bg-transparent focus:outline-none cursor-pointer"
                  >
                    {MONTH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Swap A <-> B & Reset Maps */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="compare-swap-btn"
              onClick={handleSwapPeriods}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
              title="Tukar Periode A dan Periode B"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Tukar A ↔ B</span>
            </button>

            <button
              type="button"
              data-testid="compare-reset-map-btn"
              onClick={handleResetView}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Kembalikan fokus kedua peta"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Peta</span>
            </button>
          </div>
        </div>

        {/* COMPARABILITY & EQUALITY VALIDATION BANNER */}
        {comparability && (
          <div
            data-testid="comparability-banner"
            data-comparable={String(comparability.is_comparable)}
            data-status={comparability.status}
            className={`rounded-xl border px-4 py-3 flex items-start gap-3 shadow-2xs ${comparability.is_comparable
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950'
              }`}
          >
            {comparability.is_comparable ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-0.5">
              <div data-testid="comparability-title" className="font-bold">
                {comparability.title}
              </div>
              <p data-testid="comparability-message" className="leading-relaxed opacity-90">
                {comparability.message}
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-2">
            <ShieldAlert className="w-6 h-6 text-red-600 mx-auto" />
            <div className="text-sm font-bold text-red-900">{error}</div>
            <button
              type="button"
              onClick={() => fetchComparisonData(yearA, monthA, yearB, monthB)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* SUMMARY COMPARISON KPI CARDS */}
        {compareData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Cases Period A */}
            <div
              data-testid="compare-card-cases-a"
              className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4e6057]">
                  Total Kasus Periode A
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#123027] text-white">
                  A
                </span>
              </div>
              <div
                data-testid="compare-total-a"
                className="text-xl sm:text-2xl font-bold text-[#17221e] mt-1.5 tabular-nums"
              >
                {periodA?.has_data && summary?.cases_a !== null ? (
                  <>
                    {summary.cases_a}{' '}
                    <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                  </>
                ) : periodA?.reason === 'annual_only' ? (
                  <span className="text-[#b45309] text-xs sm:text-sm font-semibold">
                    Rincian bulanan tidak tersedia
                  </span>
                ) : (
                  <span className="text-[#7d8f87] text-sm font-semibold">Data belum tersedia</span>
                )}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1 truncate">
                {comparability?.label_a}
              </div>
            </div>

            {/* Card 2: Total Cases Period B */}
            <div
              data-testid="compare-card-cases-b"
              className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4e6057]">
                  Total Kasus Periode B
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#b91c1c] text-white">
                  B
                </span>
              </div>
              <div
                data-testid="compare-total-b"
                className="text-xl sm:text-2xl font-bold text-[#17221e] mt-1.5 tabular-nums"
              >
                {periodB?.has_data && summary?.cases_b !== null ? (
                  <>
                    {summary.cases_b}{' '}
                    <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                  </>
                ) : periodB?.reason === 'annual_only' ? (
                  <span className="text-[#b45309] text-xs sm:text-sm font-semibold">
                    Rincian bulanan tidak tersedia
                  </span>
                ) : (
                  <span className="text-[#7d8f87] text-sm font-semibold">Data belum tersedia</span>
                )}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1 truncate">
                {comparability?.label_b}
              </div>
            </div>

            {/* Card 3: Absolute Difference (B - A) */}
            <div
              data-testid="compare-card-diff"
              className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4e6057]">
                  Selisih Absolut (B − A)
                </span>
                {isComparable && summary?.diff_cases !== null && (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${summary.diff_cases > 0
                      ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                      : summary.diff_cases < 0
                        ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                        : 'bg-[#f8faf9] text-[#17221e] border-[#e2e8e5]'
                      }`}
                  >
                    {summary.status_label}
                  </span>
                )}
              </div>
              <div
                data-testid="compare-diff-value"
                className={`text-xl sm:text-2xl font-bold mt-1.5 tabular-nums ${!isComparable || summary?.diff_cases === null
                  ? 'text-[#7d8f87] text-sm font-semibold'
                  : summary.diff_cases > 0
                    ? 'text-[#b91c1c]'
                    : summary.diff_cases < 0
                      ? 'text-[#15803d]'
                      : 'text-[#17221e]'
                  }`}
              >
                {isComparable && summary?.diff_cases !== null ? (
                  <>
                    {summary.diff_cases > 0 ? `+${summary.diff_cases}` : summary.diff_cases}{' '}
                    <span className="text-xs font-normal text-[#7d8f87]">Kasus</span>
                  </>
                ) : (
                  <span>{summary?.status_label || 'Tidak dapat dibandingkan'}</span>
                )}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1">
                {isComparable
                  ? `Naik: ${summary?.increased_subdistricts ?? 0} • Turun: ${summary?.decreased_subdistricts ?? 0} • Tetap: ${summary?.unchanged_subdistricts ?? 0} Kec`
                  : 'Selisih tidak disimpulkan pada periode tidak setara/kosong'}
              </div>
            </div>

            {/* Card 4: Percentage Change */}
            <div
              data-testid="compare-card-pct"
              className="bg-white p-4 rounded-lg border border-[#e2e8e5] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4e6057]">
                  Perubahan Persentase
                </span>
                <Info className="w-3.5 h-3.5 text-[#7d8f87]" />
              </div>
              <div
                data-testid="compare-pct-value"
                className={`mt-1.5 font-bold tabular-nums ${isComparable && summary?.pct_change !== null
                  ? summary.pct_change > 0
                    ? 'text-xl sm:text-2xl text-[#b91c1c]'
                    : summary.pct_change < 0
                      ? 'text-xl sm:text-2xl text-[#15803d]'
                      : 'text-xl sm:text-2xl text-[#17221e]'
                  : 'text-xs sm:text-sm font-semibold text-[#7d8f87]'
                  }`}
              >
                {summary?.pct_change_label || 'Tidak dapat dihitung'}
              </div>
              <div className="text-xs text-[#7d8f87] mt-1">
                Rumus: ((Kasus B − Kasus A) / Kasus A) × 100%
              </div>
            </div>
          </div>
        )}

        {/* SIDE-BY-SIDE CHOROPLETH MAPS (DESKTOP 2 COLS, MOBILE VERTICAL STACK) */}
        {compareData && (
          <div
            data-testid="compare-maps-grid"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <ComparisonMapPanel
              panelKey="a"
              badgeLabel="Peta A"
              periodData={periodA}
              selectedYear={yearA}
              selectedMonth={monthA}
              selectedMonthLabel={monthALabel}
              geojsonData={geojsonData}
              resetTrigger={resetTrigger}
              loading={loading}
            />

            <ComparisonMapPanel
              panelKey="b"
              badgeLabel="Peta B"
              periodData={periodB}
              selectedYear={yearB}
              selectedMonth={monthB}
              selectedMonthLabel={monthBLabel}
              geojsonData={geojsonData}
              resetTrigger={resetTrigger}
              loading={loading}
            />
          </div>
        )}

        {/* UNIFIED SHARED CHOROPLETH LEGEND FOR BOTH MAPS */}
        {compareData && (
          <div
            data-testid="compare-shared-legend"
            className="bg-white rounded-lg border border-[#e2e8e5] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#17221e] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#123027]" />
                <span>Legenda Peta Bersama (Peta A & Peta B)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {CHOROPLETH_CLASSIFICATION.method}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {CHOROPLETH_CLASSIFICATION.tiers.map((t) => (
                <div
                  key={t.tier}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm border shrink-0"
                    style={{ backgroundColor: t.color, borderColor: t.borderColor }}
                  ></span>
                  <span className="font-bold text-slate-800">{t.rangeLabel}</span>
                  <span className="text-[10.5px] text-slate-500">({t.priorityStatus})</span>
                </div>
              ))}

              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-xs">
                <span
                  className="w-3.5 h-3.5 rounded-sm border shrink-0"
                  style={{
                    backgroundColor: CHOROPLETH_CLASSIFICATION.nodata.color,
                    borderColor: CHOROPLETH_CLASSIFICATION.nodata.borderColor,
                  }}
                ></span>
                <span className="font-bold text-slate-700">
                  {CHOROPLETH_CLASSIFICATION.nodata.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PER-SUBDISTRICT CHANGE SUMMARY TABLE (27 KECAMATAN) */}
        {compareData && (
          <div
            data-testid="compare-districts-section"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Ringkasan Perubahan Kasus per Kecamatan (27 Kecamatan)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan agregat kecamatan antara <strong>{comparability?.label_a}</strong> dan{' '}
                  <strong>{comparability?.label_b}</strong> tanpa data individu pasien.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    data-testid="compare-district-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kecamatan..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>

                <select
                  data-testid="compare-status-filter"
                  aria-label="Filter Status Perubahan"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Status (27)</option>
                  <option value="meningkat">Meningkat ({summary?.increased_subdistricts ?? 0})</option>
                  <option value="menurun">Menurun ({summary?.decreased_subdistricts ?? 0})</option>
                  <option value="tetap">Tetap ({summary?.unchanged_subdistricts ?? 0})</option>
                  <option value="incomparable">
                    Tidak Dapat Dibandingkan ({summary?.incomparable_subdistricts ?? 0})
                  </option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table
                data-testid="compare-districts-table"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Kecamatan</th>
                    <th className="py-3 px-4 text-right">Kasus Periode A</th>
                    <th className="py-3 px-4 text-right">Kasus Periode B</th>
                    <th className="py-3 px-4 text-right">Selisih (B − A)</th>
                    <th className="py-3 px-4 text-right">Perubahan (%)</th>
                    <th className="py-3 px-4 text-center">Status Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDistricts.map((row) => (
                    <tr
                      key={row.code}
                      data-testid={`compare-row-${row.code}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>Kec. {row.name}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            ({row.code})
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        {row.has_data_a ? (
                          <span className="inline-flex items-center justify-end gap-1.5 font-bold text-slate-800">
                            <span
                              className="w-2.5 h-2.5 rounded-xs border border-slate-400 shrink-0"
                              style={{ backgroundColor: row.fill_color_a }}
                            ></span>
                            <span>{row.cases_a} Kasus</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum tersedia</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        {row.has_data_b ? (
                          <span className="inline-flex items-center justify-end gap-1.5 font-bold text-slate-800">
                            <span
                              className="w-2.5 h-2.5 rounded-xs border border-slate-400 shrink-0"
                              style={{ backgroundColor: row.fill_color_b }}
                            ></span>
                            <span>{row.cases_b} Kasus</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum tersedia</span>
                        )}
                      </td>

                      <td
                        data-testid={`compare-row-diff-${row.code}`}
                        className="py-2.5 px-4 text-right font-bold"
                      >
                        {row.comparable && row.diff !== null ? (
                          <span
                            className={
                              row.diff > 0
                                ? 'text-red-600'
                                : row.diff < 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-700'
                            }
                          >
                            {row.diff > 0 ? `+${row.diff}` : row.diff} Kasus
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      <td
                        data-testid={`compare-row-pct-${row.code}`}
                        className="py-2.5 px-4 text-right font-semibold text-slate-600"
                      >
                        {row.pct_change_label}
                      </td>

                      <td
                        data-testid={`compare-row-status-${row.code}`}
                        className="py-2.5 px-4 text-center"
                      >
                        {row.status === 'meningkat' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <TrendingUp className="w-3 h-3" />
                            <span>Meningkat</span>
                          </span>
                        ) : row.status === 'menurun' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingDown className="w-3 h-3" />
                            <span>Menurun</span>
                          </span>
                        ) : row.status === 'tetap' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Minus className="w-3 h-3" />
                            <span>Tetap</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span>{row.status_label}</span>
                          </span>
                        )}
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

