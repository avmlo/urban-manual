"use client";

import React from "react";
import { LogLevel, StatsigProvider } from "@statsig/react-bindings";

declare const userID: string | undefined;

type MyStatsigProps = {
  children: React.ReactNode;
};

export default function MyStatsig({ children }: MyStatsigProps) {
  const id = typeof userID !== "undefined" ? userID : "a-user";

  const user = {
    userID: id,
    // Optional additional fields:
    // email: 'user@example.com',
    // customIDs: { internalID: 'internal-123' },
    // custom: { plan: 'premium' }
  };

  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;

  if (!sdkKey) {
    return <>{children}</>;
  }

  return (
    <StatsigProvider
      sdkKey={sdkKey}
      user={user}
      options={{ logLevel: LogLevel.Debug }}
    >
      {children}
    </StatsigProvider>
  );
}
