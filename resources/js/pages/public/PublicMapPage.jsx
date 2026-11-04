import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  RotateCcw,
  LayoutDashboard,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Users,
  Maximize2,
  RefreshCw,
  Search,
  Calendar,
  Filter,
} from 'lucide-react';

// BANYUMAS GEOGRAPHIC CENTER & INITIAL BOUNDS
const BANYUMAS_CENTER = [-7.45, 109.18];
const DEFAULT_ZOOM = 10;

// COLOR CLASSIFICATION FUNCTION
const getColor = (cases, hasData) => {
  if (!hasData || cases === null || cases === undefined) {
    return '#cbd5e1'; // Slate-300: Data Belum Tersedia
  }
  if (cases === 0) {
    return '#f1f5f9'; // Slate-100: Nol Kasus
  }
  if (cases <= 4) {
    return '#fed7aa'; // Orange-200: 1 - 4 Kasus
  }
  if (cases <= 9) {
    return '#fb923c'; // Orange-400: 5 - 9 Kasus
  }
  return '#dc2626'; // Red-600: >= 10 Kasus (Prioritas Pemantauan)
};

// HELPER CONTROLLER COMPONENT TO ACCESS LEAFLET INSTANCE
function MapController({ geojsonData, resetTrigger, onMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.invalidateSize();
      if (onMapReady) {
        onMapReady(map);
      }
    }
  }, [map, onMapReady]);

  // Fit bounds when GeoJSON data changes or reset is triggered
  useEffect(() => {
    if (map && geojsonData && geojsonData.features && geojsonData.features.length > 0) {
      try {
        const geoLayer = L.geoJSON(geojsonData);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      } catch (err) {
        console.warn('Could not fit bounds:', err);
      }
    }
  }, [map, geojsonData, resetTrigger]);

  return null;
}

