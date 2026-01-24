'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DestinationVersion } from '@/types/admin';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Clock,
  User,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  XCircle,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface VersionHistoryProps {
  destinationId: number;
  onRestore?: (versionNumber: number) => void;
}

export function VersionHistory({ destinationId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DestinationVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DestinationVersion | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    fetchVersions();
  }, [destinationId]);

  const fetchVersions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('destination_versions')
      .select('*')
      .eq('destination_id', destinationId)
      .order('version_number', { ascending: false });

    if (!error && data) {
      setVersions(data);
    }
    setLoading(false);
  };

  const toggleExpanded = (versionId: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const handleRestore = async (versionNumber: number) => {
    if (!confirm('Are you sure you want to restore this version? This will overwrite current data.')) {
      return;
    }

    if (onRestore) {
      await onRestore(versionNumber);
      await fetchVersions(); // Refresh versions after restore
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <FileText size={16} className="text-blue-600" />;
      case 'update':
        return <FileText size={16} className="text-gray-600" />;
      case 'publish':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'unpublish':
        return <XCircle size={16} className="text-amber-600" />;
      case 'archive':
        return <Archive size={16} className="text-red-600" />;
      case 'restore':
        return <RotateCcw size={16} className="text-purple-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-blue-100 text-blue-700';
      case 'publish':
        return 'bg-green-100 text-green-700';
      case 'unpublish':
        return 'bg-amber-100 text-amber-700';
      case 'archive':
        return 'bg-red-100 text-red-700';
      case 'restore':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <Clock size={48} className="mx-auto mb-2 opacity-30" />
        <p>No version history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Version entries */}
        <div className="space-y-4">
          {versions.map((version, index) => {
            const isExpanded = expandedVersions.has(version.id);
            const isLatest = index === 0;

            return (
              <div key={version.id} className="relative pl-14">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-4 top-2 w-4 h-4 rounded-full border-2 border-white',
                    isLatest ? 'bg-blue-600' : 'bg-gray-400'
                  )}
                />

                {/* Version card */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(version.id)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">{getChangeTypeIcon(version.change_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                getChangeTypeColor(version.change_type)
                              )}
                            >
                              {version.change_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              Version {version.version_number}
                            </span>
                            {isLatest && (
                              <span className="text-xs font-medium text-blue-600">CURRENT</span>
                            )}
                          </div>

                          {version.changed_fields && version.changed_fields.length > 0 && (
                            <div className="text-sm text-gray-600 mb-1">
                              Changed: <strong>{version.changed_fields.join(', ')}</strong>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {version.changed_by_email || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDistanceToNow(new Date(version.changed_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version.version_number);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded"
                          >
                            <RotateCcw size={12} />
                            Restore
                          </button>
                        )}
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="space-y-4">
                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Timestamp:</span>
                            <div className="font-medium">
                              {format(new Date(version.changed_at), 'PPpp')}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Changed by:</span>
                            <div className="font-medium">{version.changed_by_email || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Changed fields */}
                        {version.changed_fields && version.changed_fields.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Changed Fields
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {version.changed_fields.map((field) => (
                                <span
                                  key={field}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* View diff button */}
                        {index < versions.length - 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedVersion(
                                selectedVersion?.id === version.id ? null : version
                              )
                            }
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <Eye size={14} />
                            {selectedVersion?.id === version.id ? 'Hide' : 'View'} Changes
                          </button>
                        )}

                        {/* Diff viewer */}
                        {selectedVersion?.id === version.id && index < versions.length - 1 && (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <ReactDiffViewer
                              oldValue={JSON.stringify(versions[index + 1].data, null, 2)}
                              newValue={JSON.stringify(version.data, null, 2)}
                              splitView={true}
                              useDarkTheme={false}
                              leftTitle={`Version ${versions[index + 1].version_number}`}
                              rightTitle={`Version ${version.version_number}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
