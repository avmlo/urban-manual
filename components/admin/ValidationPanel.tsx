'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ValidationResult } from '@/types/admin';
import { cn } from '@/lib/utils';

interface ValidationPanelProps {
  validation: ValidationResult;
  seoScore?: number;
  className?: string;
}

export function ValidationPanel({ validation, seoScore, className }: ValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasIssues = hasErrors || hasWarnings;

  if (!hasIssues && !seoScore) {
    return (
      <div
        className={cn(
          'border border-green-200 bg-green-50 rounded-lg p-4 flex items-center gap-3',
          className
        )}
      >
        <CheckCircle2 className="text-green-600" size={20} />
        <span className="text-sm text-green-800 font-medium">
          All validation checks passed
        </span>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between transition-colors',
          hasErrors
            ? 'bg-red-50 border-red-200 hover:bg-red-100'
            : hasWarnings
              ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
              : 'bg-green-50 border-green-200 hover:bg-green-100'
        )}
      >
        <div className="flex items-center gap-3">
          {hasErrors ? (
            <AlertCircle className="text-red-600" size={20} />
          ) : hasWarnings ? (
            <AlertTriangle className="text-amber-600" size={20} />
          ) : (
            <CheckCircle2 className="text-green-600" size={20} />
          )}

          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-sm font-medium',
                hasErrors ? 'text-red-800' : hasWarnings ? 'text-amber-800' : 'text-green-800'
              )}
            >
              Validation Status
            </span>

            <div className="flex items-center gap-2">
              {hasErrors && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  {validation.errors.length} {validation.errors.length === 1 ? 'error' : 'errors'}
                </span>
              )}
              {hasWarnings && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  {validation.warnings.length}{' '}
                  {validation.warnings.length === 1 ? 'warning' : 'warnings'}
                </span>
              )}
              {seoScore !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    seoScore >= 80
                      ? 'bg-green-100 text-green-800'
                      : seoScore >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  )}
                >
                  SEO: {seoScore}/100
                </span>
              )}
            </div>
          </div>
        </div>

        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Errors */}
          {hasErrors && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Errors
                </h3>
                <span className="text-xs text-red-600">Must be fixed before publishing</span>
              </div>
              <ul className="space-y-2">
                {validation.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="mt-0.5">•</span>
                    <span>
                      <strong>{error.field}:</strong> {error.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="text-sm font-semibold text-amber-800 flex items-center gap-2 hover:text-amber-900"
                >
                  <AlertTriangle size={16} />
                  Warnings
                  {showWarnings ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                <span className="text-xs text-amber-600">Recommended improvements</span>
              </div>
              {showWarnings && (
                <ul className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-0.5">•</span>
                      <span>
                        <strong>{warning.field}:</strong> {warning.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* SEO Score Details */}
          {seoScore !== undefined && (
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">SEO Quality Score</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      seoScore >= 80
                        ? 'bg-green-500'
                        : seoScore >= 60
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: `${seoScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700 min-w-[60px] text-right">
                  {seoScore}/100
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {seoScore >= 80 && 'Excellent! This content is well-optimized for search engines.'}
                {seoScore >= 60 && seoScore < 80 && 'Good, but there\'s room for improvement.'}
                {seoScore < 60 &&
                  'Needs improvement. Add meta tags and content to boost SEO score.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline field validation indicator
 */
export function FieldValidation({
  errors,
  warnings,
}: {
  errors: string[];
  warnings: string[];
}) {
  if (!errors.length && !warnings.length) return null;

  return (
    <div className="mt-1 space-y-1">
      {errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-start gap-1 text-xs text-red-600">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
      {warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-start gap-1 text-xs text-amber-600">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
