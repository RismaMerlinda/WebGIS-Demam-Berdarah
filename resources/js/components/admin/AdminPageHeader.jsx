import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function AdminPageHeader({
  breadcrumbs = [],
  title,
  description,
  badge,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div className="space-y-1">
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label || idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-emerald-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title + Optional Badge */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {badge}
            </span>
          )}
        </div>

        {/* Short Page Description */}
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {/* Contextual Action Buttons */}
      {children && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {children}
        </div>
      )}
    </div>
  );
}

