'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/ui/command';
import {
  MapPin,
  BarChart3,
  Users,
  Settings,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Database,
  Building2,
  Globe,
  Tag,
  User,
  Search,
  Crown,
  Star,
  TrendingUp,
  Clock,
  Home,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle command palette with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((item: CommandItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }, [router]);

  const commands: CommandItem[] = [
    // Dashboard & Overview
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'View admin dashboard and stats',
      icon: Home,
      section: 'Navigation',
      href: '/admin',
    },

    // Content Management
    {
      id: 'destinations',
      label: 'Destinations',
      description: 'Manage all destinations',
      icon: MapPin,
      section: 'Content',
      href: '/admin/destinations',
      keywords: ['places', 'locations', 'content'],
    },
    {
      id: 'create-destination',
      label: 'Create Destination',
      description: 'Add a new destination',
      icon: MapPin,
      section: 'Content',
      href: '/admin/destinations?action=create',
      keywords: ['new', 'add', 'create'],
    },
    {
      id: 'media',
      label: 'Media Library',
      description: 'Manage images and media',
      icon: ImageIcon,
      section: 'Content',
      href: '/admin/media',
      keywords: ['images', 'photos', 'uploads'],
    },
    {
      id: 'categories',
      label: 'Categories',
      description: 'Manage destination categories',
      icon: Tag,
      section: 'Content',
      href: '/admin/categories',
    },

    // Data Management
    {
      id: 'cities',
      label: 'Cities',
      description: 'Manage city data',
      icon: Building2,
      section: 'Data',
      href: '/admin/cities',
    },
    {
      id: 'countries',
      label: 'Countries',
      description: 'Manage country data',
      icon: Globe,
      section: 'Data',
      href: '/admin/countries',
    },
    {
      id: 'neighborhoods',
      label: 'Neighborhoods',
      description: 'Manage neighborhood data',
      icon: MapPin,
      section: 'Data',
      href: '/admin/neighborhoods',
    },
    {
      id: 'brands',
      label: 'Brands',
      description: 'Manage brand data',
      icon: Star,
      section: 'Data',
      href: '/admin/brands',
    },
    {
      id: 'architects',
      label: 'Design Firms',
      description: 'Manage design firm profiles',
      icon: User,
      section: 'Data',
      href: '/admin/architects',
    },

    // Analytics & Insights
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'View advanced analytics',
      icon: BarChart3,
      section: 'Insights',
      href: '/admin/analytics',
      keywords: ['stats', 'metrics', 'data'],
    },
    {
      id: 'realtime',
      label: 'Real-time Analytics',
      description: 'Monitor real-time activity',
      icon: TrendingUp,
      section: 'Insights',
      href: '/admin/realtime',
      keywords: ['live', 'activity'],
    },
    {
      id: 'searches',
      label: 'Search Analytics',
      description: 'View search queries and trends',
      icon: Search,
      section: 'Insights',
      href: '/admin/searches',
    },
    {
      id: 'performance',
      label: 'Performance',
      description: 'System performance metrics',
      icon: TrendingUp,
      section: 'Insights',
      href: '/admin/performance',
    },

    // Tools & Settings
    {
      id: 'enrich',
      label: 'Enrich Data',
      description: 'Google Places enrichment',
      icon: Sparkles,
      section: 'Tools',
      href: '/admin/enrich',
      keywords: ['google', 'places', 'api'],
    },
    {
      id: 'reindex',
      label: 'Reindex Search',
      description: 'Sync search index',
      icon: Database,
      section: 'Tools',
      href: '/admin/reindex',
      keywords: ['vector', 'search', 'sync'],
    },
    {
      id: 'users',
      label: 'Users',
      description: 'Manage users and permissions',
      icon: Users,
      section: 'Settings',
      href: '/admin/users',
      keywords: ['accounts', 'roles'],
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'System settings',
      icon: Settings,
      section: 'Settings',
      href: '/admin/settings',
    },

    // Quick Filters
    {
      id: 'crown-picks',
      label: 'Crown Picks',
      description: 'View all crown destinations',
      icon: Crown,
      section: 'Quick Filters',
      href: '/admin/destinations?filter=crown',
    },
    {
      id: 'michelin',
      label: 'Michelin Starred',
      description: 'View Michelin restaurants',
      icon: Star,
      section: 'Quick Filters',
      href: '/admin/destinations?filter=michelin',
    },
    {
      id: 'needs-attention',
      label: 'Needs Attention',
      description: 'Destinations missing data',
      icon: Clock,
      section: 'Quick Filters',
      href: '/admin/destinations?filter=missing-data',
    },
  ];

  // Group commands by section
  const groupedCommands = commands.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedCommands).map(([section, items], index) => (
          <div key={section}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={section}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
