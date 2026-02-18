"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, MapPin, Library } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export type CollectionId = "destinations" | "resources";

interface CollectionOption {
  id: CollectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const COLLECTIONS: CollectionOption[] = [
  { id: "destinations", label: "Destinations", icon: MapPin, href: "/admin/destinations" },
  { id: "resources", label: "Resources", icon: Library, href: "/admin/resources" },
];

interface CollectionSwitcherProps {
  activeCollection: CollectionId;
  onSwitch: (id: CollectionId) => void;
}

function CollectionSwitcher({ activeCollection, onSwitch }: CollectionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const active = COLLECTIONS.find((c) => c.id === activeCollection)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-base font-semibold text-[#1A1A1A] hover:text-[#C75B2A] transition-colors"
      >
        {active.label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-[#E8E2D9] py-1 min-w-[180px]">
            {COLLECTIONS.map((col) => {
              const Icon = col.icon;
              const isActive = col.id === activeCollection;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    onSwitch(col.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#F5F0E8] text-[#1A1A1A] font-medium"
                      : "text-[#6B6B6B] hover:bg-gray-50 hover:text-[#1A1A1A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {col.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface CmsLibraryShellProps {
  defaultCollection?: CollectionId;
  children: (props: {
    activeCollection: CollectionId;
    collectionSwitcher: ReactNode;
  }) => ReactNode;
}

export function CmsLibraryShell({ defaultCollection, children }: CmsLibraryShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine initial collection from route
  const initialCollection: CollectionId =
    defaultCollection || (pathname?.startsWith("/admin/resources") ? "resources" : "destinations");

  const [activeCollection, setActiveCollection] = useState<CollectionId>(initialCollection);

  const handleSwitch = (id: CollectionId) => {
    setActiveCollection(id);
    // Update the URL to match
    const target = COLLECTIONS.find((c) => c.id === id);
    if (target && !pathname?.startsWith(target.href)) {
      router.push(target.href);
    }
  };

  const collectionSwitcher = (
    <CollectionSwitcher
      activeCollection={activeCollection}
      onSwitch={handleSwitch}
    />
  );

  return <>{children({ activeCollection, collectionSwitcher })}</>;
}
