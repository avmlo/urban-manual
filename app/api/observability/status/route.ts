/**
 * API Route: Observability Status
 * GET /api/observability/status
 *
 * Returns real-time metrics, SLO compliance, provider health,
 * and cache hit rates. Protected by admin auth.
 */

import { NextRequest } from "next/server";
import { withStandardApi, createSuccessResponse } from "@/lib/api";
import { getMetricsSnapshot, SLO_DEFINITIONS, checkSLO } from "@/lib/observability/metrics";
import { getAiGatewayMetricsSnapshot, getCircuitBreakerStatus } from "@/services/ai-gateway";

export const GET = withStandardApi(
  { rateLimit: "admin", auth: "admin", routeName: "/api/observability/status" },
  async (_req: NextRequest) => {
    const metrics = getMetricsSnapshot();
    const aiGateway = getAiGatewayMetricsSnapshot();
    const circuitBreakers = getCircuitBreakerStatus();

    // Compute SLO compliance for all defined endpoints
    const sloCompliance: Record<string, ReturnType<typeof checkSLO>> = {};
    for (const route of Object.keys(SLO_DEFINITIONS)) {
      sloCompliance[route] = checkSLO(route);
    }

    const allSLOsMet = Object.values(sloCompliance).every(
      (s) => s.meeting.overall
    );

    return createSuccessResponse({
      status: allSLOsMet ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      sloCompliance,
      endpoints: metrics.endpoints,
      caches: metrics.caches,
      providers: metrics.providers,
      aiGateway: {
        metrics: aiGateway,
        circuitBreakers,
      },
    });
  }
);
