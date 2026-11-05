import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, MapPin, Database, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0c201a] text-[#8ea39b] border-t border-[#193a30]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-10">
          {/* Institutional Identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#194337] flex items-center justify-center text-white shrink-0">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[#f5f8f6] font-bold text-base tracking-tight">
                WebGIS DBD Kabupaten Banyumas
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#8ea39b] max-w-md">
              Platform intelijen kesehatan masyarakat untuk pemantauan dinamika spasial-temporal kasus Demam Berdarah Dengue (DBD) di 27 kecamatan Kabupaten Banyumas. Mendukung kesiapsiagaan preventif dan intervensi vektor berbasis bukti.
            </p>
            <div className="flex items-start gap-2.5 text-xs text-[#a3d4be] bg-[#122e25] border border-[#1b4337] p-2.5 rounded-md max-w-md">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                <strong>Prinsip Privasi Pasien:</strong> Seluruh data diolah secara agregat per kecamatan untuk keperluan surveilans epidemiologis tanpa menyertakan data rekam medis individu.
              </span>
            </div>
          </div>

          {/* Navigasi Layanan */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#f5f8f6]">
              Navigasi Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard Pemantauan
                </Link>
              </li>
              <li>
                <Link to="/peta" className="hover:text-white transition-colors">
                  Peta Choropleth Wilayah
                </Link>
              </li>
              <li>
                <Link to="/tren" className="hover:text-white transition-colors">
                  Analisis Tren Temporal
                </Link>
              </li>
              <li>
                <Link to="/perbandingan" className="hover:text-white transition-colors">
                  Komparasi Antar-Periode
                </Link>
              </li>
              <li>
                <Link to="/edukasi" className="hover:text-white transition-colors">
                  Edukasi & 3M Plus
                </Link>
              </li>
              <li>
                <Link to="/metadata" className="hover:text-white transition-colors">
                  Metadata & Metodologi
                </Link>
              </li>
            </ul>
          </div>

          {/* Metodologi & Indikator */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#f5f8f6]">
              Indikator Epidemiologi
            </h4>
            <ul className="space-y-2 text-xs text-[#8ea39b]">
              <li>Incidence Rate (IR) per 100.000 Penduduk</li>
              <li>Case Fatality Rate (CFR %)</li>
              <li>Klasifikasi Jenks Natural Breaks</li>
              <li>Pemantauan Wilayah Prioritas (Hotspot)</li>
              <li>Surveilans Vektor <em>Aedes aegypti</em></li>
            </ul>
          </div>

          {/* Otoritas & Kontak Darurat */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#f5f8f6]">
              Layanan & Otoritas
            </h4>
            <div className="space-y-2 text-xs text-[#8ea39b]">
              <p className="text-white font-medium">Dinas Kesehatan Banyumas</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#a3d4be]" />
                <span>Jl. RA Wiryaatmaja No. 4, Purwokerto</span>
              </p>
              <p>Telepon: (0281) 632708</p>
              <p className="pt-2 text-[11px] text-[#9bb3a8]">
                Darurat Medis DBD: Segera kunjungi Puskesmas terdekat atau RSUD Banyumas / RSUD Margono.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#193a30] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9bb3a8]">
          <p>
            &copy; {currentYear} WebGIS Demam Berdarah Dengue Kabupaten Banyumas. Publikasi resmi data kesehatan spasial.
          </p>
          <div className="flex items-center gap-3">
            <span>Peta Dasar: OpenStreetMap contributors</span>
            <span>&bull;</span>
            <span>Spatial Engine: Leaflet.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
