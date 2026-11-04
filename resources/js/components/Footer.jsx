import React from 'react';
import { Activity, ShieldCheck, HeartPulse, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-white font-extrabold text-lg tracking-tight">
                WebGIS DBD Kabupaten Banyumas
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              Sistem Informasi Geografis pemantauan dinamika spasial-temporal kasus Demam Berdarah Dengue (DBD) di 27 Kecamatan Kabupaten Banyumas, Jawa Tengah. Dirancang untuk visualisasi epidemiologi dan dukungan kesiapsiagaan kesehatan masyarakat.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-md w-fit">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Privasi Terjaga: Menggunakan data agregat kecamatan tanpa identitas individu.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Navigasi Halaman
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#fitur" className="hover:text-rose-400 transition-colors">
                  Fitur Pemetaan Spasial
                </a>
              </li>
              <li>
                <a href="#edukasi" className="hover:text-rose-400 transition-colors">
                  Edukasi & Vektor DBD
                </a>
              </li>
              <li>
                <a href="#wilayah" className="hover:text-rose-400 transition-colors">
                  Wilayah 27 Kecamatan
                </a>
              </li>
              <li>
                <a href="#disclaimer" className="hover:text-rose-400 transition-colors">
                  Disclaimer & Etika Data
                </a>
              </li>
            </ul>
          </div>

          {/* Teknologi & Atribusi */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Teknologi Terbuka
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Laravel 12 & MySQL</li>
              <li>React JS & Vite</li>
              <li>Leaflet.js & OpenStreetMap</li>
              <li>GeoJSON Batas Kecamatan</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {currentYear} WebGIS Demam Berdarah Dengue Kabupaten Banyumas. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-4">
            <span>Tile Map: &copy; OpenStreetMap contributors</span>
            <span>&bull;</span>
            <span>Engine: Leaflet.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
