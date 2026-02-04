"use client";

import React from "react";

declare const userID: string | undefined;

type MyStatsigProps = {
  children: React.ReactNode;
};

export default function MyStatsig({ children }: MyStatsigProps) {
  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  
  // If Statsig is not configured, just render children without the provider
  if (!sdkKey) {
    return <>{children}</>;
  }

  // Dynamically import Statsig only when configured
  const StatsigWrapper = React.lazy(async () => {
    const { LogLevel, StatsigProvider } = await import("@statsig/react-bindings");
    
    const id = typeof userID !== "undefined" ? userID : "a-user";
    const user = { userID: id };
    
    return {
      default: ({ children }: { children: React.ReactNode }) => (
        <StatsigProvider
          sdkKey={sdkKey}
          user={user}
          options={{ logLevel: LogLevel.Debug }}
        >
          {children}
        </StatsigProvider>
      ),
    };
  });

  return (
    <React.Suspense fallback={<>{children}</>}>
      <StatsigWrapper>{children}</StatsigWrapper>
    </React.Suspense>
  );
}
