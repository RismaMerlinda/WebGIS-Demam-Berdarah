import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Shield, Menu, X, Activity, Compass, Layers } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                  WebGIS DBD
                </span>
                <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Banyumas
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Pemantauan Dinamika Spasial-Temporal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#fitur"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Fitur Sistem
            </a>
            <a
              href="#edukasi"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Edukasi & 3M Plus
            </a>
            <a
              href="#wilayah"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Wilayah 27 Kecamatan
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi WebGIS</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
            >
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Login Admin</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-3">
            <a
              href="#fitur"
              onClick={() => setIsOpen(false)}
              className="text-slate-700 font-medium py-1 hover:text-rose-600"
            >
              Fitur Sistem
            </a>
            <a
              href="#edukasi"
              onClick={() => setIsOpen(false)}
              className="text-slate-700 font-medium py-1 hover:text-rose-600"
            >
              Edukasi & 3M Plus
            </a>
            <a
              href="#wilayah"
              onClick={() => setIsOpen(false)}
              className="text-slate-700 font-medium py-1 hover:text-rose-600"
            >
              Wilayah 27 Kecamatan
            </a>
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold text-sm"
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi WebGIS</span>
            </Link>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
            >
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Login Administrator</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
