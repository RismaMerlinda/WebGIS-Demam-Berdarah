import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Map, AlertCircle, Compass } from 'lucide-react';

export default function PlaceholderPage({ type }) {
  const isMap = type === 'map' || type === 'peta';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Dalam Antrean Urutan Fitur</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Modul Peta WebGIS Banyumas (Fitur 4)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Rute ini dijadwalkan untuk dibangun pada Fitur 4 (Peta WebGIS menggunakan Leaflet + OpenStreetMap) dengan batas polygon 27 kecamatan Kabupaten Banyumas. Saat ini Fitur 3 (Dashboard Publik) telah aktif.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <span>Keterangan Status Pengembangan:</span>
          </div>
          <p>
            Sesuai standar operasional, seluruh fitur dikembangkan secara bertahap satu per satu dan diuji secara independen. Tidak ada halaman palsu yang ditampilkan sebagai fitur selesai sebelum melewati siklus pengujian.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Publik</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
          >
            <span>Halaman Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
