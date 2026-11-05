import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X, Compass, Activity, Map, BarChart3, BookOpen } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#ffffff] border-b border-[#e2e8e5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Institutional Brand Identity */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-md bg-[#123027] text-white flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#17221e]">
                  WebGIS DBD
                </span>
                <span className="bg-[#f0f6f4] text-[#123027] border border-[#dbe4df] text-[11px] font-semibold px-2 py-0.5 rounded">
                  Banyumas
                </span>
              </div>
              <p className="text-xs text-[#4e6057] hidden sm:block">
                Surveilans Epidemiologi Spasial-Temporal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm">
            <Link
              to="/dashboard"
              className={`font-medium transition-colors py-1 ${
                isActive('/dashboard')
                  ? 'text-[#123027] font-semibold border-b-2 border-[#123027]'
                  : 'text-[#4e6057] hover:text-[#17221e]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/peta"
              className={`font-medium transition-colors py-1 ${
                isActive('/peta')
                  ? 'text-[#123027] font-semibold border-b-2 border-[#123027]'
                  : 'text-[#4e6057] hover:text-[#17221e]'
              }`}
            >
              Peta WebGIS
            </Link>
            <Link
              to="/tren"
              className={`font-medium transition-colors py-1 ${
                isActive('/tren')
                  ? 'text-[#123027] font-semibold border-b-2 border-[#123027]'
                  : 'text-[#4e6057] hover:text-[#17221e]'
              }`}
            >
              Tren Kasus
            </Link>
            <a
              href={isHome ? '#edukasi' : '/#edukasi'}
              data-testid="navbar-link-edukasi"
              className="font-medium text-[#4e6057] hover:text-[#17221e] transition-colors py-1"
            >
              Edukasi & 3M Plus
            </a>
            <Link
              to="/metadata"
              className={`font-medium transition-colors py-1 ${
                isActive('/metadata')
                  ? 'text-[#123027] font-semibold border-b-2 border-[#123027]'
                  : 'text-[#4e6057] hover:text-[#17221e]'
              }`}
            >
              Metadata
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link
              to="/peta"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#123027] hover:bg-[#194337] text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Buka Peta WebGIS</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#c5d1cb] hover:border-[#123027] bg-white text-[#17221e] text-xs sm:text-sm font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[#4e6057]" />
              <span>Login Admin</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="p-2 rounded-md text-[#4e6057] hover:text-[#17221e] hover:bg-[#f3f6f4] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden border-b border-[#e2e8e5] bg-[#ffffff] px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-2.5 text-sm">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-[#17221e] font-medium py-1.5"
            >
              <BarChart3 className="w-4 h-4 text-[#4e6057]" />
              <span>Dashboard Publik</span>
            </Link>
            <Link
              to="/peta"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-[#17221e] font-medium py-1.5"
            >
              <Map className="w-4 h-4 text-[#4e6057]" />
              <span>Peta WebGIS Banyumas</span>
            </Link>
            <Link
              to="/tren"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-[#17221e] font-medium py-1.5"
            >
              <Activity className="w-4 h-4 text-[#4e6057]" />
              <span>Analisis Tren & Temporal</span>
            </Link>
            <a
              href={isHome ? '#edukasi' : '/#edukasi'}
              data-testid="navbar-mobile-link-edukasi"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-[#17221e] font-medium py-1.5"
            >
              <BookOpen className="w-4 h-4 text-[#4e6057]" />
              <span>Edukasi & 3M Plus</span>
            </a>
            <Link
              to="/metadata"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-[#17221e] font-medium py-1.5"
            >
              <Shield className="w-4 h-4 text-[#4e6057]" />
              <span>Metadata & Metodologi</span>
            </Link>
          </div>
          <div className="pt-3 border-t border-[#e2e8e5] flex flex-col gap-2">
            <Link
              to="/peta"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-2.5 rounded-md bg-[#123027] text-white text-sm font-semibold"
            >
              Buka Peta Interaktif
            </Link>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-2 rounded-md border border-[#c5d1cb] text-[#17221e] text-sm font-medium"
            >
              Login Administrator
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
