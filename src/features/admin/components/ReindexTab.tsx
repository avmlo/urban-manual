'use client';

import { useState } from 'react';
import { Loader2, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function ReindexTab() {
  const [isReindexing, setIsReindexing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'all' | 'changed'>('changed');
  const [batchSize, setBatchSize] = useState(20);
  const [dryRun, setDryRun] = useState(false);

  const handleReindex = async () => {
    setIsReindexing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/reindex-destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          batchSize,
          dryRun,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reindex');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Vector Index Management</h2>
        <p className="text-sm text-[var(--editorial-text-secondary)]">
          Populate or update the Upstash Vector index with destination embeddings
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-[var(--editorial-bg-elevated)] rounded-lg border border-[var(--editorial-border)] p-6 space-y-6">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>

        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Reindex Mode</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value="changed"
                checked={mode === 'changed'}
                onChange={(e) => setMode(e.target.value as 'changed')}
                className="w-4 h-4"
                disabled={isReindexing}
              />
              <div>
                <div className="font-medium text-sm">Changed Only</div>
                <div className="text-xs text-[var(--editorial-text-secondary)]">
                  Only reindex destinations that have been updated since last index
                </div>
              </div>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                value="all"
                checked={mode === 'all'}
                onChange={(e) => setMode(e.target.value as 'all')}
                className="w-4 h-4"
                disabled={isReindexing}
              />
              <div>
                <div className="font-medium text-sm">All Destinations</div>
                <div className="text-xs text-[var(--editorial-text-secondary)]">
                  Reindex all destinations (use for initial setup or full refresh)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Batch Size */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Batch Size
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value) || 20)}
            disabled={isReindexing}
            className="w-32 px-3 py-2 border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] text-sm"
          />
          <p className="text-xs text-[var(--editorial-text-secondary)] mt-1">
            Number of destinations to process per batch (recommended: 10-20)
          </p>
        </div>

        {/* Dry Run */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={isReindexing}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium text-sm">Dry Run</div>
              <div className="text-xs text-[var(--editorial-text-secondary)]">
                Test the reindex process without actually updating the vector index
              </div>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="px-6 py-3 bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] rounded-xl hover:opacity-80 transition-opacity text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReindexing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {dryRun ? 'Running Dry Run...' : 'Reindexing...'}
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                {dryRun ? 'Run Dry Run' : 'Start Reindex'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                {result.message}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[var(--editorial-text-secondary)]">Total Destinations</div>
                  <div className="font-semibold text-lg">{result.total || 0}</div>
                </div>
                <div>
                  <div className="text-[var(--editorial-text-secondary)]">Successfully Processed</div>
                  <div className="font-semibold text-lg text-green-600 dark:text-green-400">
                    {result.processed || 0}
                  </div>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    Errors ({result.errors.length}):
                  </div>
                  <div className="bg-[var(--editorial-bg-elevated)] rounded border border-red-200 dark:border-red-800 p-3 max-h-40 overflow-y-auto">
                    <ul className="text-xs space-y-1 text-red-700 dark:text-red-300">
                      {result.errors.map((err: string, idx: number) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Reindex Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 text-sm">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              How it works
            </h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300 text-xs">
              <li>• Fetches destinations from Supabase based on selected mode</li>
              <li>• Generates embeddings via ML service (or OpenAI fallback)</li>
              <li>• Upserts vectors and metadata to Upstash Vector index</li>
              <li>• Updates <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">last_indexed_at</code> timestamp in Supabase</li>
              <li>• Processes in batches to avoid timeouts and rate limits</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 pt-2">
              <strong>Tip:</strong> Use "Changed Only" for regular updates. Use "All Destinations" for initial setup or when you've updated the embedding model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
