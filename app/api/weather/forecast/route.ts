/**
 * API Route: Get weather forecast for trip dates
 * GET /api/weather/forecast?city=London&startDate=2025-03-01&endDate=2025-03-07&tempUnit=C
 *
 * Returns DayWeather[] for each day in the trip date range.
 * Uses Open-Meteo free API (no key needed).
 */

import { NextRequest } from "next/server";
import {
  withStandardApi,
  createSuccessResponse,
  createValidationError,
} from "@/lib/api";
import {
  fetchWeatherForecast,
  geocodeCity,
  isWeatherUnfavorable,
} from "@/lib/weather/open-meteo";

export const GET = withStandardApi(
  { rateLimit: "api", auth: "none", routeName: "/api/weather/forecast" },
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get("city");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tempUnit = (searchParams.get("tempUnit") || "C") as "C" | "F";

    if (!startDate || !endDate) {
      throw createValidationError("startDate and endDate are required");
    }

    // Validate dates are within forecastable range (Open-Meteo supports ~16 days ahead)
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxForecastDate = new Date(
      now.getTime() + 16 * 24 * 60 * 60 * 1000
    );

    if (end < now) {
      throw createValidationError(
        "Cannot fetch weather for past dates"
      );
    }

    if (start > maxForecastDate) {
      throw createValidationError(
        "Weather forecast is only available up to 16 days ahead"
      );
    }

    // Resolve coordinates
    let latitude: number;
    let longitude: number;

    if (lat && lng) {
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);
    } else if (city) {
      const geo = await geocodeCity(city);
      if (!geo) {
        throw createValidationError(
          `Could not find coordinates for city: ${city}`
        );
      }
      latitude = geo.latitude;
      longitude = geo.longitude;
    } else {
      throw createValidationError(
        "Either city or lat/lng coordinates are required"
      );
    }

    // Clamp dates to forecastable range
    const clampedStart =
      start < now ? now.toISOString().split("T")[0] : startDate;
    const clampedEnd =
      end > maxForecastDate
        ? maxForecastDate.toISOString().split("T")[0]
        : endDate;

    const forecast = await fetchWeatherForecast(
      latitude,
      longitude,
      tempUnit,
      clampedStart,
      clampedEnd
    );

    // Add rainy flag for convenience
    const enriched = forecast.map((day) => ({
      ...day,
      isRainy: isWeatherUnfavorable(day),
    }));

    return createSuccessResponse({
      forecast: enriched,
      location: { latitude, longitude, city: city || undefined },
      dateRange: {
        requested: { startDate, endDate },
        available: { startDate: clampedStart, endDate: clampedEnd },
      },
    });
  }
);
