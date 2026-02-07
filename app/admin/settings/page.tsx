'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Globe,
  Database,
  Shield,
  Bell,
  Palette,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  timezone: string;
  maintenanceMode: boolean;
  searchIndexing: boolean;
  userRegistration: boolean;
  twoFactorAuth: boolean;
  rateLimiting: boolean;
  auditLogging: boolean;
  newUserNotifications: boolean;
  contentReports: boolean;
  weeklyAnalytics: boolean;
  adminTheme: string;
  accentColor: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Urban Manual',
  siteDescription: 'A curated travel guide featuring 897+ destinations worldwide',
  contactEmail: 'hello@urbanmanual.co',
  timezone: 'UTC',
  maintenanceMode: false,
  searchIndexing: true,
  userRegistration: true,
  twoFactorAuth: false,
  rateLimiting: true,
  auditLogging: true,
  newUserNotifications: true,
  contentReports: true,
  weeklyAnalytics: false,
  adminTheme: 'Dark (Default)',
  accentColor: '#6366f1',
};

const STORAGE_KEY = 'admin-settings';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [dbStats, setDbStats] = useState<{ records: number; status: string } | null>(null);

  // Load persisted settings from API (with localStorage fallback)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const { settings: saved } = await res.json();
          if (saved && Object.keys(saved).length > 0) {
            setSettings(prev => ({ ...prev, ...saved }));
            // Sync to localStorage as cache
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            return;
          }
        }
      } catch {
        // API unavailable — fall back to localStorage
      }
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
        }
      } catch {
        // Use defaults
      }
    };
    loadSettings();
  }, []);

  // Fetch DB stats
  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const { count } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true });
        setDbStats({ records: count || 0, status: 'Connected' });
      } catch {
        setDbStats({ records: 0, status: 'Error' });
      }
    };
    fetchDbStats();
  }, []);

  const updateSetting = useCallback(<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      // Also cache in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Fall back to localStorage-only save
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const sections: SettingSection[] = [
    { id: 'general', title: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'site', title: 'Site Settings', icon: <Globe className="w-4 h-4" /> },
    { id: 'database', title: 'Database', icon: <Database className="w-4 h-4" /> },
    { id: 'security', title: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', title: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', title: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  const accentColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const inputClass =
    'w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your admin console and site preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:w-full
                  ${activeSection === section.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                `}
              >
                {section.icon}
                <span className="hidden sm:inline lg:inline">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'general' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Description
                  </label>
                  <textarea
                    rows={3}
                    value={settings.siteDescription}
                    onChange={(e) => updateSetting('siteDescription', e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                    className={inputClass}
                  >
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>Europe/London</option>
                    <option>Asia/Tokyo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'site' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Site Settings</h2>

              <div className="space-y-4">
                <ToggleRow
                  label="Maintenance Mode"
                  description="Disable public access to the site"
                  checked={settings.maintenanceMode}
                  onChange={(v) => updateSetting('maintenanceMode', v)}
                />
                <ToggleRow
                  label="Search Indexing"
                  description="Allow search engines to index the site"
                  checked={settings.searchIndexing}
                  onChange={(v) => updateSetting('searchIndexing', v)}
                />
                <ToggleRow
                  label="User Registration"
                  description="Allow new users to sign up"
                  checked={settings.userRegistration}
                  onChange={(v) => updateSetting('userRegistration', v)}
                />
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Database Status</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
                      <CheckCircle className="w-4 h-4" />
                      {dbStats?.status || 'Checking...'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Provider</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">Supabase</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Region</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">US East</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Total Records</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {dbStats?.records?.toLocaleString() || '...'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Database Operations</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Dangerous operations like backup, restore, and purge are available in the Supabase dashboard.
                    </p>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors"
                    >
                      Open Supabase Dashboard
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>

              <div className="space-y-4">
                <ToggleRow
                  label="Two-Factor Authentication"
                  description="Require 2FA for admin access"
                  checked={settings.twoFactorAuth}
                  onChange={(v) => updateSetting('twoFactorAuth', v)}
                />
                <ToggleRow
                  label="Rate Limiting"
                  description="Limit API requests per IP address"
                  checked={settings.rateLimiting}
                  onChange={(v) => updateSetting('rateLimiting', v)}
                />
                <ToggleRow
                  label="Audit Logging"
                  description="Log all admin actions"
                  checked={settings.auditLogging}
                  onChange={(v) => updateSetting('auditLogging', v)}
                />
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>

              <div className="space-y-4">
                <ToggleRow
                  label="New User Signups"
                  description="Get notified when new users register"
                  checked={settings.newUserNotifications}
                  onChange={(v) => updateSetting('newUserNotifications', v)}
                />
                <ToggleRow
                  label="Content Reports"
                  description="Get notified when content is reported"
                  checked={settings.contentReports}
                  onChange={(v) => updateSetting('contentReports', v)}
                />
                <ToggleRow
                  label="Weekly Analytics"
                  description="Receive weekly analytics summary"
                  checked={settings.weeklyAnalytics}
                  onChange={(v) => updateSetting('weeklyAnalytics', v)}
                />
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Admin Theme
                  </label>
                  <select
                    value={settings.adminTheme}
                    onChange={(e) => updateSetting('adminTheme', e.target.value)}
                    className={inputClass}
                  >
                    <option>Dark (Default)</option>
                    <option>Light</option>
                    <option>System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    {accentColors.map(color => (
                      <button
                        key={color}
                        onClick={() => updateSetting('accentColor', color)}
                        className={`w-8 h-8 rounded-full border-2 transition-colors ${
                          settings.accentColor === color
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select accent color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white dark:peer-checked:after:bg-gray-900"></div>
      </label>
    </div>
  );
}
