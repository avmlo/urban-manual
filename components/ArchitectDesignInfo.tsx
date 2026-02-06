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
  
  // Design firm text field (primary — stores all design-related names)
  const designFirmText = destination.design_firm;
  const architecturalStyle = destination.architectural_style;
  const designPeriod = destination.design_period;
  const architectInfoJson = destination.architect_info_json as any;

  // Architecture-first content fields
  const architecturalSignificance = (destination as any).architectural_significance;
  const designStory = (destination as any).design_story;
  const constructionYear = (destination as any).construction_year;

  // Collect all design firm names from text field + FK objects, deduplicated
  const designFirmNames: string[] = [];
  const seen = new Set<string>();
  if (designFirmText) {
    for (const name of designFirmText.split(', ').filter(Boolean)) {
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        designFirmNames.push(name);
      }
    }
  }
  // Add FK names not already in the text field
  for (const name of [architectObj?.name, designFirmObj?.name, interiorDesignerObj?.name]) {
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      designFirmNames.push(name);
    }
  }

  // Build a lookup from name → rich object data (for inline details)
  const richDataByName = new Map<string, { architect?: Architect; firm?: DesignFirm }>();
  if (architectObj?.name) {
    richDataByName.set(architectObj.name.toLowerCase(), { architect: architectObj });
  }
  if (interiorDesignerObj?.name) {
    const key = interiorDesignerObj.name.toLowerCase();
    const existing = richDataByName.get(key);
    richDataByName.set(key, { ...existing, architect: existing?.architect || interiorDesignerObj });
  }
  if (designFirmObj?.name) {
    const key = designFirmObj.name.toLowerCase();
    const existing = richDataByName.get(key);
    richDataByName.set(key, { ...existing, firm: designFirmObj });
  }

  const hasDesignFirms = designFirmNames.length > 0;

  // Check if we have any architect/design info to display
  const hasInfo = hasDesignFirms || architecturalStyle || designPeriod ||
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
        {/* Design Firm — unified section for architects, interior designers, and firms */}
        {hasDesignFirms && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 dark:text-[#8b949e] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-[#8b949e] mb-1">Design Firm</div>
              <div className="space-y-3">
                {designFirmNames.map((name, idx) => {
                  const rich = richDataByName.get(name.toLowerCase());
                  const arch = rich?.architect;
                  const firm = rich?.firm;
                  const slug = arch?.slug || firm?.slug || architectNameToSlug(name);

                  return (
                    <div key={idx}>
                      <Link
                        href={`/architect/${slug}`}
                        className="text-sm text-gray-900 dark:text-white font-medium hover:underline inline-block"
                      >
                        {name}
                      </Link>
                      {arch && (
                        <div className="space-y-1.5 mt-1">
                          {(arch.birth_year || arch.death_year) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatArchitectYears(arch)}
                            </div>
                          )}
                          {arch.nationality && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Globe className="h-3 w-3" />
                              <span>{arch.nationality}</span>
                            </div>
                          )}
                          {arch.design_philosophy && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-start gap-1.5 mb-1">
                                <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Design Philosophy</span>
                              </div>
                              <p className="text-xs text-gray-700 dark:text-gray-300">{arch.design_philosophy}</p>
                            </div>
                          )}
                          {arch.bio && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                              <p>{arch.bio}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {firm && (
                        <div className="space-y-1.5 mt-1">
                          {firm.founded_year && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Founded {firm.founded_year}
                            </div>
                          )}
                          {firm.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                              <p>{firm.description}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

