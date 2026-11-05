import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Map, AlertCircle, Compass } from 'lucide-react';

export default function PlaceholderPage({ type }) {
  const isMap = type === 'map' || type === 'peta';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white rounded-lg border border-[#e2e8e5] p-8 text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-md bg-[#f0f6f4] flex items-center justify-center text-[#123027]">
          <Compass className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#fffbeb] border border-[#fde68a] text-xs font-semibold text-[#78350f]">
            <Clock className="w-3.5 h-3.5" />
            <span>Dalam Antrean Urutan Fitur</span>
          </div>
          <h1 className="text-2xl font-bold text-[#17221e]">
            Modul Peta WebGIS Banyumas
          </h1>
          <p className="text-xs sm:text-sm text-[#4e6057] leading-relaxed">
            Rute ini dijadwalkan untuk modul pemetaan lanjutan dengan batas polygon 27 kecamatan Kabupaten Banyumas.
          </p>
        </div>

        <div className="p-4 rounded-md bg-[#f8faf9] border border-[#e2e8e5] text-left text-xs text-[#4e6057] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-[#17221e]">
            <AlertCircle className="w-4 h-4 text-[#123027]" />
            <span>Keterangan Status Pengembangan:</span>
          </div>
          <p>
            Sesuai standar operasional, seluruh fitur dikembangkan secara bertahap satu per satu dan diuji secara independen.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#123027] hover:bg-[#194337] text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Publik</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#c5d1cb] hover:bg-[#f3f6f4] text-[#17221e] text-xs sm:text-sm font-medium transition-colors"
          >
            <span>Halaman Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