export default function PublicMapPage() {
  // Periods metadata & filter selections
  const [availableYears, setAvailableYears] = useState([]);
  const [periodsByYear, setPeriodsByYear] = useState({});
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('1'); // month number (1..12) or 'all'

  // Map & GeoJSON data state
  const [mapData, setMapData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  // Race condition & in-flight request management
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef(null);
  const geojsonLayerRef = useRef(null);

  // Available months for currently selected year
  const monthsForSelectedYear = useMemo(() => {
    if (!selectedYear || !periodsByYear[selectedYear]) {
      return [];
    }
    return periodsByYear[selectedYear];
  }, [selectedYear, periodsByYear]);

  // 1. Initial load: Fetch available periods list and GeoJSON geometries
  useEffect(() => {
    let isMounted = true;

    async function initializeMetadata() {
      try {
        // Fetch periods list from Laravel API
        const periodsRes = await axios.get('/api/public/map/periods');
        const data = periodsRes.data;

        if (isMounted && data.success) {
          setAvailableYears(data.years || []);
          setPeriodsByYear(data.periods_by_year || {});

          const defYear = data.default_selection?.year || data.years?.[0] || 2026;
          const defMonth = data.default_selection?.month || '1';

          setSelectedYear(defYear);
          setSelectedMonth(String(defMonth));

          // Fetch initial map data with default selection
          fetchMapData(defYear, defMonth);
        }

        // Fetch GeoJSON boundaries once
        const geoRes = await axios.get('/geojson/banyumas_27_kecamatan.geojson');
        if (isMounted) {
          setGeojsonData(geoRes.data);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setError('Gagal memuat konfigurasi periode atau batas wilayah peta.');
          setLoading(false);
        }
      }
    }

    initializeMetadata();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 2. Fetch map data by year & month with race-condition prevention
  const fetchMapData = useCallback(async (year, month) => {
    if (!year) return;

    const currentReqId = ++requestCounterRef.current;
    setLoading(true);
    setError(null);

    // Cancel pending HTTP request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await axios.get('/api/public/map', {
        params: {
          tahun: year,
          bulan: month,
        },
        signal: abortControllerRef.current.signal,
      });

      // Ignore if a newer filter change was already initiated
      if (currentReqId !== requestCounterRef.current) {
        return;
      }

      setMapData(res.data);

      // Re-sync selectedDistrict if currently open
      if (selectedDistrict && Array.isArray(res.data?.districts)) {
        const updated = res.data.districts.find((d) => d.code === selectedDistrict.code);
        if (updated) {
          setSelectedDistrict(updated);
        }
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return; // Aborted cleanly
      }
      if (currentReqId === requestCounterRef.current) {
        console.error('Error fetching map data:', err);
        setError('Gagal memuat data periode peta. Pastikan server aktif dan coba lagi.');
      }
    } finally {
      if (currentReqId === requestCounterRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDistrict]);

  // Handle year change
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setSelectedYear(newYear);

    // Check if current month exists in new year
    const availableInNewYear = periodsByYear[newYear] || [];
    let newMonth = selectedMonth;

    if (selectedMonth !== 'all') {
      const monthExists = availableInNewYear.some((m) => String(m.month) === String(selectedMonth));
      if (!monthExists && availableInNewYear.length > 0) {
        newMonth = String(availableInNewYear[0].month);
        setSelectedMonth(newMonth);
      }
    }

    fetchMapData(newYear, newMonth);
  };

  // Handle month change
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    fetchMapData(selectedYear, newMonth);
  };

  // Quick lookup dictionary for district statistics
  const districtMap = useMemo(() => {
    const map = new Map();
    if (mapData && Array.isArray(mapData.districts)) {
      mapData.districts.forEach((d) => {
        if (d.code) map.set(d.code, d);
        if (d.name) map.set(d.name.toLowerCase().replace(/\s+/g, ''), d);
      });
    }
    return map;
  }, [mapData]);

  // Style callback for GeoJSON features
  const styleFeature = useCallback(
    (feature) => {
      const code = feature.properties?.kode_kecamatan;
      const name = feature.properties?.nama_kecamatan;
      const nameKey = name ? name.toLowerCase().replace(/\s+/g, '') : '';

      const stats = districtMap.get(code) || districtMap.get(nameKey);
      const hasData = stats ? stats.has_data : false;
      const cases = stats ? stats.cases : null;

      const isSelected = selectedDistrict && selectedDistrict.code === code;

      return {
        fillColor: getColor(cases, hasData),
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        color: isSelected ? '#0f172a' : '#475569',
        dashArray: '',
        fillOpacity: isSelected ? 0.9 : 0.75,
      };
    },
    [districtMap, selectedDistrict]
  );

  // Update styles if layer is already mounted
  useEffect(() => {
    if (geojsonLayerRef.current && geojsonLayerRef.current.setStyle) {
      geojsonLayerRef.current.setStyle(styleFeature);
    }
  }, [styleFeature]);

  // Feature interactions: hover highlight, mouseout, click
  const onEachFeature = useCallback(
    (feature, layer) => {
      const code = feature.properties?.kode_kecamatan;
      const name = feature.properties?.nama_kecamatan || 'Kecamatan';
      const nameKey = name.toLowerCase().replace(/\s+/g, '');
      const stats = districtMap.get(code) || districtMap.get(nameKey);

      const hasData = stats ? stats.has_data : false;
      const cases = stats && hasData ? stats.cases : 'Belum tersedia';
      const priorityLabel = stats ? stats.priority_status : 'Data Belum Tersedia';
      const isPriority = stats ? stats.is_priority : false;
      const ir = stats && stats.incidence_rate ? `${stats.incidence_rate} / 100k` : '-';

      // Bind tooltip
      const tooltipContent = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px; font-size: 13px;">
            Kecamatan ${name}
          </div>
          <div style="color: #475569; display: flex; justify-content: space-between; gap: 8px;">
            <span>Jumlah Kasus:</span>
            <strong style="color: ${cases >= 10 ? '#dc2626' : '#0f172a'};">${cases} ${typeof cases === 'number' ? 'Kasus' : ''}</strong>
          </div>
          <div style="color: #475569; display: flex; justify-content: space-between; gap: 8px;">
            <span>Incidence Rate:</span>
            <span>${ir}</span>
          </div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: ${
            isPriority ? '#dc2626' : cases > 0 ? '#ea580c' : '#64748b'
          };">
            ${priorityLabel}
          </div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'auto',
        opacity: 0.97,
        className: 'custom-leaflet-tooltip shadow-md rounded-lg border border-slate-200',
      });

      // Events
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
        click: (e) => {
          const l = e.target;
          setSelectedDistrict(stats || { name, code, has_data: false });
          if (mapInstance && l.getBounds) {
            mapInstance.fitBounds(l.getBounds(), { padding: [50, 50], maxZoom: 13 });
          }
        },
      });
    },
    [districtMap, mapInstance]
  );

  const handleResetView = () => {
    setSelectedDistrict(null);
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* HEADER SECTION: Clean, minimal, non-crowded */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors text-slate-600 font-medium"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Publik</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">Peta WebGIS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Peta Persebaran DBD Kabupaten Banyumas
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Visualisasi spasial-temporal kasus Demam Berdarah Dengue 27 kecamatan untuk identifikasi wilayah prioritas pemantauan.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
        {/* DEDICATED SPATIO-TEMPORAL FILTER & ACTION RIBBON */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filter Controls & Active Period Status */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Periode:</span>
            </div>

            {/* Year Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-200">
              <label htmlFor="filter-tahun" className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Tahun</span>
              </label>
              <select
                id="filter-tahun"
                aria-label="Pilih Tahun"
                value={selectedYear}
                onChange={handleYearChange}
                disabled={loading && !mapData}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-md px-2 py-0.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-2xs cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-200">
              <label htmlFor="filter-bulan" className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <span>Bulan</span>
              </label>
              <select
                id="filter-bulan"
                aria-label="Pilih Bulan"
                value={selectedMonth}
                onChange={handleMonthChange}
                disabled={loading && !mapData}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-md px-2 py-0.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-2xs cursor-pointer"
              >
                <option value="all">Semua Bulan Tersedia</option>
                {monthsForSelectedYear.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.month_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Period Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-spin' : 'bg-blue-500 animate-pulse'}`}></span>
              <span>
                {mapData?.period?.is_accumulation
                  ? `Akumulasi: ${mapData.period.range}`
                  : `Periode: ${mapData?.period?.name || 'Memuat...'}`}
              </span>
            </div>
          </div>

          {/* Right: Simulation Mode Badge & Reset View Button */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              <Info className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Data Simulasi Pengembangan</span>
            </div>

            <button
              type="button"
              onClick={handleResetView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Kembalikan fokus seluruh wilayah Banyumas"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Tampilan</span>
            </button>
          </div>
        </div>

        {/* TOP SUMMARY KPI STRIP: Compact, balanced, low vertical footprint */}
        {mapData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Kejadian DBD
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {mapData.has_data && mapData.summary.total_cases !== null ? (
                    <>
                      {mapData.summary.total_cases}{' '}
                      <span className="text-xs font-normal text-slate-500">Kasus</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Tidak Ada Data</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Cakupan Wilayah
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {mapData.has_data ? mapData.summary.subdistricts_count : 27}{' '}
                  <span className="text-xs font-normal text-slate-500">Kecamatan</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Prioritas Pemantauan
                </span>
                <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                  {mapData.has_data ? mapData.summary.priority_count : 0}{' '}
                  <span className="text-xs font-normal text-slate-500">Kecamatan (≥10)</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Kasus Maksimal
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {mapData.has_data ? (
                    <>
                      {mapData.summary.max_cases}{' '}
                      <span className="text-xs font-normal text-slate-500">Kasus / Kec</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Maximize2 className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE BANNER */}
        {!loading && mapData && !mapData.has_data && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center gap-3 text-amber-900 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 text-xs">
              <span className="font-bold block text-sm">Data Kasus Belum Tersedia</span>
              <p className="mt-0.5 text-amber-800">
                {mapData.message || 'Tidak ada laporan kejadian DBD yang dipublikasikan pada periode ini.'}{' '}
                Silakan pilih bulan atau tahun lain melalui dropdown di atas.
              </p>
            </div>
          </div>
        )}

        {/* LOADING STATE OVERLAY (Initial load only) */}
        {loading && !mapData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
            <h3 className="text-base font-bold text-slate-800">Memuat Peta Spasial Banyumas</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Mengunduh geometri 27 batas kecamatan dan memadukan data agregat epidemiologi...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="text-sm font-bold text-red-900">Gagal Menampilkan Peta WebGIS</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchMapData(selectedYear, selectedMonth)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        )}

        {/* MAP CONTAINER & SIDE PANEL */}
        {mapData && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* MAP WORKBENCH: Dominant visual canvas */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              {/* Map Viewport */}
              <div className="relative w-full h-[580px] sm:h-[660px] lg:h-[720px] xl:h-[750px] bg-slate-100">
                {/* Subtle loading spinner when updating filters */}
                {loading && (
                  <div className="absolute top-4 right-4 z-1000 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-2 text-xs font-semibold text-slate-700 animate-fadeIn">
                    <RefreshCw className="w-3.5 h-3.5 text-red-600 animate-spin" />
                    <span>Memperbarui data spasial...</span>
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
                      key={`banyumas-geojson-${mapData?.period?.name || resetTrigger}`}
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

                {/* OVERLAY: Selected District Floating Card */}
                {selectedDistrict && (
                  <div className="absolute top-4 left-4 z-1000 max-w-xs w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-xl p-4 space-y-2.5 animate-fadeIn">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Detail Terpilih
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Kecamatan {selectedDistrict.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => setSelectedDistrict(null)}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        title="Tutup detail"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Jumlah Kasus:</span>
                        <strong
                          className={`text-sm ${
                            selectedDistrict.cases >= 10
                              ? 'text-red-600'
                              : selectedDistrict.cases > 0
                              ? 'text-orange-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {selectedDistrict.has_data ? `${selectedDistrict.cases} Kasus` : 'Belum Ada Data'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Incidence Rate:</span>
                        <strong className="text-slate-700">
                          {selectedDistrict.incidence_rate ? `${selectedDistrict.incidence_rate} / 100k` : '-'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Penduduk:</span>
                        <span className="text-slate-700 font-medium">
                          {selectedDistrict.population
                            ? Number(selectedDistrict.population).toLocaleString('id-ID')
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Kode BPS:</span>
                        <span className="text-slate-600 font-mono text-[11px]">
                          {selectedDistrict.code || '-'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md text-center ${
                        selectedDistrict.is_priority
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : selectedDistrict.cases > 0
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedDistrict.priority_status}
                    </div>
                  </div>
                )}
              </div>

              {/* MAP BOTTOM BAR: Status & Source */}
              <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    Batas Administrasi 27 Kecamatan: <strong>Terpetakan Lengkap</strong> (Sumber: HDX-BPS-BIG)
                  </span>
                </div>
                <div className="font-medium text-slate-600">
                  {mapData?.period?.is_accumulation
                    ? `Menampilkan Akumulasi Seluruh Bulan (${mapData.period.range})`
                    : `Menampilkan Data Bulan ${mapData?.period?.month_name || ''} ${mapData?.period?.year || ''}`}
                </div>
              </div>
            </div>

            {/* SIDE PANEL: Streamlined Legend & Epidemiological Transparency */}
            <div className="w-full lg:w-80 space-y-4 shrink-0">
              {/* LEGEND CARD */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3.5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span>Legenda Klasifikasi Choropleth</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {mapData?.period?.is_accumulation
                      ? `Indikator: Akumulasi Kasus (${mapData.period.range})`
                      : 'Indikator: Jumlah Kasus DBD per Kecamatan'}
                  </p>
                </div>

                <div className="space-y-2">
                  {mapData?.classification?.tiers?.map((t) => (
                    <div
                      key={t.tier}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className="w-4.5 h-4.5 rounded-md border shrink-0 mt-0.5 shadow-2xs"
                        style={{
                          backgroundColor: t.color,
                          borderColor: t.border_color,
                        }}
                      ></span>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">{t.label}</div>
                        <div className="text-[11px] text-slate-500 leading-snug">{t.description}</div>
                      </div>
                    </div>
                  ))}

                  {/* No data item */}
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span
                      className="w-4.5 h-4.5 rounded-md border shrink-0 mt-0.5 shadow-2xs"
                      style={{
                        backgroundColor: mapData?.classification?.nodata?.color || '#cbd5e1',
                        borderColor: mapData?.classification?.nodata?.border_color || '#94a3b8',
                      }}
                    ></span>
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">Data Belum Tersedia</div>
                      <div className="text-[11px] text-slate-500 leading-snug">
                        Wilayah kecamatan tanpa data kasus pada periode aktif.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EPIDEMIOLOGICAL METHODOLOGY & SCIENTIFIC TRANSPARENCY CARD */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3.5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Keterangan Metode Pemetaan</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Klasifikasi warna choropleth menggunakan interval bertingkat berdasarkan data agregat kecamatan untuk mempermudah identifikasi <strong>Wilayah Prioritas Pemantauan</strong>.
                  </p>
                </div>

                {/* Explicit Scientific Disclaimer */}
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Catatan Ilmiah:</span>
                  </div>
                  <span>
                    Sistem tidak menyebut warna merah sebagai hotspot signifikan secara statistik karena pemetaan ini tidak menggunakan uji klaster spasial (seperti Getis-Ord Gi* atau Moran's I).
                  </span>
                </div>

                {/* Data Privacy & Ethics */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Etika & Privasi Data</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Seluruh data disajikan dalam format agregat kecamatan tanpa menyajikan rekam medis atau identitas individu pasien.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
