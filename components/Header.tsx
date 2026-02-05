"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { User, Map, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatDrawer } from "@/features/chat/components/ChatDrawer";
import { LoginDrawer } from "@/features/account/components/LoginDrawer";
import { LoginModal } from "@/components/LoginModal";
import { CommandPalette } from "@/components/CommandPalette";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/tooltip";
import { Button } from "@/ui/button";
import { ChristmasTree } from "@/components/ChristmasTree";
import { useChristmasTheme } from "@/contexts/ChristmasThemeContext";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const { isChristmasMode } = useChristmasTheme();
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Determine admin role from user metadata (sync, no useEffect needed)
  const isAdmin = useMemo(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    return role === "admin";
  }, [user]);

  // Single useEffect to fetch all user data in parallel
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null);
      setBuildVersion(null);
      return;
    }

    // Parallel fetch: avatar and build version (if admin)
    const fetchUserData = async () => {
      const promises: Promise<void>[] = [];

      // Fetch avatar
      promises.push(
        (async () => {
          try {
            const supabaseClient = createClient();
            const { data, error } = await supabaseClient
              .from("profiles")
              .select("avatar_url")
              .eq("id", user.id)
              .maybeSingle();

            if (!error && data?.avatar_url) {
              setAvatarUrl(data.avatar_url);
            } else {
              setAvatarUrl(null);
            }
          } catch {
            setAvatarUrl(null);
          }
        })()
      );

      // Fetch build version only for admins
      if (isAdmin) {
        promises.push(
          (async () => {
            try {
              const versionRes = await fetch("/api/build-version");
              if (!versionRes.ok) {
                setBuildVersion(null);
                return;
              }
              const versionData = await versionRes.json();
              setBuildVersion(
                versionData.buildNumber ||
                  versionData.shortSha ||
                  versionData.commitSha?.substring(0, 7) ||
                  versionData.version ||
                  null
              );
            } catch {
              setBuildVersion(null);
            }
          })()
        );
      } else {
        setBuildVersion(null);
      }

      await Promise.all(promises);
    };

    fetchUserData();
  }, [user, isAdmin]);

  const navigate = (path: string) => {
    router.push(path);
  };

  const actionButtons = (
    <>
      {isAdmin && buildVersion && (
        <span
          className="text-xs text-[var(--editorial-text-tertiary)] font-mono px-1.5 py-0.5 bg-[var(--editorial-border)] rounded"
          title="Build version"
          aria-label={`Build version ${buildVersion}`}
        >
          {buildVersion}
        </span>
      )}

      {/* Admin button for admins, Trips button for others */}
      {isAdmin ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              aria-label="Admin dashboard"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Admin dashboard</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trips')}
              aria-label="View trips"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Trips</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{user ? 'View your trips' : 'Plan a trip'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {user ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openDrawer('account')}
              className="pl-1.5 pr-4"
              aria-label="Open account drawer"
            >
              {avatarUrl ? (
                <span className="relative w-7 h-7 rounded-full bg-[var(--editorial-border)] overflow-visible">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                  {isChristmasMode && (
                    <svg
                      className="absolute -top-3 -left-1 w-5 h-5 -rotate-12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M12 2L4 14H20L12 2Z" fill="#C41E3A" />
                      <path d="M12 2L4 14H20L12 2Z" fill="url(#hat-gradient)" />
                      <ellipse cx="12" cy="14" rx="9" ry="2" fill="#FFFFFF" />
                      <circle cx="12" cy="2" r="2" fill="#FFFFFF" />
                      <defs>
                        <linearGradient id="hat-gradient" x1="12" y1="2" x2="12" y2="14" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#E63946" />
                          <stop offset="1" stopColor="#9A1C2B" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </span>
              ) : (
                <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[var(--editorial-border)]">
                  <User className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
                  {isChristmasMode && (
                    <svg
                      className="absolute -top-3 -left-2 w-4 h-4 -rotate-12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M12 2L4 14H20L12 2Z" fill="#C41E3A" />
                      <ellipse cx="12" cy="14" rx="9" ry="2" fill="#FFFFFF" />
                      <circle cx="12" cy="2" r="2" fill="#FFFFFF" />
                    </svg>
                  )}
                </span>
              )}
              <span className="hidden sm:inline">Account</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Account settings</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={() => openDrawer('login')}
              aria-label="Sign in"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to save trips</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <header
      className="relative z-30 bg-[var(--editorial-bg)] w-full"
      role="banner"
    >
      {/* Primary Nav - Lovably-style minimal */}
      <div className="w-full px-6 md:px-10">
        <nav
          className="flex items-center justify-between py-5 w-full"
          aria-label="Main navigation"
        >
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm text-[var(--editorial-text-primary)] hover:opacity-70 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--editorial-text-primary)] focus:ring-offset-2 rounded-lg py-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual<span className="text-[var(--editorial-text-tertiary)]">®</span>
          </button>

          <div className="flex items-center gap-3">
            <ChristmasTree />
            <CommandPalette />
            {actionButtons}
          </div>
        </nav>
      </div>
      {/* Chat Drawer - Only render when open */}
      {isDrawerOpen('chat') && (
        <ChatDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}

      {/* Login Drawer - Only render when open */}
      {isDrawerOpen('login') && (
        <LoginDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}

      {/* Login Modal - Centered on-page modal for auth prompts */}
      {isDrawerOpen('login-modal') && (
        <LoginModal
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
    </header>
  );
}
