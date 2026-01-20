'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Progress } from '@/ui/progress';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  MapPin,
  Sparkles,
  TrendingUp,
  Crown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QualityMetric {
  id: string;
  label: string;
  description: string;
  passing: number;
  total: number;
  icon: React.ComponentType<{ className?: string }>;
  filterHref: string;
  severity: 'critical' | 'warning' | 'info';
}

export function DataQualityWidget() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    fetchQualityMetrics();
  }, []);

  const fetchQualityMetrics = async () => {
    try {
      // Fetch all destinations
      const { data: destinations, error } = await supabase
        .from('destinations')
        .select('id, image, description, content, last_enriched_at, crown, latitude, longitude, status')
        .eq('status', 'published'); // Only check published destinations

      if (error) throw error;

      const total = destinations?.length || 0;

      // Calculate metrics
      const hasImage = destinations?.filter((d) => d.image).length || 0;
      const hasDescription = destinations?.filter((d) => d.description && d.description.length >= 100).length || 0;
      const hasContent = destinations?.filter((d) => d.content).length || 0;
      const isEnriched = destinations?.filter((d) => d.last_enriched_at).length || 0;
      const hasCoordinates = destinations?.filter((d) => d.latitude && d.longitude).length || 0;
      const crownPicks = destinations?.filter((d) => d.crown).length || 0;

      const qualityMetrics: QualityMetric[] = [
        {
          id: 'images',
          label: 'Has Images',
          description: 'Destinations with image URLs',
          passing: hasImage,
          total,
          icon: ImageIcon,
          filterHref: '/admin/destinations?filter=no-image',
          severity: 'critical',
        },
        {
          id: 'descriptions',
          label: 'Quality Descriptions',
          description: 'Descriptions with 100+ characters',
          passing: hasDescription,
          total,
          icon: FileText,
          filterHref: '/admin/destinations?filter=no-description',
          severity: 'warning',
        },
        {
          id: 'content',
          label: 'Editorial Content',
          description: 'Has rich editorial content',
          passing: hasContent,
          total,
          icon: FileText,
          filterHref: '/admin/destinations?filter=no-content',
          severity: 'info',
        },
        {
          id: 'enriched',
          label: 'Enriched Data',
          description: 'Has Google Places enrichment',
          passing: isEnriched,
          total,
          icon: Sparkles,
          filterHref: '/admin/destinations?filter=not-enriched',
          severity: 'warning',
        },
        {
          id: 'coordinates',
          label: 'Has Coordinates',
          description: 'Latitude and longitude set',
          passing: hasCoordinates,
          total,
          icon: MapPin,
          filterHref: '/admin/destinations?filter=no-coordinates',
          severity: 'critical',
        },
        {
          id: 'crown',
          label: 'Crown Picks',
          description: 'Editor-curated highlights',
          passing: crownPicks,
          total,
          icon: Crown,
          filterHref: '/admin/destinations?filter=crown',
          severity: 'info',
        },
      ];

      setMetrics(qualityMetrics);

      // Calculate overall score
      const totalChecks = qualityMetrics.length * total;
      const passingChecks = qualityMetrics.reduce((sum, m) => sum + m.passing, 0);
      const score = Math.round((passingChecks / totalChecks) * 100);
      setOverallScore(score);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-admin-status-success';
    if (score >= 70) return 'text-admin-status-warning';
    return 'text-admin-status-error';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'success' as const };
    if (score >= 70) return { label: 'Good', variant: 'warning' as const };
    return { label: 'Needs Work', variant: 'destructive' as const };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-admin-status-success';
    if (percentage >= 70) return 'bg-admin-status-warning';
    return 'bg-admin-status-error';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreBadge = getScoreBadge(overallScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Content Quality
            </CardTitle>
            <CardDescription>Overall data completeness and quality metrics</CardDescription>
          </div>
          <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
          </div>
          <Progress value={overallScore} className="h-2" />
        </div>

        {/* Quality Metrics */}
        <div className="space-y-3">
          {metrics.map((metric) => {
            const percentage = Math.round((metric.passing / metric.total) * 100);
            const Icon = metric.icon;
            const failing = metric.total - metric.passing;

            return (
              <div
                key={metric.id}
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(metric.filterHref)}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    percentage >= 90
                      ? 'bg-admin-status-success-bg'
                      : percentage >= 70
                      ? 'bg-admin-status-warning-bg'
                      : 'bg-admin-status-error-bg'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      percentage >= 90
                        ? 'text-admin-status-success'
                        : percentage >= 70
                        ? 'text-admin-status-warning'
                        : 'text-admin-status-error'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{metric.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.passing}/{metric.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={percentage}
                      className="h-1.5 flex-1"
                    />
                    <span className={`text-xs font-medium ${getScoreColor(percentage)}`}>
                      {percentage}%
                    </span>
                  </div>
                  {failing > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{failing} need attention</span>
                    </div>
                  )}
                </div>

                {percentage === 100 && (
                  <CheckCircle2 className="w-5 h-5 text-admin-status-success flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push('/admin/destinations?filter=needs-attention')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Fix Issues
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push('/admin/enrich')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Enrich Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
