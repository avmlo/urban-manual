"use client";

import React from "react";
import { LogLevel, StatsigProvider } from "@statsig/react-bindings";

declare const userID: string | undefined;

type MyStatsigProps = {
  children: React.ReactNode;
};

export default function MyStatsig({ children }: MyStatsigProps) {
  const key = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;

  if (!key) {
    return <>{children}</>;
  }

  const id = typeof userID !== "undefined" ? userID : "a-user";

  const user = {
    userID: id,
    // Optional additional fields:
    // email: 'user@example.com',
    // customIDs: { internalID: 'internal-123' },
    // custom: { plan: 'premium' }
  };

  return (
    <StatsigProvider
      sdkKey={key}
      user={user}
      options={{ logLevel: LogLevel.Debug }}
    >
      {children}
    </StatsigProvider>
  );
}
