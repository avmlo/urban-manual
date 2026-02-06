'use client';

import { Building2, Palette, Calendar, ExternalLink, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Destination } from '@/types/destination';
import { Architect, DesignFirm, DesignMovement } from '@/types/architecture';
import { architectNameToSlug } from '@/lib/architect-utils';

interface ArchitectDesignInfoProps {
  destination: Destination;
}

export function ArchitectDesignInfo({ destination }: ArchitectDesignInfoProps) {
  // Extract architect/design information - check for new architecture-first data first
  const architectObj = (destination as any).architect_obj as Architect | undefined;
  const designFirmObj = (destination as any).design_firm_obj as DesignFirm | undefined;
  const interiorDesignerObj = (destination as any).interior_designer_obj as Architect | undefined;
  const movementObj = (destination as any).movement_obj as DesignMovement | undefined;
  
  // Fallback to legacy text fields
  const architect = architectObj?.name || destination.architect;
  const designFirm = designFirmObj?.name || destination.design_firm;
  const interiorDesigner = interiorDesignerObj?.name || destination.interior_designer || (destination as any).designer_name;
  const architecturalStyle = destination.architectural_style;
  const designPeriod = destination.design_period;
  const architectInfoJson = destination.architect_info_json as any;
  
  // Architecture-first content fields
  const architecturalSignificance = (destination as any).architectural_significance;
  const designStory = (destination as any).design_story;
  const constructionYear = (destination as any).construction_year;

  // Check if we have any architect/design info to display
  const hasInfo = architect || designFirm || interiorDesigner || architecturalStyle || designPeriod || 
                  architecturalSignificance || designStory || movementObj;

  if (!hasInfo) {
    return null;
  }

  // Extract sources from architect_info_json if available
  const sources = architectInfoJson?.sources || [];
  
  // Format architect years
  const formatArchitectYears = (arch: Architect) => {
    if (arch.birth_year && arch.death_year) {
      return `${arch.birth_year}–${arch.death_year}`;
    } else if (arch.birth_year) {
      return `b. ${arch.birth_year}`;
    }
    return null;
  };

  return (
    <div className="p-6 bg-white dark:bg-[#161b22] rounded-xl border border-gray-200 dark:border-[#30363d]">
      <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-5">Architecture & Design</h2>
      <div className="space-y-5">
        {/* Architect - Enhanced with rich data */}
        {architect && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Design Firm</div>
              <div className="space-y-1">
                <Link
                  href={architectObj?.slug ? `/architect/${architectObj.slug}` : `/architect/${architectNameToSlug(architect)}`}
                  className="text-sm text-gray-900 dark:text-white font-medium hover:underline inline-block"
                >
                  {architect}
                </Link>
                {architectObj && (
                  <div className="space-y-1.5">
                    {(architectObj.birth_year || architectObj.death_year) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatArchitectYears(architectObj)}
                      </div>
                    )}
                    {architectObj.nationality && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Globe className="h-3 w-3" />
                        <span>{architectObj.nationality}</span>
                      </div>
                    )}
                    {architectObj.design_philosophy && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-start gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Design Philosophy</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{architectObj.design_philosophy}</p>
                      </div>
                    )}
                    {architectObj.bio && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                        <p>{architectObj.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Design Firm - Enhanced */}
        {designFirm && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Design Firm</div>
              <div className="space-y-1">
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {designFirm}
                </div>
                {designFirmObj && (
                  <div className="space-y-1.5">
                    {designFirmObj.founded_year && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Founded {designFirmObj.founded_year}
                      </div>
                    )}
                    {designFirmObj.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                        <p>{designFirmObj.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interior Designer - Enhanced */}
        {interiorDesigner && (
          <div className="flex items-start gap-3">
            <Palette className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Interior Designer</div>
              <div className="space-y-1">
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {interiorDesigner}
                </div>
                {interiorDesignerObj && (
                  <div className="space-y-1.5">
                    {(interiorDesignerObj.birth_year || interiorDesignerObj.death_year) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatArchitectYears(interiorDesignerObj)}
                      </div>
                    )}
                    {interiorDesignerObj.nationality && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Globe className="h-3 w-3" />
                        <span>{interiorDesignerObj.nationality}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Architectural Style */}
        {architecturalStyle && (
          <div className="flex items-start gap-3">
            <Palette className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Style</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium capitalize">
                {architecturalStyle}
              </div>
            </div>
          </div>
        )}

        {/* Design Movement */}
        {movementObj && (
          <div className="flex items-start gap-3">
            <Palette className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Movement</div>
              <div className="space-y-1">
                <Link
                  href={`/movement/${movementObj.slug}`}
                  className="text-sm text-gray-900 dark:text-white font-medium hover:underline inline-block"
                >
                  {movementObj.name}
                </Link>
                {movementObj.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                    <p>{movementObj.description}</p>
                  </div>
                )}
                {(movementObj.period_start || movementObj.period_end) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {movementObj.period_start}
                    {movementObj.period_end ? `–${movementObj.period_end}` : '–present'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Design Period (legacy) */}
        {designPeriod && !movementObj && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Period</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {designPeriod}
              </div>
            </div>
          </div>
        )}

        {/* Architectural Significance */}
        {architecturalSignificance && (
          <div className="pt-4 border-t border-gray-100 dark:border-[#30363d]">
            <div className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mb-2">Significance</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {architecturalSignificance}
            </p>
          </div>
        )}

        {/* Design Story */}
        {designStory && (
          <div className="pt-4 border-t border-gray-100 dark:border-[#30363d]">
            <div className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mb-2">Design Story</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {designStory}
            </p>
          </div>
        )}

        {/* Construction Year */}
        {constructionYear && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Construction</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {constructionYear}
              </div>
            </div>
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-[#30363d]">
            <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-2">Sources</div>
            <div className="space-y-1.5">
              {sources.slice(0, 3).map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  <span className="truncate">{source.title || source.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

